# OpenCadre

Boards, notes, and tasks. Organized.

A flexible, real-time, collaborative, and AI-powered workspace built with SolidJS for organizing ideas, projects, and knowledge.

OpenCadre lets you create pages that adapt to the way you work. Write documents in Markdown, manage projects with Kanban boards, and build your own systems using simple, composable blocks.

## Tech Stack

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

## Features

- **Markdown pages** with collaborative editing (TipTap + Yjs), markdown preview, and inline AI assistance.
- **Kanban boards** with drag-and-drop columns, card dialogs, assignees, due dates, and tags.
- **Tables** with editable headers, row actions, and CSV import/export.
- **AI assistant** powered by TanStack AI and OpenRouter, with per-page context and inline generation.
- **Comments** on any page, with real-time updates via Supabase Realtime.
- **Tags** with colors, reusable across cards and pages.
- **Workspaces** to organize pages, with member invites and role-based access.
- **RGPD compliance** with privacy/terms pages, account deletion (atomic edge function), and data retention cleanup.

## Prerequisites

- **Node.js** >= 20
- **pnpm** (corepack enable, then `pnpm install -g pnpm`)
- **Docker** (required for local Supabase)
- **Supabase CLI** (included as a dev dependency, accessed via `npx supabase`)

## Setup

### 1. Clone and install

```bash
git clone <repo-url> && cd opencadre
pnpm install
```

### 2. Create your Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Note the **Project URL** and **Publishable (anon) key** from the API settings.

### 3. Set up the database

Run the migration to create all tables, functions, RLS policies, and triggers:

```bash
npx supabase db push
```

This applies `supabase/migrations/20260910132550_remote_schema.sql` which creates:

- 18 tables (workspaces, pages, cards, columns, comments, notifications, etc.)
- 13 database functions (RPCs for invites, account deletion, role checks, etc.)
- 50+ RLS policies for row-level security
- 9 triggers (updated_at, comment notifications, page version bumping)
- 1 event trigger (auto-enable RLS on new tables)
- Realtime publication for live updates

### 4. Configure environment variables

Create `.env` for production/remote:

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

# Required for account deletion, invite emails, and retention cleanup
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

| Secret | Function | Required | Notes |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | ai-generate | Yes | Get from [openrouter.ai](https://openrouter.ai) |
| `SUPABASE_SERVICE_ROLE_KEY` | invite-member, delete-account, cleanup-retention | Yes | From Supabase project settings |
| `SMTP_HOST` | invite-member | No | If missing, invite emails are skipped (token still created) |
| `SMTP_PORT` | invite-member | No | |
| `SMTP_USER` | invite-member | No | |
| `SMTP_PASS` | invite-member | No | |
| `SMTP_FROM` | invite-member | No | Defaults to SMTP_USER |
| `SMTP_FROM_NAME` | invite-member | No | Defaults to "OpenCadre" |
| `CRON_SECRET` | cleanup-retention | No | Alternative auth for cron jobs (vs service role key) |

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

| Service | URL |
| --- | --- |
| API (REST/Auth) | http://127.0.0.1:54321 |
| Studio (GUI) | http://127.0.0.1:54323 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Mailpit (email) | http://127.0.0.1:54324 |

#### Local dev account

When running locally, a dev user is auto-created via `supabase/seed.sql`:

- **Email:** `dev@opencadre.local`
- **Password:** `dev-password-123`

A "Sign in with dev account" button appears on the auth page in development mode.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite dev server (port 3000) |
| `pnpm build` | Production build |
| `pnpm serve` | Preview the production build |
| `pnpm typecheck` | TypeScript check (`tsc --noEmit`) |
| `pnpm lint` | Biome lint |
| `pnpm lint:fix` | Biome check + autofix |
| `pnpm format` | Biome format |
| `pnpm test` | Run tests (watch mode) |
| `pnpm test:run` | Run tests (single run) |
| `pnpm check:staged` | Lint staged files (via lint-staged) |
| `pnpm supabase:start` | Start the local Supabase stack |
| `pnpm supabase:stop` | Stop the local Supabase stack |
| `pnpm supabase:status` | Show local Supabase status/keys |

## Edge Functions

| Function | Auth | Description |
| --- | --- | --- |
| `ai-generate` | Yes (JWT) | AI content generation via TanStack AI / OpenRouter |
| `invite-member` | Yes (JWT) | Send workspace invite emails |
| `delete-account` | Yes (JWT) | Atomic account deletion (auth.users + all data) |
| `cleanup-retention` | No (cron) | Purge old page visits, activity logs, and AI requests |

## Database

The full schema lives in `supabase/migrations/20260910132550_remote_schema.sql`. Key tables:

| Table | Purpose |
| --- | --- |
| `workspaces` | Top-level containers for pages and members |
| `workspace_members` | Member roles (owner, admin, member, guest) with invite tokens |
| `pages` | Workspace pages (markdown, kanban, or table kind) |
| `page_content` | Versioned page body (Yjs state + markdown) |
| `cards` | Kanban card items |
| `columns` | Kanban board columns |
| `card_tags` | Many-to-many: cards <-> tags |
| `tags` | Reusable colored tags per workspace |
| `comments` | Page/card comments with threading |
| `comment_threads` | Thread groupings for comments |
| `comment_reactions` | Emoji reactions on comments |
| `notifications` | In-app notifications (mention, comment, invite) |
| `profiles` | User profiles (display name, avatar) |
| `user_settings` | Per-user shortcuts and notification prefs |
| `activity_logs` | Workspace audit trail |
| `ai_requests` | AI generation request log |
| `page_visits` | Page view tracking |
| `ydocs` | Yjs document state for collaborative editing |

To regenerate TypeScript types after schema changes:

```bash
npx supabase gen types typescript --schema public > src/types/database.ts
```

## Project Structure

```
src/
├── features/          # Feature-based modules
│   ├── ai/            # AI assistant popup + generation
│   ├── auth/          # Login, signup, RGPD consent
│   ├── comments/      # Page-level comments panel
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

## Verification

After making changes, run:

```bash
pnpm typecheck        # TypeScript check
pnpm build            # Production build
```

Both should pass with no errors.
