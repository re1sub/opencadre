<p align="center">
  <a href="https://opencadre.pages.dev">
    <img src="src/assets/img/brand/logo.svg" alt="OpenCadre logo" width="96" height="96">
  </a>
</p>

<h1 align="center" style="border-bottom: none">
  <a href="https://opencadre.pages.dev">OpenCadre</a><br />
  Write, plan, and organize it all in one workspace
</h1>

<p align="center">
  <strong>A flexible, real-time, collaborative, and AI-powered workspace built with SolidJS for organizing ideas, projects, and knowledge.</strong>
</p>

<p align="center">
  <a href="https://opencadre.pages.dev">Home</a> |
  <a href="https://dev.opencadre.pages.dev">Preview</a> |
  <a href="#features">Features</a> |
  <a href="#getting-started">Get started</a> |
  <a href="#documentation">Documentation</a> |
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="src/assets/img/home/hero-dark.png" alt="OpenCadre workspace preview" width="100%">
</p>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white"></a>
  <a href="package.json"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue"></a>
</p>

<br />

<p align="center">
  <em>Docs, boards, and tables are brought together in OpenCadre. Write it down, structure it, and share it in real time.</em>
</p>

## What is OpenCadre

OpenCadre lets you create pages that adapt to the way you work. Write documents in Markdown, manage projects with Kanban boards, and build your own systems from simple, composable blocks. Everything lives in a workspace you can share, and content is encrypted in your browser before it reaches Supabase.

## Features

**Docs that adapt to how you think**

- Markdown pages with collaborative editing (TipTap + Yjs), markdown preview, and inline AI assistance.
- Tags with colors, reusable across cards and pages.
- Comments on any page, with real-time updates through Supabase Realtime.

**Boards and tables for structured work**

- Kanban boards with drag-and-drop columns, card dialogs, assignees, due dates, and tags.
- Tables with editable headers, row actions, and CSV import/export.
- Workspaces to organize pages, with member invites and role-based access.

**AI assistance where you write**

- AI assistant powered by TanStack AI and OpenRouter, with per-page context and inline generation.

**Privacy that is built in**

- End-to-end encryption of page content, titles, comments, tags, workspace names and descriptions, card titles and descriptions, notifications, collaborative documents, and display names.
- Keys are created in the browser, and Supabase stores only ciphertext.
- RGPD compliance with privacy and terms pages, account deletion through an atomic edge function, and data retention cleanup.

## Getting started

```bash
git clone https://github.com/re1sub/opencadre && cd opencadre
pnpm install
pnpm supabase:start
pnpm dev
```

The app runs at http://localhost:3000. The first Supabase start pulls the Docker images. See [Full setup](#full-setup) for remote projects, environment variables, and edge function secrets.

## Documentation

| Document                                     | Description                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| [Requirements](docs/requirements.md)         | Personas, user stories, user journeys, functional and non-functional requirements |
| [Architecture](docs/architecture.md)         | Layered architecture, repository pattern, realtime, deployment topology, ADRs     |
| [API](docs/api.md)                           | Edge functions, RPC functions, realtime channels, env secrets                     |
| [Database](docs/database.md)                 | ER diagram, 29 tables, RLS matrix, triggers, retention                            |
| [Project tracking](docs/project-tracking.md) | Git workflow, commit conventions, changelog, roadmap                              |

## Tech stack

- SolidJS 1.9 + @solidjs/router 1.0
- Vite 8, TypeScript 7
- Supabase (auth, database, edge functions, realtime)
- TipTap + Yjs/Y-prosemirror (collaborative markdown editing)
- TanStack AI (@tanstack/ai-solid, OpenRouter provider)
- @dnd-kit/solid (drag-and-drop for kanban)
- @simple-table/solid (table views)
- vanilla-extract (typed CSS)
- Web Awesome web components + lucide icons
- marked (markdown preview), zod (validation), papaparse (CSV)
- solid-motionone (animations)
- Biome (lint + format), pnpm

## Security and encryption

**Keys are created in the browser.** On the first workspace visit, OpenCadre creates an ECDH identity key pair, registers the current device automatically, and shows a recovery code that you should save and acknowledge. Later visits on that browser unlock automatically. A new browser uses the recovery code or an approved device link. There is no enable setting and no passphrase prompt. The recovery code is the only manual secret.

