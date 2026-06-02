import { requireRep } from "@/server/guards";
import { loadSellerDashboard } from "@/server/loaders";
import { createRoomAction } from "@/server/actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// Account-scoped room state lives in our DB and CRM data is per-request, so this
// page must never be statically cached.
export const dynamic = "force-dynamic";

/**
 * Account picker. Lists every CRM account the rep can curate, annotated with
 * whether a room already exists. Each card's button posts to createRoomAction,
 * which opens the existing room or creates+seeds a new one (one-click flow).
 */
export default async function SellerDashboard() {
  const { token } = requireRep();
  const entries = await loadSellerDashboard(token);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Accounts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick an account to open its sales room. Creating a room seeds it with
          the full content library, ready to curate.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(({ account, room }) => (
          <Card key={account.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-900">
                  {account.name}
                </h2>
                <p className="truncate text-sm text-slate-500">
                  {account.industry} · {account.hq_location}
                </p>
              </div>
              {room ? (
                <Badge tone={room.status === "published" ? "green" : "amber"}>
                  {room.status === "published" ? "Published" : "Draft"}
                </Badge>
              ) : (
                <Badge tone="slate">No room</Badge>
              )}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-400">Stage</dt>
              <dd className="text-right text-slate-700">
                {account.account_stage}
              </dd>
              <dt className="text-slate-400">Employees</dt>
              <dd className="text-right text-slate-700">
                {account.employee_count?.toLocaleString() ?? "—"}
              </dd>
              <dt className="text-slate-400">ICP fit</dt>
              <dd className="text-right font-medium text-slate-700">
                {account.icp_fit_score ?? "—"}
              </dd>
            </dl>

            <form action={createRoomAction} className="mt-5">
              <input type="hidden" name="account_id" value={account.id} />
              <button className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">
                {room ? "Open room" : "Create room"}
              </button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
