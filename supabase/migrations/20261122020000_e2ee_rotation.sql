-- Workspace key rotation and member removal.

create table if not exists public.key_rotations (
  id              uuid        primary key default gen_random_uuid(),
  workspace_id    uuid        not null references public.workspaces(id) on delete cascade,
  from_key_id     uuid        references public.content_keys(id),
  to_key_id       uuid        references public.content_keys(id),
  status          text        not null check (status in ('pending','running','completed','failed')),
  processed_count integer     not null default 0,
  last_record_key text        not null default '',
  total_count     integer     not null default 0,
  started_at      timestamptz,
  completed_at    timestamptz,
  error_code      text,
  created_at      timestamptz default now() not null
);

create unique index if not exists key_rotations_one_open
  on public.key_rotations (workspace_id) where status in ('pending','running');

alter table public.key_rotations enable row level security;
grant select, insert, update on public.key_rotations to authenticated;
grant all on public.key_rotations to service_role;

drop policy if exists "Key rotations: members read" on public.key_rotations;
create policy "Key rotations: members read" on public.key_rotations for select to authenticated
using (public.is_workspace_member(workspace_id, (select auth.uid())));

drop policy if exists "Key rotations: admins insert" on public.key_rotations;
create policy "Key rotations: admins insert" on public.key_rotations for insert to authenticated
with check (public.is_workspace_owner_or_admin(workspace_id, (select auth.uid())));

drop policy if exists "Key rotations: admins update" on public.key_rotations;
create policy "Key rotations: admins update" on public.key_rotations for update to authenticated
using (public.is_workspace_owner_or_admin(workspace_id, (select auth.uid())))
with check (public.is_workspace_owner_or_admin(workspace_id, (select auth.uid())));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'key_rotations') then
    alter publication supabase_realtime add table public.key_rotations;
  end if;
end $$;

-- Any membership deletion, including direct PostgREST deletes and account deletion,
-- marks the workspace for a full rotation. A removed member keeps only the data they
-- already downloaded until that rotation completes.
create or replace function public.tg_workspace_member_removed()
returns trigger language plpgsql security definer set search_path to '' as $fn$
begin
  update public.workspaces
     set rotation_required = true, rotation_requested_at = now()
   where id = old.workspace_id;
  return old;
end;
$fn$;

drop trigger if exists workspace_member_removed on public.workspace_members;
create trigger workspace_member_removed
after delete on public.workspace_members
for each row execute function public.tg_workspace_member_removed();

create or replace function public.remove_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid
) returns void
language plpgsql security definer set search_path to '' as $fn$
declare v_actor uuid := (select auth.uid());
begin
  if not public.is_workspace_owner_or_admin(p_workspace_id, v_actor) then
    raise exception 'not authorized';
  end if;

  if p_user_id = v_actor then raise exception 'cannot remove yourself'; end if;

  delete from public.workspace_keys
   where workspace_id = p_workspace_id and user_id = p_user_id;

  delete from public.workspace_members
   where workspace_id = p_workspace_id and user_id = p_user_id;

  update public.workspaces
     set rotation_required = true, rotation_requested_at = now()
   where id = p_workspace_id;
end;
$fn$;

create or replace function public.begin_workspace_key_rotation(
  p_workspace_id uuid,
  p_new_key_id uuid,
  p_old_key_id uuid,
  p_wrapped_keys jsonb
) returns uuid
language plpgsql security definer set search_path to '' as $fn$
declare
  v_actor uuid := (select auth.uid());
  v_rotation uuid;
  v_total integer;
  v_item jsonb;
  v_member_count integer;
  v_wrapped_count integer;
