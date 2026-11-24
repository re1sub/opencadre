# OpenCadre — Database Design

This document describes the Postgres database that backs OpenCadre. It covers
the 29 tables, their relationships, the RLS policies that enforce authorization,
the triggers and RPC functions that run server-side, and the realtime
publication.

The schema is defined across eleven migrations applied in order: one base migration
plus ten later migrations (E2EE v3 and related follow-ups).

| Migration | Purpose |
| --- | --- |
| `20260910132550_remote_schema.sql` | Base app tables, functions, RLS, triggers |
| `20261122000000_e2ee_core.sql` | Encrypted columns, key and nonce tables, scope checks |
| `20261122010000_e2ee_device_links.sql` | Device linking, recovery rate limiting, nonce reservation |
| `20261122020000_e2ee_rotation.sql` | Workspace key rotation and member removal |
| `20261122030000_e2ee_security_events.sql` | Security event log and session revocation |
| `20261122040000_e2ee_bootstrap_nullable.sql` | Nullable workspace name during key bootstrap |
| `20261122050000_workspace_owner_insert_policy.sql` | Owner-scoped workspace insert policy |
| `20261122060000_device_link_last_used.sql` | `last_used_at` backfill and 30-minute approval window |
| `20261122070000_device_link_target.sql` | Targeted link requests and matching approval |
| `20261122080000_delete_account_device_links.sql` | Device-link deletion order for account erasure |
| `20261124130000_delete_account_ownership_transfer.sql` | Account deletion: ownership transfer to successor, comment anonymization (`author_id` nullable, `ON DELETE SET NULL`), assignee scrub, updated comment delete RLS |

The E2EE migrations assume an empty database. They drop legacy plaintext columns
and do not copy legacy plaintext into the new schema.

## 1. Encryption model in the schema

Protected fields are stored only as `v3` envelopes of the form
`v3.<key-id>.<iv>.<ciphertext>`. Supabase never receives plaintext protected
content, workspace keys, identity private keys, recovery codes, passphrases,
notification content, or profile display names.

Every protected field follows the same pattern:

- A `text` ciphertext column holding the envelope, with a `CHECK` constraint
  calling `is_v3_sealed()` and a ciphertext length cap.
- Generated `*_key_id` and `*_iv` columns parsed from the envelope, with a foreign
  key to `content_keys` (workspace scope) or `user_content_keys` (user scope).
- A `tg_*_encrypted()` trigger that calls `assert_sealed_in_scope()` before insert
  or update. This rejects invalid envelopes, oversized ciphertext, keys from the
  wrong workspace or user, and nonces that were not reserved first.

There is one content key per workspace, wrapped separately for each authorized
member in `workspace_keys`. Genuinely private user data, currently
`profiles.display_name_ciphertext`, uses a separate per-user content key. Reads
strictly fail on tampering: no partial plaintext, empty placeholders, or fallback
decryption is ever returned.

Plaintext size caps are enforced client-side before sealing and mirrored as
ciphertext caps in the database.

## 2. Entity-relationship diagram

