/**
 * A compact CRM score: the "CRM score" label with the value bolded and centered
 * beneath it. The label defaults to "CRM score" so the stakeholder map never
 * conflates the CRM's static engagement_score with our live in-room activity
 * (which is surfaced separately in the activity feed).
 */
export function ScorePill({
  score,
  label = "CRM score",
}: {
  score?: number | null;
  label?: string;
}) {
  const has = typeof score === "number" && Number.isFinite(score);
  const val = has ? Math.max(0, Math.min(100, score as number)) : null;

  return (
    <div
      className="flex flex-col items-center"
      title={`${label}: ${has ? val : "n/a"}`}
    >
      <span className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-slate-700">
        {has ? val : "—"}
      </span>
    </div>
  );
}
