import { formatAmount, formatDate } from "@/lib/format";
import { STAGE_SEQUENCE, stageIndex } from "@/lib/deals";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Opportunity } from "@/lib/types";

/** Horizontal stage progress: prior stages done, current highlighted, rest upcoming. */
function Stepper({ stage }: { stage: string }) {
  const cur = stageIndex(stage);
  return (
    <div className="flex items-center">
      {STAGE_SEQUENCE.map((s, i) => {
        const done = cur >= 0 && i < cur;
        const active = i === cur;
        return (
          <div key={s} className="flex flex-1 items-center">
            <div className="flex flex-col items-center text-center">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  active
                    ? "bg-brand-600 text-white"
                    : done
                      ? "bg-brand-200 text-brand-800"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`mt-1 text-[10px] leading-tight ${
                  active ? "font-medium text-slate-700" : "text-slate-400"
                }`}
              >
                {s}
              </span>
            </div>
            {i < STAGE_SEQUENCE.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 ${i < cur ? "bg-brand-300" : "bg-slate-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function Chips({ items, tone }: { items: string[]; tone: "slate" | "red" }) {
  const cls =
    tone === "red"
      ? "bg-red-50 text-red-700"
      : "bg-slate-100 text-slate-600";
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className={`rounded-md px-2 py-0.5 text-xs ${cls}`}>
          {x}
        </span>
      ))}
    </div>
  );
}

/**
 * Module D — Deal Overview (deal status; seller-only). One card per opportunity
 * with a stage stepper and key CRM facts (amount, close date, days-in-stage,
 * next step, products, competitors), plus a pipeline-total summary. All from the
 * CRM; no new persistence.
 */
export function DealOverview({ opportunities }: { opportunities: Opportunity[] }) {
  if (opportunities.length === 0) {
    return (
      <EmptyState
        title="No active opportunities"
        hint="No open deals are associated with this account in the CRM."
      />
    );
  }

  const total = opportunities.reduce((s, o) => s + (o.amount || 0), 0);
  const currency = opportunities[0]?.currency || "USD";

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {opportunities.length} open{" "}
        {opportunities.length === 1 ? "opportunity" : "opportunities"} ·{" "}
        {formatAmount(total, currency)} pipeline
      </p>

      {opportunities.map((o) => (
        <div key={o.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-slate-900">{o.name}</h4>
            <Badge tone="violet">{o.type}</Badge>
          </div>

          <div className="mt-4">
            <Stepper stage={o.stage} />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-4">
            <Fact label="Amount" value={formatAmount(o.amount, o.currency)} />
            <Fact label="Close date" value={formatDate(o.close_date)} />
            <Fact
              label="Days in stage"
              value={o.days_in_stage != null ? o.days_in_stage : "—"}
            />
            <Fact label="Owner" value={o.owner || "—"} />
          </dl>

          {o.next_step && (
            <p className="mt-3 text-sm">
              <span className="text-slate-400">Next step: </span>
              <span className="text-slate-700">{o.next_step}</span>
            </p>
          )}

          {o.products?.length > 0 && (
            <div className="mt-3">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Products
              </span>
              <Chips items={o.products} tone="slate" />
            </div>
          )}

          {o.competitors?.length > 0 && (
            <div className="mt-3">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Competitors
              </span>
              <Chips items={o.competitors} tone="red" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
