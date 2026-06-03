# `server/` — The Guardrails (server-only boundary)

**What this is:** the gate between the browser and our data. Everything here runs
**only on the server** — it never ships to the browser — which is exactly why the
security rules can live here and be trusted.

**The 30-second pitch:** "This is the bouncer. It checks who you are, fetches only
what you're allowed to see, and is the only place that's allowed to change data."

### What's in here

| File | Role | The guardrail it enforces |
| ---- | ---- | ------------------------- |
| `guards.ts` | Auth checks (`requireAuth`, `requireRep`). | No session → bounce to login. Wrong role → a buyer can't reach the seller workspace. |
| `loaders.ts` | **Reads**: gather CRM + DB data into ready-to-render view models. | Buyer access is delegated to the CRM's own 403 scoping (a buyer only sees their own account's room); hidden content/categories are filtered out before anything is sent. |
| `actions.ts` | **Writes**: every mutation (create room, publish, reorder, hide, notes…). | All writes go to **SQLite, never the CRM**; the author of a note is taken from the session, not the client. |

### The four guardrails in one breath

1. **The CRM token never reaches the browser** — it lives in a server-only cookie,
   and only this layer reads it.
2. **The CRM is read-only** — the single non-GET call is login; everything else is
   a write to our own database.
3. **Auth is enforced server-side** — guards run before any data is fetched.
4. **Buyers are scoped** — they can only load a published room for their own
   account, and never see rep-only data (notes, competitors).

### How it fits

UI components call **loaders** to get data and **actions** to change it. They never
touch the CRM or database directly — they go through this boundary, so the rules
can't be bypassed from the client.
