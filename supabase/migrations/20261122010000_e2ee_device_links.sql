-- Device linking and recovery rate limiting.

create table if not exists public.device_link_requests (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,
  status                text        not null
    check (status in ('pending','approved','rejected','consumed','expired')),
  device_label          text        not null,
  one_time_public_key   text,
  wrapped_private_key   jsonb,
  consumed_wrapped_key  jsonb,
  created_at            timestamptz default now() not null,
  expires_at            timestamptz not null,
  approved_by_device_id uuid        references public.user_devices(id),
  responded_at          timestamptz,
  consumed_at           timestamptz
);

create index if not exists device_link_requests_user_status_idx
  on public.device_link_requests (user_id, status, expires_at);

create table if not exists public.recovery_attempts (
  user_id      uuid        primary key references auth.users(id) on delete cascade,
  failed_count integer     not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz default now() not null
);

alter table public.device_link_requests enable row level security;
alter table public.recovery_attempts enable row level security;

grant select, insert on public.device_link_requests to authenticated;
grant all on public.device_link_requests, public.recovery_attempts to service_role;
revoke all on public.recovery_attempts from anon, authenticated;

drop policy if exists "Device links: own read" on public.device_link_requests;
create policy "Device links: own read" on public.device_link_requests for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Device links: own insert" on public.device_link_requests;
create policy "Device links: own insert" on public.device_link_requests for insert to authenticated
with check ((select auth.uid()) = user_id);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'device_link_requests') then
    alter publication supabase_realtime add table public.device_link_requests;
  end if;
end $$;

create or replace function public.create_device_link_request(
  p_device_label text,
  p_one_time_public_key text
) returns uuid
language plpgsql security definer set search_path to '' as $fn$
declare v_id uuid; v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  insert into public.device_link_requests (id, user_id, status, device_label, one_time_public_key, expires_at)
  values (gen_random_uuid(), v_user, 'pending', p_device_label, p_one_time_public_key, now() + interval '10 minutes')
  returning id into v_id;
  return v_id;
end;
$fn$;

create or replace function public.approve_device_link(
  p_request_id uuid,
  p_wrapped_private_key jsonb,
  p_approving_device_id uuid
) returns void
language plpgsql security definer set search_path to '' as $fn$
declare v_user uuid := (select auth.uid()); v_ok boolean;
begin
  select exists (
    select 1 from public.user_devices d
     where d.id = p_approving_device_id and d.user_id = v_user
       and d.status = 'active' and d.last_used_at > now() - interval '30 minutes'
  ) into v_ok;
  if not v_ok then raise exception 'approving device is not active'; end if;

  update public.device_link_requests
     set status = 'approved',
         wrapped_private_key = p_wrapped_private_key,
         approved_by_device_id = p_approving_device_id,
         responded_at = now()
   where id = p_request_id and user_id = v_user and status = 'pending'
     and expires_at > now();
  if not found then raise exception 'link request is not pending'; end if;
end;
$fn$;

create or replace function public.reject_device_link(p_request_id uuid)
returns void language plpgsql security definer set search_path to '' as $fn$
declare v_user uuid := (select auth.uid());
begin
  update public.device_link_requests
     set status = 'rejected', responded_at = now()
   where id = p_request_id and user_id = v_user and status = 'pending' and expires_at > now();
  if not found then raise exception 'link request is not pending'; end if;
end;
$fn$;

create or replace function public.consume_device_link(
  p_request_id uuid,
  p_device_id uuid,
  p_wrapped_private_key jsonb,
  p_device_label text
) returns void
language plpgsql security definer set search_path to '' as $fn$
declare v_user uuid := (select auth.uid()); v_version integer;
begin
  select key_version into v_version from public.user_keys where user_id = v_user;
  if v_version is null then raise exception 'identity not configured'; end if;

  -- Bind the device-wrapped key to the approved request row before creating the device.
  update public.device_link_requests
     set status = 'consumed', consumed_at = now(), one_time_public_key = null,
         consumed_wrapped_key = p_wrapped_private_key
   where id = p_request_id and user_id = v_user and status = 'approved'
     and expires_at > now() and consumed_at is null;
  if not found then raise exception 'link request is not approved'; end if;

  insert into public.user_devices (id, user_id, wrapped_private_key, identity_key_version, device_label, status, last_used_at)
  select p_device_id, v_user, consumed_wrapped_key, v_version, p_device_label, 'active', now()
    from public.device_link_requests where id = p_request_id;
