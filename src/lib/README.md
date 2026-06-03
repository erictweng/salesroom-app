# `lib/` — The Brains (domain logic + database)

**What this is:** plain TypeScript with no React and no UI. It's where the **data
lives** (our SQLite database) and where the **rules** are computed. Because it's
pure, it's the part we unit-test the hardest (see `__tests__/`).

**The 30-second pitch:** "All the thinking happens here — talking to the database,
reading the CRM, and turning raw events into insights. The UI just displays what
this layer produces."

### The database & external data

| File | What it does |
| ---- | ------------ |
| `db.ts` | Opens **SQLite** and defines the schema + lightweight migrations (`rooms`, `room_resources`, `room_notes`, `events`). |
| `repo.ts` | Every read/write to **our** database goes through here (rooms, curated content, notes, events, retention/pruning). |
| `crm.ts` | The **read-only** client for the mock CRM (accounts, contacts, deals, content). |
| `session.ts` | Reads the signed-in user out of the secure cookie. |
| `env.ts` / `http.ts` | Config + small fetch helper. |
| `types.ts` | Shared data shapes used everywhere. |

### The "thinking" helpers (pure & tested)

| File | What it computes |
| ---- | ---------------- |
| `insights.ts` | Turns raw events into the feed metrics, trend, category mix, top people. |
| `deals.ts` | Picks the primary opportunity + stage ordering. |
| `categories.ts` | The buyer-facing content taxonomy + which category each item belongs to. |
| `notes.ts` | Note targets + the "10:08 am, Jun 7th" timestamp formatting. |
| `sections.ts` | The room's panel keys + ordering. |
| `progress.ts` | Video 25/50/75% milestone logic. |
| `events.ts` | The 6 valid event types + payload validation. |
| `track.ts` | Client-side helper that posts engagement events (with session dedup). |
| `followups.ts`, `format.ts`, `youtube.ts`, `demoAccounts.ts`, `demoLogins.ts` | Follow-up templates, formatting, YouTube URL parsing, demo data. |

### How it fits

The **read-only-CRM guardrail** is enforced here: `crm.ts` only ever reads (its one
write is login), and all app changes go through `repo.ts` into SQLite. The pure
helpers have no side effects, which is why ~200 unit tests can cover them fast.
