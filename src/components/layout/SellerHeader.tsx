import { logoutAction } from "@/server/actions";
import type { CrmUser } from "@/lib/types";

/**
 * Top chrome for every seller page. Mirrors the buyer portal's branded header so
 * the two experiences feel like one product. Sign-out posts to a server action
 * (logoutAction) which clears the httpOnly session cookie server-side.
 */
export function SellerHeader({ user }: { user: CrmUser }) {
  return (
    <header className="brand-hero text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="/seller" className="text-lg font-semibold tracking-tight">
          secureframe <span className="font-normal text-brand-200">Salesroom</span>
        </a>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-brand-100">
            {user.name}
            <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-brand-200">
              {user.role}
            </span>
          </span>
          <form action={logoutAction}>
            <button className="rounded-md border border-white/20 px-3 py-1 text-xs transition hover:bg-white/10">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
