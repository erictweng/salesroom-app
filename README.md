# Salesroom — Digital Sales Room

A per-account "sales room" where a rep curates content for a buyer and sees
identity-attributed engagement. Built on Next.js (App Router) + SQLite, backed by
a local mock CRM server that stands in for Salesforce.

This is a complete mini Digital Sales Room across all five phases (P0–P4): the
CRM client, the SQLite store, session/auth, the events/rooms API, the rep-facing
curation UI (account picker, room builder, reorderable/​hideable content), the
buyer-facing room that emits identity-attributed engagement, and the rep's
auto-refreshing feed with deterministic insight cards.

## Seller portal (P1)

Sign in as a rep at `/login`, then:

- **Account picker** (`/seller`) lists every CRM account, with **name search** so
  it scales. One click opens the account's room, creating it (idempotently) and
  seeding it with the full content library if it doesn't exist yet.
- **Room builder** (`/seller/rooms/[slug]`) is build-first: a compact
  **engagement KPI strip** stays glanceable up top, and the five panels (Account
  Snapshot, Stakeholder Map, Deal Overview, Content Hub, Activity & Engagement) are
  **collapsible** (state per browser) and **drag-to-reorder** — the panel order is
  saved **per room** (`rooms.section_order`, default order as fallback), with a
  "Reset layout" control. Each stakeholder is **clickable → a profile modal** with
  full CRM detail (email, phone, LinkedIn, role, seniority, engagement score, last
  activity). The underlying modules:
  - **A — Account Snapshot**: account + enrichment context, degrades gracefully
    when fields or enrichment are missing.
  - **B — Stakeholder Map**: contacts with the Champion highlighted, the primary
    contact starred, each colored by the CRM `engagement_score` (labeled "CRM
    score" so it's never confused with live in-room activity). Includes name search
    and a role / minimum-CRM-score filter.
  - **C — Content Hub**: curated resources grouped by category, with an embedded,
    click-to-play YouTube player for videos.
  - **D — Deal Overview**: the CRM pipeline for the account — each opportunity's
    stage (a stepper), amount, close date, days-in-stage, owner, next step,
    products, and competitors, plus a pipeline total. Its own panel, separate from
    engagement, because pipeline state and live buyer behavior are two different
    questions the rep acts on differently.
  - **E — Activity & Engagement**: the in-room feed (empty until buyers generate
    events in P2; populated with insights in P3) plus the analytics summary.

All CRM reads happen in server components / server actions; the token never
reaches the browser. Non-reps are sent to a friendly `/forbidden` page.

Each room has **publish controls**: a draft/published status, a Publish/Unpublish
toggle, Copy Link (the buyer URL), and Preview Buyer Room (opens the public route
in a new tab). Only published rooms are visible to buyers.

The Content Hub is an editable **Kanban board** (P4): each content category is a
column (fixed canonical order, shown even when empty), and resources are cards.
The rep **drags a card within a column to reorder** it and **drags it to another
column to recategorize** — one gesture does both (`@dnd-kit` multi-container, with
a drag overlay and shuffle animation). Hide/Unhide toggles per card. Category is a
per-room override (`room_resources.category`, falling back to the CRM category),
so re-categorizing never touches the shared catalog. All edits are optimistic and
persist via server actions (one flattened order write + a category write when a
card changes column); the buyer's view groups by the same effective category and
order on next load.

**Internal notes (rep-only).** A floating comment button at the bottom-right of the
room opens a Google-Docs-style notes pane (`room_notes`). Each note is attributed
to the signed-in rep and timestamped (e.g. _"Sarah · Stakeholder Map · 'This guy
is at the top of the food chain!' — 10:08 am, Jun 7th, 2026"_), can optionally be
tagged to a section, and is individually deletable (plus "Clear all", so there's
no backlog). A red badge shows **unread** notes — anything added since the rep last
opened the pane (tracked per browser); it clears on open. A tagged note is
**clickable**: it closes the pane, expands the target section if collapsed, scrolls
to it, and flashes a brief highlight. Notes are never loaded for the buyer view.

## Buyer loop (P2)

Buyers open `/room/[slug]` and the page resolves to one of four states: an inline
**login prompt** (unauthenticated), **not authorized** (wrong account — enforced
by the CRM's own 403 scoping, not a parallel ACL), **not published yet** (draft),
or the **room** itself. Hidden resources are filtered server-side, so they never
reach the browser.

The room follows the provided design: a slim Secureframe top bar, a
dark→bright-green hero with the welcome and a "Have a question?" rep card, a tab
bar (Resources active; the other tabs are out of scope), and a **two-level
Resources experience** — a category grid that drills into a per-category list.
Every consumption action emits an **identity-attributed event** that appears in
the rep's feed (e.g., "Sarah watched Product Demo for 42 seconds"):

| Event | Fires when | Dedup |
| ----- | ---------- | ----- |
| `ROOM_VIEWED` | room opens | once per session |
| `RESOURCE_OPENED` / `RESOURCE_REVISITED` | a PDF is opened (first vs. repeat) | per resource, per session |
| `VIDEO_PLAYED` | first play (YouTube IFrame API) | once per video |
| `VIDEO_PROGRESS` | crossing 25% / 50% / 75% | once each; seeking back never re-fires |
| `VIDEO_COMPLETED` | the player's ENDED state only | once per video |

Resilience built in: if the YouTube IFrame API can't load (adblocker/offline) the
card falls back to a plain embed; events post with `keepalive` so a mid-watch
event survives a tab close; and dedup uses `sessionStorage`, so refreshes and
React re-renders don't flood the feed.

## Architecture at a glance

- **Next.js App Router** with server-side route handlers. All CRM calls happen on
  the server; the CRM bearer token lives only in an httpOnly cookie and never
  reaches the browser.
- **Read-only CRM boundary.** The CRM is treated as a read-only system of record.
  The only non-GET call the app makes to it is `POST /api/auth/login`. Every app
  mutation (rooms, curated resources, engagement events) goes to **SQLite**.
- **SQLite via better-sqlite3** for `rooms`, `room_resources`, `room_notes`, and
  `events`.

## Architecture & trade-offs

Almost every backend choice here optimizes for a simple, fast, demoable
single-node loop, deliberately trading away horizontal scale, caching, and
multi-user concurrency. The honest tally:

- **SQLite (better-sqlite3).** Buys a zero-config, single-file, fully
  transactional store with a synchronous API — no connection pool, no ORM, no
  network hop, and it's fast at this data scale. The cost: synchronous queries run
  on the Node event loop, so a heavy query blocks every other request; SQLite
  serializes writes (one writer at a time, even under WAL); and it's one file on
  one machine, so you can't run multiple app instances against it or get managed
  backups/replication. The first thing to swap (for Postgres) at real scale.
- **Read-only CRM, all calls server-side.** The CRM stays the system of record,
  the JWT never reaches the browser, and authorization is delegated to the CRM's
  own 403 scoping rather than a parallel ACL. The cost: every room render fans out
  several CRM calls with no caching, so the same account/contacts/content are
  re-fetched on every load and every ~15s refresh, and we're coupled to CRM
  latency and uptime. It also means we can't persist anything the CRM doesn't
  expose (why custom content uploads were dropped).
- **Server Actions instead of a REST/GraphQL API.** Far less boilerplate,
  type-safe end to end, nothing to version. The cost: the backend isn't consumable
  by non-Next clients (mobile, third parties), and it's awkward to test in
  isolation — which is why a few `/api` routes are kept purely so the HTTP smoke
  scripts have stable endpoints, duplicating a little logic.
- **Insights computed on every read.** `computeInsights` runs over the event list
  each render, so numbers are always fresh, there's no materialized state to
  invalidate, and the function is pure (trivially testable). The cost: it's
  O(events) per request (up to ~1000 rows), recomputed on every render and
  refresh, with no memoization — at higher volume you'd want rolled-up aggregates.
- **Event retention by prune-on-insert (7 days / 500 per room).** Keeps the table
  bounded with no cron or background worker — simple and deterministic. The cost:
  two `DELETE`s run synchronously on every insert (wasteful on a hot write path),
  and old events are gone for good — no archival, so no long-term history.
- **localStorage for some UI state** (panel collapse, the notes "unread" marker).
  Instant, no round-trip. The cost: it's per-browser, not per-user on the server,
  so "unread" doesn't follow you across devices and resets on a cache clear — a
  convenience, not authoritative data.
- **Optimistic UI with id-signature resync** (notes, reordering). Snappy, and it
  survives the auto-refresh. The cost: brief client/server divergence windows, and
  concurrent edits are last-write-wins with no conflict resolution — fine for one
  rep per room, not collaborative editing.
- **Hand-rolled migrations.** `migrate()` does guarded additive `ALTER TABLE`s and
  creates new tables via `CREATE TABLE IF NOT EXISTS`. Dependency-free and simple,
  but there's no version tracking, no down-migrations, and complex changes
  (renames, type changes, backfills) would get painful.

For production the first three changes would be: a caching layer in front of the
CRM, moving insights and pruning off the request path (precomputed aggregates +
a background job), and swapping SQLite for Postgres. See **Design decisions &
known limitations** below for the product-level counterparts to these.

## Prerequisites

- Node.js 18.18+ (Node 20 or 22 recommended)
- The mock CRM server binary from
  [secureframe/salesroom-crm-servers](https://github.com/secureframe/salesroom-crm-servers)

## Running locally

### 1. Start the CRM server

Download/clone the CRM binary repo and run the binary for your platform. It
listens on **http://localhost:8080**:

```bash
# macOS (Apple Silicon)
chmod +x ./crm-server-darwin-arm64
./crm-server-darwin-arm64
```

### 2. Start this app

```bash
cd salesroom-app
cp .env.example .env.local   # adjust if your CRM runs on a different port
npm install
npm run dev
```

The app runs on http://localhost:3000.

> `npm install` compiles `better-sqlite3` for your platform. If you copied this
> folder between machines, delete `node_modules` and re-run `npm install`.

### Environment variables

| Variable         | Default                     | Purpose                                   |
| ---------------- | --------------------------- | ----------------------------------------- |
| `CRM_BASE_URL`   | `http://localhost:8080`     | Base URL of the mock CRM server           |
| `SESSION_SECRET` | dev placeholder             | Reserved for signing the session cookie   |
| `DATABASE_PATH`  | `./data/salesroom.db`       | SQLite file location (auto-created)        |
| `DEMO_ACCOUNTS`  | unset (`0`)                 | Pad the picker with N synthetic accounts (scale testing) |

Reset the local database at any time with `npm run db:reset`.

Set `DEMO_ACCOUNTS=100` to stress-test the account picker's search/filter/grid-list
at scale. These synthetic accounts are display-only (their "Create room" is
disabled, since they have no CRM record); the real CRM accounts still work.

## Demo accounts

All passwords are `demo1234`.

| Email                          | Role  | Scope                          |
| ------------------------------ | ----- | ------------------------------ |
| `sarah.chen@salesroom.io`      | rep   | All accounts                   |
| `marcus.thompson@salesroom.io` | rep   | All accounts                   |
| `d.park@meridianrobotics.com`  | buyer | Meridian Robotics (acc_001)    |
| `p.sharma@velorahealth.com`    | buyer | Velora Health (acc_002)        |
| `e.rodriguez@velorahealth.com` | buyer | Velora Health (acc_002)        |

> Rep and buyer sessions share one cookie. To exercise both roles at once, use
> two browsers or an incognito window.

## API surface (P0)

| Method & path           | Auth        | Purpose                                            |
| ----------------------- | ----------- | -------------------------------------------------- |
| `POST /api/auth/login`  | none        | Log in; sets httpOnly session cookie               |
| `POST /api/auth/logout` | none        | Clear the session                                  |
| `GET  /api/auth/me`     | session     | Current user identity                              |
| `GET  /api/accounts`    | session     | List CRM accounts (proxied server-side)            |
| `POST /api/rooms`       | rep         | Create/open a room for an account; seeds resources |
| `GET  /api/rooms/:slug` | none        | Fetch a room and its resources (404 if unknown)    |
| `POST /api/events`      | session     | Record an engagement event (validated, attributed) |
| `GET  /api/events?slug` | rep         | Engagement feed for a room, newest first           |

### Event types

`ROOM_VIEWED`, `RESOURCE_OPENED`, `RESOURCE_REVISITED`, `VIDEO_PLAYED`,
`VIDEO_PROGRESS`, `VIDEO_COMPLETED`. Any other value is rejected with `400`.

## Feed & insights (P3)

The seller room builder shows an **auto-refreshing** activity feed plus four
deterministic insight cards:

- **Top stakeholder** — the buyer with the most events (tiebreak: latest
  activity, then name).
- **Most-viewed resource** — the content with the most interactions (same
  tiebreak, then title).
- **Last activity** — most recent event, with a unique-visitor count that
  surfaces multi-threading (e.g., two buyers at one account).
- **Suggested follow-up** — a templated next step mapped from the most-viewed
  content's category (no LLM, fully deterministic).

Insights count buyers only — the rep's own preview actions are excluded from the
analysis (and shown in the feed tagged "preview"). The feed re-renders via
`router.refresh()` on tab focus and on a ~15s interval, so a buyer action appears
shortly after the rep looks back at the tab. All ordering uses server time, and a
fresh room renders empty states rather than dividing by zero.

The engagement section also includes an **Analytics** summary — an activity-type
breakdown (inline bars), top resources, and top people — and the activity feed
**scrolls** within a fixed height so a busy room doesn't stretch the page.

**Event retention.** To keep storage bounded, events are pruned on insert: anything
older than `EVENT_RETENTION_DAYS` (7) is deleted, and each room keeps at most
`MAX_EVENTS_PER_ROOM` (500) of its most recent events. Insights/analytics therefore
reflect roughly the last week of activity. (Both constants live in `src/lib/repo.ts`.)

## Testing

- **Unit tests** (Vitest + React Testing Library) cover the edge cases the seed
  data can't trigger — null enrichment, missing fields, empty stakeholder lists,
  no Champion, null scores — plus the deal-picker and YouTube-URL logic:

  ```bash
  npm test
  ```

- **HTTP smoke tests** exercise each phase end to end. Start the CRM binary and
  `npm run dev`, then:

  ```bash
  bash scripts/test-p0.sh   # backend: auth, CRM proxy, events→sqlite→feed, 404/400, concurrency guard, read-only CRM
  bash scripts/test-p1.sh   # seller: login → picker → create/seed → modules → role guard
  bash scripts/test-p2.sh   # buyer: login prompt, not-authorized/not-published, 6 events, rich feed
  bash scripts/test-p3.sh   # insights: top stakeholder, most-viewed, follow-up, multi-buyer, rep-exclusion
  bash scripts/test-p4.sh   # polish: reorder + hide reflected, buyer exclusion, demo seed
  ```

  Each script assumes a reasonably clean database — run one after a fresh
  `npm run dev` (delete `data/` or `npm run db:reset` to reset). They share one
  SQLite file, so running them back-to-back against the same DB can interfere
  (e.g. the seed step skips rooms that already have events).

## Optional: seed demo activity

To make a room's feed and insights look alive for a walkthrough, populate a few
past-dated buyer events (idempotent — skips rooms that already have events):

```bash
npm run seed
```

## Pre-submission QA checklist

- [x] Fresh clone + README steps run against the CRM binary
- [x] All five panels (Account Snapshot, Stakeholder Map, Deal Overview, Content Hub, Activity/Insights) visible and populated; internal-notes pane works
- [x] All 6 event types fire and are accepted, no duplicates (client dedup + server validation)
- [x] Multi-threading: two Velora buyers both appear, attributed, in the feed/insights
- [x] Read-only CRM confirmed (only non-GET CRM call is auth/login — static-checked in `test-p0.sh`)
- [x] Empty states (fresh room, no enrichment, no events) don't crash
- [x] 401 / 403 / 404 paths show friendly UI (login prompt, not-authorized, not-published, /forbidden)
- [x] Reorder + hide persist and reflect in the buyer view
- [ ] Loom / walkthrough recorded (do this last, on your machine)

> The one path not covered by the sandbox test suite is **live in-browser video
> playback** firing the progress events through the YouTube IFrame API (no
> headless browser here). The threshold/dedup logic and the event plumbing are
> unit- and HTTP-tested; confirm the live player with a 60-second manual pass.

## Design decisions & known limitations

- **`content_id` is not validated against the CRM catalog.** Event bodies are
  validated structurally — `type` must be one of the six known values, and
  resource/video events must carry a string `content_id` — but the id is not
  checked against the CRM or the room's resource list. Events are an append-only
  engagement log whose value is identity attribution; an unknown id simply won't
  resolve to a card at render time. This keeps event ingestion off the CRM's
  availability path and avoids a network round-trip on a hot endpoint.
- **Rooms are 1:1 with accounts.** Re-creating a room for an account opens the
  existing one instead of duplicating. A `UNIQUE(account_id)` index enforces
  this, and room creation has a concurrency guard: if two requests race, the
  loser returns the winner's room rather than surfacing a constraint error.
- **Account picker renders client-side.** Search, filters, and the grid/list view
  all run over the full account list in the browser. That's fine for the CRM's
  handful of accounts (and verified smooth at 100+ via `DEMO_ACCOUNTS`), but a
  real deployment with thousands of accounts would need server-side pagination,
  query-side filtering, and list virtualization. Same applies to the activity
  feed, which is capped at a recent window rather than paginated.
- **One session cookie per browser.** Rep and buyer sessions share the
  `sf_session` cookie, so logging in as one role replaces the other in the same
  browser. Use two browsers / incognito to exercise both roles at once.
- **CRM availability.** If the CRM server is unreachable, CRM-backed routes
  return `503` with a retry hint rather than hanging.

## Third-party libraries

- **next / react** — App Router framework and UI.
- **better-sqlite3** — synchronous embedded SQLite for rooms, resources, events.
- **jose** — decode the CRM JWT to read the current user from the session cookie.
- **tailwindcss** — styling.
- **@dnd-kit/core · sortable · utilities** — drag-and-drop reordering of room
  content (with the sliding shuffle animation).
- **vitest · @testing-library/react · jsdom** — unit/component tests (dev only).

## AI tools used

- **Claude (Cowork / Claude Code)** — used throughout: scaffolding the project,
  the CRM client, SQLite schema and API routes, the seller and buyer portals, the
  engagement-event tracking, feed insights, drag-and-drop content management, and
  the test suites (Vitest unit tests + per-phase HTTP smoke scripts).
