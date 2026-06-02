import { logoutAction } from "@/server/actions";
import type { CrmUser } from "@/lib/types";

type Variant = "unpublished" | "forbidden";

const COPY: Record<Variant, { icon: string; title: string; body: string }> = {
  unpublished: {
    icon: "🚧",
    title: "This room isn't published yet",
    body: "Your account team is still putting it together. Please check back once they've shared it with you.",
  },
  forbidden: {
    icon: "🔒",
    title: "You don't have access to this room",
    body: "This room belongs to a different account than the one you're signed in with.",
  },
};

/**
 * Friendly full-page notice for the buyer states that aren't the room itself —
 * a draft room or a cross-account access attempt. Shown instead of a stack
 * trace or a bare 403, per the PRD's "friendly 401/403/404" requirement.
 */
export function RoomNotice({
  variant,
  user,
}: {
  variant: Variant;
  user?: CrmUser;
}) {
  const { icon, title, body } = COPY[variant];

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
          {icon}
        </div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{body}</p>
        {variant === "forbidden" && (
          <>
            {user && (
              <p className="mt-3 text-xs text-slate-400">
                Signed in as {user.email}.
              </p>
            )}
            <form action={logoutAction} className="mt-6">
              <button className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800">
                Sign in as a different user
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
