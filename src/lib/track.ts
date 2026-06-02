"use client";

/**
 * Client-side engagement tracking. Posts events to /api/events, which attributes
 * them to the signed-in buyer server-side (from the session JWT) — so nothing
 * sensitive is sent from here, just the slug/type/content.
 *
 * Two hard rules baked in:
 *   1. Tracking must NEVER break the buyer experience -> every post soft-fails.
 *   2. The final event of a session must survive a tab close -> keepalive.
 */

import type { EventType } from "./events";

export async function postEvent(
  slug: string,
  type: EventType,
  contentId?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true, // lets a mid-watch event still send if the tab closes
      body: JSON.stringify({
        slug,
        type,
        content_id: contentId ?? undefined,
        metadata,
      }),
    });
  } catch {
    // Soft-fail by design: a logging hiccup or adblocker must not surface to the user.
  }
}

/**
 * Returns true the first time `key` is seen in this browser session, marking it
 * as seen. Used to dedupe once-per-session events (ROOM_VIEWED, each video
 * threshold, first resource open) so refreshes and re-renders don't spam the
 * feed. Falls back to "fire" if sessionStorage is unavailable.
 */
export function firstTimeThisSession(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

/** True if `key` has already been recorded this session (without marking it). */
export function seenThisSession(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(key) != null;
  } catch {
    return false;
  }
}