end;
$fn$;

create or replace function public.record_recovery_attempt(p_success boolean)
returns jsonb
language plpgsql security definer set search_path to '' as $fn$
declare
  v_user uuid := (select auth.uid());
  r public.recovery_attempts%rowtype;
  v_locked timestamptz;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  insert into public.recovery_attempts (user_id) values (v_user)
  on conflict (user_id) do nothing;

  select locked_until into v_locked from public.recovery_attempts where user_id = v_user;
  if v_locked is not null and v_locked > now() then
    raise exception 'recovery unlock temporarily locked';
  end if;

  if p_success then
    update public.recovery_attempts
       set failed_count = 0, locked_until = null, updated_at = now()
     where user_id = v_user;
  else
    update public.recovery_attempts
       set failed_count = failed_count + 1,
           locked_until = case
             when failed_count + 1 >= 10 then now() + interval '1 hour'
             when failed_count + 1 >= 5 then now() + interval '15 minutes'
             else locked_until
           end,
           updated_at = now()
     where user_id = v_user;
  end if;

  select * into r from public.recovery_attempts where user_id = v_user;
  return jsonb_build_object('failed_count', r.failed_count, 'locked_until', r.locked_until);
end;
$fn$;

create or replace function public.check_recovery_lock()
returns timestamptz
language sql stable security definer set search_path to ''
as $fn$
  select locked_until from public.recovery_attempts where user_id = (select auth.uid());
$fn$;

revoke all on function public.create_device_link_request(text,text) from public;
revoke all on function public.approve_device_link(uuid,jsonb,uuid) from public;
revoke all on function public.reject_device_link(uuid) from public;
revoke all on function public.consume_device_link(uuid,uuid,jsonb,text) from public;
revoke all on function public.record_recovery_attempt(boolean) from public;
revoke all on function public.check_recovery_lock() from public;

grant execute on function public.create_device_link_request(text,text) to authenticated;
grant execute on function public.approve_device_link(uuid,jsonb,uuid) to authenticated;
grant execute on function public.reject_device_link(uuid) to authenticated;
grant execute on function public.consume_device_link(uuid,uuid,jsonb,text) to authenticated;
grant execute on function public.record_recovery_attempt(boolean) to authenticated;
grant execute on function public.check_recovery_lock() to authenticated;

create or replace function public.reserve_nonces(
  p_key_scope text,
  p_key_id uuid,
  p_ivs text[]
) returns integer
language plpgsql security definer set search_path to '' as $fn$
declare v_user uuid := (select auth.uid()); v_ok boolean := false; v_inserted integer := 0;
begin
  if coalesce(array_length(p_ivs, 1), 0) < 1 or array_length(p_ivs, 1) > 64 then
    raise exception 'invalid nonce batch size';
  end if;

  if p_key_scope = 'user' then
    select exists (select 1 from public.user_content_keys k where k.id = p_key_id and k.user_id = v_user) into v_ok;
  else
    select exists (
      select 1 from public.content_keys k
       where k.id = p_key_id and public.is_workspace_member(k.workspace_id, v_user)
    ) into v_ok;
  end if;

  if not v_ok then raise exception 'nonce key is not available to user'; end if;

  insert into public.crypto_nonces (key_scope, key_id, iv)
  select p_key_scope, p_key_id, iv from unnest(p_ivs) as iv
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$fn$;

revoke all on function public.reserve_nonces(text,uuid,text[]) from public;
grant execute on function public.reserve_nonces(text,uuid,text[]) to authenticated;
