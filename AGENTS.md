# OpenCadre - Agent Guidelines

## Project Overview

OpenCadre is a Solid.js workspace app (kanban, markdown, tables) with Supabase
auth. Stack: Solid 1.9, @solidjs/router, Supabase, Web Awesome (`wa-*`)
web components, Vanilla Extract CSS (`*.css.ts`), TipTap, @simple-table/solid,
@dnd-kit/solid, Biome (format/lint), pnpm.

## Commands

- `pnpm typecheck` - TypeScript check (run after every change)
- `pnpm build` - Vite production build (final verification)
- `pnpm dev` - local dev server
- Formatting is done by Biome; Zed runs `biome check --write --unsafe` on save

## Code Structure

- Feature-based layout: all code lives in `src/features/<feature>/`
  (`auth`, `comments`, `home`, `kanban`, `markdown`, `table`, `tags`, `ui`,
  `workspace`)
- Each feature: `components/`, `hooks/`, `constants/`, `types.ts`
- Shared app shell: `src/App.tsx`, `src/routes.tsx`, `src/index.tsx`,
  `src/theme/`, `src/styles/`, `src/utils/`
- Kanban tags and comments live in their own features (`tags`, `comments`)
  rather than under `kanban`; `Card.tagIds` is `string[]` and
  `Comment.parentId` references the owning entity (e.g. a card id)

## Component Convention (IMPORTANT)

- Write components as: `const Component = (props) => { ... };` then
  `export default Component;`
- NEVER use `export function Component` or `export const Component = ...`
  for components
- Default exports are required so `lazy(() => import(...))` works
- Non-component exports (hooks, constants, context hooks) stay named:
  `export function useAuth()`, `export const PAGE_KIND_META`
- Web Awesome components should never be self closing, always use `<wa-icon></wa-icon>` style

## Lazy Imports

- Only lazy-load what makes sense: heavy, conditionally-rendered pages
  (page kinds in `PageView`, route-level components)
- Example: `const MarkdownEditor = lazy(() => import("#/features/markdown/MarkdownEditor"));`
- Do NOT lazy-load small shared primitives or dialogs
  (`EditableText`, `DeleteButton`, `ConfirmDialog`, `CardDialog`, ...)

## Path Aliases

- `#/*` -> `src/*`, plus `#styles/*`, `#theme/*`, `#assets/*`
- Cross-feature imports use `#/features/<feature>/...`

## Styling

- Vanilla Extract: styles live in `*.css.ts` next to the component
- Prefer CSS variables from Web Awesome (`var(--wa-color-*)`, `var(--wa-space-*)`,
  `var(--wa-font-size-*)`)

## Kanban / dnd-kit

- Board uses sortable groups with `group: BOARD_ID` for columns
- Cards are sortables with `type: "card"`, `accept: ["card"]`,
  `collisionPriority: 2`
- Empty-column drop: each column has an extra droppable
  `id: ${column.id}-cards-droppable`, `type: "column-droppable"`,
  `accept: ["card"]`, `collisionPriority: 0`

## Git / Commits

- Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- Prefer several small logical commits over one large one
  (e.g. deps / feature / refactor split)
- Only commit or push when explicitly asked

## Verification

- After changes: run `pnpm typecheck`, then `pnpm build`
- Keep every intermediate commit buildable where practical
