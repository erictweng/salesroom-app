# `ui/` — Frontend UI Primitives

**What this is:** the small, reusable Lego bricks the rest of the app is built
from. They're "dumb" on purpose — they take props and render; they hold no
business logic, fetch nothing, and know nothing about the CRM or database.

**The 30-second pitch:** "These are our design-system basics. Build a screen by
snapping these together, and everything looks consistent for free."

### What's in here

| File | What it is |
| ---- | ---------- |
| `Card.tsx` | The white, rounded, subtly-shadowed panel everything sits in. |
| `Badge.tsx` | Small colored pill/label (e.g. role tags, statuses). |
| `Avatar.tsx` | Circular initials bubble for a person. |
| `ScorePill.tsx` | The "CRM SCORE" label with the value beneath it. |
| `EmptyState.tsx` | The friendly "nothing here yet" message + hint. |
| `CollapsibleSection.tsx` | A titled card you can collapse; remembers open/closed per browser. Used to wrap each room panel. |

### How it fits

If you change a primitive here, it updates everywhere at once — that's the point.
Feature components (in `buyer/`, `seller/`, `modules/`) compose these; they should
rarely re-style raw HTML themselves.