**Trusted devices are managed in Settings > Security.** Other devices can be revoked there. The current device is never offered for revocation. On mobile, for example, you can forget a laptop but not the phone you are using. Sign out of other devices ends their app sessions without changing vault trust.

**Supabase stores ciphertext, not readable content.** It still sees metadata such as ids, timestamps, membership, roles, positions, and due dates. Other members' display names are not decryptable, so the UI shows their email or a short user id. Removing a member starts a full workspace key rotation and re-encryption. See [docs/api.md](docs/api.md#11-end-to-end-encryption) for the full key hierarchy and migration notes.

## Full setup

### Prerequisites

- **Node.js** >= 20
- **pnpm** (`corepack enable`, then `pnpm install -g pnpm`)
- **Docker** (required for local Supabase)
- **Supabase CLI** (included as a dev dependency, accessed via `npx supabase`)

### 1. Clone and install

```bash
git clone <repo-url> && cd opencadre
pnpm install
```

### 2. Create your Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Note the **Project URL** and **Publishable (anon) key** from the API settings.

### 3. Set up the database

Run the migrations to create all tables, functions, RLS policies, and triggers:

```bash
npx supabase db push
```

This applies the base schema plus the E2EE v3 follow-ups. The result is 29 tables, including key material tables (`content_keys`, `workspace_keys`, `user_keys`, `user_devices`, `crypto_nonces`, `key_rotations`, `device_link_requests`, `security_events`), plus RLS policies, encryption scope triggers, and the realtime publication. The E2EE migrations assume an empty database and do not copy legacy plaintext into the new schema. The full migration list is in [docs/database.md](docs/database.md).

### 4. Configure environment variables

Create `.env` for production or remote use:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

For local development, create `.env.development`:

```bash
cp .env.example .env.development
```

Edit `.env.development` with your local Supabase values (from `pnpm supabase:status`):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local-anon-key>
```

The dev server loads `.env.development` and `pnpm build` loads `.env`, so nothing needs to be swapped between environments.

### 5. Set edge function secrets

Deploy the edge functions and set required secrets:

```bash
npx supabase functions deploy

# Required for AI generation
npx supabase secrets set OPENROUTER_API_KEY=<your-openrouter-key>

# Platform-provided by Supabase; set only if you use a custom service role key
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Optional: for sending invite emails (skip if not needed)
npx supabase secrets set \
  SMTP_HOST=<smtp-host> \
  SMTP_PORT=<smtp-port> \
  SMTP_USER=<smtp-user> \
  SMTP_PASS=<smtp-password> \
  SMTP_FROM=<sender-email> \
  SMTP_FROM_NAME="OpenCadre"
```

#### Edge function secrets reference

| Secret                      | Function                                                               | Required | Notes                                                       |
| --------------------------- | ---------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| `OPENROUTER_API_KEY`        | ai-generate                                                            | Yes      | Get from [openrouter.ai](https://openrouter.ai)             |
| `SUPABASE_SERVICE_ROLE_KEY` | invite-member, delete-account, cleanup-retention, revoke-user-sessions | Yes      | Platform-provided; from Supabase project settings           |
| `SMTP_HOST`                 | invite-member                                                          | No       | If missing, invite emails are skipped (token still created) |
| `SMTP_PORT`                 | invite-member                                                          | No       |                                                             |
| `SMTP_USER`                 | invite-member                                                          | No       |                                                             |
| `SMTP_PASS`                 | invite-member                                                          | No       |                                                             |
| `SMTP_FROM`                 | invite-member                                                          | No       | Defaults to SMTP_USER                                       |
| `SMTP_FROM_NAME`            | invite-member                                                          | No       | Defaults to "OpenCadre"                                     |
| `CRON_SECRET`               | cleanup-retention                                                      | No       | Alternative auth for cron jobs (vs service role key)        |

### 6. Configure auth settings (dashboard)

In the Supabase dashboard, go to **Authentication > Providers** and configure:

- **Email**: Enable sign-ups, set redirect URLs to your app URL
- **OAuth** (optional): Add Google, GitHub, or other providers as needed
- **SMTP** (optional): Configure a real SMTP server for production email delivery

### 7. Start development

```bash
pnpm dev                # http://localhost:3000
```

For local Supabase (full stack):

```bash
pnpm supabase:start     # first run pulls Docker images
pnpm dev                # connects to local Supabase
```

#### Local Supabase endpoints

| Service         | URL                                                     |
| --------------- | ------------------------------------------------------- |
| API (REST/Auth) | http://127.0.0.1:54321                                  |
| Studio (GUI)    | http://127.0.0.1:54323                                  |
| Postgres        | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Mailpit (email) | http://127.0.0.1:54324                                  |

#### Local dev account

When running locally, a dev user is auto-created via `supabase/seed.sql`:

- **Email:** `dev@opencadre.local`
- **Password:** `dev-password-123`

A "Sign in with dev account" button appears on the auth page in development mode.

## Deployment

OpenCadre is hosted on **Cloudflare Pages**. Production deploys come from the `main` branch, and preview deploys come from the `dev` branch.

```mermaid
flowchart LR
    Dev[dev branch] --> Preview[Preview<br/>dev.opencadre.pages.dev]
    Main[main branch] --> Production[Production<br/>opencadre.pages.dev]
