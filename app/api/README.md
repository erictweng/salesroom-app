# `api/` — HTTP Endpoints

**What this is:** the handful of plain HTTP routes the app exposes. Most data flows
through server components/actions instead, so this list is intentionally small — it
covers auth, a couple of proxies, and the engagement firehose.

**The 30-second pitch:** "These are the few URLs the browser (and our smoke tests)
can hit directly — log in, record an event, fetch a room."

### The routes

| Endpoint | Who | What |
| -------- | --- | ---- |
| `POST /api/auth/login` | anyone | Logs in via the CRM, sets the secure session cookie. |
| `POST /api/auth/logout` | anyone | Clears the session. |
| `GET /api/auth/me` | signed-in | Returns the current user. |
| `GET /api/accounts` | signed-in | Lists CRM accounts (server-side proxy). |
| `POST /api/rooms` | rep | Create/open a room for an account (seeds content). |
| `GET /api/rooms/:slug` | anyone | Fetch a room + its resources. |
| `POST /api/events` | signed-in | Record an engagement event (validated + attributed to you). |
| `GET /api/events?slug=` | rep | The engagement feed for a room. |

### How it fits

`POST /api/events` is the one the buyer's browser calls constantly as they engage —
it validates the payload (`lib/events.ts`) and attributes it to the signed-in user
server-side, so the client can't spoof who did what. These routes also give the
`scripts/test-p*.sh` smoke tests stable URLs to assert against.
