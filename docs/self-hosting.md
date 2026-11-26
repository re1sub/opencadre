# Self-hosting OpenCadre

The self-hosted stack runs entirely in Docker. Docker Engine with the Compose
plugin is the only host requirement. There is no host Node.js, pnpm, Supabase
CLI, OpenSSL, or jq step.

Everything is configured from the root `.env` file. `docker compose run --rm
setup` creates it from `.env.example`, fills every missing secret with a fresh
random value, adds any template settings that your `.env` lacks, and writes a
public-only `docker/app/build.env` for the app build. It never overwrites
values you already set.

## Start

```bash
docker compose run --rm setup
docker compose up --build --attach status
```

The second command attaches only to the one-shot `status` service, so the final
summary is easy to spot. Compose exits when `status` finishes while the rest of
the stack keeps running. The default progress view shows compact bars for image
pulls and builds. If your user is not in the `docker` group, prefix these
commands with `sudo`.

Open the app at `http://localhost:3000`. API endpoints are served by the
gateway at `http://localhost:8000`; browser requests from the app include the
public API key automatically. The optional Studio dashboard is described below.

The first `up --build` applies all SQL migrations automatically through the
one-shot `migrate` service. The `status` service waits for migrations and all
health checks, so the command returns only after edge functions are ready.
Subsequent starts skip migrations that are already recorded.

## The single `.env` file

All names and default values live in `.env.example`. After setup, edit only
`.env`. Common changes:

- `SUPABASE_PUBLIC_URL`: browser-visible Supabase gateway URL.
- `SITE_URL`: browser origin, used for OAuth and email redirects.
- `API_EXTERNAL_URL`: external Auth URL. Keep the `/auth/v1` suffix.
- `APP_PORT`, `API_GW_HTTP_PORT`, `STUDIO_PORT`: host ports.
- `VITE_ENABLE_*`: optional browser features. They default to hosted behavior
  when absent and are set to `false` in the template.
- `GOOGLE_ENABLED`, `GOOGLE_CLIENT_ID`, `GOOGLE_SECRET`: Google sign-in.
- `SMTP_*`: outgoing mail for confirmations and member invites.
- `OPENROUTER_API_KEY`: required only when `VITE_ENABLE_AI=true`.

Vite replaces frontend environment values at build time. `setup` derives
`docker/app/build.env` from the public values in `.env`, and the app build
copies only that generated file. The root `.env` is excluded from the build
context, so secrets are not stored in any image layer. After changing
`SUPABASE_PUBLIC_URL`, `SUPABASE_PUBLISHABLE_KEY`, or any `VITE_ENABLE_*` flag,
run setup again and rebuild the app:

```bash
docker compose run --rm setup
docker compose up --build --attach status
```

Secrets such as `SUPABASE_SECRET_KEY`, `JWT_SECRET`, `POSTGRES_PASSWORD`, and
SMTP credentials are never placed in the browser bundle or in an image layer.

`POSTGRES_PASSWORD` starts as `CHANGE_ME` in `.env.example`. `setup` replaces it
with a random 32-character hex value when it is missing, empty, or still starts
with `CHANGE_ME`. Compose uses `${POSTGRES_PASSWORD:-}`, so it would be empty if
absent, but the normal setup flow always fills it.

That value is used for the Postgres superuser and for the Supabase roles,
including `authenticator`. Role passwords are applied by init scripts only when
`docker/supabase/db/data` is empty. If you change `POSTGRES_PASSWORD` after the
database has been initialized, stop the stack and remove
`docker/supabase/db/data` so the init scripts run again.

## Converting a hosted `.env`

`.env.example` already uses local URLs. If your `.env` came from a hosted
Supabase project, replace the URL values with the local defaults:

```env
SUPABASE_PUBLIC_URL=http://localhost:8000
API_EXTERNAL_URL=http://localhost:8000/auth/v1
SITE_URL=http://localhost:3000
```

Then rebuild so Vite bakes the new values into the app:

```bash
docker compose up --build --attach status
```

