# Salesroom — Digital Sales Room

A per-account "sales room" where a rep curates content for a buyer and sees
identity-attributed engagement. Built on Next.js (App Router) + SQLite, backed by
a local mock CRM server that stands in for Salesforce.

This repository currently contains **P0 — the backend spine**: the CRM client,
the SQLite store, session/auth, and the events/rooms API. The seller and buyer
portals (P1–P4) build on top of it.

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
