-- Delete account: transfer owned workspaces to another member when possible,
-- anonymize comments instead of deleting them, scrub assignee_ids, and clean
-- personal data. Workspaces with no remaining members are cascaded away by
-- workspaces.owner_id -> auth.users ON DELETE CASCADE.

create or replace function public.delete_user_account (p_user_id uuid)
returns void language plpgsql security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_old_role text;
begin
  -- Transfer ownership of workspaces this user owns to a successor.
  with owned as (
    select w.id as workspace_id
      from public.workspaces w
     where w.owner_id = p_user_id
  ),
  candidates as (
    select
      o.workspace_id,
      wm.user_id,
      case wm.role
        when 'owner' then 1
        when 'admin' then 2
        when 'member' then 3
        when 'guest' then 4
        else 5
      end as role_rank,
      wm.created_at
      from owned o
      join public.workspace_members wm
        on wm.workspace_id = o.workspace_id
       and wm.user_id is not null
       and wm.user_id <> p_user_id
  ),
  picked as (
    select distinct on (workspace_id)
      workspace_id,
      user_id
      from candidates
     order by workspace_id, role_rank, created_at
  )
  update public.workspaces w
     set owner_id = p.user_id,
         updated_at = now()
    from picked p
   where w.id = p.workspace_id;

  -- For workspaces where the deleted user was owner and we transferred ownership,
  -- ensure the new owner's membership role is 'owner'.
  update public.workspace_members wm
     set role = 'owner'
    from public.workspaces w
   where wm.workspace_id = w.id
     and wm.user_id = w.owner_id
     and wm.role <> 'owner';

  -- Scrub assignee lists across all workspaces (non-FK UUID array).
  update public.cards c
     set assignee_ids = coalesce(array_remove(c.assignee_ids, p_user_id), '{}'::uuid[])
   where c.assignee_ids @> array[p_user_id]::uuid[];

  -- Unset page owner.
  update public.pages set owner_id = null where owner_id = p_user_id;

  -- Anonymize comments: keep them, detach author (author_id will be null after FK change).
  delete from public.comment_reactions where user_id = p_user_id;

  -- Remove personal notifications.
  delete from public.notifications where user_id = p_user_id or actor_id = p_user_id;

  delete from public.ai_requests where user_id = p_user_id;
  delete from public.activity_logs where user_id = p_user_id;
  delete from public.user_settings where user_id = p_user_id;

  -- Workspace nonce reservations are shared with other members and must survive.
  delete from public.crypto_nonces n
   where n.key_scope = 'user'
     and n.key_id in (select id from public.user_content_keys where user_id = p_user_id);
  delete from public.user_content_key_wraps where user_id = p_user_id;
  delete from public.user_content_keys where user_id = p_user_id;
  delete from public.workspace_keys where user_id = p_user_id;

  -- Link requests point at user_devices with NO ACTION; remove them first.
  delete from public.device_link_requests
   where user_id = p_user_id
      or target_device_id in (select id from public.user_devices where user_id = p_user_id)
      or approved_by_device_id in (select id from public.user_devices where user_id = p_user_id);
  delete from public.user_devices where user_id = p_user_id;
  delete from public.user_keys where user_id = p_user_id;

  -- Finally remove memberships (triggers rotation flag for affected workspaces).
  delete from public.workspace_members where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;

  -- Delete auth user; workspaces owned with no members will cascade-delete.
  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'user not found' using errcode = 'P0001';
  end if;
end;
$function$;

revoke all on function public.delete_user_account(uuid) from public;
grant execute on function public.delete_user_account(uuid) to service_role;

-- Allow anonymizing comments when author is deleted.
alter table public.comments
  alter column author_id drop not null;

-- Replace FK to set null on user deletion.
alter table public.comments
  drop constraint if exists comments_author_id_fkey;

alter table public.comments
  add constraint comments_author_id_fkey
  foreign key (author_id) references auth.users(id) on delete set null;

-- Update comment delete policies: allow author to delete their own, and owners/admins to delete any.
-- Drop existing policies if they exist, then recreate.
drop policy if exists "Comments: author delete" on public.comments;
drop policy if exists "Comments: owner/admin delete" on public.comments;

create policy "Comments: author delete" on public.comments
  for delete
  to authenticated
  using (auth.uid() = author_id);

create policy "Comments: owner/admin delete" on public.comments
  for delete
  to authenticated
  using (public.is_workspace_owner_or_admin(COALESCE(( SELECT p.workspace_id
   FROM (public.comment_threads ct
     JOIN public.pages p ON ((p.id = ct.entity_id)))
  WHERE ((ct.id = comments.thread_id) AND (ct.entity_type = 'page'::text))), ( SELECT p.workspace_id
   FROM ((public.comment_threads ct
     JOIN public.cards c ON ((c.id = ct.entity_id)))
     JOIN public.pages p ON ((p.id = c.page_id)))
  WHERE ((ct.id = comments.thread_id) AND (ct.entity_type = 'card'::text)))), auth.uid()));
