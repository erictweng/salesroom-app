import { formatDate } from "@/lib/format";
import type { Insights } from "@/lib/insights";
import type { RoomStatus } from "@/lib/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 truncate text-base font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}

/**
 * Compact, always-visible engagement summary for the room header — keeps the
 * "is this deal warm?" answer glanceable while the detailed feed/insights live in
 * a collapsible section below.
 */
export function EngagementSummary({
  insights,
  status,
}: {
  insights: Insights;
  status: RoomStatus;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Status" value={status === "published" ? "Published" : "Draft"} />
      <Stat label="Visitors" value={String(insights.uniqueVisitors)} />
      <Stat label="Events" value={String(insights.totalEvents)} />
      <Stat
        label="Last activity"
        value={insights.lastActivityAt ? formatDate(insights.lastActivityAt) : "—"}
      />
    </div>
  );
}
