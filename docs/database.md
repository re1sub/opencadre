# OpenCadre — Database Design

This document describes the Postgres database that backs OpenCadre. It covers
the 18 tables, their relationships, the RLS policies that enforce authorization,
the triggers and RPC functions that run server-side, and the realtime
publication. All of this is defined in a single migration:
`supabase/migrations/20260910132550_remote_schema.sql`.

## 1. Entity-relationship diagram

```mermaid
erDiagram
    auth_users["auth.users"] {
        uuid id PK
    }

    workspaces {
        uuid id PK
        uuid owner_id FK
        text name
        text description
        text default_page_kind
        timestamptz created_at
        timestamptz updated_at
    }

    workspace_members {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        text role
        text email
        uuid invite_token
        timestamptz created_at
    }

    profiles {
        uuid id PK
        text display_name
        text avatar_url
        timestamptz updated_at
    }

    pages {
        uuid id PK
        uuid workspace_id FK
        uuid owner_id FK
        text title
        text kind
        text icon
        boolean is_favorite
        boolean is_deleted
        timestamptz deleted_at
        integer "position"
        timestamptz created_at
        timestamptz updated_at
    }

    page_content {
        uuid id PK
        uuid page_id FK "1:1 unique"
        jsonb content
        integer version
        timestamptz created_at
        timestamptz updated_at
    }

    page_visits {
        uuid id PK
        uuid user_id FK
        uuid page_id FK
        uuid workspace_id FK
        timestamptz viewed_at
    }

    tags {
        uuid id PK
        uuid workspace_id FK
        text name
        text color
        timestamptz created_at
    }

    columns {
        uuid id PK
        uuid page_id FK
        text title
        integer "position"
        text color
        timestamptz created_at
        timestamptz updated_at
    }

    cards {
        uuid id PK
        uuid column_id FK
        uuid page_id FK
        text title
        text description
        integer "position"
        timestamptz due_date
        uuid[] assignee_ids
        timestamptz created_at
        timestamptz updated_at
    }

    card_tags {
        uuid id PK
        uuid card_id FK
        uuid tag_id FK
        timestamptz created_at
    }

    comment_threads {
        uuid id PK
        text entity_type
        uuid entity_id
        timestamptz created_at
    }

    comments {
        uuid id PK
        uuid thread_id FK
        uuid author_id FK
        text content
        timestamptz created_at
        timestamptz updated_at
    }

    comment_reactions {
        uuid id PK
        uuid comment_id FK
        uuid user_id FK
        text reaction
        timestamptz created_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        notification_type type
        uuid actor_id FK
        uuid workspace_id FK
        text entity_type
        uuid entity_id
        uuid page_id
        text title
        text body
        jsonb data
        timestamptz read_at
        timestamptz created_at
    }

    activity_logs {
        uuid id PK
        uuid workspace_id FK
        uuid user_id FK
        text action
        text entity_type
        uuid entity_id
        jsonb metadata
        timestamptz created_at
    }

    ai_requests {
        uuid id PK
        uuid user_id FK
        uuid page_id FK
        uuid card_id FK
        text model
        text prompt
        text response
        integer tokens_used
        timestamptz created_at
    }

    user_settings {
        uuid user_id PK
        jsonb shortcuts
        jsonb notifications
        timestamptz created_at
        timestamptz updated_at
    }

    ydocs {
        uuid id PK
        uuid workspace_id FK
        text entity_type
        uuid entity_id
        text state
        bigint version
        timestamptz updated_at
    }

    auth_users ||--o| workspaces : "owns"
    auth_users ||--o{ workspace_members : "is member"
    auth_users ||--o| profiles : "has profile"
    auth_users ||--o{ comments : "authors"
    auth_users ||--o{ comment_reactions : "reacts"
    auth_users ||--o{ notifications : "receives"
    auth_users ||--o{ page_visits : "visits"
    auth_users ||--o{ ai_requests : "requests"
    auth_users ||--o{ pages : "owns"

    workspaces ||--o{ workspace_members : "has members"
    workspaces ||--o{ pages : "contains"
    workspaces ||--o{ tags : "has tags"
    workspaces ||--o{ activity_logs : "logs"
    workspaces ||--o{ notifications : "notifies in"
    workspaces ||--o{ page_visits : "visited in"
    workspaces ||--o{ ydocs : "stores docs"

    pages ||--o| page_content : "has content"
    pages ||--o{ page_visits : "tracked by"
    pages ||--o{ columns : "has columns"
    pages ||--o{ cards : "has cards"
    pages ||--o{ ai_requests : "generates for"

    columns ||--o{ cards : "contains"

    cards ||--o{ card_tags : "tagged via"

    tags ||--o{ card_tags : "linked via"

    comment_threads }o--o{ comments : "has comments"

    comments ||--o{ comment_reactions : "receives reactions"

    workspace_members }o--|| profiles : "references"
    workspace_members ||--o{ workspace_members : "same workspace"
```

