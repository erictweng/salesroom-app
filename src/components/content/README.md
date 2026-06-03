# `content/` — Shared Content Players

**What this is:** the two pieces that actually play/open a piece of content and
record that it happened. Both portals reuse them.

**The 30-second pitch:** "This is where 'a buyer watched the demo' becomes a real,
tracked event — and it's the same code whether the rep is previewing or the buyer
is watching."

### What's in here

| File | What it does |
| ---- | ------------ |
| `VideoPlayer.tsx` | The embedded **YouTube player** — opens a Google-style modal, plays via the YouTube IFrame API, and (when given tracking) fires `VIDEO_PLAYED` / 25·50·75% `PROGRESS` / `COMPLETED`. Falls back to a plain embed if YouTube's API is blocked. |
| `TrackedDocLink.tsx` | Opens a document and logs `RESOURCE_OPENED` (first time) or `RESOURCE_REVISITED` (repeat). |

### How it fits

The **mandatory "embed at least one working video player"** requirement lives here.
"Tracking" is opt-in: pass it on the buyer side so engagement is recorded; omit it
for the seller's silent inline preview. Events are posted via `lib/track.ts` →
`POST /api/events`, and dedup uses the browser session so refreshes don't spam the
feed.
