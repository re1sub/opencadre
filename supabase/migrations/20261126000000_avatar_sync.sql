-- Keep public.profiles.avatar_url in sync with the provider avatar stored in
-- auth.users.raw_user_meta_data. The client reads profiles.avatar_url so co-workers
-- see the same avatar without depending on Supabase Storage.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to '' as $fn$
begin
  insert into public.profiles (id, avatar_url)
  values (new.id, nullif(new.raw_user_meta_data ->> 'avatar_url', ''))
  on conflict (id) do update
    set avatar_url = excluded.avatar_url,
        updated_at = now()
    where public.profiles.avatar_url is distinct from excluded.avatar_url;
  return new;
end;
$fn$;

create or replace function public.sync_profile_avatar()
returns trigger
language plpgsql
security definer
set search_path to '' as $fn$
begin
  if new.raw_user_meta_data is distinct from old.raw_user_meta_data then
    update public.profiles
       set avatar_url = nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
           updated_at = now()
     where id = new.id
       and avatar_url is distinct from nullif(new.raw_user_meta_data ->> 'avatar_url', '');
  end if;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_avatar_updated on auth.users;
create trigger on_auth_user_avatar_updated
  after update on auth.users
  for each row
  execute function public.sync_profile_avatar();

update public.profiles p
   set avatar_url = nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
       updated_at = now()
  from auth.users u
 where p.id = u.id
   and p.avatar_url is distinct from nullif(u.raw_user_meta_data ->> 'avatar_url', '');
