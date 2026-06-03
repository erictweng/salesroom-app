# `modules/` — The Assessment Modules (A–F)

**What this is:** the actual sales-room building blocks the brief asks for. Each is
a **pure component** — you hand it data, it renders. It doesn't fetch anything, so
the same module can be reused and is easy to test.

**The 30-second pitch:** "These are the named modules from the spec. The page loads
all the data once and feeds it in; each module just draws its slice."

### The modules

| Module | File(s) here | What it shows |
| ------ | ------------ | ------------- |
| **A — Account Snapshot** (mandatory) | `AccountSnapshot.tsx` | Who the company is + a one-line **deal cue** for where the deal stands. |
| **B — Stakeholder Map** (mandatory) | `StakeholderMap.tsx` | The people, ranked by CRM score, champion highlighted, with search/filter + profile modal. |
| **C — Content Hub** (mandatory) | *(see note)* | Curated content + a working video player. |
| **D — Deal Overview** | `DealOverview.tsx` | The pipeline: stage stepper, amount, close date, next step, competitors. |
| **E — Activity & Engagement** | `ActivityFeed.tsx`, `InsightsPanel.tsx`, `AnalyticsSummary.tsx` | The live feed, insight cards, and dependency-free charts. |
| **F — Internal Notes** | *(see note)* | Private rep notes. |

> **Note:** Modules C and F have a rep-facing *editor* and a buyer-facing *view*,
> so they live with their portals: **C** is `seller/ContentManager.tsx` +
> `buyer/BuyerResources.tsx` (player in `content/VideoPlayer.tsx`); **F** is
> `seller/NotesDrawer.tsx`.

### How it fits

The brief asks for at least four modules including the three mandatory ones — we
built **all six**. The room page (`app/(seller)/seller/rooms/[slug]/page.tsx`)
loads the data and arranges these into the widget grid.
