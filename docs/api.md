# OpenCadre — API Reference

This document describes the server-side API surface of OpenCadre. The
application does not expose a traditional HTTP REST API: it uses three
mechanisms provided by Supabase:

1. **Supabase Edge Functions** (HTTP endpoints, Deno runtime) for operations
   that need secrets or elevated roles.
2. **Postgres RPC functions** (invoked through the Supabase PostgREST client)
   for security-critical, transactional operations.
3. **The Supabase PostgREST API** for CRUD on tables, consumed through the
   adapter layer in `src/features/*/hooks/*Adapter.ts`. All table access is
   governed by Row Level Security (RLS), documented in [database.md](./database.md).

This document focuses on (1) and (2), and notes how (3) is structured in code.

---

## 1. Authentication model

| Mechanism | How it works |
| --- | --- |
| Session | Supabase issues a JWT on sign-in; the client sends it as `Authorization: Bearer <token>` on every request. Refresh-token rotation is enabled. |
| Email confirmation | New accounts must confirm their email before signing in. |
| Edge function auth | `ai-generate`, `invite-member`, and `delete-account` set `verify_jwt = true` and use `withSupabase({ auth: "user" })`, so the JWT is validated by the edge runtime and the user identity (`userClaims.id`) is trusted. |
| `cleanup-retention` | `verify_jwt = false`; the endpoint authenticates via a cron secret header or the service role bearer token instead of a user JWT. |

---

## 2. Edge functions

All edge functions live in `supabase/functions/`. They are deployed with:

```bash
npx supabase functions deploy
```

### 2.1 `ai-generate`

Generate AI content by streaming a conversation to OpenRouter (GPT-4o-mini).

- **Route:** `https://<project-ref>/functions/v1/ai-generate`
- **Method:** `POST`
- **Auth:** `verify_jwt = true` (user)
- **Body:** a chat request as consumed by TanStack AI
  (`chatParamsFromRequest`): a `messages` array where each message has an `id`,
  a `role` (`user`/`assistant`...), and `parts` of text content.
- **Response:** `text/event-stream` (Server-Sent Events) streaming the
  generated markdown token by token.
- **Errors:** `500` JSON `{ error: "Missing OpenRouter API key" }` when
  `OPENROUTER_API_KEY` is not configured.

The function prepends a system prompt that constrains the model to output only
markdown content (no greetings, no commentary) and caps the completion at 2000
tokens.

**Secrets:** `OPENROUTER_API_KEY`.

---

### 2.2 `invite-member`

Create a pending workspace invite for an email address and optionally send an
invitation email.

- **Route:** `https://<project-ref>/functions/v1/invite-member`
- **Method:** `POST`
- **Auth:** `verify_jwt = true` (user, must be workspace `owner` or `admin`)
- **Body:**

```json
{
  "workspace_id": "uuid",
  "email": "person@example.com",
  "role": "member"
}
```

`role` is one of `"admin" | "member" | "guest"`.

