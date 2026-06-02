# Salesroom — Digital Sales Room

A per-account "sales room" where a rep curates content for a buyer and sees
identity-attributed engagement. Built on Next.js (App Router) + SQLite, backed by
a local mock CRM server that stands in for Salesforce.

This repository contains **P0 (backend spine)**, **P1 (seller portal)**,
**P2 (buyer loop)**, and **P3 (feed + insights)**: the CRM client, the SQLite
store, session/auth, the events/rooms API, the rep-facing curation UI, the
buyer-facing room that emits identity-attributed engagement, and the rep's
auto-refreshing feed with deterministic insight cards. Final polish (P4) builds
on top of it.

## Seller portal (P1)

Sign in as a rep at `/login`, then:

- **Account picker** (`/seller`) lists every CRM account. One click opens the
  account's room, creating it (idempotently) and seeding it with the full
  content library if it doesn't exist yet.
- **Room builder** (`/seller/rooms/[slug]`) renders four modules on one page:
  - **A — Account Snapshot**: account + enrichment context, degrades gracefully
    when fields or enrichment are missing.
  - **B — Stakeholder Map**: contacts with the Champion highlighted, the primary
    contact starred, each colored by the CRM `engagement_score` (labeled "CRM
    score" so it's never confused with live in-room activity).
  - **C — Content Hub**: curated resources grouped by category, with an embedded,
    click-to-play YouTube player for videos.
  - **E — Activity & Engagement**: the in-room feed (empty until buyers generate
    events in P2; populated with insights in P3).
  - Plus a one-line **deal context** strip (most-advanced open opportunity).

All CRM reads happen in server components / server actions; the token never
reaches the browser. Non-reps are sent to a friendly `/forbidden` page.

Each room has **publish controls**: a draft/published status, a Publish/Unpublish
toggle, Copy Link (the buyer URL), and Preview Buyer Room (opens the public route
in a new tab). Only published rooms are visible to buyers.

## Buyer loop (P2)

Buyers open `/room/[slug]` and the page resolves to one of four states: an inline
**login prompt** (unauthenticated), **not authorized** (wrong account — enforced
by the CRM's own 403 scoping, not a parallel ACL), **not published yet** (draft),
or the **room** itself. Hidden resources are filtered server-side, so they never
reach the browser.

The room is a branded welcome hero, a "Have a question?" rep contact card, and
the tracked Content Hub. Every consumption action emits an **identity-attributed
event** that appears in the rep's feed (e.g., "Sarah watched Product Demo for 42
seconds"):

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
- **SQLite via better-sqlite3** for `rooms`, `room_resources`, and `events`.

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

Reset the local database at any time with `npm run db:reset`.

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
  ```

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
- **One session cookie per browser.** Rep and buyer sessions share the
  `sf_session` cookie, so logging in as one role replaces the other in the same
  browser. Use two browsers / incognito to exercise both roles at once.
- **CRM availability.** If the CRM server is unreachable, CRM-backed routes
  return `503` with a retry hint rather than hanging.

## AI tools used

- **Claude (Cowork / Claude Code)** — scaffolding the project structure, CRM
  client, SQLite schema, and API routes for the P0 backend spine.