begin
  if not public.is_workspace_owner_or_admin(p_workspace_id, v_actor) then
    raise exception 'not authorized';
  end if;

  perform 1 from public.key_rotations
   where workspace_id = p_workspace_id and status in ('pending','running');
  if found then raise exception 'rotation already active'; end if;

  if jsonb_typeof(p_wrapped_keys) is distinct from 'array' then
    raise exception 'wrapped keys must be an array';
  end if;

  if not exists (
    select 1 from public.content_keys
     where id = p_old_key_id and workspace_id = p_workspace_id and status = 'active'
  ) then
    raise exception 'old key is not active';
  end if;

  for v_item in select * from jsonb_array_elements(p_wrapped_keys)
  loop
    if not public.is_workspace_member(p_workspace_id, (v_item->>'user_id')::uuid) then
      raise exception 'wrapped key for non-member';
    end if;
    if jsonb_typeof(v_item->'wrapped_key') is null then
      raise exception 'missing wrapped key';
    end if;
  end loop;

  select count(distinct (v_item->>'user_id')::uuid)
    into v_wrapped_count
    from jsonb_array_elements(p_wrapped_keys) v_item;
  select count(*) into v_member_count
    from public.workspace_members where workspace_id = p_workspace_id and user_id is not null;
  if v_wrapped_count <> v_member_count then
    raise exception 'wrapped keys do not cover all members';
  end if;

  -- Retire the old key before inserting the new one so the one-active-key index
  -- is never violated.
  update public.content_keys
     set status = 'rotating'
   where id = p_old_key_id and workspace_id = p_workspace_id and status = 'active';
  if not found then raise exception 'old key is not active'; end if;

  insert into public.content_keys (id, workspace_id, status)
  values (p_new_key_id, p_workspace_id, 'active');

  for v_item in select * from jsonb_array_elements(p_wrapped_keys)
  loop
    insert into public.workspace_keys (workspace_id, user_id, key_id, wrapped_key)
    values (
      p_workspace_id,
      (v_item->>'user_id')::uuid,
      p_new_key_id,
      v_item->'wrapped_key'
    )
    on conflict (workspace_id, user_id, key_id) do nothing;
  end loop;

  select
    (select count(*) from public.pages where workspace_id = p_workspace_id) +
    (select count(*) from public.page_content pc join public.pages p on p.id = pc.page_id where p.workspace_id = p_workspace_id) +
    (select count(*) from public.tags where workspace_id = p_workspace_id) +
    (select count(*) from public.columns c join public.pages p on p.id = c.page_id where p.workspace_id = p_workspace_id) +
    (select count(*) from public.cards c join public.pages p on p.id = c.page_id where p.workspace_id = p_workspace_id) +
    (select count(*) from public.comments cm where public.comment_workspace_id(cm.thread_id) = p_workspace_id) +
    (select count(*) from public.notifications where workspace_id = p_workspace_id and title_ciphertext is not null) +
    (select count(*) from public.notifications where workspace_id = p_workspace_id and body_ciphertext is not null) +
    (select count(*) from public.ydocs where workspace_id = p_workspace_id) +
    (select 1 from public.workspaces where id = p_workspace_id and name_ciphertext is not null) +
    (select 1 from public.workspaces where id = p_workspace_id and description_ciphertext is not null)
    into v_total;

  insert into public.key_rotations (id, workspace_id, from_key_id, to_key_id, status, total_count, started_at)
  values (gen_random_uuid(), p_workspace_id, p_old_key_id, p_new_key_id, 'running', v_total, now())
  returning id into v_rotation;

  update public.workspaces
     set rotation_required = false
   where id = p_workspace_id;

  return v_rotation;
end;
$fn$;

