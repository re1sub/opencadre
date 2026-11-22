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
| Edge function auth | `ai-generate`, `invite-member`, `delete-account`, and `revoke-user-sessions` set `verify_jwt = true`, so the JWT is validated by the edge runtime and the user identity is trusted. |
| `cleanup-retention` | `verify_jwt = false`; the endpoint authenticates via a cron secret header or the service role bearer token instead of a user JWT. |

### 1.1 End-to-end encryption

User content is sealed in the browser before it reaches Supabase. Supabase never
receives plaintext workspace content, workspace keys, identity private keys,
recovery codes, passphrases, notification content, or profile display names.

Key hierarchy:

1. On the first `/workspace` visit, `VaultProvider` creates an ECDH P-256
   identity key pair automatically. There is no enable setting and no
   passphrase prompt.
2. The identity private key is sealed twice: once to a generated recovery code
   in `user_keys.recovery_wrapped_key`, and once to a non-extractable device key
   in IndexedDB with the server copy in `user_devices.wrapped_private_key`.
3. The recovery code is the only manual secret. It is generated client-side,
   shown once with copy and download, then acknowledged. Failed recovery
   unlocks are rate limited at 5 failures (15 minutes) and 10 failures (1 hour).
4. Each workspace gets a 256-bit AES-GCM content key wrapped separately for each
   authorized member in `workspace_keys.wrapped_key`. `profiles.display_name_ciphertext`
   uses a separate per-user content key.
5. Records use a `v3` envelope with a key id, a fresh 12-byte nonce, and AES-GCM
   AAD binding the ciphertext to its workspace, row, and field. Nonces are
   reserved in small batches and cached in limited numbers; a reserved nonce is
   never reused after a failed write unless the database confirms it was not
   consumed. Uniqueness is per scope and per key.
6. New devices create a labelled, expiring link request. An already trusted
   device with an unlocked vault approves it. Removing a member starts a full
   workspace key rotation and historical re-encryption.

Later visits on the same browser unlock from the device key with no prompt. A
new browser uses the recovery code or an approved device link. Other members'
display names are not decryptable under the per-user key model, so the UI shows
their email or a short user id instead.

Trusted devices are managed in Settings > Security. Revoking one deletes only
that `user_devices` row, requires a confirmation, and never targets the device
used to open Settings. With two or more trusted devices the gate shows a chooser
and aims the link request at the selected device. With one trusted device it
sends the request directly. Sign out of other devices uses
`auth.signOut({ scope: "others" })` and is separate from vault trust: it ends
their app sessions but leaves their device row trusted.

What Supabase can still read: ids, timestamps, workspace and user ids, page
kind, positions, due dates, roles, invite emails, notification type, and
activity action names. Content and key material are opaque ciphertext.

Access tokens expire after 15 minutes. Revoking sessions invalidates refresh
tokens, but existing access tokens remain valid until expiry. Re-authentication
is required for plaintext exports and recovery-code changes. A removed member
may still decrypt content they downloaded before a rotation completes.

The v3 E2EE migrations assume an empty database and do not copy legacy
plaintext into the new schema.

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

**Secrets:** no function-specific secret. It uses the platform-provided
`SUPABASE_SERVICE_ROLE_KEY` through `supabaseAdmin`. Device-link rows are deleted
before devices so account erasure cannot fail with a foreign key violation.

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
  | Table | Retention |
  | --- | --- |
  | `activity_logs` | 90 days |
  | `security_events` | 1 year |
  | `ai_requests` | 30 days |
  | `notifications` | 90 days |
- **Response** (`200`):

```json
{
  "success": true,
  "deletedBefore": {
    "activity_logs": "2026-08-24T...",
    "security_events": "2025-11-22T...",
    "ai_requests": "2026-10-23T...",
    "notifications": "2026-08-24T..."
  },
  "cleanedAt": "2026-11-22T..."
}
```

- **Errors:**
  | Status | Meaning |
  | --- | --- |
  | `401` | Missing/invalid auth (`{ "error": "Unauthorized" }`) |
  | `500` | Cleanup failed |

**Secrets:** `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

---

### 2.5 `revoke-user-sessions`

Revoke a user's refresh sessions. Intended for account security responses.

- **Route:** `https://<project-ref>/functions/v1/revoke-user-sessions`
- **Method:** `POST`
- **Auth:** `verify_jwt = true`. The caller must be the target user or use the
  service role key.
- **Body:** `{ "user_id": "<uuid>" }`
- **Response:** `{ "success": true, "revokedSessions": <number>, "note": "Existing access tokens remain valid until they expire." }`
- **Errors:** `400` for invalid input, `401` without a valid JWT, `403` when the
  caller is neither the target nor the service role, `405` for non-POST, and
  `500` if revocation fails.