```mermaid
erDiagram
    auth_users["auth.users"] {
        uuid id PK
    }

    workspaces {
        uuid id PK
        uuid owner_id FK
        text name_ciphertext
        text description_ciphertext
        text default_page_kind
        boolean rotation_required
        timestamptz rotation_requested_at
    }

    workspace_members {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        text role
        text email
        uuid invite_token
    }

    profiles {
        uuid id PK
        text display_name_ciphertext
        text avatar_url
    }

    pages {
        uuid id PK
        uuid workspace_id FK
        uuid owner_id FK
        text title_ciphertext
        text kind
    }

    page_content {
        uuid id PK
        uuid page_id FK "1:1 unique"
        text ciphertext
        integer version
    }

    tags {
        uuid id PK
        uuid workspace_id FK
        text ciphertext
        text color
    }

    columns {
        uuid id PK
        uuid page_id FK
        text ciphertext
        integer "position"
    }

    cards {
        uuid id PK
        uuid column_id FK
        uuid page_id FK
        text ciphertext
        timestamptz due_date
        uuid[] assignee_ids
    }

    comment_threads {
        uuid id PK
        text entity_type
        uuid entity_id
    }

    comments {
        uuid id PK
        uuid thread_id FK
        uuid author_id FK
        text ciphertext
    }

    notifications {
        uuid id PK
        uuid user_id FK
        notification_type type
        uuid workspace_id
        text title_ciphertext
        text body_ciphertext
        jsonb data
    }

    ydocs {
        uuid id PK
        uuid workspace_id FK
        text entity_type
        uuid entity_id
        text state
    }

    content_keys {
        uuid id PK
        uuid workspace_id FK
        text status
    }

    workspace_keys {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        uuid key_id FK
        jsonb wrapped_key
    }

    user_content_keys {
        uuid id PK
        uuid user_id FK
        text status
    }

    user_content_key_wraps {
        uuid user_id FK
        uuid key_id FK
        jsonb wrapped_key
    }

    user_keys {
        uuid user_id PK
        text public_key
        jsonb recovery_wrapped_key
    }

    user_devices {
        uuid id PK
        uuid user_id FK
        text device_label
        jsonb wrapped_private_key
        text status
        timestamptz last_used_at
    }

    device_link_requests {
        uuid id PK
        uuid user_id FK
        uuid target_device_id FK
        text status
        timestamptz expires_at
    }

    key_rotations {
        uuid id PK
        uuid workspace_id FK
        uuid from_key_id FK
        uuid to_key_id FK
        text status
    }

    crypto_nonces {
        text key_scope
        uuid key_id
        text iv
    }

    security_events {
        uuid id PK
        uuid user_id FK
        uuid workspace_id FK
        text type
    }

    auth_users ||--o| workspaces : "owns"
    auth_users ||--o{ workspace_members : "is member"
    auth_users ||--o| profiles : "has profile"
    workspaces ||--o{ workspace_members : "has members"
    workspaces ||--o{ pages : "contains"
    workspaces ||--o{ tags : "has tags"
    workspaces ||--o{ content_keys : "has keys"
    workspaces ||--o{ key_rotations : "rotates"
    content_keys ||--o{ workspace_keys : "wrapped for members"
    content_keys ||--o{ crypto_nonces : "reserves nonces"
    user_content_keys ||--o{ user_content_key_wraps : "wrapped for user"
    auth_users ||--o| user_keys : "identity"
    auth_users ||--o{ user_devices : "devices"
    auth_users ||--o{ device_link_requests : "link requests"
    pages ||--o| page_content : "has content"
    pages ||--o{ columns : "has columns"
    pages ||--o{ cards : "has cards"
    columns ||--o{ cards : "contains"
    comment_threads }o--o{ comments : "has comments"
    comments ||--o{ notifications : "notifies"
```

## 3. Table reference

### 3.1 Application tables

#### `workspaces`

Top-level container. Name and description are sealed with the workspace content
key. `name_key_id` and `description_key_id` reference `content_keys`.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` |
| `owner_id` | uuid | NOT NULL, FK `auth.users(id)` ON DELETE CASCADE |
| `name_ciphertext` | text | nullable during bootstrap, then sealed, cap 704 |
| `description_ciphertext` | text | nullable, sealed, cap 704 |
| `name_key_id`, `name_iv` | uuid, text | generated from `name_ciphertext` |
| `description_key_id`, `description_iv` | uuid, text | generated from `description_ciphertext` |
| `default_page_kind` | text | NOT NULL, CHECK IN `('markdown','kanban','table')` |
| `rotation_required` | boolean | NOT NULL, default `false` |
| `rotation_requested_at` | timestamptz | nullable |
| `created_at`, `updated_at` | timestamptz | NOT NULL, default `now()` |

The client creates the row, creates the content key, then sets the sealed name
before adding any membership, so no reader can observe the null-name state.

#### `workspace_members`

Links users to workspaces. Pending invites have `user_id = NULL` and a unique
`invite_token`. Deleting any row, including through account deletion, flags the
workspace for a full rotation via `tg_workspace_member_removed()`.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` |
| `workspace_id` | uuid | NOT NULL, FK `workspaces(id)` ON DELETE CASCADE |
| `user_id` | uuid | nullable, FK `auth.users(id)` ON DELETE CASCADE |
| `role` | text | NOT NULL, CHECK IN `('owner','admin','member','guest')` |
| `email` | text | NOT NULL, default `''` |
| `invite_token` | uuid | nullable, UNIQUE |
| `created_at` | timestamptz | NOT NULL, default `now()` |

