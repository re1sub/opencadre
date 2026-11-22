-- OpenCadre E2EE core schema.
-- Supabase stores ciphertext and metadata only. No plaintext protected content
-- is written to these columns by the client.

create or replace function public.is_v3_sealed(p_value text)
returns boolean
language sql
immutable
set search_path to ''
as $fn$
  select
    p_value is not null
    and p_value ~ $re$^v3\.([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9+/]{16})\.((?:[A-Za-z0-9+/]{4}){5,}(?:[A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==))$re$;
$fn$;

create or replace function public.comment_workspace_id(p_thread_id uuid)
returns uuid
language sql
stable
set search_path to ''
as $fn$
  select case t.entity_type
    when 'page' then (select p.workspace_id from public.pages p where p.id = t.entity_id)
    when 'card' then (
      select p.workspace_id
        from public.cards c
        join public.pages p on p.id = c.page_id
       where c.id = t.entity_id
    )
  end
  from public.comment_threads t
 where t.id = p_thread_id;
$fn$;

-- The legacy E2EE migrations created some of these constraints under the same
-- names. Drop them first so this migration applies to both a clean base schema
-- and a schema that still carries the legacy definitions.
do $$
declare
  v_spec record;
begin
  for v_spec in
    select * from (values
      ('public.workspaces', 'workspaces_name_sealed'),
      ('public.workspaces', 'workspaces_description_sealed'),
      ('public.workspaces', 'workspaces_name_ct_cap'),
      ('public.workspaces', 'workspaces_description_ct_cap'),
      ('public.workspaces', 'workspaces_name_key_fkey'),
      ('public.workspaces', 'workspaces_description_key_fkey'),
      ('public.pages', 'pages_title_sealed'),
      ('public.pages', 'pages_title_ct_cap'),
      ('public.pages', 'pages_title_key_fkey'),
      ('public.page_content', 'page_content_sealed'),
      ('public.page_content', 'page_content_ct_cap'),
      ('public.page_content', 'page_content_key_fkey'),
      ('public.tags', 'tags_sealed'),
      ('public.tags', 'tags_ct_cap'),
      ('public.tags', 'tags_key_fkey'),
      ('public.columns', 'columns_sealed'),
      ('public.columns', 'columns_ct_cap'),
      ('public.columns', 'columns_key_fkey'),
      ('public.cards', 'cards_sealed'),
      ('public.cards', 'cards_ct_cap'),
      ('public.cards', 'cards_key_fkey'),
      ('public.comments', 'comments_sealed'),
      ('public.comments', 'comments_ct_cap'),
      ('public.comments', 'comments_key_fkey'),
      ('public.notifications', 'notifications_title_sealed'),
      ('public.notifications', 'notifications_body_sealed'),
      ('public.notifications', 'notifications_title_ct_cap'),
      ('public.notifications', 'notifications_body_ct_cap'),
      ('public.notifications', 'notifications_title_key_fkey'),
      ('public.notifications', 'notifications_body_key_fkey'),
      ('public.ydocs', 'ydocs_sealed'),
      ('public.ydocs', 'ydocs_ct_cap'),
      ('public.ydocs', 'ydocs_state_key_fkey'),
      ('public.workspace_keys', 'workspace_keys_workspace_user_key_key')
    ) as t(tbl, con)
  loop
    if to_regclass(v_spec.tbl) is not null then
      execute format('alter table %s drop constraint if exists %I', v_spec.tbl, v_spec.con);
    end if;
  end loop;
end $$;

create table if not exists public.content_keys (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references public.workspaces(id) on delete cascade,
  status       text        not null check (status in ('active','rotating','retired')),
  created_at   timestamptz default now() not null,
  retired_at   timestamptz
);

create unique index if not exists content_keys_one_active
  on public.content_keys (workspace_id) where status = 'active';

create table if not exists public.user_content_keys (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null unique references auth.users(id) on delete cascade,
  status     text        not null check (status in ('active','rotated')),
  created_at timestamptz default now() not null
);

create table if not exists public.user_content_key_wraps (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  key_id      uuid        not null references public.user_content_keys(id) on delete cascade,
  wrapped_key jsonb       not null,
  created_at  timestamptz default now() not null,
  primary key (user_id, key_id)
);

create table if not exists public.crypto_nonces (
  key_scope   text        not null check (key_scope in ('workspace','user')),
  key_id      uuid        not null,
  iv          text        not null check (iv ~ '^[A-Za-z0-9+/]{16}$'),
  entity_type text,
  entity_id   uuid,
  created_at  timestamptz default now() not null,
  primary key (key_scope, key_id, iv)
);

create table if not exists public.user_keys (
  user_id              uuid        primary key references auth.users(id) on delete cascade,
  public_key           text        not null,
  recovery_wrapped_key jsonb       not null,
  key_version          integer     not null default 1,
  created_at           timestamptz default now() not null,
  updated_at           timestamptz default now() not null
);

create table if not exists public.user_devices (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users(id) on delete cascade,
  wrapped_private_key  jsonb       not null,
  identity_key_version integer     not null default 1,
  device_label         text        not null default '',
  status               text        not null default 'active' check (status in ('active','revoked')),
  last_used_at         timestamptz,
  revoked_at           timestamptz,
  created_at           timestamptz default now() not null
);

create table if not exists public.workspace_keys (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references public.workspaces(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  key_id       uuid        not null references public.content_keys(id) on delete cascade,
  wrapped_key  jsonb       not null,
  created_at   timestamptz default now() not null
);

alter table public.user_keys
  drop column if exists wrapped_private_key,
  add column if not exists recovery_wrapped_key jsonb,
  add column if not exists key_version integer not null default 1;


alter table public.user_keys
  alter column recovery_wrapped_key set not null;

alter table public.user_devices
  add column if not exists identity_key_version integer not null default 1,
  add column if not exists device_label text not null default '',
  add column if not exists status text not null default 'active'
    check (status in ('active','revoked')),
  add column if not exists revoked_at timestamptz;

alter table public.workspace_keys
  add column if not exists key_id uuid references public.content_keys(id);

alter table public.workspace_keys
  drop constraint if exists workspace_keys_workspace_id_user_id_key;

alter table public.workspace_keys
  add constraint workspace_keys_workspace_user_key_key
    unique (workspace_id, user_id, key_id);

alter table public.workspaces
  add column if not exists rotation_required boolean not null default false,
  add column if not exists rotation_requested_at timestamptz;

alter table public.profiles
  add column if not exists display_name_ciphertext text,
  drop column if exists display_name;

create or replace function public.assert_sealed_in_scope(
  p_value text,
  p_scope text,
  p_owner uuid,
  p_field text,
  p_max_ct int
) returns void
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_key uuid;
  v_iv text;
  v_ok boolean;
begin
  if p_value is null then
    return;
  end if;

  if not public.is_v3_sealed(p_value) then
    raise exception 'invalid v3 envelope for %', p_field;
  end if;

  if length(split_part(p_value, '.', 4)) > p_max_ct then
    raise exception 'ciphertext too large for %', p_field;
  end if;

  v_key := split_part(p_value, '.', 2)::uuid;
  v_iv  := split_part(p_value, '.', 3);

  if p_scope = 'workspace' then
    select exists (
      select 1 from public.content_keys k
       where k.id = v_key and k.workspace_id = p_owner
         and k.status in ('active','rotating')
    ) into v_ok;
  else
    select exists (
      select 1 from public.user_content_keys k
       where k.id = v_key and k.user_id = p_owner
         and k.status = 'active'
    ) into v_ok;
  end if;

  if not v_ok then
    raise exception 'ciphertext key does not belong to % %', p_scope, p_owner;
  end if;

  select exists (
    select 1 from public.crypto_nonces n
     where n.key_scope = p_scope and n.key_id = v_key and n.iv = v_iv
  ) into v_ok;

  if not v_ok then
    raise exception 'ciphertext nonce was not reserved';
  end if;
end;
$fn$;

revoke all on function public.assert_sealed_in_scope(text,text,uuid,text,int) from public;
grant execute on function public.assert_sealed_in_scope(text,text,uuid,text,int) to authenticated;

-- Workspaces.
alter table public.workspaces
  add column if not exists name_ciphertext text,
  add column if not exists description_ciphertext text,
  drop column if exists name,
  drop column if exists description;

alter table public.workspaces alter column name_ciphertext drop not null;

-- name_ciphertext is temporarily null during workspace bootstrap. The client
-- creates the row, creates the content key, then sets the sealed name before
-- adding any membership, so no reader can observe the null state.

alter table public.workspaces
  add column if not exists name_key_id uuid generated always as (split_part(name_ciphertext, '.', 2)::uuid) stored,
  add column if not exists name_iv text generated always as (split_part(name_ciphertext, '.', 3)) stored,
  add column if not exists description_key_id uuid generated always as (nullif(split_part(description_ciphertext, '.', 2), '')::uuid) stored,
  add column if not exists description_iv text generated always as (nullif(split_part(description_ciphertext, '.', 3), '')) stored,
  add constraint workspaces_name_sealed check (name_ciphertext is null or public.is_v3_sealed(name_ciphertext)),
  add constraint workspaces_description_sealed check (description_ciphertext is null or public.is_v3_sealed(description_ciphertext)),
  add constraint workspaces_name_ct_cap check (length(split_part(name_ciphertext, '.', 4)) <= 704),
  add constraint workspaces_description_ct_cap check (description_ciphertext is null or length(split_part(description_ciphertext, '.', 4)) <= 704);

create or replace function public.tg_workspaces_encrypted()
returns trigger language plpgsql set search_path to '' as $fn$
begin
  perform public.assert_sealed_in_scope(new.name_ciphertext,'workspace',new.id,'workspace.name',704);
  perform public.assert_sealed_in_scope(new.description_ciphertext,'workspace',new.id,'workspace.description',704);
  return new;
end $fn$;

drop trigger if exists workspaces_encrypted_scope on public.workspaces;
create trigger workspaces_encrypted_scope
before insert or update of name_ciphertext, description_ciphertext on public.workspaces
for each row execute function public.tg_workspaces_encrypted();

-- Pages.
alter table public.pages
  add column if not exists title_ciphertext text,
  drop column if exists title;


alter table public.pages
  alter column title_ciphertext set not null,
  add column if not exists title_key_id uuid generated always as (split_part(title_ciphertext, '.', 2)::uuid) stored,
  add column if not exists title_iv text generated always as (split_part(title_ciphertext, '.', 3)) stored,
  add constraint pages_title_sealed check (public.is_v3_sealed(title_ciphertext)),
  add constraint pages_title_ct_cap check (length(split_part(title_ciphertext, '.', 4)) <= 704);

create or replace function public.tg_pages_encrypted()
returns trigger language plpgsql set search_path to '' as $fn$
begin
  perform public.assert_sealed_in_scope(new.title_ciphertext,'workspace',new.workspace_id,'pages.title',704);
  return new;
end $fn$;

drop trigger if exists pages_encrypted_scope on public.pages;
create trigger pages_encrypted_scope
before insert or update of title_ciphertext on public.pages
for each row execute function public.tg_pages_encrypted();

-- Page content.
alter table public.page_content
  add column if not exists ciphertext text,
  drop column if exists content;


alter table public.page_content
  alter column ciphertext set not null,
  add column if not exists key_id uuid generated always as (split_part(ciphertext, '.', 2)::uuid) stored,
  add column if not exists iv text generated always as (split_part(ciphertext, '.', 3)) stored,
  add constraint page_content_sealed check (public.is_v3_sealed(ciphertext)),
  add constraint page_content_ct_cap check (length(split_part(ciphertext, '.', 4)) <= 1398124);

create or replace function public.tg_page_content_encrypted()
returns trigger language plpgsql set search_path to '' as $fn$
declare v_workspace uuid;
begin
  select workspace_id into v_workspace from public.pages where id = new.page_id;
  perform public.assert_sealed_in_scope(new.ciphertext,'workspace',v_workspace,'page_content',1398124);
  return new;
end $fn$;

drop trigger if exists page_content_encrypted_scope on public.page_content;
create trigger page_content_encrypted_scope
before insert or update of ciphertext on public.page_content
for each row execute function public.tg_page_content_encrypted();

-- Tags.
alter table public.tags
  add column if not exists ciphertext text,
  drop column if exists name;


alter table public.tags
  alter column ciphertext set not null,
  add column if not exists key_id uuid generated always as (split_part(ciphertext, '.', 2)::uuid) stored,
  add column if not exists iv text generated always as (split_part(ciphertext, '.', 3)) stored,
  add constraint tags_sealed check (public.is_v3_sealed(ciphertext)),
  add constraint tags_ct_cap check (length(split_part(ciphertext, '.', 4)) <= 704);

create or replace function public.tg_tags_encrypted()
returns trigger language plpgsql set search_path to '' as $fn$
begin
  perform public.assert_sealed_in_scope(new.ciphertext,'workspace',new.workspace_id,'tags.name',704);
  return new;
end $fn$;

drop trigger if exists tags_encrypted_scope on public.tags;
create trigger tags_encrypted_scope
before insert or update of ciphertext on public.tags
for each row execute function public.tg_tags_encrypted();

-- Columns.
alter table public.columns
  add column if not exists ciphertext text,
  drop column if exists title;


alter table public.columns
  alter column ciphertext set not null,
  add column if not exists key_id uuid generated always as (split_part(ciphertext, '.', 2)::uuid) stored,
  add column if not exists iv text generated always as (split_part(ciphertext, '.', 3)) stored,
  add constraint columns_sealed check (public.is_v3_sealed(ciphertext)),
  add constraint columns_ct_cap check (length(split_part(ciphertext, '.', 4)) <= 704);

create or replace function public.tg_columns_encrypted()
returns trigger language plpgsql set search_path to '' as $fn$
declare v_workspace uuid;
begin
  select workspace_id into v_workspace from public.pages where id = new.page_id;
  perform public.assert_sealed_in_scope(new.ciphertext,'workspace',v_workspace,'columns.title',704);
  return new;
end $fn$;

drop trigger if exists columns_encrypted_scope on public.columns;
create trigger columns_encrypted_scope
before insert or update of ciphertext on public.columns
for each row execute function public.tg_columns_encrypted();

-- Cards.
alter table public.cards
  add column if not exists ciphertext text,
  drop column if exists title,
  drop column if exists description;


alter table public.cards
  alter column ciphertext set not null,
  add column if not exists key_id uuid generated always as (split_part(ciphertext, '.', 2)::uuid) stored,
  add column if not exists iv text generated always as (split_part(ciphertext, '.', 3)) stored,
  add constraint cards_sealed check (public.is_v3_sealed(ciphertext)),
  add constraint cards_ct_cap check (length(split_part(ciphertext, '.', 4)) <= 704);

create or replace function public.tg_cards_encrypted()
returns trigger language plpgsql set search_path to '' as $fn$
declare v_workspace uuid;
begin
  select workspace_id into v_workspace from public.pages where id = new.page_id;
  perform public.assert_sealed_in_scope(new.ciphertext,'workspace',v_workspace,'cards',704);
  return new;
end $fn$;

drop trigger if exists cards_encrypted_scope on public.cards;
create trigger cards_encrypted_scope
before insert or update of ciphertext on public.cards
for each row execute function public.tg_cards_encrypted();

-- Comments.
alter table public.comments
  add column if not exists ciphertext text,
  drop column if exists content;


alter table public.comments
  alter column ciphertext set not null,
  add column if not exists key_id uuid generated always as (split_part(ciphertext, '.', 2)::uuid) stored,
  add column if not exists iv text generated always as (split_part(ciphertext, '.', 3)) stored,
  add constraint comments_sealed check (public.is_v3_sealed(ciphertext)),
  add constraint comments_ct_cap check (length(split_part(ciphertext, '.', 4)) <= 87404);

create or replace function public.tg_comments_encrypted()
returns trigger language plpgsql set search_path to '' as $fn$
begin
  perform public.assert_sealed_in_scope(
    new.ciphertext,
    'workspace',
    public.comment_workspace_id(new.thread_id),
    'comments.body',
    87404
  );
  return new;
end $fn$;

drop trigger if exists comments_encrypted_scope on public.comments;
create trigger comments_encrypted_scope
before insert or update of ciphertext on public.comments
for each row execute function public.tg_comments_encrypted();

-- Notifications.
alter table public.notifications
  add column if not exists title_ciphertext text,
  add column if not exists body_ciphertext text,
  drop column if exists title,
  drop column if exists body;


alter table public.notifications
  alter column title_ciphertext set not null,
  add column if not exists title_key_id uuid generated always as (split_part(title_ciphertext, '.', 2)::uuid) stored,
  add column if not exists title_iv text generated always as (split_part(title_ciphertext, '.', 3)) stored,
  add column if not exists body_key_id uuid generated always as (nullif(split_part(body_ciphertext, '.', 2), '')::uuid) stored,
  add column if not exists body_iv text generated always as (nullif(split_part(body_ciphertext, '.', 3), '')) stored,
  add constraint notifications_title_sealed check (public.is_v3_sealed(title_ciphertext)),
  add constraint notifications_body_sealed check (body_ciphertext is null or public.is_v3_sealed(body_ciphertext)),
  add constraint notifications_title_ct_cap check (length(split_part(title_ciphertext, '.', 4)) <= 704),
  add constraint notifications_body_ct_cap check (body_ciphertext is null or length(split_part(body_ciphertext, '.', 4)) <= 704);

create or replace function public.tg_notifications_encrypted()
returns trigger language plpgsql set search_path to '' as $fn$
begin
  perform public.assert_sealed_in_scope(new.title_ciphertext,'workspace',new.workspace_id,'notifications.title',704);
  perform public.assert_sealed_in_scope(new.body_ciphertext,'workspace',new.workspace_id,'notifications.body',704);
  return new;
end $fn$;

drop trigger if exists notifications_encrypted_scope on public.notifications;
create trigger notifications_encrypted_scope
before insert or update of title_ciphertext, body_ciphertext on public.notifications
for each row execute function public.tg_notifications_encrypted();

-- Ydocs. The legacy empty-string default can never satisfy the v3 check.
alter table public.ydocs
  alter column state drop default,
  drop column if exists is_encrypted,
  add column if not exists state_key_id uuid generated always as (split_part(state, '.', 2)::uuid) stored,
  add column if not exists state_iv text generated always as (split_part(state, '.', 3)) stored,
  add constraint ydocs_sealed check (public.is_v3_sealed(state)),
  add constraint ydocs_ct_cap check (length(split_part(state, '.', 4)) <= 2796224);

create or replace function public.tg_ydocs_encrypted()
returns trigger language plpgsql set search_path to '' as $fn$
begin
  perform public.assert_sealed_in_scope(new.state,'workspace',new.workspace_id,'ydocs.state',2796224);
  return new;
end $fn$;

drop trigger if exists ydocs_encrypted_scope on public.ydocs;
create trigger ydocs_encrypted_scope
before insert or update of state on public.ydocs
for each row execute function public.tg_ydocs_encrypted();

-- Profiles.
create or replace function public.tg_profiles_encrypted()
returns trigger language plpgsql set search_path to '' as $fn$
begin
  perform public.assert_sealed_in_scope(new.display_name_ciphertext,'user',new.id,'profiles.display_name',704);
  return new;
end $fn$;

drop trigger if exists profiles_encrypted_scope on public.profiles;
create trigger profiles_encrypted_scope
before insert or update of display_name_ciphertext on public.profiles
for each row execute function public.tg_profiles_encrypted();

alter table public.workspaces
  add constraint workspaces_name_key_fkey foreign key (name_key_id) references public.content_keys(id),
  add constraint workspaces_description_key_fkey foreign key (description_key_id) references public.content_keys(id);
alter table public.pages
  add constraint pages_title_key_fkey foreign key (title_key_id) references public.content_keys(id);
alter table public.page_content
  add constraint page_content_key_fkey foreign key (key_id) references public.content_keys(id);
alter table public.tags
  add constraint tags_key_fkey foreign key (key_id) references public.content_keys(id);
alter table public.columns
  add constraint columns_key_fkey foreign key (key_id) references public.content_keys(id);
alter table public.cards
  add constraint cards_key_fkey foreign key (key_id) references public.content_keys(id);
alter table public.comments
  add constraint comments_key_fkey foreign key (key_id) references public.content_keys(id);
alter table public.notifications
  add constraint notifications_title_key_fkey foreign key (title_key_id) references public.content_keys(id),
  add constraint notifications_body_key_fkey foreign key (body_key_id) references public.content_keys(id);
alter table public.ydocs
  add constraint ydocs_state_key_fkey foreign key (state_key_id) references public.content_keys(id);

-- Legacy plaintext database writers are removed with the v3 schema.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to '' as $fn$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_updated on auth.users;
drop function if exists public.sync_profile_display_name();

drop trigger if exists trg_comment_notifications on public.comments;
drop function if exists public.handle_comment_notifications();
drop function if exists public.create_mention_notification(uuid, uuid, text, text);

-- Comment notifications are sealed by the client before this RPC runs.
create or replace function public.create_comment_notifications(
  p_comment_id uuid,
  p_mention_title text,
  p_comment_title text,
  p_body text,
  p_recipient_ids uuid[] default '{}'::uuid[]
) returns void
language plpgsql security definer set search_path to '' as $fn$
declare
  v_actor uuid := (select auth.uid());
  v_workspace uuid;
  v_thread uuid;
  v_entity_type text;
  v_entity_id uuid;
  v_page_id uuid;
  v_recipient uuid;
  v_prefs jsonb;
  v_is_mention boolean;
  v_title text;
  v_type public.notification_type;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if not public.is_v3_sealed(p_mention_title)
     or not public.is_v3_sealed(p_comment_title)
     or (p_body is not null and not public.is_v3_sealed(p_body)) then
    raise exception 'notification fields must be v3 sealed';
  end if;

  select cm.thread_id into v_thread from public.comments cm where cm.id = p_comment_id;
  if v_thread is null then raise exception 'comment not found'; end if;
  v_workspace := public.comment_workspace_id(v_thread);
  if v_workspace is null then raise exception 'comment workspace not found'; end if;
  if not public.is_workspace_member(v_workspace, v_actor) then raise exception 'not a workspace member'; end if;

  select ct.entity_type, ct.entity_id into v_entity_type, v_entity_id
    from public.comment_threads ct where ct.id = v_thread;
  if v_entity_type = 'page' then
    v_page_id := v_entity_id;
  else
    select c.page_id into v_page_id from public.cards c where c.id = v_entity_id;
  end if;

  for v_recipient in
    select wm.user_id from public.workspace_members wm
     where wm.workspace_id = v_workspace
       and wm.user_id is not null
       and wm.user_id <> v_actor
  loop
    v_is_mention := v_recipient = any(coalesce(p_recipient_ids, '{}'::uuid[]));
    select us.notifications into v_prefs from public.user_settings us where us.user_id = v_recipient;

    if v_is_mention then
      if v_prefs is not null and coalesce(v_prefs ->> 'mentions', 'true') = 'false' then continue; end if;
      v_type := 'mention';
      v_title := p_mention_title;
    else
      if v_prefs is not null and coalesce(v_prefs ->> 'comments', 'true') = 'false' then continue; end if;
      v_type := 'comment';
      v_title := p_comment_title;
    end if;

    insert into public.notifications (
      user_id, type, actor_id, workspace_id, entity_type, entity_id, page_id,
      title_ciphertext, body_ciphertext, data
    ) values (
      v_recipient, v_type, v_actor, v_workspace, v_entity_type, v_entity_id, v_page_id,
      v_title, p_body, jsonb_build_object('comment_id', p_comment_id::text)
    );
  end loop;
end;
$fn$;

revoke all on function public.create_comment_notifications(uuid,text,text,text,uuid[]) from public;
grant execute on function public.create_comment_notifications(uuid,text,text,text,uuid[]) to authenticated;

-- Owners can write their encrypted display name from the client.
grant insert, update on public.profiles to authenticated;
drop policy if exists "Profiles: own insert" on public.profiles;
create policy "Profiles: own insert" on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
drop policy if exists "Profiles: own update" on public.profiles;
create policy "Profiles: own update" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- AI request plaintext columns are never stored.
alter table public.ai_requests
  drop column if exists prompt,
  drop column if exists response;

-- Account deletion cleanup.
create or replace function public.delete_user_account (p_user_id uuid)
returns void language plpgsql security definer
set search_path to 'public', 'auth'
as $function$
begin
  update public.pages set owner_id = null where owner_id = p_user_id;
  delete from public.comment_reactions where user_id = p_user_id;
  delete from public.comments where author_id = p_user_id;
  delete from public.ai_requests where user_id = p_user_id;
  delete from public.activity_logs where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id or actor_id = p_user_id;
  delete from public.user_settings where user_id = p_user_id;
  -- Workspace nonce reservations are shared with other members and must survive.
  delete from public.crypto_nonces n
   where n.key_scope = 'user'
     and n.key_id in (select id from public.user_content_keys where user_id = p_user_id);
  delete from public.user_content_key_wraps where user_id = p_user_id;
  delete from public.user_content_keys where user_id = p_user_id;
  delete from public.workspace_keys where user_id = p_user_id;
  delete from public.user_devices where user_id = p_user_id;
  delete from public.user_keys where user_id = p_user_id;
  delete from public.workspace_members where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'user not found' using errcode = 'P0001';
  end if;
end;
$function$;

revoke all on function public.delete_user_account(uuid) from public;
grant execute on function public.delete_user_account(uuid) to service_role;

-- Public keys for workspace sharing.
create or replace function public.workspace_member_public_keys (p_workspace_id uuid)
returns table (user_id uuid, public_key text)
language sql stable security definer set search_path to ''
as $function$
  select uk.user_id, uk.public_key
    from public.user_keys uk
    join public.workspace_members wm on wm.user_id = uk.user_id
   where wm.workspace_id = p_workspace_id
     and public.is_workspace_member(p_workspace_id, (select auth.uid()));
$function$;

revoke all on function public.workspace_member_public_keys(uuid) from public;
grant execute on function public.workspace_member_public_keys(uuid) to authenticated;

-- Invite details retain plaintext email because invitations are metadata.
-- The legacy function returned workspace_name, so CREATE OR REPLACE cannot
-- change its row type.
drop function if exists public.get_invite_details(uuid);
create or replace function public.get_invite_details (p_token uuid)
returns table (workspace_id uuid, email text, role text)
language sql stable security definer set search_path to ''
as $function$
  select m.workspace_id, m.email, m.role
    from public.workspace_members m
   where m.invite_token = p_token and m.user_id is null
   limit 1;
$function$;

revoke all on function public.get_invite_details(uuid) from public;
grant execute on function public.get_invite_details(uuid) to anon, authenticated, service_role;

-- RLS and grants.
alter table public.content_keys enable row level security;
alter table public.user_content_keys enable row level security;
alter table public.user_content_key_wraps enable row level security;
alter table public.crypto_nonces enable row level security;
alter table public.user_keys enable row level security;
alter table public.user_devices enable row level security;
alter table public.workspace_keys enable row level security;

grant select, insert, update on public.content_keys to authenticated;
grant select, insert, update, delete on public.user_content_keys to authenticated;
grant select, insert, update, delete on public.user_content_key_wraps to authenticated;
grant select, insert, update, delete on public.user_keys to authenticated;
grant select, insert, update, delete on public.user_devices to authenticated;
grant select, insert, update, delete on public.workspace_keys to authenticated;
grant all on public.content_keys, public.user_content_keys, public.user_content_key_wraps,
  public.user_keys, public.user_devices, public.workspace_keys, public.crypto_nonces to service_role;

revoke all on public.crypto_nonces from anon, authenticated;

drop policy if exists "Content keys: members read" on public.content_keys;
create policy "Content keys: members read" on public.content_keys for select to authenticated
using (public.is_workspace_member(workspace_id, (select auth.uid())));

drop policy if exists "Content keys: admins insert" on public.content_keys;
create policy "Content keys: admins insert" on public.content_keys for insert to authenticated
with check (public.is_workspace_owner_or_admin(workspace_id, (select auth.uid())));

drop policy if exists "Content keys: admins update" on public.content_keys;
create policy "Content keys: admins update" on public.content_keys for update to authenticated
using (public.is_workspace_owner_or_admin(workspace_id, (select auth.uid())))
with check (public.is_workspace_owner_or_admin(workspace_id, (select auth.uid())));

drop policy if exists "User content keys: own read" on public.user_content_keys;
create policy "User content keys: own read" on public.user_content_keys for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "User content keys: own insert" on public.user_content_keys;
create policy "User content keys: own insert" on public.user_content_keys for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "User content keys: own update" on public.user_content_keys;
create policy "User content keys: own update" on public.user_content_keys for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "User content key wraps: own" on public.user_content_key_wraps;
create policy "User content key wraps: own" on public.user_content_key_wraps for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "User keys: own" on public.user_keys;
create policy "User keys: own" on public.user_keys for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "User devices: own" on public.user_devices;
create policy "User devices: own" on public.user_devices for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Workspace keys: members read" on public.workspace_keys;
create policy "Workspace keys: members read" on public.workspace_keys for select to authenticated
using (public.is_workspace_member(workspace_id, (select auth.uid())));

drop policy if exists "Workspace keys: members insert" on public.workspace_keys;
create policy "Workspace keys: own insert" on public.workspace_keys for insert to authenticated
with check (
  (select auth.uid()) = user_id
  or public.is_workspace_owner_or_admin(workspace_id, (select auth.uid()))
);

drop policy if exists "Workspace keys: own update" on public.workspace_keys;
create policy "Workspace keys: own update" on public.workspace_keys for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Workspace keys: own or admin delete" on public.workspace_keys;
create policy "Workspace keys: own or admin delete" on public.workspace_keys for delete to authenticated
using ((select auth.uid()) = user_id or public.is_workspace_owner_or_admin(workspace_id, (select auth.uid())));

-- Realtime for key distribution and rotation state.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspace_keys') then
    alter publication supabase_realtime add table public.workspace_keys;
  end if;
end $$;