**Secrets:** `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. Postgres RPC functions

Security-critical logic runs as Postgres functions invoked via the Supabase
client (`supabase.rpc(...)`). They are defined in `public` across the base
migration (`20260910132550_remote_schema.sql`) and the nine v3 migrations
(`20261122*`). Legacy plaintext functions and triggers were removed with v3.

**Membership and invites**

| Function | Returns | Description | Invoked from |
| --- | --- | --- | --- |
| `accept_invite(token uuid)` | `uuid` (workspace id) | Links the authenticated user's email to the pending `workspace_members` row matching `token`, clears `invite_token`. Only runs if the row has no `user_id` and the caller's email matches. | `AcceptInvite.tsx` |
| `get_invite_details(token uuid)` | `table(workspace_id, email, role)` | Public lookup for pending invite metadata. No workspace name is returned because it is sealed client-side. | `AcceptInvite.tsx` |
| `get_user_role(workspace_id uuid, user_id uuid)` | `text` | Returns the member's role. Used inside most RLS policies. | RLS policies |
| `is_workspace_member(workspace_id uuid, user_id uuid)` | `boolean` | Membership check. Used inside read RLS policies. | RLS policies |
| `is_workspace_owner_or_admin(ws_id uuid, uid uuid)` | `boolean` | Role-in `('owner','admin')` check for destructive policies. | RLS policies |
| `lookup_confirmed_user_id(p_email text)` | `uuid` | Resolves a confirmed user id by email for invite flows. `SECURITY DEFINER`. | client invite UX |
| `workspace_member_public_keys(p_workspace_id uuid)` | `table(user_id, public_key)` | Public keys of workspace members, for wrapping content keys. Members only. | vault key wrapping |

**Encryption validation and nonce reservation**

| Function | Returns | Description | Invoked from |
| --- | --- | --- | --- |
| `is_v3_sealed(p_value text)` | `boolean` | Validates the exact `v3` envelope shape, matching the client parser. | check constraints |
| `comment_workspace_id(p_thread_id uuid)` | `uuid` | Resolves a comment's workspace through its thread and page or card. | scope triggers |
| `assert_sealed_in_scope(p_value text, p_scope text, p_owner uuid, p_field text, p_max_ct int)` | `void` | `SECURITY DEFINER`. Rejects invalid envelopes, oversized ciphertext, keys outside the owning workspace or user, and unreserved nonces. | encryption scope triggers |
| `reserve_nonces(p_key_scope text, p_key_id uuid, p_ivs text[])` | `integer` | `SECURITY DEFINER`. Reserves 1 to 64 nonces for a key the caller may use. Idempotent via primary key conflict. Returns the number inserted. | vault writes |

**Notifications**

| Function | Returns | Description | Invoked from |
| --- | --- | --- | --- |
| `create_comment_notifications(p_comment_id uuid, p_mention_title text, p_comment_title text, p_body text, p_recipient_ids uuid[])` | `void` | `SECURITY DEFINER`. Fans out sealed comment and mention notifications to members, honoring notification prefs. All title and body arguments must already be `v3` envelopes; `data.comment_id` binds the AAD. | comments adapter |
| `mark_notifications_read()` | `void` | Marks all of the caller's unread notifications as read. | notification center |

**Device linking and recovery**

| Function | Returns | Description | Invoked from |
| --- | --- | --- | --- |
| `create_device_link_request(p_device_label text, p_one_time_public_key text, p_target_device_id uuid default null)` | `uuid` | Creates a pending, 10-minute link request for the caller. A non-null target must be an active device of the caller; a null target stays broadcast for legacy compatibility. | new device |
| `approve_device_link(p_request_id uuid, p_wrapped_private_key jsonb, p_approving_device_id uuid)` | `void` | `SECURITY DEFINER`. Approves a pending request from an active device used in the last 30 minutes. A targeted request also requires the approving device id to match. | trusted device |
| `reject_device_link(p_request_id uuid)` | `void` | Rejects a pending request. | trusted device |
| `consume_device_link(p_request_id uuid, p_device_id uuid, p_wrapped_private_key jsonb, p_device_label text)` | `void` | `SECURITY DEFINER`. Consumes an approved request and creates the new device bound to that request. | new device |
| `record_recovery_attempt(p_success boolean)` | `jsonb` | `SECURITY DEFINER`. Tracks failures and applies staged lockout (15 minutes at 5, 1 hour at 10). Success resets the counter. The submitted code is never passed in. | vault unlock |
| `check_recovery_lock()` | `timestamptz` | Returns the caller's current lockout deadline. | vault gate |

**Rotation and member removal**

| Function | Returns | Description | Invoked from |
| --- | --- | --- | --- |
| `remove_workspace_member(p_workspace_id uuid, p_user_id uuid)` | `void` | `SECURITY DEFINER`. Owner/admin only. Deletes the member's wrap and membership, then flags the workspace for rotation. | members settings |
| `begin_workspace_key_rotation(p_workspace_id uuid, p_new_key_id uuid, p_old_key_id uuid, p_wrapped_keys jsonb)` | `uuid` | `SECURITY DEFINER`. Verifies wraps cover all members, retires the old key, inserts the new key and wraps, and starts one rotation. | vault rotation |
| `rotation_batch(p_workspace_id uuid, p_after text, p_limit int)` | `table(record_key, table_name, row_id, secondary_id, field, ciphertext)` | Pages through every encrypted field in a workspace for re-encryption. Members only. | vault rotation |
| `ack_rotation_batch(p_rotation_id uuid, p_last_record_key text, p_processed_count int)` | `void` | `SECURITY DEFINER`. Advances a running rotation's progress. | vault rotation |
| `complete_rotation(p_rotation_id uuid)` | `void` | `SECURITY DEFINER`. Verifies no field still uses the old key, then retires it and deletes its wraps and nonces. | vault rotation |
| `fail_rotation(p_rotation_id uuid, p_error_code text)` | `void` | `SECURITY DEFINER`. Marks a running rotation failed with an error code. | vault rotation |
| `retry_rotation(p_rotation_id uuid)` | `void` | `SECURITY DEFINER`. Resumes a failed rotation with the same keys and last acknowledged record. | rotation UI |

**Security events and account lifecycle**

| Function | Returns | Description | Invoked from |
| --- | --- | --- | --- |
| `log_security_event(p_type text, p_metadata jsonb)` | `void` | `SECURITY DEFINER`. Allowlisted event types and metadata keys only. Rejects secrets and unbounded strings. | vault and security UI |
| `delete_user_sessions(p_user_id uuid)` | `integer` | `SECURITY DEFINER`, `service_role` only. Deletes refresh sessions. Existing access tokens remain valid until expiry. | `revoke-user-sessions` |
| `delete_user_account(p_user_id uuid)` | `void` | `SECURITY DEFINER`, `service_role` only. Transactional erasure of personal data, user-scoped nonces, and the auth user. | `delete-account` edge function |

**Triggers and event trigger**

| Function | Returns | Description | Invoked from |
| --- | --- | --- | --- |
| `rls_auto_enable()` | `event_trigger` | Automatically enables RLS on every new table in `public`. | DB event trigger |
| `bump_page_content_version()` | `trigger` | Increments `page_content.version` on update. | trigger |
| `handle_new_user()` | `trigger` | Creates a `profiles` row on auth user creation. | trigger |
| `update_updated_at()` | `trigger` | Sets `updated_at = now()` on update. | triggers |
| `tg_workspaces_encrypted()` and the other `tg_*_encrypted()` functions | `trigger` | Before insert or update of each protected field, call `assert_sealed_in_scope`. Every encrypted table has one, including notifications for both title and body. | encryption scope triggers |
| `tg_workspace_member_removed()` | `trigger` | After any membership delete, flag the workspace for a full rotation. | workspace_members |

**Grant model:** every function is `REVOKE ALL ... FROM PUBLIC` and then granted
only to the roles that legitimately need it (typically `authenticated`; `anon`
only for `get_invite_details`, and `service_role` only for the account and
session functions).

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
  `comment_threads`, `comments`, `device_link_requests`, `key_rotations`,
  `notifications`, `page_content`, `pages`, `security_events`, `tags`,
  `user_settings`, `workspace_members`, `workspace_keys`, `workspaces`, `ydocs`.
- **Events:** `INSERT`, `UPDATE`, `DELETE` are routed to registered adapters
  via `src/utils/realtime/registrar.ts`; the reconcile guard suppresses the
  author's own echo.
- **Vault channel:** `vault-keys:<user_id>` (opened in
  `src/features/crypto/VaultProvider.tsx`) listens for new `workspace_keys`
  rows addressed to the current user so a just-invited member picks up access
  without reloading.

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
| `SUPABASE_SERVICE_ROLE_KEY` | `invite-member`, `delete-account`, `cleanup-retention`, `revoke-user-sessions` | Yes |
| `SMTP_HOST` | `invite-member` | No (email skipped) |
| `SMTP_PORT` | `invite-member` | No |
| `SMTP_USER` | `invite-member` | No |
| `SMTP_PASS` | `invite-member` | No |
| `SMTP_FROM` | `invite-member` | No (defaults to `SMTP_USER`) |
| `SMTP_FROM_NAME` | `invite-member` | No (defaults to "OpenCadre") |
| `CRON_SECRET` | `cleanup-retention` | No (alternative to service role) |