#### `profiles`

One row per auth user, created by `handle_new_user()`. The display name is
sealed with the user's own content key. Other members see an email or short user
id in the UI instead.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, FK `auth.users(id)` ON DELETE CASCADE |
| `display_name_ciphertext` | text | nullable, sealed with a user key, cap 704 |
| `avatar_url` | text | nullable |
| `updated_at` | timestamptz | default `now()` |

#### `pages`

A workspace page of kind `markdown`, `kanban`, or `table`. The title is sealed
with the workspace content key. Soft-deleted pages keep `is_deleted = true`.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `workspace_id` | uuid | NOT NULL, FK `workspaces(id)` ON DELETE CASCADE |
| `owner_id` | uuid | nullable, FK `auth.users(id)` |
| `title_ciphertext` | text | NOT NULL, sealed, cap 704 |
| `title_key_id`, `title_iv` | uuid, text | generated from `title_ciphertext` |
| `kind` | text | NOT NULL, CHECK IN `('markdown','kanban','table')` |
| `icon` | text | nullable |
| `is_favorite`, `is_deleted` | boolean | NOT NULL, default `false` |
| `deleted_at` | timestamptz | nullable |
| `position` | integer | default `0` |
| `created_at`, `updated_at` | timestamptz | NOT NULL, default `now()` |

#### `page_content`

One-to-one with `pages`. Stores the encrypted editor payload. `version` is
bumped on every update for optimistic concurrency.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `page_id` | uuid | NOT NULL, UNIQUE, FK `pages(id)` ON DELETE CASCADE |
| `ciphertext` | text | NOT NULL, sealed, cap 1,398,124 |
| `key_id`, `iv` | uuid, text | generated from `ciphertext` |
| `version` | integer | NOT NULL, default `1` |
| `created_at`, `updated_at` | timestamptz | NOT NULL, default `now()` |

#### `page_visits`

Page view records for the "Recent pages" feature. One row per user and page.

#### `tags`, `columns`, `cards`

Kanban metadata. Each has a `ciphertext` column sealed with the workspace key,
plus generated `key_id` and `iv` columns. Non-secret metadata remains explicit:

| Table | Plaintext metadata | Ciphertext holds | Cap |
| --- | --- | --- | --- |
| `tags` | `color`, `workspace_id` | tag name | 704 |
| `columns` | `color`, `position`, `page_id` | column title | 704 |
| `cards` | `position`, `due_date`, `assignee_ids`, `page_id`, `column_id` | JSON title and description | 704 |

#### `card_tags`

Join table linking cards to tags. Unique on `(card_id, tag_id)`.

#### `comment_threads`, `comments`

Threads are polymorphic over `page` and `card`. Comment bodies are sealed with
the workspace key. The scope trigger resolves the workspace through
`comment_workspace_id(thread_id)`, which follows the thread to its page or card.
When an author deletes their account, `author_id` becomes `NULL` (`ON DELETE SET NULL`)
and the UI displays the author as "Deleted member".

| Table | Key columns |
| --- | --- |
| `comment_threads` | `id`, `entity_type` IN `('page','card')`, `entity_id`, `created_at` |
| `comments` | `id`, `thread_id`, `author_id` (nullable, FK `auth.users(id)` `ON DELETE SET NULL`), `ciphertext` (cap 87,404), generated `key_id`/`iv`, timestamps |

#### `comment_reactions`

Emoji reactions on comments. Unique per `(comment_id, user_id, reaction)`.

#### `notifications`

