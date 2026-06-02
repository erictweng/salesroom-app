import { pickPrimaryOpportunity } from "@/lib/deals";
import { formatAmount, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import type { Opportunity } from "@/lib/types";

/** One-line deal context strip. Renders nothing when there are no opportunities. */
export function DealStrip({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  const opp = pickPrimaryOpportunity(opportunities);
  if (!opp) return null;
  const more = opportunities.length - 1;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
      <Badge tone="violet">{opp.stage}</Badge>
      <span className="font-medium text-slate-800">{opp.name}</span>
      <span className="text-slate-500">
        {formatAmount(opp.amount, opp.currency)}
      </span>
      <span className="text-slate-300">·</span>
      <span className="text-slate-500">Close {formatDate(opp.close_date)}</span>
      {opp.next_step && (
        <>
          <span className="text-slate-300">·</span>
          <span className="truncate text-slate-500">Next: {opp.next_step}</span>
        </>
      )}
      {more > 0 && (
        <span className="ml-auto text-xs text-slate-400">+{more} more</span>
      )}
    </div>
  );
}
