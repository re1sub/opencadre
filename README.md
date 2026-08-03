# opencadre

Boards, notes, and tasks. Organized.

A flexible, real-time, collaborative, and AI-powered workspace built with SolidJS for organizing ideas, projects, and knowledge.

opencadre lets you create pages that adapt to the way you work. Write documents in Markdown, manage projects with Kanban boards, and build your own systems using simple, composable blocks.

## Tech Stack

- SolidJS 1.9 + @solidjs/router 1.0
- Vite 8
- TypeScript 7
- vanilla-extract (typed CSS modules)
- Web Awesome (web components, lucide icons)
- TanStack Solid Query
- Solid-motionone
- Supabase
- Biome (lint + format), pnpm

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

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `pnpm dev`           | Start the Vite dev server (port 3000)|
| `pnpm build`         | Production build                     |
| `pnpm serve`         | Preview the production build         |
| `pnpm typecheck`     | `tsc --noEmit`                       |
| `pnpm lint`          | Biome lint                           |
| `pnpm lint:fix`      | Biome check + autofix                |
| `pnpm format`        | Biome format                         |
| `pnpm supabase:start`  | Start the local Supabase stack     |
| `pnpm supabase:stop`   | Stop the local Supabase stack      |
| `pnpm supabase:status` | Show local Supabase status/keys    |


## Environment Variables

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable (anon) key

## Project Structure

```
src/
├── components/home/   # Landing page sections (Hero, Navbar, Features, ...)
├── pages/             # Route components (Home, Auth, Workspace)
├── styles/            # Global + font styles (vanilla-extract)
├── theme/             # Light/dark ThemeProvider
├── utils/             # supabase client
└── webawesome.imports.ts  # Web Awesome component + icon registration
```