- **Behavior:**
  1. Authorizes the caller by querying `workspace_members` with an
     RLS-scoped client (the caller's own JWT) and requiring role `owner` or
     `admin`.
  2. Looks for an existing member/pending invite with the same workspace +
     email. If the email is already a confirmed member, returns `409`.
  3. Creates (or refreshes) a pending `workspace_members` row with a new
     `invite_token`.
  4. If SMTP env vars are configured, sends the invitation email with an
     accept link built from the request `Origin`. If SMTP is not configured,
     the invite token is still created (email delivery is skipped).
- **Response** (`200`):

```json
{
  "status": "invited",
  "pending": true,
  "token": "uuid",
  "redirectTo": "https://app.example.com/accept-invite?token=uuid",
  "emailSent": true,
  "emailError": null
}
```

- **Errors:**
  | Status | Meaning |
  | --- | --- |
  | `400` | Invalid JSON body, or missing/invalid `workspace_id`, `email`, or `role` |
  | `403` | Caller is not an owner/admin of the workspace |
  | `409` | `{ "status": "already-member" }` when the email is already a member |
  | `500` | Authorization/DB/email failure |

**Important:** the invite does **not** create an `auth.users` account. The
account is created only when the recipient follows the link and completes sign
up. Acceptance is handled by the `accept_invite` RPC (see below).

**Secrets:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
`SMTP_FROM_NAME`.

---

### 2.3 `delete-account`

Atomically delete the calling user's account and all of their personal data.

- **Route:** `https://<project-ref>/functions/v1/delete-account`
- **Method:** `POST` (no body)
- **Auth:** `verify_jwt = true` (user)
- **Behavior:** calls the `delete_user_account(p_user_id)` RPC with the service
  role. All statements run inside one transaction, so a failure rolls the whole
  deletion back.
- **Response** (`200`): `{ "success": true }`
- **Errors:**
  | Status | Meaning |
  | --- | --- |
  | `405` | Non-POST method |
  | `500` | Deletion failed (`{ "error": "Failed to delete account" }`) |

**Secrets:** none (uses Supabase's bundled service role via `supabaseAdmin`).

---

### 2.4 `cleanup-retention`

Purge and anonymize data older than the RGPD retention periods. Intended to be
invoked on a schedule (cron).

- **Route:** `https://<project-ref>/functions/v1/cleanup-retention`
- **Method:** any (typically `POST` or `GET` by the scheduler)
- **Auth:** `verify_jwt = false`. The function requires **one** of:
  - `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`, or
  - `X-Cron-Secret: <CRON_SECRET>` header.
- **Behavior:**
  | Action | Cutoff |
  | --- | --- |
  | Anonymize `activity_logs.user_id` (keep history, drop the personal link) | 180 days |
  | Scrub invitee emails from `activity_logs.metadata` (member_invite) | 180 days |
  | Delete `page_visits` | 90 days |
  | Delete `ai_requests` | 365 days |
- **Response** (`200`):

```json
{
  "success": true,
  "activityLogsAnonymizedBefore": "2026-03-14T...",
  "activityLogsAnonymized": 12,
  "deleted": {
    "pageVisitsBefore": "2026-06-13T...",
    "aiRequestsBefore": "2025-09-11T..."
  },
  "cleanedAt": "2026-09-11T..."
}
```

- **Errors:**
  | Status | Meaning |
  | --- | --- |
  | `401` | Missing/invalid auth (`{ "error": "Unauthorized" }`) |
  | `500` | Cleanup failed |

**Secrets:** `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

---

## 3. Postgres RPC functions

Security-critical logic runs as Postgres functions invoked via the Supabase
client (`supabase.rpc(...)`). Package: `public` schema, defined in
`supabase/migrations/20260910132550_remote_schema.sql`.

| Function | Returns | Description | Invoked from |
| --- | --- | --- | --- |
| `accept_invite(token uuid)` | `uuid` (workspace id) | Links the authenticated user's email to the pending `workspace_members` row matching `token`, clears `invite_token`. Only runs if the row has no `user_id` and the caller's email matches. | `AcceptInvite.tsx` |
| `get_invite_details(token uuid)` | `table(workspace_id, workspace_name, email, role)` | Public lookup for pending invite metadata to render the accept page. | `AcceptInvite.tsx` |
| `get_user_role(workspace_id uuid, user_id uuid)` | `text` | Returns the member's role. Used inside most RLS policies. | RLS policies |
| `is_workspace_member(workspace_id uuid, user_id uuid)` | `boolean` | Membership check. Used inside read RLS policies. | RLS policies |
| `is_workspace_owner_or_admin(ws_id uuid, uid uuid)` | `boolean` | Role-in `('owner','admin')` check for destructive policies. | RLS policies (comments, pages) |
| `create_mention_notification(p_page_id uuid, p_recipient_id uuid, p_page_title text, p_excerpt text)` | `void` | Creates a `mention` notification; guards self-mention, membership, and notification prefs. `SECURITY DEFINER`. | markdown editor (mentions) |
| `mark_notifications_read()` | `void` | Marks all of the caller's unread notifications as read. | notification center |
| `delete_user_account(p_user_id uuid)` | `void` | Transactional erasure of personal data + the auth user. `SECURITY DEFINER`, granted to `service_role` only. | `delete-account` edge function |
| `lookup_confirmed_user_id(p_email text)` | `uuid` | Resolves a confirmed user id by email for invite flows. `SECURITY DEFINER`. | client invite UX |
| `rls_auto_enable()` | `event_trigger` | Event trigger that automatically enables RLS on every new table created in `public`. | DB event trigger |
| `bump_page_content_version()` | `trigger` | Increments `page_content.version` on update. | trigger |
| `handle_comment_notifications()` | `trigger` | Fans out `comment` notifications to workspace members on comment insert. `SECURITY DEFINER`. | trigger |
| `handle_new_user()` | `trigger` | Creates a `profiles` row on auth user creation. `SECURITY DEFINER`. | trigger |
| `sync_profile_display_name()` | `trigger` | Syncs `profiles.display_name` from auth user metadata on update. `SECURITY DEFINER`. | trigger |
| `update_updated_at()` | `trigger` | Sets `updated_at = now()` on update. | triggers |

**Grant model:** every function is `REVOKE ALL ... FROM PUBLIC` and then
granted only to the roles that legitimately need it (typically `authenticated`,
and `anon` only for `get_invite_details`).

---

## 4. Table CRUD (PostgREST) and the adapter layer

The bulk of application data access is CRUD on Postgres tables through
Supabase's typed PostgREST client, encapsulated in the repository/adapter
layer. There is no public REST endpoint per table; access is:
- **Authorized** by RLS policies at the row level (the client can only reach
  rows the policies allow).
- **Validated** client-side by zod schemas before submission:
  - `src/features/auth/schemas.ts` — sign-in, sign-up, password reset.
  - `src/features/workspace/schemas.ts` — workspace name, member email, display
    name.
  - `src/features/kanban/schemas.ts` — column and card drafts.
  - `src/features/tags/schemas.ts` — tag names.

Adapters that own CRUD (see [architecture.md](./architecture.md)):

| Adapter | Tables touched |
| --- | --- |
| `useWorkspaceAdapter` | `workspaces`, `workspace_members` |
| `usePagesAdapter` | `pages`, `page_content`, `page_visits` |
| `useWorkspaceMembersAdapter` | `workspace_members` |
| `useKanbanBoardAdapter` | `columns`, `cards`, `card_tags` |
| `useCommentsAdapter` | `comment_threads`, `comments`, `comment_reactions` |
| `useWorkspaceTagsAdapter` | `tags` |
| `useNotifications` | `notifications` |
| `useTrash` | `pages` (soft-deleted), `page_content` |

---

## 5. Realtime channels

The client subscribes to one channel per active workspace and filters events by
table. Authorization comes from RLS SELECT policies.

- **Channel:** `workspace-realtime:<workspace_id>` (opened in
  `src/utils/realtime/useWorkspaceRealtime.ts`).
- **Tables** (from the `supabase_realtime` publication):
  `activity_logs`, `card_tags`, `cards`, `columns`, `comment_reactions`,
  `comment_threads`, `comments`, `notifications`, `page_content`, `pages`,
  `tags`, `user_settings`, `workspace_members`, `workspaces`, `ydocs`.
- **Events:** `INSERT`, `UPDATE`, `DELETE` are routed to registered adapters
  via `src/utils/realtime/registrar.ts`; the reconcile guard suppresses the
  author's own echo.

---

## 6. Environment variables and secrets

### Client (`.env` / `.env.development`)

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |

### Edge function secrets (set via `npx supabase secrets set`)

| Secret | Used by | Required |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | `ai-generate` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `invite-member`, `delete-account`, `cleanup-retention` | Yes |
| `SMTP_HOST` | `invite-member` | No (email skipped) |
| `SMTP_PORT` | `invite-member` | No |
| `SMTP_USER` | `invite-member` | No |
| `SMTP_PASS` | `invite-member` | No |
| `SMTP_FROM` | `invite-member` | No (defaults to `SMTP_USER`) |
| `SMTP_FROM_NAME` | `invite-member` | No (defaults to "OpenCadre") |
| `CRON_SECRET` | `cleanup-retention` | No (alternative to service role) |