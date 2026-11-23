-- Local development accounts. Recreated on every `supabase db reset`.
-- Sign in at http://localhost:3000/auth with password `dev-password-123`:
--   dev@opencadre.local         (Chromium E2E project)
--   dev-firefox@opencadre.local (Firefox E2E project)
--   dev-webkit@opencadre.local  (WebKit E2E project)
--   dev-link@opencadre.local    (cross-browser device-link E2E test)
-- Each E2E browser project gets its own user so first-time vault onboarding
-- is exercised independently instead of hitting a device-link approval gate.
-- Additional e2e-NNN accounts back the per-test stateful journeys. The pool
-- includes a separate account for every browser project and retry attempt so a
-- retried test never inherits an already-onboarded vault or trusted device.

insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   confirmation_token, recovery_token, email_change_token_new, email_change,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   is_sso_user, is_anonymous)
select
  '00000000-0000-0000-0000-000000000000',
  u.id, 'authenticated', 'authenticated', u.email,
  crypt('dev-password-123', gen_salt('bf')),
  now(), '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('display_name', u.display_name),
  now(), now(), false, false
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'dev@opencadre.local',         'Dev User'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'dev-firefox@opencadre.local', 'Firefox E2E'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'dev-webkit@opencadre.local',  'WebKit E2E'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'dev-link@opencadre.local',    'Device Link E2E')
) as u(id, email, display_name)
on conflict (id) do nothing;

-- Identity rows required for email/password sign-in.
insert into auth.identities
  (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'dev@opencadre.local'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'dev-firefox@opencadre.local'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'dev-webkit@opencadre.local'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'dev-link@opencadre.local')
) as u(id, email)
on conflict (provider_id, provider) do nothing;

-- Per-test E2E users. Each stateful test uses a distinct account so its vault,
-- device trust, and workspace state cannot collide with another test or with
-- the same test running in a different browser project.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   confirmation_token, recovery_token, email_change_token_new, email_change,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   is_sso_user, is_anonymous)
select
  '00000000-0000-0000-0000-000000000000',
  ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'authenticated', 'authenticated',
  'e2e-' || lpad(n::text, 3, '0') || '@opencadre.local',
  crypt('dev-password-123', gen_salt('bf')),
  now(), '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('display_name', 'E2E User ' || n),
  now(), now(), false, false
from generate_series(5, 200) as n
on conflict (id) do nothing;

insert into auth.identities
  (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like 'e2e-%@opencadre.local'
on conflict (provider_id, provider) do nothing;