create or replace function public.rotation_batch(
  p_workspace_id uuid,
  p_after text,
  p_limit int default 50
) returns table (
  record_key text,
  table_name text,
  row_id uuid,
  secondary_id text,
  field text,
  ciphertext text
)
language plpgsql stable security definer set search_path to '' as $fn$
begin
  if not public.is_workspace_member(p_workspace_id, (select auth.uid())) then
    raise exception 'not a workspace member';
  end if;
  p_limit := least(greatest(coalesce(p_limit, 50), 1), 200);

  return query
  select 'workspace_name:' || w.id::text, 'workspaces', w.id, null::text, 'name', w.name_ciphertext
    from public.workspaces w where w.id = p_workspace_id and 'workspace_name:' || w.id::text > p_after
  union all
  select 'workspace_description:' || w.id::text, 'workspaces', w.id, null::text, 'description', w.description_ciphertext
    from public.workspaces w where w.id = p_workspace_id and w.description_ciphertext is not null and 'workspace_description:' || w.id::text > p_after
  union all
  select 'page_title:' || p.id::text, 'pages', p.id, null::text, 'title', p.title_ciphertext
    from public.pages p where p.workspace_id = p_workspace_id and 'page_title:' || p.id::text > p_after
  union all
  select 'page_content:' || pc.id::text, 'page_content', pc.id, p.id::text, 'content', pc.ciphertext
    from public.page_content pc join public.pages p on p.id = pc.page_id
   where p.workspace_id = p_workspace_id and 'page_content:' || pc.id::text > p_after
  union all
  select 'tag:' || t.id::text, 'tags', t.id, null::text, 'name', t.ciphertext
    from public.tags t where t.workspace_id = p_workspace_id and 'tag:' || t.id::text > p_after
  union all
  select 'column:' || c.id::text, 'columns', c.id, p.id::text, 'title', c.ciphertext
    from public.columns c join public.pages p on p.id = c.page_id
   where p.workspace_id = p_workspace_id and 'column:' || c.id::text > p_after
  union all
  select 'card:' || c.id::text, 'cards', c.id, p.id::text, 'content', c.ciphertext
    from public.cards c join public.pages p on p.id = c.page_id
   where p.workspace_id = p_workspace_id and 'card:' || c.id::text > p_after
  union all
  select 'comment:' || cm.id::text, 'comments', cm.id, null::text, 'body', cm.ciphertext
    from public.comments cm
   where public.comment_workspace_id(cm.thread_id) = p_workspace_id and 'comment:' || cm.id::text > p_after
  union all
  select 'notification_title:' || n.id::text, 'notifications', n.id,
         coalesce(n.data->>'comment_id', n.entity_id::text), 'title', n.title_ciphertext
    from public.notifications n
   where n.workspace_id = p_workspace_id and 'notification_title:' || n.id::text > p_after
  union all
  select 'notification_body:' || n.id::text, 'notifications', n.id,
         coalesce(n.data->>'comment_id', n.entity_id::text), 'body', n.body_ciphertext
    from public.notifications n
   where n.workspace_id = p_workspace_id and n.body_ciphertext is not null and 'notification_body:' || n.id::text > p_after
  union all
  select 'ydoc:' || y.entity_type || ':' || y.entity_id::text, 'ydocs', y.id, y.entity_type || ':' || y.entity_id::text, 'state', y.state
    from public.ydocs y where y.workspace_id = p_workspace_id and 'ydoc:' || y.entity_type || ':' || y.entity_id::text > p_after
  order by 1
  limit p_limit;
end;
$fn$;

create or replace function public.ack_rotation_batch(
  p_rotation_id uuid,
  p_last_record_key text,
  p_processed_count int
) returns void
language plpgsql security definer set search_path to '' as $fn$
declare r public.key_rotations%rowtype;
begin
  select * into r from public.key_rotations where id = p_rotation_id;
  if r.id is null then raise exception 'rotation not found'; end if;
  if not public.is_workspace_owner_or_admin(r.workspace_id, (select auth.uid())) then
    raise exception 'not authorized';
  end if;

  update public.key_rotations
     set processed_count = greatest(processed_count, p_processed_count),
         last_record_key = case when p_last_record_key > last_record_key then p_last_record_key else last_record_key end
   where id = p_rotation_id and status = 'running';
end;
$fn$;

