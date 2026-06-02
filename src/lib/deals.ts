import type { Opportunity } from "./types";

/**
 * All CRM opportunity stages are "open" (no Closed Won/Lost in the enum), so we
 * rank by how far along the deal is. Used by the DealStrip to surface the single
 * most relevant opportunity for an account.
 */
const STAGE_RANK: Record<string, number> = {
  Negotiation: 4,
  Proposal: 3,
  "Technical Evaluation": 2,
  Discovery: 1,
};

/**
 * Pick the "primary" opportunity to summarise: most-advanced stage, tie-broken
 * by soonest close date, then most recently created. Deterministic.
 */
export function pickPrimaryOpportunity(
  opps: Opportunity[] | null | undefined,
): Opportunity | null {
  if (!opps || opps.length === 0) return null;
  return [...opps].sort((a, b) => {
    const byStage = (STAGE_RANK[b.stage] ?? 0) - (STAGE_RANK[a.stage] ?? 0);
    if (byStage) return byStage;
    const byClose = (a.close_date ?? "").localeCompare(b.close_date ?? "");
    if (byClose) return byClose;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  })[0];
}
