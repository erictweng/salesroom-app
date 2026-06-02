import Link from "next/link";
import { requireRep } from "@/server/guards";
import { loadRoomData } from "@/server/loaders";
import { getFeed, getEventsForInsights } from "@/lib/repo";
import { computeInsights } from "@/lib/insights";
import { RoomControls } from "@/components/seller/RoomControls";
import { FeedAutoRefresh } from "@/components/seller/FeedAutoRefresh";
import { EngagementSummary } from "@/components/seller/EngagementSummary";
import { ContentManager } from "@/components/seller/ContentManager";
import {
  SortableSections,
  type SectionDescriptor,
} from "@/components/seller/SortableSections";
import { orderKeys, parseSectionOrder } from "@/lib/sections";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { DealOverview } from "@/components/modules/DealOverview";
import { AccountSnapshot } from "@/components/modules/AccountSnapshot";
import { StakeholderMap } from "@/components/modules/StakeholderMap";
import { InsightsPanel } from "@/components/modules/InsightsPanel";
import { ActivityFeed } from "@/components/modules/ActivityFeed";
import { InternalNotes } from "@/components/seller/InternalNotes";

export const dynamic = "force-dynamic";

/**
 * The room builder, build-first: the rep's working surface (content curation) is
 * primary, with a glanceable engagement strip up top. Account context,
 * stakeholders, and the engagement detail live in collapsible sections so the
 * page stays focused. Modules are pure components fed by a single parallel load,
 * so the same set can power the buyer view.
 */
export default async function RoomBuilderPage({
  params,
}: {
  params: { slug: string };
}) {
  const { token } = requireRep();
  const data = await loadRoomData(params.slug, token);
  const events = getFeed(data.room.id);
  const contentTitles = Object.fromEntries(
    data.resources.map((r) => [r.content_id, r.content.title]),
  );
  const contentMeta = Object.fromEntries(
    data.resources.map((r) => [
      r.content_id,
      { title: r.content.title, category: r.effectiveCategory },
    ]),
  );
  const insights = computeInsights(
    getEventsForInsights(data.room.id),
    contentMeta,
    { excludeRoles: ["rep"] },
  );

  // The reorderable panels. Built here (server) and ordered by the room's saved
  // layout, so the chosen order server-renders on first paint.
  const sectionMap: Record<string, SectionDescriptor> = {
    content: {
      id: "content",
      title: "Content Hub",
      storageKey: "content",
      content: <ContentManager slug={data.room.slug} resources={data.resources} />,
    },
    snapshot: {
      id: "snapshot",
      title: "Account Snapshot",
      storageKey: "snapshot",
      content: <AccountSnapshot account={data.account} enrichment={data.enrichment} />,
    },
    stakeholders: {
      id: "stakeholders",
      title: "Stakeholder Map",
      storageKey: "stakeholders",
      content: <StakeholderMap contacts={data.contacts} />,
    },
    engagement: {
      id: "engagement",
      title: "Deal & Engagement",
      storageKey: "engagement",
      content: (
        <div className="space-y-4">
          {/* Deal status (CRM) stays visible at the top... */}
          <DealOverview opportunities={data.opportunities} />
          {/* ...with the live activity in its own nested collapse below. */}
          <CollapsibleSection
            title="Activity & Engagement"
            storageKey="activity"
            nested
          >
            <InsightsPanel insights={insights} />
            <ActivityFeed events={events} contentTitles={contentTitles} />
          </CollapsibleSection>
        </div>
      ),
    },
    notes: {
      id: "notes",
      title: "Internal Notes",
      storageKey: "notes",
      content: (
        <InternalNotes
          slug={data.room.slug}
          initial={data.room.internal_notes ?? ""}
        />
      ),
    },
  };
  const orderedSections = orderKeys(parseSectionOrder(data.room.section_order))
    .map((k) => sectionMap[k])
    .filter(Boolean) as SectionDescriptor[];

  return (
    <div className="space-y-5">
      <FeedAutoRefresh />

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

      <EngagementSummary insights={insights} status={data.room.status} />

      <SortableSections slug={data.room.slug} sections={orderedSections} />
    </div>
  );
}
