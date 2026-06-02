import { requireRep } from "@/server/guards";
import { loadSellerDashboard } from "@/server/loaders";
import { AccountGrid } from "@/components/seller/AccountGrid";

// Account-scoped room state lives in our DB and CRM data is per-request, so this
// page must never be statically cached.
export const dynamic = "force-dynamic";

/**
 * Account picker. Lists every CRM account the rep can curate (with search),
 * annotated with whether a room already exists. Each card opens or creates the
 * account's room via createRoomAction.
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
      <AccountGrid entries={entries} />
    </div>
  );
}