```

| Trigger        | Deployment | URL                             |
| -------------- | ---------- | ------------------------------- |
| Push to `main` | Production | https://opencadre.pages.dev     |
| Push to `dev`  | Preview    | https://dev.opencadre.pages.dev |

Deploy manually from the CLI:

```bash
pnpm deploy        # build + deploy dist/ to production (branch=main)
make deploy-dev    # build + deploy dist/ to preview (branch=dev)
```

## Desktop app build (Tauri)

### Android build (Arch Linux)

The Android build uses Gradle/AGP, which requires a compatible JDK. The bundled Android Studio JBR (Java 25+) is too new for Gradle 8.14.3.

1. **Install JDK 21:** `sudo pacman -S jdk21-openjdk`
2. **Build:**
   ```bash
   export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
   pnpm tauri android dev
   ```

### Icon management

Icons are generated from a single manifest at `src-tauri/icon-manifest.json` (kept out of `src-tauri/icons/`, which is the CLI's generated-output directory):

```bash
pnpm tauri icon src-tauri/icon-manifest.json
```

The manifest points at the brand sources in `src/assets/img/brand/`:

| Source             | Purpose                                                         |
| ------------------ | --------------------------------------------------------------- |
| `logo.svg`         | Default icon (desktop + iOS); `bg_color` is the iOS background. |
| `android-fg.svg`   | Android adaptive foreground (glyph only, padded for safe zone). |
| `android-bg.svg`   | Android adaptive background (solid brand color `#9097e2`).      |
| `android-mono.svg` | Android 13+ themed (monochrome) icon.                           |

Android adaptive padding comes from the `scale(...)` in the group transform of `android-fg.svg` (currently `0.75`) and `android-mono.svg`; tune it and re-run. `android_fg_scale` is deliberately unset: it only affects the legacy raster `ic_launcher.png`, not the adaptive icon.

## Scripts

| Command                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `pnpm dev`             | Start the Vite dev server (port 3000)         |
| `pnpm build`           | Production build                              |
| `pnpm serve`           | Preview the production build                  |
| `pnpm typecheck`       | TypeScript check (`tsc --noEmit`)             |
| `pnpm lint`            | Biome lint                                    |
| `pnpm lint:full`       | Biome check (lint + format)                   |
| `pnpm lint:fix`        | Biome check + autofix                         |
| `pnpm format`          | Biome format                                  |
| `pnpm test`            | Run tests (watch mode)                        |
| `pnpm test:run`        | Run tests (single run)                        |
| `pnpm test:e2e`        | Start local Supabase, then run Playwright     |
| `pnpm test:e2e:ui`     | Start local Supabase, then open Playwright UI |
| `pnpm check:staged`    | Lint staged files (via lint-staged)           |
| `pnpm deploy`          | Build + deploy to Cloudflare Pages            |
| `pnpm dev:supabase`    | Start local Supabase and the dev server       |
| `pnpm supabase:start`  | Start the local Supabase stack                |
| `pnpm supabase:stop`   | Stop the local Supabase stack                 |
| `pnpm supabase:status` | Show local Supabase status/keys               |

## Edge functions

| Function               | Auth      | Description                                                                                   |
| ---------------------- | --------- | --------------------------------------------------------------------------------------------- |
| `ai-generate`          | Yes (JWT) | AI content generation via TanStack AI / OpenRouter                                            |
| `invite-member`        | Yes (JWT) | Send workspace invite emails                                                                  |
| `delete-account`       | Yes (JWT) | Account deletion with ownership transfer when possible, anonymized comments, and data cleanup |
| `revoke-user-sessions` | Yes (JWT) | Revoke refresh sessions for account security responses                                        |
| `cleanup-retention`    | No (cron) | Purge expired activity, security, AI, and notification rows                                   |

