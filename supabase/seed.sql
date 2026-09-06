-- Local development account. Recreated on every `supabase db reset`.
-- Sign in at http://localhost:3000/auth with:
--   email:    dev@opencadre.local
--   password: dev-password-123

insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   confirmation_token, recovery_token, email_change_token_new, email_change,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   is_sso_user, is_anonymous)
values
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated',
   'dev@opencadre.local',
   crypt('dev-password-123', gen_salt('bf')),
   now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}',
   '{"display_name":"Dev User"}', now(), now(), false, false)
on conflict (id) do nothing;

-- Identity row required for email/password sign-in.
insert into auth.identities
  (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   jsonb_build_object('sub', '00000000-0000-0000-0000-000000000001',
                      'email', 'dev@opencadre.local',
                      'email_verified', true),
   'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;
