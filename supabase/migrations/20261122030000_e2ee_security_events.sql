-- Security events and retention policies.

create table if not exists public.security_events (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references auth.users(id) on delete set null,
  workspace_id uuid        references public.workspaces(id) on delete cascade,
  type         text        not null,
  metadata     jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists security_events_user_created_idx
  on public.security_events (user_id, created_at desc);
create index if not exists security_events_workspace_created_idx
  on public.security_events (workspace_id, created_at desc);
create index if not exists security_events_created_at_idx
  on public.security_events (created_at);
create index if not exists activity_logs_created_at_retention_idx
  on public.activity_logs (created_at);
create index if not exists ai_requests_created_at_retention_idx
  on public.ai_requests (created_at);
create index if not exists notifications_created_at_retention_idx
  on public.notifications (created_at);

alter table public.security_events enable row level security;
grant insert on public.security_events to authenticated;
grant select on public.security_events to authenticated;
grant all on public.security_events to service_role;

drop policy if exists "Security events: own read" on public.security_events;
create policy "Security events: own read" on public.security_events for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Security events: workspace admins read" on public.security_events;
create policy "Security events: workspace admins read" on public.security_events for select to authenticated
using (
  workspace_id is not null
  and public.is_workspace_owner_or_admin(workspace_id, (select auth.uid()))
);

create or replace function public.log_security_event(
  p_type text,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path to '' as $fn$
declare
  v_user uuid := (select auth.uid());
  v_allowed text[] := array[
    'recovery.unlock_failed',
    'device_link.created',
    'device_link.approved',
    'device_link.rejected',
    'device_link.consumed',
    'rotation.started',
    'rotation.completed',
    'rotation.failed',
    'member.removed'
  ];
  v_keys text[] := array['error_code','device_label','workspace_id','rotation_id','request_id'];
  v_key text;
  v_clean jsonb := '{}'::jsonb;
  v_workspace uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if not (p_type = any(v_allowed)) then raise exception 'security event type not allowed'; end if;

  for v_key in select key from jsonb_object_keys(p_metadata) as key
  loop
    if v_key = any(v_keys)
       and jsonb_typeof(p_metadata->v_key) = 'string'
       and length(p_metadata->>v_key) <= 200 then
      v_clean := v_clean || jsonb_build_object(
         v_key,
         regexp_replace(p_metadata->>v_key, '[[:cntrl:]]', '', 'g')
       );
    end if;
  end loop;

  if v_clean ? 'workspace_id'
     and (v_clean->>'workspace_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
     and public.is_workspace_member((v_clean->>'workspace_id')::uuid, v_user) then
    v_workspace := (v_clean->>'workspace_id')::uuid;
  end if;

  insert into public.security_events (user_id, workspace_id, type, metadata)
  values (v_user, v_workspace, p_type, v_clean - 'workspace_id');
end;
$fn$;

revoke all on function public.log_security_event(text, jsonb) from public;
grant execute on function public.log_security_event(text, jsonb) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'security_events') then
    alter publication supabase_realtime add table public.security_events;
  end if;
end $$;

create or replace function public.delete_user_sessions(p_user_id uuid)
returns integer
language plpgsql security definer set search_path to '' as $fn$
declare v_deleted integer;
begin
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$fn$;

revoke all on function public.delete_user_sessions(uuid) from public;
grant execute on function public.delete_user_sessions(uuid) to service_role;
