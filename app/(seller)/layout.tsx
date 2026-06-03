import { requireRep } from "@/server/guards";
import { SellerHeader } from "@/components/layout/SellerHeader";

/**
 * Guards every seller route. No session -> /login, wrong role -> /forbidden.
 * Pages under this layout still call requireRep() themselves before any CRM
 * call, since Next renders page and layout concurrently.
 */
export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = requireRep();

  return (
    <div className="min-h-screen bg-slate-50">
      <SellerHeader user={user} />
      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </div>
  );
}
