import Link from "next/link";
import { requireRep } from "@/server/guards";
import { loadRoomData } from "@/server/loaders";
import { getFeed, getEventsForInsights } from "@/lib/repo";
import { computeInsights } from "@/lib/insights";
import { RoomControls } from "@/components/seller/RoomControls";
import { FeedAutoRefresh } from "@/components/seller/FeedAutoRefresh";
import { EngagementSummary } from "@/components/seller/EngagementSummary";
import { ContentManager } from "@/components/seller/ContentManager";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { sectionDomId } from "@/lib/notes";
import { DealOverview } from "@/components/modules/DealOverview";
import { AccountSnapshot } from "@/components/modules/AccountSnapshot";
import { StakeholderMap } from "@/components/modules/StakeholderMap";
import { InsightsPanel } from "@/components/modules/InsightsPanel";
import { AnalyticsSummary } from "@/components/modules/AnalyticsSummary";
import { ActivityFeed } from "@/components/modules/ActivityFeed";
import { NotesDrawer } from "@/components/seller/NotesDrawer";

export const dynamic = "force-dynamic";

/**
 * The room builder, build-first, laid out as a widget grid: Account Snapshot and
 * Stakeholder Map sit side by side up top (compact context, using the horizontal
 * space), with the detail-dense panels — Deal Overview, then Activity &
 * Engagement, then the Content Hub — stacked full-width below. A glanceable
 * engagement KPI strip stays at the top. Panels are collapsible (state per
 * browser). Drag-to-reorder is intentionally shelved for now; the layout is
 * fixed. Modules are pure components fed by a single parallel load, so the same
 * set can power the buyer view.
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

      {/* Row 1: compact context, side by side and equal height on wide screens
          (default grid stretch). A collapsed panel pins to the top via the
          CollapsibleSection's self-start so it won't stretch. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CollapsibleSection
          title="Account Snapshot"
          storageKey="snapshot"
          id={sectionDomId("snapshot")}
          className="scroll-mt-24"
        >
          <AccountSnapshot
            account={data.account}
            enrichment={data.enrichment}
            opportunities={data.opportunities}
          />
        </CollapsibleSection>
        <CollapsibleSection
          title="Stakeholder Map"
          storageKey="stakeholders"
          id={sectionDomId("stakeholders")}
          className="scroll-mt-24"
        >
          <StakeholderMap contacts={data.contacts} />
        </CollapsibleSection>
      </div>

      {/* Detail-dense panels, stacked full-width below. */}
      <CollapsibleSection
        title="Deal Overview"
        storageKey="deal"
        id={sectionDomId("deal")}
        className="scroll-mt-24"
      >
        <DealOverview opportunities={data.opportunities} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Activity & Engagement"
        storageKey="engagement"
        id={sectionDomId("engagement")}
        className="scroll-mt-24"
      >
        <div className="space-y-4">
          <InsightsPanel insights={insights} />
          <AnalyticsSummary insights={insights} />
          <ActivityFeed events={events} contentTitles={contentTitles} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Content Hub"
        storageKey="content"
        id={sectionDomId("content")}
        className="scroll-mt-24"
      >
        <ContentManager slug={data.room.slug} resources={data.resources} />
      </CollapsibleSection>

      {/* Floating notes button (bottom-right) + slide-out pane. Rep-only. */}
      <NotesDrawer slug={data.room.slug} notes={data.notes} />
    </div>
  );
}
