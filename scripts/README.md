# `scripts/` — Dev & Test Utilities

**What this is:** the command-line helpers for setting up data and proving the app
works. Nothing here ships to users.

**The 30-second pitch:** "One command resets the database, one seeds demo activity,
and a set of scripts smoke-tests the whole app end to end."

### What's in here

| File | What it does | Run via |
| ---- | ------------ | ------- |
| `reset-db.mjs` | Wipes the local SQLite database (fresh start). | `npm run db:reset` |
| `seed-demo.mjs` | Adds a few past-dated buyer events so the feed/insights look alive. | `npm run seed` |
| `test-p0.sh` | Backend: auth, CRM proxy, events→DB→feed, validation, read-only-CRM check. | `bash scripts/test-p0.sh` |
| `test-p1.sh` | Seller: login → picker → create/seed → modules render → role guard. | `bash scripts/test-p1.sh` |
| `test-p2.sh` | Buyer: login states, the 6 events, the rich feed. | `bash scripts/test-p2.sh` |
| `test-p3.sh` | Insights: top stakeholder, most-viewed, follow-up, multi-buyer. | `bash scripts/test-p3.sh` |
| `test-p4.sh` | Polish: reorder/hide reflected in the buyer view. | `bash scripts/test-p4.sh` |
| `test-all.sh` | Runs the unit tests, then the P0–P4 scripts if the servers are up. | `npm run test:all` |

### How it fits

The `test-p*` scripts need the **CRM running on :8080** and the **app on :3000**
(`npm run dev`). The pure unit tests (`npm test`, in `src/lib/__tests__` and
`src/components/**/__tests__`) need neither and run anywhere. `test-all.sh` ties it
together and skips the HTTP phase gracefully if the servers aren't up.
