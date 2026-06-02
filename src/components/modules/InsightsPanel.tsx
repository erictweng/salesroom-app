import { formatDate } from "@/lib/format";
import type { Insights } from "@/lib/insights";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 line-clamp-2 text-base font-semibold text-slate-900">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

/**
 * Module E (insights half) — deterministic engagement summary above the feed.
 * Shows the four PRD cards (top stakeholder, most-viewed resource, last
 * activity, suggested follow-up) and an empty state for a fresh room. Insights
 * exclude rep preview events (computed upstream with excludeRoles: ["rep"]).
 */
export function InsightsPanel({ insights }: { insights: Insights }) {
  if (insights.totalEvents === 0) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Insights</h2>
        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-8 text-center text-sm text-slate-400">
          No engagement yet — insights appear once a buyer interacts with the
          room.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Insights</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Top stakeholder"
          value={insights.topStakeholder?.name ?? "—"}
          sub={
            insights.topStakeholder
              ? `${insights.topStakeholder.eventCount} action${insights.topStakeholder.eventCount === 1 ? "" : "s"}`
              : undefined
          }
        />
        <StatCard
          label="Most-viewed"
          value={insights.mostViewedResource?.title ?? "—"}
          sub={
            insights.mostViewedResource
              ? `${insights.mostViewedResource.eventCount} interaction${insights.mostViewedResource.eventCount === 1 ? "" : "s"}`
              : undefined
          }
        />
        <StatCard
          label="Last activity"
          value={
            insights.lastActivityAt ? formatDate(insights.lastActivityAt) : "—"
          }
          sub={`${insights.uniqueVisitors} visitor${insights.uniqueVisitors === 1 ? "" : "s"}`}
        />
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-xs uppercase tracking-wide text-brand-700">
            Suggested follow-up
          </p>
          <p className="mt-1 text-sm text-brand-900">
            {insights.suggestedFollowUp ?? "Keep nurturing the deal."}
          </p>
        </div>
      </div>
    </section>
  );
}
