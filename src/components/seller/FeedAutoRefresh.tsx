"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the rep's feed/insights fresh without a manual reload. Calls
 * router.refresh() (a soft re-render of the server component — no full page
 * reload, scroll/state preserved) on an interval and whenever the tab regains
 * focus, so a buyer action shows up shortly after the rep looks back at the tab.
 * Renders nothing.
 */
export function FeedAutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();
    const id = setInterval(refresh, intervalMs);
    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