create or replace function public.complete_rotation(p_rotation_id uuid)
returns void
language plpgsql security definer set search_path to '' as $fn$
declare r public.key_rotations%rowtype; v_left integer;
begin
  select * into r from public.key_rotations where id = p_rotation_id;
  if r.id is null or r.status <> 'running' then raise exception 'rotation is not running'; end if;
  if not public.is_workspace_owner_or_admin(r.workspace_id, (select auth.uid())) then
    raise exception 'not authorized';
  end if;

  select
    (select count(*) from public.pages where workspace_id = r.workspace_id and split_part(title_ciphertext,'.',2) = r.from_key_id::text) +
    (select count(*) from public.page_content pc join public.pages p on p.id = pc.page_id where p.workspace_id = r.workspace_id and split_part(pc.ciphertext,'.',2) = r.from_key_id::text) +
    (select count(*) from public.tags where workspace_id = r.workspace_id and split_part(ciphertext,'.',2) = r.from_key_id::text) +
    (select count(*) from public.columns c join public.pages p on p.id = c.page_id where p.workspace_id = r.workspace_id and split_part(c.ciphertext,'.',2) = r.from_key_id::text) +
    (select count(*) from public.cards c join public.pages p on p.id = c.page_id where p.workspace_id = r.workspace_id and split_part(c.ciphertext,'.',2) = r.from_key_id::text) +
    (select count(*) from public.comments cm where public.comment_workspace_id(cm.thread_id) = r.workspace_id and split_part(cm.ciphertext,'.',2) = r.from_key_id::text) +
    (select count(*) from public.notifications where workspace_id = r.workspace_id and (split_part(title_ciphertext,'.',2) = r.from_key_id::text or split_part(body_ciphertext,'.',2) = r.from_key_id::text)) +
    (select count(*) from public.ydocs where workspace_id = r.workspace_id and split_part(state,'.',2) = r.from_key_id::text) +
    (select count(*) from public.workspaces where id = r.workspace_id and (split_part(name_ciphertext,'.',2) = r.from_key_id::text or split_part(description_ciphertext,'.',2) = r.from_key_id::text))
    into v_left;

  if v_left > 0 then raise exception 'rotation verification failed'; end if;

  update public.content_keys set status = 'retired', retired_at = now() where id = r.from_key_id;
  delete from public.workspace_keys where key_id = r.from_key_id;
  delete from public.crypto_nonces where key_scope = 'workspace' and key_id = r.from_key_id;
  update public.key_rotations set status = 'completed', completed_at = now() where id = p_rotation_id;
end;
$fn$;

create or replace function public.fail_rotation(p_rotation_id uuid, p_error_code text)
returns void language plpgsql security definer set search_path to '' as $fn$
declare r public.key_rotations%rowtype;
begin
  select * into r from public.key_rotations where id = p_rotation_id;
  if r.id is null or r.status <> 'running' then raise exception 'rotation is not running'; end if;
  if not public.is_workspace_owner_or_admin(r.workspace_id, (select auth.uid())) then
    raise exception 'not authorized';
  end if;

  update public.key_rotations
      set status = 'failed', error_code = p_error_code
    where id = p_rotation_id and status = 'running';
end;
$fn$;

-- A failed rotation keeps the same from/to keys. Retry resumes from the last
-- acknowledged record instead of creating another active key.
create or replace function public.retry_rotation(p_rotation_id uuid)
returns void language plpgsql security definer set search_path to '' as $fn$
declare r public.key_rotations%rowtype;
begin
  select * into r from public.key_rotations where id = p_rotation_id;
  if r.id is null or r.status <> 'failed' then raise exception 'rotation is not failed'; end if;
  if not public.is_workspace_owner_or_admin(r.workspace_id, (select auth.uid())) then
    raise exception 'not authorized';
  end if;

  update public.key_rotations
     set status = 'running', error_code = null, started_at = now()
   where id = p_rotation_id;
end;
$fn$;

revoke all on function public.remove_workspace_member(uuid,uuid) from public;
revoke all on function public.begin_workspace_key_rotation(uuid,uuid,uuid,jsonb) from public;
revoke all on function public.rotation_batch(uuid,text,int) from public;
revoke all on function public.ack_rotation_batch(uuid,text,int) from public;
revoke all on function public.complete_rotation(uuid) from public;
revoke all on function public.fail_rotation(uuid,text) from public;
revoke all on function public.retry_rotation(uuid) from public;

grant execute on function public.remove_workspace_member(uuid,uuid) to authenticated;
grant execute on function public.begin_workspace_key_rotation(uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function public.rotation_batch(uuid,text,int) to authenticated;
grant execute on function public.ack_rotation_batch(uuid,text,int) to authenticated;
grant execute on function public.complete_rotation(uuid) to authenticated;
grant execute on function public.fail_rotation(uuid,text) to authenticated;
grant execute on function public.retry_rotation(uuid) to authenticated;
