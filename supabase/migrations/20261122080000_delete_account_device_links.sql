-- Device-link requests reference user_devices with ON DELETE NO ACTION. They
-- must be removed before the devices themselves, otherwise account deletion
-- fails with a 23503 foreign key violation.
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
  -- Link requests point at user_devices with NO ACTION; remove them first.
  delete from public.device_link_requests
   where user_id = p_user_id
      or target_device_id in (select id from public.user_devices where user_id = p_user_id)
      or approved_by_device_id in (select id from public.user_devices where user_id = p_user_id);
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
