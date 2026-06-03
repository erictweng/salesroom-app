# Salesroom — Full Program Audit

A pass over file organization, dead code, and requirement coverage. Status keys:
✅ met · 🟡 partial / worth a look · 🗑️ straggler (dead code).

## 1. File arrangement & organization

The tree is layered cleanly by responsibility, which makes things easy to find:

- `app/` — routes only (App Router). `(seller)/` group + guard layout, `room/[slug]`
  buyer route, `login`, `forbidden`, `/` landing, and `api/*` route handlers.
- `src/lib/` — framework-free domain logic (CRM client, SQLite repo/db, pure
  helpers like `insights`, `deals`, `categories`, `notes`, `progress`, `youtube`).
  This is where the unit tests point, because none of it needs React or a browser.
- `src/server/` — the server boundary: `guards` (auth), `loaders` (parallel CRM
  reads → view models), `actions` (mutations → SQLite).
- `src/components/` — split by surface: `ui/` primitives, `layout/`, `auth/`,
  `home/`, `seller/`, `buyer/`, `content/` (shared player/doc-link), and
  `modules/` (the six assessment modules as pure components).
- `scripts/` — `reset-db`, `seed-demo`, and `test-p0..p4` HTTP smoke tests.

Assessment: **well balanced.** Pure logic, server boundary, and UI are separated;
modules are pure components fed by a single loader, so the same set powers both
portals. Naming is consistent and discoverable. The only cleanup needed is the
dead code below.

### Stragglers (not imported anywhere)

| File | Status | Why |
| ---- | ------ | --- |
| `src/components/modules/ContentHub.tsx` | 🗑️ | Superseded by `buyer/BuyerResources.tsx` (buyer) and `seller/ContentManager.tsx` (seller). No importers. |
| `src/components/content/ResourceCard.tsx` | 🗑️ | Only `ContentHub` imported it; transitively dead. |
| `src/components/ui/SectionHeader.tsx` | 🗑️ | Only `ContentHub` imported it; transitively dead. |
| `src/components/modules/DealStrip.tsx` | 🗑️ | Superseded by `DealOverview` + the Module A deal cue. Only a stale code comment in `lib/deals.ts` still names it. |
| `src/components/seller/SortableSections.tsx` | 🟡 | Unused, but **deliberately kept** when panel drag-reorder was shelved for the fixed widget grid. Keep only if you plan to re-enable drag; otherwise delete. |

Recommendation: delete the four 🗑️ files and the `DealStrip` mention in
`lib/deals.ts`; decide on `SortableSections` based on whether drag-reorder returns.
(`InternalNotes.tsx` was already removed — good.) Everything else in the tree is
referenced and intentional.

## 2. Module requirements coverage

> Requirement: build **at least four** modules including the **mandatory** ones
> (A, B, C). **Status: all six (A–F) built.** ✅ Exceeds the minimum.

### Module A — Account Snapshot (Mandatory) ✅

*"Who this company is, what they care about, and where the deal stands."*

- **Frontend** — `modules/AccountSnapshot.tsx`: domain, ICP-fit badge, industry /
  employees / revenue / HQ / account stage / owner, recent news, tech stack, and
  an enrichment block (compliance frameworks, technologies, hiring signals, social
  presence). Leads with a one-line **deal cue** (primary opp stage · amount · close
  date) — the "where the deal stands" requirement. Graceful "—" for missing fields.
- **Backend** — `lib/crm.ts` (`getAccount`, `getAccountEnrichment`),
  `lib/deals.ts` (`pickPrimaryOpportunity` for the cue), `server/loaders.ts`
  (`loadRoomData` fans these out in parallel, enrichment degrades to `null`).
- **Full-stack integration** — server-rendered from `loaders` → props; the deal
  cue reuses the same opportunities the Deal Overview panel reads, so the two never
  disagree. No client JS required.

### Module B — Stakeholder Map (Mandatory) ✅

*"People involved — roles, seniority, engagement; highlight the champion."*

- **Frontend** — `modules/StakeholderMap.tsx`: contact list with the **Champion**
  highlighted, primary contact starred, each colored by CRM `engagement_score`
  (labeled "CRM score"). Name search + filter popover (role, minimum score). Click
  → `ContactModal` with email / phone / LinkedIn / role / seniority / score / last
  activity. Uses `ui/Avatar`, `ui/Badge`, `ui/ScorePill`.
- **Backend** — `lib/crm.ts` (`getAccountContacts`), surfaced via `loaders`.
- **Full-stack integration** — server-loaded contacts → client component for
  search/filter/modal interactivity; no mutations (read-only CRM data).

### Module C — Content Hub (Mandatory; must embed a working video player) ✅

*"Rep curates content; organization/playback open-ended. Embed ≥1 video player."*

- **Frontend** — seller `seller/ContentManager.tsx` (Kanban: drag to reorder /
  recategorize, per-card Hide + inline ▶ Preview, per-column eye toggle to hide a
  category); buyer `buyer/BuyerResources.tsx` (category grid with icon/tinted logos
  → per-category drill-down). `content/VideoPlayer.tsx` is the **working embedded
  YouTube player** (IFrame API, Google-style modal, plain-embed fallback);
  `content/TrackedDocLink.tsx` for docs.
