import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import type { EventRecord } from "@/lib/types";

/**
 * Turn a stored event into a human, attributed line — the whole point of the
 * product is that the rep sees "Sarah watched Product Demo for 42 seconds", not
 * a raw event code. Title comes from the resolved content map; watch-time/percent
 * come from the event metadata (stored as JSON).
 */
function describe(e: EventRecord, titles: Record<string, string>): string {
  const who = e.actor_name ?? e.actor_email ?? "Someone";
  const title = e.content_id
    ? (titles[e.content_id] ?? "a resource")
    : "a resource";

  let meta: { seconds?: unknown; percent?: unknown } = {};
  try {
    meta = e.metadata ? JSON.parse(e.metadata) : {};
  } catch {
    /* malformed metadata -> ignore */
  }
  const secs = typeof meta.seconds === "number" ? meta.seconds : null;
  const pct = typeof meta.percent === "number" ? meta.percent : null;

  switch (e.type) {
    case "ROOM_VIEWED":
      return `${who} viewed the room`;
    case "RESOURCE_OPENED":
      return `${who} opened ${title}`;
    case "RESOURCE_REVISITED":
      return `${who} revisited ${title}`;
    case "VIDEO_PLAYED":
      return `${who} started watching ${title}`;
    case "VIDEO_PROGRESS":
      if (secs != null) return `${who} watched ${title} for ${secs} seconds`;
      if (pct != null) return `${who} watched ${pct}% of ${title}`;
      return `${who} watched ${title}`;
    case "VIDEO_COMPLETED":
      return `${who} finished ${title}`;
    default:
      return `${who} — ${e.type}`;
  }
}

/**
 * Activity feed (bare body; section chrome supplied by the wrapper). Attributed,
 * human-readable lines newest-first; rep preview actions are tagged.
 */
export function ActivityFeed({
  events,
  contentTitles = {},
}: {
  events: EventRecord[];
  contentTitles?: Record<string, string>;
}) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">
        Recent activity
      </h3>
      {events.length === 0 ? (
        <EmptyState
          title="No buyer activity yet"
          hint="When a buyer opens this room and views content, their actions appear here, attributed to them."
        />
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              <span className="text-slate-700">{describe(e, contentTitles)}</span>
              {e.actor_role === "rep" && (
                <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                  preview
                </span>
              )}
              <span className="ml-auto shrink-0 text-xs text-slate-400">
                {formatDate(e.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
