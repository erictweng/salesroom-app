import { BuyerTopBar } from "./BuyerTopBar";
import { HaveAQuestion } from "./HaveAQuestion";
import { BuyerResources } from "./BuyerResources";
import { RoomViewTracker } from "./RoomViewTracker";
import type { Account, CrmUser, Room } from "@/lib/types";
import type { ResourceWithContent } from "@/server/loaders";

/**
 * Derive the rep's email from the account owner's name using the CRM's seed
 * convention (e.g., "Sarah Chen" -> sarah.chen@salesroom.io).
 */
function repEmail(name: string): string {
  return `${name.trim().toLowerCase().replace(/\s+/g, ".")}@salesroom.io`;
}

/**
 * The buyer-facing room, styled after the design screenshots: a slim Secureframe
 * top bar, a dark→bright green hero (welcome + "Have a question?" rep card), the
 * Resources experience (category grid → drill-down), and a branded footer.
 * Mounting RoomViewTracker records ROOM_VIEWED once.
 */
export function BuyerRoom({
  user,
  account,
  room,
  resources,
}: {
  user: CrmUser;
  account: Account;
  room: Room;
  resources: ResourceWithContent[];
}) {
  const firstName = user.name?.split(/\s+/)[0] || "there";
  const owner = account.account_owner?.trim();

  return (
    <div className="min-h-screen bg-slate-50">
      <RoomViewTracker slug={room.slug} />
      <BuyerTopBar />

      <section className="buyer-hero text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-brand-100">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-white/15 text-xs font-bold">
                  {account.name[0]}
                </span>
                <span className="text-sm font-medium">{account.name}</span>
              </div>
              <h1 className="mt-3 text-4xl font-semibold">
                Welcome, {firstName}
              </h1>
              <p className="mt-4 text-brand-100">
                We&apos;re excited to partner with {account.name}. This room has
                everything you need to evaluate Secureframe and move forward —
                documents, demos, and a direct line to your team.
              </p>
              <a
                href="#resources"
                className="mt-6 inline-block rounded-md border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                View your proposal →
              </a>
            </div>

            {owner && <HaveAQuestion name={owner} email={repEmail(owner)} />}
          </div>
        </div>
      </section>

      <section id="resources" className="mx-auto max-w-6xl px-6 py-8">
        <BuyerResources slug={room.slug} resources={resources} />
      </section>

      <footer className="border-t border-slate-200 py-8 text-center">
        <p className="text-sm font-semibold lowercase text-slate-700">
          secureframe
        </p>
        <p className="mt-1 text-xs text-slate-400">
          © 2026 Secureframe · Privacy policy
        </p>
      </footer>
    </div>
  );
}