## Database

Protected fields are stored only as `v3` ciphertext envelopes. Key tables:

| Table                                         | Purpose                                                       |
| --------------------------------------------- | ------------------------------------------------------------- |
| `workspaces`                                  | Top-level containers with an encrypted name and description   |
| `workspace_members`                           | Member roles (owner, admin, member, guest) with invite tokens |
| `pages`                                       | Workspace pages with an encrypted title                       |
| `page_content`                                | Versioned encrypted page body                                 |
| `cards`, `columns`                            | Kanban items with encrypted titles and card descriptions      |
| `card_tags`, `tags`                           | Workspaces tags with encrypted names                          |
| `comments`, `comment_threads`                 | Encrypted comments grouped by thread                          |
| `comment_reactions`                           | Emoji reactions on comments                                   |
| `notifications`                               | Encrypted notification title and body                         |
| `profiles`                                    | User profiles with an encrypted display name                  |
| `user_settings`                               | Per-user shortcuts and notification prefs                     |
| `ydocs`                                       | Encrypted Yjs document state for collaborative editing        |
| `activity_logs`                               | Workspace audit trail                                         |
| `ai_requests`                                 | AI generation request log                                     |
| `page_visits`                                 | Page view tracking                                            |
| `content_keys`, `workspace_keys`              | Workspace content keys and per-member wraps                   |
| `user_content_keys`, `user_content_key_wraps` | Per-user keys for private fields                              |
| `user_keys`, `user_devices`                   | Identity public key, recovery and device private-key wraps    |
| `crypto_nonces`                               | Reserved nonce registry for per-key uniqueness                |
| `device_link_requests`                        | Pending device-link approvals                                 |
| `recovery_attempts`                           | Recovery unlock failure counter and lockout                   |
| `key_rotations`                               | Workspace key rotation progress                               |
| `security_events`                             | Security audit log for recovery, devices, rotation, members   |

To regenerate TypeScript types after schema changes:

```bash
npx supabase gen types typescript --schema public > src/types/database.ts
```

## Project structure

```
src/
├── features/          # Feature-based modules
│   ├── ai/            # AI assistant popup + generation
│   ├── auth/          # Login, signup, RGPD consent
│   ├── comments/      # Page-level comments panel
│   ├── crypto/        # Vault, E2EE keys, device links, recovery, rotation
│   ├── home/          # Landing page (Hero, Features, Footer)
│   ├── kanban/        # Board columns, cards, drag-and-drop
│   ├── legal/         # Terms & conditions, privacy policy
│   ├── markdown/      # TipTap editor, toolbar, mention popup
│   ├── table/         # Editable table views
│   ├── tags/          # Tag editor, picker, color swatches
│   ├── ui/            # Shared UI primitives
│   └── workspace/     # Workspace settings, page list, member invite
├── theme/             # Light/dark ThemeProvider
├── styles/            # Global + font styles (vanilla-extract)
├── utils/             # Supabase client
└── webawesome.imports.ts  # Web Awesome component + icon registration

supabase/
├── functions/         # Edge functions (ai-generate, delete-account, ...)
├── migrations/        # SQL migrations
└── seed.sql           # Local dev seed data
```

## Contributing

**Run the full suite before opening a pull request.**

```bash
pnpm format           # Biome format
pnpm lint             # Biome lint
pnpm lint:full        # Biome check
pnpm typecheck        # TypeScript check
pnpm test:run         # Vitest single run
pnpm build            # Production build
pnpm test:e2e         # Local Supabase + Playwright
```

All commands should pass with no errors. Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. Details are in [docs/project-tracking.md](docs/project-tracking.md).

**The pre-push hook runs the same checks locally.** `.husky/pre-push` runs `pnpm lint:full && pnpm test:run && pnpm typecheck && pnpm build && pnpm test:e2e`. The E2E script starts local Supabase automatically before Playwright. GitHub Actions (`.github/workflows/ci.yml`) also runs lint, typecheck, unit tests, build, and E2E tests. If you have `act` installed, you can run the E2E job locally with `act -j e2e --pull=false`, where `--pull=false` reuses the cached runner image.

## License

MIT, as declared in `package.json`.