Notification title and body are both sealed with the workspace key. Both fields
have their own scope trigger call and generated key and iv columns. `data` is a
metadata allowlist, for example `{"comment_id": "..."}`, which binds the client
AAD. Notification type and ids remain plaintext metadata.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK `auth.users(id)` ON DELETE CASCADE |
| `type` | notification_type | NOT NULL |
| `actor_id` | uuid | nullable |
| `workspace_id` | uuid | NOT NULL |
| `entity_type`, `entity_id`, `page_id` | text, uuid, uuid | entity metadata |
| `title_ciphertext` | text | NOT NULL, sealed, cap 704 |
| `body_ciphertext` | text | nullable, sealed, cap 704 |
| `data` | jsonb | NOT NULL, default `'{}'` |
| `read_at`, `created_at` | timestamptz | nullable / NOT NULL |

#### `activity_logs`

Workspace audit trail. `action` and entity references are metadata; no protected
content is stored. Rows older than 90 days are purged.

#### `ai_requests`

AI request log. The legacy `prompt` and `response` plaintext columns were
dropped. Only ids, model, and token counts remain. Rows older than 30 days are
purged.

#### `user_settings`

Per-user preferences: keyboard shortcuts and notification toggles.

#### `ydocs`

Serialized Yjs state for collaborative editing, sealed with the workspace key
in `state`. The legacy empty-string default was dropped because it can never
satisfy the `v3` check.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` |
| `workspace_id` | uuid | NOT NULL, FK `workspaces(id)` ON DELETE CASCADE |
| `entity_type`, `entity_id` | text, uuid | UNIQUE together |
| `state` | text | NOT NULL, sealed, cap 2,796,224 |
| `state_key_id`, `state_iv` | uuid, text | generated from `state` |
| `version` | bigint | NOT NULL, default `1` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

### 3.2 Key and crypto tables

#### `content_keys`

One row per workspace key generation. Exactly one `active` key per workspace via
`content_keys_one_active`. Status is `active`, `rotating`, or `retired`.

#### `user_content_keys`, `user_content_key_wraps`

Per-user content keys for private fields. One active key per user, wrapped for
that user in `user_content_key_wraps`.

#### `workspace_keys`

A workspace content key wrapped separately for each member. Unique on
`(workspace_id, user_id, key_id)`, so multiple wraps per user across rotations
are allowed. Inserted wraps must target a current member.

#### `crypto_nonces`

Reserved nonce registry with primary key `(key_scope, key_id, iv)` and
`key_scope` in `('workspace','user')`. Writes must reference a reserved nonce;
this is how nonce reuse is prevented. Client access is granted only through
`reserve_nonces()`.

#### `user_keys`

Identity public key and the private key wrapped with the recovery code. The
plaintext private key never reaches the server.

| Column | Type | Constraints |
| --- | --- | --- |
| `user_id` | uuid | PK, FK `auth.users(id)` ON DELETE CASCADE |
| `public_key` | text | NOT NULL |
| `recovery_wrapped_key` | jsonb | NOT NULL |
| `key_version` | integer | NOT NULL, default `1` |
| `created_at`, `updated_at` | timestamptz | NOT NULL, default `now()` |

#### `user_devices`

A trusted browser or device with the identity private key wrapped to its
non-extractable device key in IndexedDB. Status is `active` or `revoked`.
Approving a link requires an active device used within the last 30 minutes.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK `auth.users(id)` |
| `device_label` | text | Detected or user-chosen label |
| `wrapped_private_key` | jsonb | Identity private key wrapped to the device key |
| `identity_key_version` | integer | NOT NULL, default `1` |
| `status` | text | `active` or `revoked` |
| `last_used_at` | timestamptz | nullable, refreshed when the device approves a link |
| `revoked_at` | timestamptz | nullable |
| `created_at` | timestamptz | NOT NULL, default `now()` |

The Security settings revoke a selected device by deleting its row. The device
used to open Settings is filtered out client-side and can never be the target of
that operation, so at least one trusted device remains.

#### `device_link_requests`

Expiring requests to link a new device, with a one-time public key and the
approved private-key wrap. Status is `pending`, `approved`, `rejected`,
`consumed`, or `expired`. Requests expire after 10 minutes. A request may name a
single `target_device_id`, in which case only that device can approve it. A null
target is a broadcast request kept for legacy compatibility. When there are two
or more trusted devices, the client shows a chooser and sends the request to the
selected device; with one trusted device it sends directly to that device.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK `auth.users(id)` |
| `device_label` | text | NOT NULL, label for the new device |
| `one_time_public_key` | text | nullable after consumption |
| `target_device_id` | uuid | nullable, FK `user_devices(id)` |
| `status` | text | `pending`, `approved`, `rejected`, `consumed`, `expired` |
| `approved_by_device_id` | uuid | nullable, FK `user_devices(id)` |
| `wrapped_private_key` | jsonb | nullable, written on approval |
| `consumed_wrapped_key` | jsonb | nullable |
| `responded_at`, `consumed_at` | timestamptz | nullable |
| `expires_at` | timestamptz | NOT NULL, now + 10 minutes at creation |
| `created_at` | timestamptz | NOT NULL, default `now()` |

#### `recovery_attempts`

Failure counter and staged lockout for recovery unlocks. 5 failures lock for 15
minutes, 10 failures lock for 1 hour. A success resets the counter. The
submitted recovery code is never passed to the database.

#### `key_rotations`

Progress of one workspace key rotation. At most one `pending` or `running`
rotation per workspace. Tracks `from_key_id`, `to_key_id`, `processed_count`,
`last_record_key`, `total_count`, and an optional `error_code`. Failed rotations
can be retried with the same keys and resume from the last acknowledged record.

#### `security_events`

Security audit log for recovery failures, device links, rotation events, and
member removal. `log_security_event()` allowlists both event types and metadata
keys, so plaintext, keys, and recovery codes cannot be recorded. Rows older than
one year are purged.

## 4. RLS policy matrix

RLS is enabled on every table, including new tables (via the `ensure_rls` event
trigger). The helpers `is_workspace_member`, `get_user_role`, and
`is_workspace_owner_or_admin` resolve membership and role from
`workspace_members`.

### Application policies

| Table | Operation | Policy |
| --- | --- | --- |
| `workspaces` | INSERT | Any authenticated user |
| `workspaces` | SELECT | Member or owner |
| `workspaces` | UPDATE / DELETE | Owner |
| `workspace_members` | SELECT | Workspace member |
| `workspace_members` | INSERT | Self-join or owner/admin |
| `workspace_members` | UPDATE / DELETE | Owner/admin |
| `profiles` | SELECT | Co-member or self |
| `profiles` | INSERT / UPDATE | Self only |
| `pages`, `page_content` | SELECT | Workspace member |
| `pages`, `page_content` | INSERT / UPDATE | owner/admin/member |
| `pages` | DELETE | Owner/admin |
| `page_visits` | All | Own rows only |
| `columns`, `cards`, `card_tags`, `tags` | SELECT | Workspace member |
| `columns`, `cards`, `card_tags`, `tags` | Write | owner/admin/member |
| `comment_threads`, `comments` | SELECT | Workspace member via thread |
| `comments` | INSERT / UPDATE | Author |
| `comments` | DELETE | Author or owner/admin |
| `comment_reactions` | SELECT | Thread member |
| `comment_reactions` | INSERT / DELETE | Own rows |
| `notifications` | SELECT / UPDATE / DELETE | Own only |
| `activity_logs` | SELECT | Workspace member |
| `ai_requests`, `user_settings` | All | Own only |
| `ydocs` | All | Workspace member |

### Key and crypto policies

| Table | Operation | Policy |
| --- | --- | --- |
| `content_keys` | SELECT | Workspace member |
| `content_keys` | INSERT / UPDATE | Owner/admin |
| `workspace_keys` | SELECT | Workspace member |
| `workspace_keys` | INSERT | Self or owner/admin |
| `workspace_keys` | UPDATE | Self |
| `workspace_keys` | DELETE | Self or owner/admin |
| `user_content_keys`, `user_content_key_wraps` | All | Own rows only |
| `user_keys`, `user_devices` | All | Own rows only |
| `device_link_requests` | SELECT / INSERT | Own rows only |
| `key_rotations` | SELECT | Workspace member |
| `key_rotations` | INSERT / UPDATE | Owner/admin |
| `recovery_attempts`, `crypto_nonces` | Direct client access | None, RPC only |
| `security_events` | SELECT | Own rows or workspace owner/admin |
| `security_events` | INSERT | Authenticated, via `log_security_event()` |

## 5. Triggers

| Table | Trigger | Function | Purpose |
| --- | --- | --- | --- |
| `auth.users` | `on_auth_user_created` | `handle_new_user()` | Creates a profile |
| `workspaces` | `workspaces_encrypted_scope` | `tg_workspaces_encrypted()` | Validates sealed name and description |
| `pages` | `pages_encrypted_scope` | `tg_pages_encrypted()` | Validates sealed title |
| `page_content` | `page_content_encrypted_scope` | `tg_page_content_encrypted()` | Validates sealed content |
| `tags` | `tags_encrypted_scope` | `tg_tags_encrypted()` | Validates sealed tag name |
| `columns` | `columns_encrypted_scope` | `tg_columns_encrypted()` | Validates sealed column title |
| `cards` | `cards_encrypted_scope` | `tg_cards_encrypted()` | Validates sealed card JSON |
| `comments` | `comments_encrypted_scope` | `tg_comments_encrypted()` | Validates sealed body via thread workspace |
| `notifications` | `notifications_encrypted_scope` | `tg_notifications_encrypted()` | Validates sealed title and body |
| `ydocs` | `ydocs_encrypted_scope` | `tg_ydocs_encrypted()` | Validates sealed state |
| `profiles` | `profiles_encrypted_scope` | `tg_profiles_encrypted()` | Validates sealed display name |
| `workspace_members` | `workspace_member_removed` | `tg_workspace_member_removed()` | Flags the workspace for rotation |
| `page_content` | `bump_page_content_version` | `bump_page_content_version()` | Increments version |
| `updated_at` columns | `update_*_updated_at` | `update_updated_at()` | Maintains timestamps |

The legacy `sync_profile_display_name()` and `handle_comment_notifications()`
triggers were removed. Comment notifications are now created explicitly by the
client through `create_comment_notifications()` after sealing their content.

### Event trigger

| Name | Event | Function | Purpose |
| --- | --- | --- | --- |
| `ensure_rls` | `ddl_command_end` on `CREATE TABLE` | `rls_auto_enable()` | Enables RLS on new `public` tables |

## 6. Realtime publication

The following tables are in the `supabase_realtime` publication:

```
activity_logs, card_tags, cards, columns, comment_reactions, comment_threads,
comments, device_link_requests, key_rotations, notifications, page_content,
pages, security_events, tags, user_settings, workspace_members, workspace_keys,
workspaces, ydocs
```

`page_visits`, `ai_requests`, and key material tables other than
`workspace_keys` are not streamed. A separate `vault-keys:<user_id>` channel
listens for new `workspace_keys` rows addressed to the current user.

## 7. Enums and checks

### `notification_type`

```sql
CREATE TYPE public.notification_type AS ENUM ('mention', 'comment');
```

The following columns are constrained by checks rather than enums:

- `pages.kind` IN `('markdown', 'kanban', 'table')`
- `workspace_members.role` IN `('owner', 'admin', 'member', 'guest')`
- `content_keys.status` IN `('active', 'rotating', 'retired')`
- `key_rotations.status` IN `('pending', 'running', 'completed', 'failed')`
- `device_link_requests.status` IN `('pending', 'approved', 'rejected', 'consumed', 'expired')`

## 8. Retention policy (RGPD)

Enforced by the `cleanup-retention` edge function (see [api.md](./api.md)):

| Table | Retention | Action |
| --- | --- | --- |
| `activity_logs` | 90 days | `DELETE` |
| `security_events` | 1 year | `DELETE` |
| `ai_requests` | 30 days | `DELETE` |
| `notifications` | 90 days | `DELETE` |
