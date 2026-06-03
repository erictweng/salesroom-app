# `app/` — Pages & Routes

**What this is:** the URL map of the app (Next.js App Router). Each folder is a
route; `page.tsx` is what renders at that URL. These pages are thin — they call the
server `loaders` for data and hand it to components.

**The 30-second pitch:** "This is the site map. A URL points to a folder here, and
that folder's `page.tsx` assembles the screen from our components."

### The routes

| Path | File | What it is |
| ---- | ---- | ---------- |
| `/` | `page.tsx` → `home/HomeLanding` | Public sign-in landing. |
| `/login` | `login/page.tsx` | The login form. |
| `/forbidden` | `forbidden/page.tsx` | Friendly "this is the rep workspace" page for buyers who wander in. |
| `/seller` | `(seller)/seller/page.tsx` | The account picker (rep home). |
| `/seller/rooms/[slug]` | `(seller)/seller/rooms/[slug]/page.tsx` | **The room builder** — loads everything and lays out modules A–F. |
| `/room/[slug]` | `room/[slug]/page.tsx` | **The buyer room** (public link). |
| `/api/*` | `api/` | HTTP endpoints — see `api/README.md`. |

Supporting files: `layout.tsx` (global shell), `(seller)/layout.tsx` (guards every
seller page + adds the header), `globals.css` (Tailwind + brand gradients/animations).

### How it fits

- `(seller)` is a **route group** — the parentheses don't appear in the URL; they
  just let every seller page share one auth-guarded layout.
- `[slug]` is a **dynamic segment** — the room's slug (e.g. `velora-health`).
- Pages run on the server, call `server/loaders.ts`, and render `components/*`.
  Mutations happen through `server/actions.ts`.
