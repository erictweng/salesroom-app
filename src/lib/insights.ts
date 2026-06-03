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
  // Analytics breakdowns:
  eventsByType: Record<string, number>;
  topStakeholders: { name: string; eventCount: number }[];
  topResources: { contentId: string; title: string; eventCount: number }[];
  /** Per-day event counts over the trend window (ascending, zero-filled). */
  eventsByDay: { date: string; count: number }[];
  /** Content-event counts grouped by category (desc), for the category mix. */
  eventsByCategory: { category: string; count: number }[];
  /** Per-person engagement totals (desc), for the per-stakeholder bars. */
  peopleEngagement: { name: string; eventCount: number }[];
}

export interface ComputeInsightsOptions {
  /** Actor roles to exclude from engagement analysis (e.g. ["rep"] previews). */
  excludeRoles?: string[];
  /**
   * "Now" as an ISO string, used only to anchor the trend window's last day.
   * Defaults to the wall clock; pass a fixed value for deterministic tests.
   */
  now?: string;
}

/** How many days the activity trend spans (matches event retention). */
export const TREND_DAYS = 7;

/** Add `delta` days to a YYYY-MM-DD date (UTC), returning YYYY-MM-DD. */
function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
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
  eventsByType: {},
  topStakeholders: [],
  topResources: [],
  eventsByDay: [],
  eventsByCategory: [],
  peopleEngagement: [],
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
  const actorsSorted = [...actors.values()].sort(
    (x, y) =>
      y.count - x.count ||
      y.last.localeCompare(x.last) ||
      x.name.localeCompare(y.name),
  );
  const top = actorsSorted[0];
  const topStakeholders = actorsSorted.slice(0, 3).map((a) => ({
    name: a.name,
    eventCount: a.count,
  }));
  // A longer list for the per-person engagement bars.
  const peopleEngagement = actorsSorted.slice(0, 8).map((a) => ({
    name: a.name,
    eventCount: a.count,
  }));

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
  const contentsSorted = [...contents.entries()].sort(
    ([idX, x], [idY, y]) =>
      y.count - x.count ||
      y.last.localeCompare(x.last) ||
      (contentMeta[idX]?.title ?? idX).localeCompare(
        contentMeta[idY]?.title ?? idY,
      ),
  );
  const topResources = contentsSorted.slice(0, 3).map(([id, agg]) => ({
    contentId: id,
    title: contentMeta[id]?.title ?? id,
    eventCount: agg.count,
  }));

  let mostViewedResource: Insights["mostViewedResource"] = null;
  let suggestedFollowUp: string | null = null;
  if (contentsSorted.length > 0) {
    const [contentId, agg] = contentsSorted[0];
    const meta = contentMeta[contentId];
    mostViewedResource = {
      contentId,
      title: meta?.title ?? contentId,
      eventCount: agg.count,
    };
    suggestedFollowUp = followUpForCategory(meta?.category);
  }

  // Event-type breakdown.
  const eventsByType: Record<string, number> = {};
  for (const e of rows) {
    eventsByType[e.type] = (eventsByType[e.type] ?? 0) + 1;
  }

  // Per-day trend: zero-filled window of TREND_DAYS ending on "now"'s UTC day.
  const dayCounts = new Map<string, number>();
  for (const e of rows) {
    const day = e.created_at.slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  const endDay = (opts.now ?? new Date().toISOString()).slice(0, 10);
  const eventsByDay: { date: string; count: number }[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const date = shiftDay(endDay, -i);
    eventsByDay.push({ date, count: dayCounts.get(date) ?? 0 });
  }

  // Category mix: content-referencing events grouped by their content's category.
  const categoryCounts = new Map<string, number>();
  for (const e of rows) {
    if (!e.content_id || !CONTENT_EVENT_TYPES.has(e.type)) continue;
    const category = contentMeta[e.content_id]?.category ?? "Uncategorized";
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }
  const eventsByCategory = [...categoryCounts.entries()]
    .sort(([catX, x], [catY, y]) => y - x || catX.localeCompare(catY))
    .map(([category, count]) => ({ category, count }));

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
    eventsByType,
    topStakeholders,
    topResources,
    eventsByDay,
    eventsByCategory,
    peopleEngagement,
  };
}
