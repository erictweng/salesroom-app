# `seller/` — The Seller (Sales Rep) Portal

**Who this is for:** the sales rep (e.g. Sarah). This is the "build & configure"
side — where the rep picks an account, curates content, and watches engagement.

**The 30-second pitch:** "The rep gets one room per account. They drag content into
shape, hide what's not relevant, jot private notes, publish, and share the link —
then sit back and watch what the buyer actually engages with."

### What's in here

| File | What it does |
| ---- | ------------ |
| `AccountGrid.tsx` | The account picker: search, filter popover, **favorites** (gold star), grid/list toggle. |
| `ContentManager.tsx` | The **Content Hub** as a Kanban board: drag to reorder/recategorize, hide cards, hide whole categories, preview videos inline. |
| `EngagementSummary.tsx` | The glanceable KPI strip at the top of a room (status, visitors, events, last activity). |
| `RoomControls.tsx` | Publish / Unpublish, Copy Link, Preview Buyer Room. |
| `NotesDrawer.tsx` | **Internal Notes** — a private, rep-only pane (floating button, bottom-right). |
| `FeedAutoRefresh.tsx` | Quietly refreshes the room on tab-focus and every ~15s so new buyer activity appears. |
| `SortableSections.tsx` | (Currently unused) drag-to-reorder for the room panels — kept in case we re-enable it. |

### How it fits

Everything the rep changes here is saved to **our SQLite database**, never to the
CRM. The room is assembled from read-only CRM data (account, contacts, deals,
content) plus the rep's curation. What the rep publishes is exactly what the buyer
sees in `../buyer/`.