- **Backend** — `lib/crm.ts` (`listContent`); `lib/repo.ts` (room_resources:
  order, hidden, per-room category override); `lib/categories.ts` (six-category
  taxonomy + per-item delegation); `server/actions.ts`
  (`setResourceOrder/Category/Hidden`, `setCategoryHidden`); `loaders` compute
  `effectiveCategory`; `api/events` records video/doc engagement.
- **Full-stack integration** — drag/hide edits are optimistic → server actions →
  SQLite; the buyer view groups by the same `effectiveCategory` + order on next
  load; the embedded player posts `VIDEO_*` events to `/api/events`. **Video-player
  requirement met** (real playback + tracking on the buyer side, inline preview on
  the seller side).

### Module D — Deal Overview & Timeline (Optional) ✅ / 🟡

*"Where the deal is, key dates, next steps, deal history or milestones."*

- **Frontend** — `modules/DealOverview.tsx`: per-opportunity card with a **stage
  stepper** (Discovery → Technical Evaluation → Proposal → Negotiation), amount,
  close date, days-in-stage (stall signal), owner, next step, products,
  competitors, plus a pipeline total. Seller-only (competitors are internal).
- **Backend** — `lib/crm.ts` (`getAccountOpportunities`), `lib/deals.ts`
  (`STAGE_SEQUENCE`, `stageIndex`).
- **Full-stack integration** — `loadRoomData` → props; no mutation (CRM-owned).
- 🟡 **Gap vs the prompt:** we cover "where it is / key dates / next steps" well,
  but there's **no explicit history/milestone timeline** (the prompt lists
  "timeline … or milestones" as options). The stepper + days-in-stage imply
  progress, but a dated milestone trail isn't rendered. Optional to add.

### Module E — Activity & Engagement Feed (Optional) ✅

*"Signals about what's happening — recent activity, content views, engagement."*

- **Frontend** — `modules/ActivityFeed.tsx` (attributed, scrollable feed),
  `modules/InsightsPanel.tsx` (top stakeholder / most-viewed / last activity /
  follow-up), `modules/AnalyticsSummary.tsx` (trend line + category donut + ranked
  top-3), `seller/EngagementSummary.tsx` (KPI strip), `seller/FeedAutoRefresh.tsx`.
- **Backend** — `events` table; `lib/repo.ts` (`insertEvent`, `getFeed`,
  `getEventsForInsights`, `pruneRoomEvents`); `lib/insights.ts` (`computeInsights`,
  pure/deterministic); `lib/followups.ts`; `api/events`.
- **Full-stack integration** — the buyer emits events (`RoomViewTracker`,
  `VideoPlayer`, `TrackedDocLink` → `lib/track.ts` → `POST /api/events` → SQLite);
  the seller feed re-renders on focus + ~15s; rep preview events are tagged and
  excluded from insights. This is the core curate → consume → engage loop.

### Module F — Internal Notes (Optional) ✅

*"Reps write/view internal notes, strategy, next steps, competitive intel."*

- **Frontend** — `seller/NotesDrawer.tsx`: floating button + Google-Docs-style
  pane; authored, timestamped entries; optional section tag (click a note to jump +
  auto-expand that section); per-note delete + Clear all; red **unread** badge.
- **Backend** — `room_notes` table; `lib/repo.ts` (`addNote`, `listNotes`,
  `deleteNote`, `clearNotes`); `server/actions.ts` (`addNoteAction` [author from
  session], `deleteNoteAction`, `clearNotesAction`); `lib/notes.ts` (targets +
  timestamp formatting).
- **Full-stack integration** — `loadRoomData` returns notes (rep-only; **never**
  loaded in the buyer loader); optimistic add/delete with server-authored
  timestamps. Author is always taken from the session, never client-supplied.

## 3. Platform requirements (beyond the modules)

| Requirement | Status | Where |
| ----------- | ------ | ----- |
| Rep can **log in** | ✅ | `auth/LoginForm`, `api/auth/login`, httpOnly cookie |
| Rep **builds/configures** a room per company | ✅ | account picker → `createRoomAction` → room builder (curate, categorize, hide, reorder, publish) |
| Separate **Buyer Portal** | ✅ | `/room/[slug]` (`BuyerRoom`) with login / not-authorized / not-published / room states |
| **Embed ≥1 working video player** | ✅ | `VideoPlayer` (YouTube IFrame API), both portals |
| Identity-attributed **engagement** | ✅ | 6 event types → feed/insights |
| **Read-only CRM** boundary | ✅ | only non-GET CRM call is `/api/auth/login`; static-checked in `test-p0.sh` |
| Auth scoping (buyers can't see seller / other accounts) | ✅ | `guards.requireRep`, CRM 403 delegation in `loadBuyerRoom` |

## 4. Recommended actions

1. Delete the four dead files (`ContentHub`, `ResourceCard`, `SectionHeader`,
   `DealStrip`) and the stale `DealStrip` comment in `lib/deals.ts`.
2. Decide on `SortableSections` (keep for future drag-reorder, or delete).
3. Optional: add a milestone/history timeline to Module D to fully cover the
   prompt's "deal history or milestones" wording.

Everything else — structure, naming, module coverage, mandatory requirements, the
read-only CRM boundary, and the embedded video player — checks out.