## 2. Table reference

### 2.1 `workspaces`

The top-level container. Every page, tag, member, and log belongs to a
workspace.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `owner_id` | uuid | NOT NULL, FK `auth.users(id)` ON DELETE CASCADE |
| `name` | text | NOT NULL |
| `description` | text | nullable |
| `default_page_kind` | text | NOT NULL, CHECK IN `('markdown','kanban','table')` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

**Indexes:** none (checked via `workspace_members` relationship).

---

### 2.2 `profiles`

One row per auth user; created by the `handle_new_user()` trigger on
`auth.users` insert.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, FK `auth.users(id)` ON DELETE CASCADE |
| `display_name` | text | nullable, synced from user metadata on update |
| `avatar_url` | text | nullable |
| `updated_at` | timestamptz | default `now()` |

**RLS policy (read):** a workspace member can read another member's profile if
they share at least one workspace; the owner can always read their own.

---

### 2.3 `workspace_members`

Links users to workspaces. Pending invites have `user_id = NULL` and a unique
`invite_token`.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` |
| `workspace_id` | uuid | NOT NULL, FK `workspaces(id)` ON DELETE CASCADE |
| `user_id` | uuid | nullable, FK `profiles(id)` ON DELETE CASCADE |
| `role` | text | NOT NULL, CHECK IN `('owner','admin','member','guest')` |
| `email` | text | NOT NULL, default `''` |
| `invite_token` | uuid | nullable, UNIQUE index |
| `created_at` | timestamptz | NOT NULL, default `now()` |

**Unique constraint:** `(workspace_id, user_id)` when `user_id` is not null.

---

### 2.4 `pages`

A workspace page of one of three kinds: `markdown`, `kanban`, or `table`.
Soft-deleted pages keep `is_deleted = true` and are only hidden, not removed.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `workspace_id` | uuid | NOT NULL, FK `workspaces(id)` ON DELETE CASCADE |
| `owner_id` | uuid | nullable, FK `auth.users(id)` |
| `title` | text | NOT NULL, default `'Untitled'` |
| `kind` | text | NOT NULL, CHECK IN `('markdown','kanban','table')` |
| `icon` | text | nullable |
| `is_favorite` | boolean | NOT NULL, default `false` |
| `is_deleted` | boolean | NOT NULL, default `false` |
| `deleted_at` | timestamptz | nullable |
| `position` | integer | default `0` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

**Indexes:** `(workspace_id)`, `(is_deleted)`.

---

### 2.5 `page_content`

One-to-one with `pages` (unique `page_id`). Stores the editor payload as JSON.
The `version` column is bumped on every update by the `bump_page_content_version()`
trigger, enabling optimistic concurrency checks.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `page_id` | uuid | NOT NULL, UNIQUE, FK `pages(id)` ON DELETE CASCADE |
| `content` | jsonb | NOT NULL, default `'{}'` |
| `version` | integer | NOT NULL, default `1` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

---

### 2.6 `page_visits`

Records when a user views a page. Used for the "Recent pages" feature.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `user_id` | uuid | NOT NULL, FK `auth.users(id)` ON DELETE CASCADE |
| `page_id` | uuid | NOT NULL, FK `pages(id)` ON DELETE CASCADE |
| `workspace_id` | uuid | NOT NULL, FK `workspaces(id)` ON DELETE CASCADE |
| `viewed_at` | timestamptz | NOT NULL, default `now()` |

**Unique constraint:** `(user_id, page_id)` (one visit record per user per
page, updated via upsert).

---

### 2.7 `columns`

A Kanban column on a kanban-type page.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `page_id` | uuid | NOT NULL, FK `pages(id)` ON DELETE CASCADE |
| `title` | text | NOT NULL |
| `position` | integer | NOT NULL, default `0` |
| `color` | text | nullable |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

---

### 2.8 `cards`

A Kanban card inside a column. The `assignee_ids` array stores referenced user
ids directly (no join table) for efficient GIN-indexed lookups.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `column_id` | uuid | NOT NULL, FK `columns(id)` ON DELETE CASCADE |
| `page_id` | uuid | NOT NULL, FK `pages(id)` ON DELETE CASCADE |
| `title` | text | NOT NULL |
| `description` | text | nullable |
| `position` | integer | NOT NULL, default `0` |
| `due_date` | timestamptz | nullable |
| `assignee_ids` | uuid[] | default `ARRAY[]::uuid[]` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

**Indexes:** `(column_id)`, `(page_id)`, GIN on `(assignee_ids)`.

---

### 2.9 `tags`

Workspace-scoped tags for categorizing cards.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `workspace_id` | uuid | NOT NULL, FK `workspaces(id)` ON DELETE CASCADE |
| `name` | text | NOT NULL |
| `color` | text | NOT NULL, default `'#6b7280'` |
| `created_at` | timestamptz | NOT NULL, default `now()` |

---

### 2.10 `card_tags`

Join table linking cards to tags.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `card_id` | uuid | NOT NULL, FK `cards(id)` ON DELETE CASCADE |
| `tag_id` | uuid | NOT NULL, FK `tags(id)` ON DELETE CASCADE |
| `created_at` | timestamptz | NOT NULL, default `now()` |

**Unique constraint:** `(card_id, tag_id)`.

---

### 2.11 `comment_threads`

A thread tied to either a `page` or a `card` (polymorphic via
`entity_type` + `entity_id`).

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `entity_type` | text | NOT NULL, CHECK IN `('page','card')` |
| `entity_id` | uuid | NOT NULL |
| `created_at` | timestamptz | NOT NULL, default `now()` |

**Index:** `(entity_type, entity_id)`.

---

### 2.12 `comments`

A single comment in a thread.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `thread_id` | uuid | NOT NULL, FK `comment_threads(id)` ON DELETE CASCADE |
| `author_id` | uuid | NOT NULL, FK `auth.users(id)` ON DELETE SET NULL |
| `content` | text | NOT NULL |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

**Index:** `(thread_id)`, `(author_id)`.

---

### 2.13 `comment_reactions`

Reactions on comments. Unique per `(comment_id, user_id, reaction)`.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` |
| `comment_id` | uuid | NOT NULL, FK `comments(id)` ON DELETE CASCADE |
| `user_id` | uuid | NOT NULL, FK `auth.users(id)` ON DELETE CASCADE |
| `reaction` | text | NOT NULL |
| `created_at` | timestamptz | NOT NULL, default `now()` |

