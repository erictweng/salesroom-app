import Link from "next/link";
import { requireRep } from "@/server/guards";
import { loadRoomData } from "@/server/loaders";
import { getFeed } from "@/lib/repo";
import { RoomControls } from "@/components/seller/RoomControls";
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
  // Map content id -> title so the feed can render "watched Product Demo …".
  const contentTitles = Object.fromEntries(
    data.resources.map((r) => [r.content_id, r.content.title]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
        <RoomControls slug={data.room.slug} status={data.room.status} />
      </div>

      <DealStrip opportunities={data.opportunities} />
      <AccountSnapshot account={data.account} enrichment={data.enrichment} />
      <StakeholderMap contacts={data.contacts} />
      <ContentHub resources={data.resources} />
      <ActivityFeed events={events} contentTitles={contentTitles} />
    </div>
  );
}
