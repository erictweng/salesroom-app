import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/server/actions";

/** Friendly 403 shown when a non-rep (buyer) lands on a seller route. */
export default function ForbiddenPage() {
  const user = getCurrentUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl">
          🔒
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          This is the sales-rep workspace
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {user
            ? `You're signed in as ${user.name} (${user.role}). The seller portal is only available to sales reps.`
            : "You don't have access to the seller portal."}
        </p>
        <form action={logoutAction} className="mt-6">
          <button className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
