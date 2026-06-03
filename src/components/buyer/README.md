# `buyer/` — The Buyer Portal

**Who this is for:** the prospect (e.g. David Park at Meridian). This is the
"consume" side of the product — a clean, branded room the buyer opens from a link.
Everything here is **read-only to the buyer**; their clicks quietly send
engagement signals back to the rep.

**The 30-second pitch:** "When a buyer opens their link, they land in a polished
room with the content their rep curated. As they browse and watch, we record what
they engaged with — and that flows straight to the seller's activity feed."

### What's in here

| File | What it does |
| ---- | ------------ |
| `BuyerRoom.tsx` | The overall page layout: top bar → green hero → resources → "Have a question?" card → footer. |
| `BuyerTopBar.tsx` | Slim dark bar with the Secureframe wordmark and the **Share** button. |
| `ShareButton.tsx` | Shares the room link (phone share sheet, or copy-to-clipboard on desktop). |
| `BuyerResources.tsx` | The buyer's **Content Hub**: a category grid that drills into a list of resources. |
| `HaveAQuestion.tsx` | The rep "business card" — who to contact, with a Book-a-meeting link. |
| `RoomViewTracker.tsx` | Fires the `ROOM_VIEWED` event when the page opens (once per visit). |
| `BuyerLoginPrompt.tsx` | Inline sign-in shown when someone opens a room without being logged in. |
| `RoomNotice.tsx` | Friendly "not authorized" / "not published yet" screens. |

### How it fits

The buyer can only ever see **their own account's** room (the CRM enforces this),
and only if the rep has **published** it. Hidden content and hidden categories are
filtered out before the page is sent. Engagement is captured by the small tracker
components here plus the shared player in `../content/`.
