/**
 * A small score bar + number. The `label` defaults to "CRM score" so the
 * stakeholder map never conflates the CRM's static engagement_score with our
 * live in-room activity (which is surfaced separately in the activity feed).
 */
export function ScorePill({
  score,
  label = "CRM score",
}: {
  score?: number | null;
  label?: string;
}) {
  const has = typeof score === "number" && Number.isFinite(score);
  const val = has ? Math.max(0, Math.min(100, score as number)) : 0;
  const tone = !has
    ? "bg-slate-300"
    : val >= 75
      ? "bg-brand-500"
      : val >= 50
        ? "bg-amber-400"
        : "bg-red-400";

  return (
    <div className="flex items-center gap-2" title={`${label}: ${has ? val : "n/a"}`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${tone}`} style={{ width: `${val}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-600">
        {has ? val : "—"}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </span>
    </div>
  );
}
