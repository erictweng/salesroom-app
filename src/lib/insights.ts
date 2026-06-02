/**
 * Deterministic engagement insights derived from a room's events. Pure (events
 * + content metadata in, insights out) so the counting and — critically — the
 * tiebreak rules are unit-testable without a DB or browser.
 *
 * Determinism rules:
 *   - Ranking ties break on latest activity, then name/title (never on Map order).
 *   - created_at is an ISO-8601 UTC string, so lexical comparison == chronological.
 *   - Zero (filtered) events yields an all-empty result — no division by zero.
 */

import { followUpForCategory } from "./followups";
import type { EventRecord } from "./types";

export interface ContentMeta {
  title: string;
  category: string;
}

export interface Insights {
  totalEvents: number;
  uniqueVisitors: number;
  lastActivityAt: string | null;
  topStakeholder: { name: string; email: string | null; eventCount: number } | null;
  mostViewedResource: { contentId: string; title: string; eventCount: number } | null;
  suggestedFollowUp: string | null;
}

export interface ComputeInsightsOptions {
  /** Actor roles to exclude from engagement analysis (e.g. ["rep"] previews). */
  excludeRoles?: string[];
}

/** Event types that reference a specific content item (count toward "most viewed"). */
const CONTENT_EVENT_TYPES = new Set([
  "RESOURCE_OPENED",
  "RESOURCE_REVISITED",
  "VIDEO_PLAYED",
  "VIDEO_PROGRESS",
  "VIDEO_COMPLETED",
]);

const EMPTY: Insights = {
  totalEvents: 0,
  uniqueVisitors: 0,
  lastActivityAt: null,
  topStakeholder: null,
  mostViewedResource: null,
  suggestedFollowUp: null,
};

export function computeInsights(
  events: EventRecord[],
  contentMeta: Record<string, ContentMeta>,
  opts: ComputeInsightsOptions = {},
): Insights {
  const exclude = new Set(opts.excludeRoles ?? []);
  const rows = events.filter((e) => !(e.actor_role && exclude.has(e.actor_role)));
  if (rows.length === 0) return { ...EMPTY };

  let lastActivityAt = rows[0].created_at;
  for (const e of rows) {
    if (e.created_at > lastActivityAt) lastActivityAt = e.created_at;
  }

  // Aggregate by actor (keyed on email, falling back to name).
  const actors = new Map<
    string,
    { name: string; email: string | null; count: number; last: string }
  >();
  for (const e of rows) {
    const key = e.actor_email ?? e.actor_name ?? "unknown";
    const a = actors.get(key);
    if (a) {
      a.count++;
      if (e.created_at > a.last) a.last = e.created_at;
    } else {
      actors.set(key, {
        name: e.actor_name ?? e.actor_email ?? "Someone",
        email: e.actor_email ?? null,
        count: 1,
        last: e.created_at,
      });
    }
  }
  const top = [...actors.values()].sort(
    (x, y) =>
      y.count - x.count ||
      y.last.localeCompare(x.last) ||
      x.name.localeCompare(y.name),
  )[0];

  // Aggregate content-referencing events by content id.
  const contents = new Map<string, { count: number; last: string }>();
  for (const e of rows) {
    if (!e.content_id || !CONTENT_EVENT_TYPES.has(e.type)) continue;
    const c = contents.get(e.content_id);
    if (c) {
      c.count++;
      if (e.created_at > c.last) c.last = e.created_at;
    } else {
      contents.set(e.content_id, { count: 1, last: e.created_at });
    }
  }

  let mostViewedResource: Insights["mostViewedResource"] = null;
  let suggestedFollowUp: string | null = null;
  if (contents.size > 0) {
    const ranked = [...contents.entries()].sort(
      ([idX, x], [idY, y]) =>
        y.count - x.count ||
        y.last.localeCompare(x.last) ||
        (contentMeta[idX]?.title ?? idX).localeCompare(
          contentMeta[idY]?.title ?? idY,
        ),
    )[0];
    const [contentId, agg] = ranked;
    const meta = contentMeta[contentId];
    mostViewedResource = {
      contentId,
      title: meta?.title ?? contentId,
      eventCount: agg.count,
    };
    suggestedFollowUp = followUpForCategory(meta?.category);
  }

  return {
    totalEvents: rows.length,
    uniqueVisitors: actors.size,
    lastActivityAt,
    topStakeholder: {
      name: top.name,
      email: top.email,
      eventCount: top.count,
    },
    mostViewedResource,
    suggestedFollowUp,
  };
}
