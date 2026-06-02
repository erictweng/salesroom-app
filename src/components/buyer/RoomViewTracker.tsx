"use client";

import { useEffect, useRef } from "react";
import { postEvent, firstTimeThisSession } from "@/lib/track";

/**
 * Fires ROOM_VIEWED once per session. The ref guards against React re-renders /
 * StrictMode double-invoke within a single mount; the sessionStorage check (in
 * firstTimeThisSession) guards against refresh spam so the rep's feed isn't
 * flooded. Renders nothing.
 */
export function RoomViewTracker({ slug }: { slug: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (firstTimeThisSession(`room_viewed:${slug}`)) {
      postEvent(slug, "ROOM_VIEWED");
    }
  }, [slug]);

  return null;
}
