# `components/` — All the UI, by area

Everything the user sees, split by **who it's for** and **how reusable it is**.

| Folder | What it is |
| ------ | ---------- |
| `ui/` | Reusable design-system primitives (Card, Badge, Avatar…). No business logic. |
| `modules/` | The assessment modules A–F as pure, data-in components. |
| `content/` | Shared content players (the tracked video player + doc link). |
| `seller/` | The sales-rep portal (account picker, content Kanban, notes, controls). |
| `buyer/` | The prospect's portal (the branded room they open from a link). |
| `auth/` | `LoginForm.tsx` — the email/password sign-in form (+ demo quick-fill chips). |
| `layout/` | `SellerHeader.tsx` — the top chrome (logo + sign-out) on seller pages. |
| `home/` | `HomeLanding.tsx` — the public sign-in landing page at `/`. |

**Mental model:** `ui/` = bricks → `modules/` + `content/` = features → `seller/`
and `buyer/` = the two portals that arrange features into pages. The smaller
`auth/`, `layout/`, and `home/` folders are single-purpose and named for what they
hold.
