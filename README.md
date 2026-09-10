# opencadre

Boards, notes, and tasks. Organized.

A flexible, real-time, collaborative, and AI-powered workspace built with SolidJS for organizing ideas, projects, and knowledge.

opencadre lets you create pages that adapt to the way you work. Write documents in Markdown, manage projects with Kanban boards, and build your own systems using simple, composable blocks.

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

## Getting Started

```bash
pnpm install
cp .env.example .env   # fill in your Supabase project URL + publishable key

# local Supabase stack (optional, for local development)
pnpm supabase:start    # first run pulls Docker images
cp .env.example .env.development  # point VITE_SUPABASE_* at the local stack output

pnpm dev               # http://localhost:3000
```

The dev server loads `.env.development` (local stack) and `pnpm build` loads
`.env` (remote project), so nothing needs to be swapped between environments.

### Local Supabase endpoints

| Service          | URL                                                     |
| ---------------- | ------------------------------------------------------- |
| API (REST/Auth)  | http://127.0.0.1:54321                                  |
| Studio (GUI)     | http://127.0.0.1:54323                                  |
| Postgres         | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Mailpit (email)  | http://127.0.0.1:54324                                  |

`pnpm supabase:status` prints the current keys. For daily work you mostly need
Studio; Mailpit only matters once email confirmations are enabled.

## Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `pnpm dev`             | Start the Vite dev server (port 3000)|
| `pnpm build`           | Production build                     |
| `pnpm serve`           | Preview the production build         |
| `pnpm typecheck`       | `tsc --noEmit`                       |
| `pnpm lint`            | Biome lint                           |
| `pnpm lint:fix`        | Biome check + autofix                |
| `pnpm format`          | Biome format                         |
| `pnpm supabase:start`  | Start the local Supabase stack       |
| `pnpm supabase:stop`   | Stop the local Supabase stack        |
| `pnpm supabase:status` | Show local Supabase status/keys      |

## Edge Functions

| Function             | Auth required | Description                                        |
| -------------------- | ------------- | -------------------------------------------------- |
| `ai-generate`        | Yes           | AI content generation via TanStack AI / OpenRouter  |
| `invite-member`      | Yes           | Send workspace invite emails                       |
| `delete-account`     | Yes           | Atomic account deletion (auth.users + all data)     |
| `cleanup-retention`  | No (cron)     | Purge old page visits and request logs              |

## Environment Variables

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable (anon) key

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
├── utils/             # supabase client
└── webawesome.imports.ts  # Web Awesome component + icon registration

supabase/
├── functions/         # Edge functions (ai-generate, delete-account, ...)
└── migrations/        # SQL migrations
```
