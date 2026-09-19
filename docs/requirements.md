# OpenCadre — Requirements Analysis

Boards, notes, and tasks. Organized.

This document describes the need analysis for OpenCadre: the target users
(personas), the problems the application solves, the user stories that express
the desired behavior, the user journeys that walk through real flows, and the
functional and non-functional requirements that derive from them.

## 1. Introduction

OpenCadre is a web-based workspace application that lets teams and individuals
organize ideas, projects, and knowledge in one place. It combines three core
content types in a single tool:

- **Markdown pages** for writing and documentation, with real-time
  collaborative editing.
- **Kanban boards** for task and project tracking.
- **Tables** for structured data.

A single workspace can contain any mix of these pages, so users can shape the
tool to the way they work instead of adapting to a fixed structure.

## 2. Problem statement

Knowledge work is fragmented across many tools. Documentation lives in one
application, tasks in another, and structured data in a third. Teams either pay
for several products, or compromise by forcing all their work into one
ill-fitting tool.

OpenCadre addresses this with a single workspace where **pages** are the core
unit. A page can be a document, a board, or a table. Every page supports
comments, mentions, tags, and real-time updates, so the collaborative
experience is consistent no matter what kind of page a user is working in.

### Stakeholders

| Stakeholder | Interest |
| --- | --- |
| Individual users | Personal knowledge management, note taking, and task tracking in one tool |
| Small teams | Shared workspaces, role-based access, invitations, collaboration |
| Workspace owners | Administer members, roles, permissions, and the workspace itself |
| Evaluators | Need a demonstrable, secure, documented application |

## 3. Personas

### 3.1 Alex, the individual power user
- **Role:** Knowledge worker and personal project manager.
- **Goals:** Keep notes, track side-project tasks, and reference past work.
- **Pain points:** Uses separate apps for notes, tasks, and tables; wants one
  home for all of them.
- **Needs:** Fast markdown editing, a simple kanban board, offline-friendly
  short pages, and instant search across content.

### 3.2 Marie, the team lead
- **Role:** Leads a small product team or a student group project.
- **Goals:** Share a workspace, distribute tasks, and keep everyone aligned.
- **Pain points:** Cannot see what the team is working on without status
  meetings; struggles to manage who can edit what.
- **Needs:** Workspaces with role-based access, member invitations, assignees,
  due dates, comments, and mentions.

### 3.3 Sam, the guest collaborator
- **Role:** External contributor or reviewer.
- **Goals:** Read and comment on content, offer feedback, and be mentioned
  without a full membership.
- **Pain points:** Does not want to dig through authorization complexity.
- **Needs:** Read-only access by default, the ability to be mentioned, and
  clear visibility of what they can and cannot do.

## 4. User stories

Stories are grouped by capability area. The acceptance criteria are *internal*:
each story maps to real behavior in the application.

### 4.1 Authentication and account

| ID | As a... | I want to... | So that... |
| --- | --- | --- | --- |
| A-01 | visitor | sign up with an email and a password | I can create an account. |
| A-02 | visitor | be asked to confirm my email | the platform verifies my address. |
| A-03 | user | sign in with my credentials | I can reach my workspaces. |
| A-04 | user | request a password reset | I can recover access when I forget my password. |
| A-05 | user | delete my account atomically | my personal data is erased (RGPD). |
| A-06 | user | accept the terms and privacy policy at signup | I give informed consent (RGPD). |

### 4.2 Workspaces and members

| ID | As a... | I want to... | So that... |
| --- | --- | --- | --- |
| W-01 | user | create a workspace | I have a home for my pages. |
| W-02 | owner | invite members by email with a role | I control who joins and their permissions. |
| W-03 | invitee | accept an invite with a token | I join without being able to self-register into random spaces. |
| W-04 | owner/admin | change or remove members | I can manage access over time. |
| W-05 | member | see the member list and my own role | I know what I am allowed to do. |
| W-06 | owner | rename or delete the workspace | I can administer it. |
| W-07 | guest | only read content | I cannot mutate work by accident. |

### 4.3 Pages

| ID | As a... | I want to... | So that... |
| --- | --- | --- | --- |
| P-01 | member | create a markdown, kanban, or table page | I can choose the right format. |
| P-02 | member | rename a page | I can keep it meaningful. |
| P-03 | member | reorder pages in the sidebar | I control my workspace layout. |
| P-04 | member | duplicate a page | I can reuse structure. |
| P-05 | member | soft-delete a page and restore it | I can undo mistakes. |
| P-06 | member | mark pages as favorites | I can reach important pages fast. |
| P-07 | member | see recently visited pages | I can return to active work. |

### 4.4 Markdown

| ID | As a... | I want to... | So that... |
| --- | --- | --- | --- |
| M-01 | member | edit markdown with a rich editor | I do not need to write raw syntax. |
| M-02 | member | preview rendered markdown | I see how it will look. |
| M-03 | member | collaborate live with teammates | we can edit the same page at once. |
| M-04 | member | mention a teammate with `@` | they get notified. |

### 4.5 Kanban

| ID | As a... | I want to... | So that... |
| --- | --- | --- | --- |
| K-01 | member | create columns | I can model workflow stages. |
| K-02 | member | drag and drop cards between columns | I can move work along. |
| K-03 | member | set a title, description, and due date on a card | I capture the details. |
| K-04 | member | assign teammates to a card | I distribute ownership. |
| K-05 | member | tag cards with colors | I can categorize work. |
| K-06 | member | reorder cards inside a column | I can prioritize. |

