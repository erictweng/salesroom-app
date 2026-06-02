"use client";

import { postEvent, seenThisSession, firstTimeThisSession } from "@/lib/track";
import type { ReactNode } from "react";

/**
 * Wraps a non-video resource link and emits RESOURCE_OPENED the first time it's
 * opened this session, RESOURCE_REVISITED on subsequent opens. The PDF still
 * opens normally in a new tab; tracking is best-effort and never blocks the click.
 */
export function TrackedDocLink({
  slug,
  contentId,
  href,
  className,
  children,
}: {
  slug: string;
  contentId: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  function onClick() {
    const key = `res_open:${slug}:${contentId}`;
    // seen-before decides OPENED vs REVISITED; firstTime marks it seen.
    const revisited = seenThisSession(key);
    firstTimeThisSession(key);
    postEvent(slug, revisited ? "RESOURCE_REVISITED" : "RESOURCE_OPENED", contentId);
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={className}
    >
      {children}
    </a>
  );
}
