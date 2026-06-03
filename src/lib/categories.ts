/**
 * Content categories and their canonical display order. Categories auto-sort by
 * this fixed sequence in both portals; the seller only controls ordering *within*
 * a category (and which category a resource belongs to). Anything not listed
 * sorts after these, alphabetically.
 *
 * The CRM ships its own coarse categories (Product Demo, Customer Story, …); we
 * present a buyer-facing taxonomy instead and map each CRM content item onto it
 * (see CONTENT_CATEGORY_MAP). The CRM stays read-only — this mapping lives here,
 * and a seller can still override per room via the Content Hub.
 */

export const CATEGORY_ORDER = [
  "Custom Proposal",
  "Secureframe Overview & Our Team",
  "Product Demos",
  "Getting Started with Your Trial",
  "Case Studies",
  "Integration Documentation",
] as const;

/** The set a seller can assign via the Content Hub. */
export const ASSIGNABLE_CATEGORIES: string[] = [...CATEGORY_ORDER];

/**
 * Default category for each CRM content item (by id). This is the "dedicated
 * category" delegation; a per-room override (room_resources.category) still wins.
 */
const CONTENT_CATEGORY_MAP: Record<string, string> = {
  // Custom Proposal — pricing, scope, and deal-shaping collateral.
  cnt_003: "Custom Proposal", // ROI Analysis Template
  cnt_015: "Custom Proposal", // Enterprise Pricing Guide
  cnt_010: "Custom Proposal", // Competitive Comparison Brief

  // Secureframe Overview & Our Team — who we are and what the platform does.
  cnt_016: "Secureframe Overview & Our Team", // Platform at a Glance
  cnt_008: "Secureframe Overview & Our Team", // Product Roadmap 2026
  cnt_004: "Secureframe Overview & Our Team", // Security & Compliance Overview

  // Product Demos — feature walkthroughs.
  cnt_001: "Product Demos", // Platform Overview Demo
  cnt_011: "Product Demos", // Analytics Dashboard Walkthrough
  cnt_012: "Product Demos", // HIPAA Compliance and Data Security Demo

  // Getting Started with Your Trial — onboarding.
  cnt_007: "Getting Started with Your Trial", // Implementation Playbook

  // Case Studies — proof from comparable customers.
  cnt_005: "Case Studies", // Customer Success: CarePoint Health
  cnt_002: "Case Studies", // Case Study: Apex Manufacturing
  cnt_013: "Case Studies", // Case Study: Lumen Healthcare Network
  cnt_014: "Case Studies", // Case Study: Nimbus SaaS

  // Integration Documentation — technical setup guides.
  cnt_006: "Integration Documentation", // Technical Architecture Deep Dive
  cnt_009: "Integration Documentation", // Data Migration Guide
};

/**
 * The buyer-facing category for a content item: its dedicated mapping if known,
 * otherwise the CRM's own category as a fallback (so new/unmapped content still
 * lands somewhere sensible).
 */
export function categoryForContent(id: string, fallback: string): string {
  return CONTENT_CATEGORY_MAP[id] ?? fallback;
}

export function isKnownCategory(value: unknown): value is string {
  return typeof value === "string" && (CATEGORY_ORDER as readonly string[]).includes(value);
}

/** Sort category names by the canonical order, unknowns last (alphabetical). */
export function orderCategories(categories: string[]): string[] {
  const rank = (c: string) => {
    const i = (CATEGORY_ORDER as readonly string[]).indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...categories].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b),
  );
}