---

### 2.14 `notifications`

Pushed to users on mention or new comment. The `type` column uses the custom
enum `notification_type('mention','comment')`.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL, FK `auth.users(id)` ON DELETE CASCADE |
| `type` | notification_type | NOT NULL |
| `actor_id` | uuid | nullable, FK `auth.users(id)` ON DELETE SET NULL |
| `workspace_id` | uuid | NOT NULL |
| `entity_type` | text | NOT NULL |
| `entity_id` | uuid | NOT NULL |
| `page_id` | uuid | nullable |
| `title` | text | NOT NULL |
| `body` | text | nullable |
| `data` | jsonb | NOT NULL, default `'{}'` |
| `read_at` | timestamptz | nullable |
| `created_at` | timestamptz | NOT NULL, default `now()` |

**Indexes:** `(user_id, created_at DESC)`, partial `(user_id) WHERE
read_at IS NULL`.

---

### 2.15 `activity_logs`

Immutable audit trail of workspace activity (page create, member join, etc.).
The `user_id` is anonymized after 180 days by `cleanup-retention`.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `workspace_id` | uuid | NOT NULL, FK `workspaces(id)` ON DELETE CASCADE |
| `user_id` | uuid | nullable, FK `auth.users(id)` ON DELETE SET NULL |
| `action` | text | NOT NULL |
| `entity_type` | text | NOT NULL |
| `entity_id` | uuid | nullable |
| `metadata` | jsonb | default `'{}'` |
| `created_at` | timestamptz | NOT NULL, default `now()` |

**Indexes:** `(created_at)`, `(workspace_id)`.

---

### 2.16 `ai_requests`

