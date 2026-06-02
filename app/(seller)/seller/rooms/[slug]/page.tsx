import Link from "next/link";
import { requireRep } from "@/server/guards";
import { loadRoomData } from "@/server/loaders";
import { getFeed } from "@/lib/repo";
import { Badge } from "@/components/ui/Badge";
import { DealStrip } from "@/components/modules/DealStrip";
import { AccountSnapshot } from "@/components/modules/AccountSnapshot";
import { StakeholderMap } from "@/components/modules/StakeholderMap";
import { ContentHub } from "@/components/modules/ContentHub";
import { ActivityFeed } from "@/components/modules/ActivityFeed";

export const dynamic = "force-dynamic";

/**
 * The room builder: one stacked page composing the four modules from a single
 * parallel data load. Unknown slugs 404 (via loadRoomData -> notFound). Modules
 * are pure components fed by props here, so the same set powers the P2 buyer view.
 */
export default async function RoomBuilderPage({
  params,
}: {
  params: { slug: string };
}) {
  const { token } = requireRep();
  const data = await loadRoomData(params.slug, token);
  const events = getFeed(data.room.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/seller"
            className="text-sm text-slate-500 transition hover:text-brand-700"
          >
            ← All accounts
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {data.account.name}
          </h1>
          <p className="text-sm text-slate-500">
            Room <code className="text-slate-600">/{data.room.slug}</code> ·
            created by {data.room.created_by}
          </p>
        </div>
        <Badge tone={data.room.status === "published" ? "green" : "amber"}>
          {data.room.status === "published" ? "Published" : "Draft"}
        </Badge>
      </div>

      <DealStrip opportunities={data.opportunities} />
      <AccountSnapshot account={data.account} enrichment={data.enrichment} />
      <StakeholderMap contacts={data.contacts} />
      <ContentHub resources={data.resources} />
      <ActivityFeed events={events} />
    </div>
  );
}
