-- Device link approval requires the approving device to have been used in the
-- last 30 minutes. Devices enrolled before last_used_at was populated need a
-- one-time backfill, and a missing value should fall back to enrollment time.

update public.user_devices
   set last_used_at = now()
 where last_used_at is null;

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
     and expires_at > now();
  if not found then raise exception 'link request is not pending'; end if;
end;
$fn$;