Logs each AI generation request. Rows older than 365 days are purged.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `uuid_generate_v4()` |
| `user_id` | uuid | NOT NULL, FK `auth.users(id)` ON DELETE SET NULL |
| `page_id` | uuid | nullable, FK `pages(id)` ON DELETE SET NULL |
| `card_id` | uuid | nullable, FK `cards(id)` ON DELETE SET NULL |
| `model` | text | NOT NULL |
| `prompt` | text | NOT NULL |
| `response` | text | nullable |
| `tokens_used` | integer | nullable |
| `created_at` | timestamptz | NOT NULL, default `now()` |

---

### 2.17 `user_settings`

Per-user preferences (keyboard shortcuts, notification preferences).

| Column | Type | Constraints |
| --- | --- | --- |
| `user_id` | uuid | PK, FK `auth.users(id)` ON DELETE CASCADE |
| `shortcuts` | jsonb | NOT NULL, default `'{}'` |
| `notifications` | jsonb | nullable |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

---

### 2.18 `ydocs`

Stores serialized Yjs documents for collaborative editing.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | uuid | PK, default `gen_random_uuid()` |
| `workspace_id` | uuid | NOT NULL, FK `workspaces(id)` ON DELETE CASCADE |
| `entity_type` | text | NOT NULL |
| `entity_id` | uuid | NOT NULL |
| `state` | text | NOT NULL, default `''` |
| `version` | bigint | NOT NULL, default `1` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

**Unique constraint:** `(entity_type, entity_id)`.

---

## 3. RLS policy matrix

RLS is enabled on **every** table, including new tables created in the future
(via the `ensure_rls` event trigger).

Policies are abbreviated. The helpers `is_workspace_member(id, user_id)`,
`get_user_role(id, user_id)`, and `is_workspace_owner_or_admin(id, user_id)`
resolve membership/role by querying `workspace_members`.

### Workspace and member policies

| Table | Operation | Policy | Role check |
| --- | --- | --- | --- |
| `workspaces` | INSERT | Any authenticated user can create | none |
| `workspaces` | SELECT | Member OR owner | `is_workspace_member` OR `auth.uid() = owner_id` |
| `workspaces` | UPDATE | Owner only | `get_user_role = 'owner'` |
| `workspaces` | DELETE | Owner only | `get_user_role = 'owner'` |
| `workspace_members` | SELECT | Workspace member | `is_workspace_member` |
| `workspace_members` | INSERT | Self-join OR owner/admin | `user_id = auth.uid()` OR owner/admin |
| `workspace_members` | UPDATE | Owner/admin | owner/admin role |
| `workspace_members` | DELETE | Owner/admin | owner/admin role |
| `profiles` | SELECT | Co-member of any workspace, OR owner self-read | `EXISTS (shared workspace)` OR self-owner |

### Page policies

| Table | Operation | Policy | Role check |
| --- | --- | --- | --- |
| `pages` | SELECT | Workspace member | `is_workspace_member` |
| `pages` | INSERT | owner/admin/member | `get_user_role IN (...)` |
| `pages` | UPDATE | owner/admin/member | `get_user_role IN (...)` |
| `pages` | DELETE | owner/admin only | `get_user_role IN (...)` |
| `page_content` | SELECT | Workspace member | `is_workspace_member` via parent page |
| `page_content` | INSERT | owner/admin/member | via parent page |
| `page_content` | UPDATE | owner/admin/member | via parent page |
| `page_visits` | SELECT/INSERT/UPDATE/DELETE | Own rows only | `auth.uid() = user_id` |

### Kanban policies

| Table | Operation | Policy | Role check |
| --- | --- | --- | --- |
| `columns` | SELECT | Workspace member | via parent page |
| `columns` | INSERT/UPDATE/DELETE | owner/admin/member | via parent page |
| `cards` | SELECT | Workspace member | via parent page |
| `cards` | INSERT/UPDATE/DELETE | owner/admin/member | via parent page |
| `card_tags` | SELECT | Workspace member | via parent page > card |
| `card_tags` | INSERT/DELETE | owner/admin/member | via parent page > card |
| `tags` | SELECT | Workspace member | `is_workspace_member` |
| `tags` | INSERT/UPDATE/DELETE | owner/admin/member | `get_user_role IN (...)` |

### Comment policies

