"use client";

import { useState } from "react";

/**
 * Share the current room. Uses the native share sheet (navigator.share) where
 * available — great on mobile, and handy for a buyer looping in a colleague —
 * and falls back to copying the room link to the clipboard with a brief "Copied!"
 * confirmation. Access is still scoped by the CRM, so sharing the link doesn't
 * widen who can actually open the room.
 */
export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const title = document.title || "Sales Room";

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* user cancelled or share failed — do nothing */
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked (e.g. insecure context) — nothing we can do */
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label="Share this room"
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      {copied ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          Share
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
            <path d="M16 6l-4-4-4 4M12 2v13" />
          </svg>
        </>
      )}
    </button>
  );
}