Setup fills missing secrets and adds missing template keys, but it will not
change a hosted URL you already set. Inline shell environment variables affect
Compose, but not the Vite build, so edit `.env` instead. If the Supabase keys
also came from that hosted project, clear them and rerun
`docker compose run --rm setup` before rebuilding.

## Optional profiles

Studio:

```bash
docker compose --profile studio up -d
```

It is published on `STUDIO_PORT` and is not required for the app or API. With
the profile enabled, the dashboard is also reachable through the API gateway at
`http://localhost:8000` using `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD` from
`.env`.

HTTPS and a single public domain:

```bash
# Set PROXY_DOMAIN, SUPABASE_PUBLIC_URL=https://<domain>, and
# SITE_URL=https://<domain> in .env first, then rebuild.
docker compose --profile proxy up --build -d
```

The proxy route sends Supabase API paths to the gateway and everything else
to the app. DNS must point at the host and ports 80 and 443 must be reachable.

## Google sign-in

1. Create a Google OAuth client with an authorized redirect URI of
   `${API_EXTERNAL_URL}/callback`, for example
   `http://localhost:8000/auth/v1/callback`.
2. Set `GOOGLE_ENABLED=true`, `GOOGLE_CLIENT_ID`, and `GOOGLE_SECRET` in `.env`.
3. Set `VITE_ENABLE_GOOGLE_SIGNIN=true`.
4. Rebuild the app and restart Auth:

```bash
docker compose up --build --attach status
docker compose restart auth
```

## Email delivery

No SMTP server is configured by default, so `ENABLE_EMAIL_AUTOCONFIRM=true` in
the template and new accounts are usable immediately. To require email
confirmation, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_FROM`, and `SMTP_SENDER_NAME` in `.env`, set
`ENABLE_EMAIL_AUTOCONFIRM=false`, then restart `auth` and `functions`. Invite
links are still created when mail is unavailable, but they are not delivered.

## Feature flags

| Variable | Default when absent | Template value |
| --- | --- | --- |
| `VITE_ENABLE_GOOGLE_SIGNIN` | `true` | `false` |
| `VITE_ENABLE_AI` | `true` | `false` |
| `VITE_ENABLE_MEMBER_INVITES` | `true` | `false` |
| `VITE_ENABLE_LEGAL_PAGES` | `true` | `false` |
| `VITE_ENABLE_GITHUB_RELEASE_CHECK` | `true` | `false` |
| `VITE_ENABLE_CDN_ICONS` | `true` | `false` |

When `VITE_ENABLE_CDN_ICONS=false`, Lucide SVGs are bundled locally from
`lucide-static`, so the app makes no icon CDN requests.

## Troubleshooting

If `db` stays unhealthy, read `docker compose logs db` before resetting
anything. Two common causes on desktop virtualization are:

- Disk space. Postgres initialization writes to `docker/supabase/db/data` on
  the Docker host, not just to the project directory. Check `df -h` and
  `docker system df`, then reclaim build cache with `docker builder prune -af`
  if free space is low.
- Unreadable SQL bind mounts. Files copied out of a VirtualBox shared folder can
  keep group `vboxsf` and mode `770`. The container runs as `postgres`, so
  `psql` reports `Permission denied` on a script such as `98-webhooks.sql`.
  Init then aborts before role passwords are set. Fix with
  `sudo chown -R "$USER":"$USER" .` and `sudo chmod -R a+rX .` in the project,
  then remove `docker/supabase/db/data` and start again.

## Data and backups

Postgres data is in `docker/supabase/db/data`, the migration log is stored in
`public.opencadre_migrations`, and Deno's module cache is a named volume. Take
backups of the Postgres volume and `.env` together. `.env` contains the keys
needed to sign and verify tokens.

Retention is handled inside Postgres by `public.cleanup_expired_data()`, which
`pg_cron` runs daily at 03:00 UTC. There is no `CRON_SECRET` and no Supabase
Storage dependency. Profile avatars are stored in `public.profiles.avatar_url`
and synced from `auth.users.raw_user_meta_data`.

## Stop and reset

```bash
docker compose down
```

To delete all local data, remove `docker/supabase/db/data` after stopping the
stack. Then run `docker compose run --rm setup` again if you also want fresh
secrets.