| Table | Operation | Policy | Role check |
| --- | --- | --- | --- |
| `comment_threads` | SELECT | Workspace member | via `entity_type`/`entity_id` |
| `comment_threads` | INSERT | Any authenticated user | `auth.uid() IS NOT NULL` |
| `comments` | SELECT | Workspace member | via thread > page/card |
| `comments` | INSERT | Author only | `auth.uid() = author_id` |
| `comments` | UPDATE | Author only | `auth.uid() = author_id` |
| `comments` | DELETE | Author OR owner/admin | `auth.uid() = author_id` OR `is_workspace_owner_or_admin` |
| `comment_reactions` | SELECT | Thread member (indirect) | existence check via parent comment |
| `comment_reactions` | INSERT/DELETE | Own rows only | `auth.uid() = user_id` |

### Notification policies

| Table | Operation | Policy |
| --- | --- | --- |
| `notifications` | SELECT | Own only (`auth.uid() = user_id`) |
| `notifications` | UPDATE | Own only (mark read) |
| `notifications` | DELETE | Own only |

### Other

| Table | Operation | Policy |
| --- | --- | --- |
| `activity_logs` | SELECT | Workspace member |
| `activity_logs` | INSERT | Unrestricted (written by RPCs/service role) |
| `ai_requests` | SELECT/INSERT | Own only (`auth.uid() = user_id`) |
| `user_settings` | SELECT/INSERT/UPDATE | Own only (`auth.uid() = user_id`) |
| `ydocs` | SELECT/INSERT/UPDATE | Workspace member |
| `ydocs` | DELETE | Workspace member |

---

## 4. Triggers

| Table | Trigger | Event | Function | Purpose |
| --- | --- | --- | --- | --- |
| `auth.users` | `on_auth_user_created` | INSERT | `handle_new_user()` | Creates a `profiles` row for the new user. |
| `auth.users` | `on_auth_user_updated` | UPDATE | `sync_profile_display_name()` | Copies `raw_user_meta_data.display_name` to `profiles.display_name`. |
| `workspaces` | `update_workspaces_updated_at` | BEFORE UPDATE | `update_updated_at()` | Sets `updated_at = now()`. |
| `pages` | `update_pages_updated_at` | BEFORE UPDATE | `update_updated_at()` | Sets `updated_at = now()`. |
| `page_content` | `bump_page_content_version` | BEFORE UPDATE | `bump_page_content_version()` | Increments `version` by 1. |
| `page_content` | `update_page_content_updated_at` | BEFORE UPDATE | `update_updated_at()` | Sets `updated_at = now()`. |
| `columns` | `update_columns_updated_at` | BEFORE UPDATE | `update_updated_at()` | Sets `updated_at = now()`. |
| `cards` | `update_cards_updated_at` | BEFORE UPDATE | `update_updated_at()` | Sets `updated_at = now()`. |
| `comments` | `trg_comment_notifications` | AFTER INSERT | `handle_comment_notifications()` | Fans out `comment` notifications to workspace members (except the author). Runs as `SECURITY DEFINER`. |
| `comments` | `update_comments_updated_at` | BEFORE UPDATE | `update_updated_at()` | Sets `updated_at = now()`. |
| `user_settings` | `update_user_settings_updated_at` | BEFORE UPDATE | `update_updated_at()` | Sets `updated_at = now()`. |

### Event trigger

| Name | Event | Function | Purpose |
| --- | --- | --- | --- |
| `ensure_rls` | `ddl_command_end` on `CREATE TABLE` | `rls_auto_enable()` | Automatically runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on every new table in `public`. |

---

## 5. Realtime publication

The following tables are added to the `supabase_realtime` publication and are
available for live subscription:

```
activity_logs, card_tags, cards, columns, comment_reactions,
comment_threads, comments, notifications, page_content, pages,
tags, user_settings, workspace_members, workspaces, ydocs
```

Tables not in the publication (e.g. `page_visits`, `ai_requests`) are not
streamed to clients. `profiles` and `user_settings` are streamed, allowing the
client to see profile and settings changes in real time.

---

## 6. Column types enum

### `notification_type`

```sql
CREATE TYPE public.notification_type AS ENUM ('mention', 'comment');
```

### `pages.kind`

Constrained by: `CHECK (kind IN ('markdown', 'kanban', 'table'))`.

### `workspace_members.role`

Constrained by: `CHECK (role IN ('owner', 'admin', 'member', 'guest'))`.

---

## 7. Retention policy (RGPD)

Enforced by the `cleanup-retention` edge function (see [api.md](./api.md)):

| Table | Retention | Action |
| --- | --- | --- |
| `page_visits` | 90 days | `DELETE` |
| `activity_logs` | 180 days | `SET user_id = NULL`, scrub invitee emails from `metadata` |
| `ai_requests` | 365 days | `DELETE` |