import { ContentHub } from "@/components/modules/ContentHub";
import { RoomViewTracker } from "./RoomViewTracker";
import type { Account, CrmUser, Room } from "@/lib/types";
import type { ResourceWithContent } from "@/server/loaders";

/**
 * Derive the rep's email from the account owner's name using the CRM's seed
 * convention (e.g., "Sarah Chen" -> sarah.chen@salesroom.io). Lets the "Have a
 * question?" card offer a real mailto without a separate rep-contact endpoint.
 */
function repEmail(name: string): string {
  return `${name.trim().toLowerCase().replace(/\s+/g, ".")}@salesroom.io`;
}

/**
 * The buyer-facing room. Intentionally focused on the Resources experience (per
 * the brief): a branded welcome hero, a "Have a question?" rep card, and the
 * tracked Content Hub. Mounting RoomViewTracker records ROOM_VIEWED once.
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
    <main className="min-h-screen bg-slate-50">
      <RoomViewTracker slug={room.slug} />

      <section className="brand-hero text-white">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-medium uppercase tracking-widest text-brand-200">
                {account.name}
              </p>
              <h1 className="mt-2 text-4xl font-semibold">
                Welcome, {firstName}
              </h1>
              <p className="mt-4 text-brand-100">
                We&apos;re excited to partner with {account.name}. This room has
                everything you need to evaluate Secureframe and move forward —
                documents, demos, and a direct line to your team.
              </p>
            </div>

            {owner && (
              <div className="w-full max-w-xs rounded-xl bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-200">
                  Have a question?
                </p>
                <p className="mt-2 font-medium">{owner}</p>
                <p className="text-sm text-brand-100">Your account executive</p>
                <a
                  href={`mailto:${repEmail(owner)}`}
                  className="mt-3 inline-block rounded-md bg-white px-3 py-1.5 text-sm font-medium text-brand-800 transition hover:bg-brand-50"
                >
                  Email {owner.split(/\s+/)[0]}
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 border-b border-slate-200">
          <span className="inline-block border-b-2 border-brand-600 px-1 pb-2 text-sm font-medium text-brand-700">
            Resources
          </span>
        </div>
        <ContentHub resources={resources} tracking={{ slug: room.slug }} />
      </section>

      <footer className="py-10 text-center text-xs text-slate-400">
        © 2026 Secureframe
      </footer>
    </main>
  );
}
