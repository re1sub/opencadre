-- Device-link requests can be aimed at one enrolled device. The approving
-- device must then be that device (legacy rows with no target stay broadcast).

alter table public.device_link_requests
  add column if not exists target_device_id uuid references public.user_devices(id);

drop function if exists public.create_device_link_request(text, text);

create or replace function public.create_device_link_request(
  p_device_label text,
  p_one_time_public_key text,
  p_target_device_id uuid default null
) returns uuid
language plpgsql security definer set search_path to '' as $fn$
declare v_id uuid; v_user uuid := (select auth.uid()); v_ok boolean := true;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_target_device_id is not null then
    select exists (
      select 1 from public.user_devices d
       where d.id = p_target_device_id and d.user_id = v_user
         and d.status = 'active'
    ) into v_ok;
    if not v_ok then raise exception 'target device is not available'; end if;
  end if;

  insert into public.device_link_requests
    (id, user_id, status, device_label, one_time_public_key, target_device_id, expires_at)
  values
    (gen_random_uuid(), v_user, 'pending', p_device_label, p_one_time_public_key,
     p_target_device_id, now() + interval '10 minutes')
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
       and d.status = 'active'
       and coalesce(d.last_used_at, d.created_at) > now() - interval '30 minutes'
  ) into v_ok;
  if not v_ok then raise exception 'approving device is not active'; end if;

  update public.device_link_requests
     set status = 'approved',
         wrapped_private_key = p_wrapped_private_key,
         approved_by_device_id = p_approving_device_id,
         responded_at = now()
   where id = p_request_id and user_id = v_user and status = 'pending'
     and expires_at > now()
     and (target_device_id is null or target_device_id = p_approving_device_id);
  if not found then raise exception 'link request is not pending for this device'; end if;
end;
$fn$;

revoke all on function public.create_device_link_request(text,text,uuid) from public;
grant execute on function public.create_device_link_request(text,text,uuid) to authenticated;