### 4.6 Tables

| ID | As a... | I want to... | So that... |
| --- | --- | --- | --- |
| T-01 | member | edit an inline table | I can manage structured data. |
| T-02 | member | add and remove columns and rows | I shape the data model. |
| T-03 | member | import and export CSV | I can move data in and out. |

### 4.7 Collaboration

| ID | As a... | I want to... | So that... |
| --- | --- | --- | --- |
| C-01 | member | comment on a page | I can discuss content in context. |
| C-02 | author | react to comments | I can acknowledge feedback quickly. |
| C-03 | member | be notified of mentions and new comments | I do not miss updates. |
| C-04 | member | control which notifications I receive | I am not flooded with noise. |

### 4.8 AI assistance

| ID | As a... | I want to... | So that... |
| --- | --- | --- | --- |
| AI-01 | member | generate content with an AI assistant | I can draft faster. |
| AI-02 | member | have AI output inserted directly as markdown | I can use it immediately. |

## 5. User journeys

### 5.1 Onboarding: from signup to first page

```
Sign up (email, display name, consent)
  -> Email confirmation
  -> Redirect to /workspace
  -> Create a workspace
  -> Create first page (markdown by default)
  -> Result: first empty page ready to edit
```

### 5.2 Team collaboration: invite a member

```
Owner opens workspace settings
  -> Invites a member with email + role (member)
  -> Edge function creates a pending workspace_member with invite_token
  -> Email (if SMTP configured) contains an accept link
  -> Recipient opens link (no account yet) -> signs up
  -> accept_invite() links the pending row to their account
  -> Recipient appears in the member list with the granted role
```

### 5.3 Daily work: task on a board

```
Open a kanban page
  -> Add a column (e.g. "In progress")
  -> Create a card with title and due date
  -> Assign a teammate
  -> Drag the card to another column
  -> Position persists to the database and updates live for teammates
```

### 5.4 Document review: mention and comment

```
Open a markdown page
  -> Write content; @-mention a teammate
  -> Mention creates a notification (create_mention_notification RPC)
  -> Teammate reads the notification and opens the page
  -> Teammate leaves a comment -> comment notification fans out to the workspace
```

### 5.5 RGPD erasure: delete account

```
User settings -> Delete account
  -> Edge function delete-account (JWT verified)
  -> delete_user_account() RPC erases personal rows and the auth user in one
     transaction
  -> Client signs out and returns to the landing page
```

## 6. Functional requirements (summary)

Derived from the user stories above. Coded by area.

| Area | Requirements |
| --- | --- |
| Auth | Email + password signup/signin, email confirmation, password reset, secure password rules (8+ chars, upper/lower/digit), account deletion |
| Authorization | Workspace owner/admin/member/guest roles; owner-only workspace mutation; owner/admin member management; guests read-only; server-side RLS enforcement |
| Workspaces | CRUD, member management, invitations via token, role display |
| Pages | CRUD, soft delete/restore, reorder, duplicate, favorite, recents |
| Markdown | Rich editing, preview, collaborative editing (Yjs), mentions |
| Kanban | Columns and cards CRUD, drag-and-drop reorder, assignees, due dates, tags |
| Tables | Inline editing, column/row management, CSV import/export |
| Comments | Threaded comments on pages and cards, reactions, notifications |
| Notifications | Mention + comment notifications, preferences, read/unread |
| AI | Streaming content generation, editor integration |
| Realtime | Live updates across pages, boards, comments, notifications |
| RGPD | Consent, privacy/terms pages, retention cleanup, account erasure |

## 7. Non-functional requirements

| Category | Requirements |
| --- | --- |
| Security | Secure auth (JWT, refresh rotation, rate limits), RLS on every table, parameterized queries, markdown output sanitization against XSS, JWT-verified edge functions, secrets stored server-side, minimal `.env` surface |
| Performance | Lean bundle via code splitting per editor vendor, lazy route components, realtime dedup to avoid write echo, indexed hot query paths |
| Accessibility | Keyboard-friendly Web Awesome components, semantic focus states, tooltips with accessible labels; progress on accessible UI |
| Responsiveness | Responsive layout targeting desktop and mobile; the layout adapts to viewport width |
| Reliability | Consistent error handling with user-facing messages, debounced persistence to limit round-trips, atomic transactional RPCs |
| Maintainability | Feature-based structure, typed database layer, shared UI primitives, consistent conventions (lint + format via Biome) |
| Testability | Unit tests for all validation schemas and permission logic, utility tests for realtime reconciliation and hotkeys |
| Compliance | GDPR/RGPD-minded practices: explicit consent, data erasure, retention cleanup, privacy/terms pages |

## 8. Constraints and assumptions

- **Backend as a service:** Supabase provides auth, Postgres, realtime, and
  edge functions; the team does not operate its own servers.
- **Deployment:** Cloudflare Pages hosts the built SPA (production on `main`,
  preview on `dev`).
- **Modern browser only:** the application targets evergreen browsers
  (Chrome, Firefox, Safari, Edge). No legacy browser support.
- **Single region/tenant model:** workspaces are multi-user *within* the
  application; there is currently no cross-tenant (multi-organization)
  hierarchy.
- **Local Supabase for development:** Docker-backed local stack mirrors the
  remote environment with the same schema and RLS.