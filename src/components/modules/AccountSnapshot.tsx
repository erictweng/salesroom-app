import { Badge } from "@/components/ui/Badge";
import type { Account, Enrichment } from "@/lib/types";
import type { ReactNode } from "react";

/** Show "—" for any missing/blank scalar so the module never renders gaps. */
function val(v: unknown): ReactNode {
  if (v == null) return "—";
  const s = String(v).trim();
  return s.length ? s : "—";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function Chips({ items }: { items?: string[] | null }) {
  if (!items || items.length === 0)
    return <span className="text-sm text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span
          key={t}
          className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

/**
 * Module A — Account Snapshot (bare body; the section chrome/title is supplied by
 * the surrounding CollapsibleSection). Account + enrichment context, degrades
 * gracefully when fields or enrichment are missing.
 */
export function AccountSnapshot({
  account,
  enrichment,
}: {
  account: Account;
  enrichment: Enrichment | null;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{val(account.domain)}</p>
        <Badge tone="green">ICP fit {account.icp_fit_score ?? "—"}</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
        <Field label="Industry">{val(account.industry)}</Field>
        <Field label="Employees">
          {account.employee_count != null
            ? account.employee_count.toLocaleString()
            : "—"}
        </Field>
        <Field label="Annual revenue">{val(account.annual_revenue)}</Field>
        <Field label="HQ">{val(account.hq_location)}</Field>
        <Field label="Stage">{val(account.account_stage)}</Field>
        <Field label="Owner">{val(account.account_owner)}</Field>
        {enrichment?.funding_stage && (
          <Field label="Funding">{val(enrichment.funding_stage)}</Field>
        )}
        {enrichment?.web_traffic_trend && (
          <Field label="Web traffic">{val(enrichment.web_traffic_trend)}</Field>
        )}
      </dl>

      {account.recent_news && (
        <div className="mt-5">
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Recent news
          </dt>
          <dd className="mt-0.5 line-clamp-3 text-sm text-slate-700">
            {account.recent_news}
          </dd>
        </div>
      )}

      <div className="mt-5">
        <dt className="text-xs uppercase tracking-wide text-slate-400">
          Tech stack
        </dt>
        <dd className="mt-1.5">
          <Chips items={account.tech_stack} />
        </dd>
      </div>

      {enrichment ? (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Enrichment
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Compliance frameworks
              </dt>
              <dd className="mt-1.5">
                <Chips items={enrichment.compliance_frameworks} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Technologies
              </dt>
              <dd className="mt-1.5">
                <Chips items={enrichment.technologies} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Hiring signals
              </dt>
              <dd className="mt-1.5">
                <Chips items={enrichment.hiring_signals} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">
                Social presence
              </dt>
              <dd className="mt-1.5 flex flex-wrap gap-3 text-sm text-slate-700">
                {enrichment.social_presence &&
                Object.keys(enrichment.social_presence).length ? (
                  Object.entries(enrichment.social_presence).map(([k, v]) => (
                    <span key={k}>
                      <span className="capitalize text-slate-500">{k}:</span>{" "}
                      {typeof v === "number" ? v.toLocaleString() : String(v)}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </dd>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-400">
          No enrichment data available for this account.
        </p>
      )}
    </div>
  );
}
