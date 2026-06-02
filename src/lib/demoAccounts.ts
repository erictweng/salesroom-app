import "server-only";
import type { Account } from "./types";

/**
 * Synthetic accounts for stress-testing the seller picker at scale. Enabled only
 * when the DEMO_ACCOUNTS env var is set (count). These are display-only — their
 * ids are prefixed `demo_` and the UI disables "Create room" for them, since they
 * have no real CRM record behind them. Deterministic so the list is stable.
 */

const FIRST = [
  "Apex", "Nimbus", "Vertex", "Quanta", "Lumen", "Cobalt", "Aster", "Onyx",
  "Pylon", "Helix", "Strata", "Marble", "Cinder", "Verdant", "Halcyon",
  "Beacon", "Drift", "Forge", "Ember", "Atlas",
];
const SECOND = [
  "Systems", "Labs", "Health", "Robotics", "Cloud", "Analytics", "Networks",
  "Dynamics", "Works", "Group", "Technologies", "Industries", "Solutions",
  "Digital",
];
const INDUSTRIES = [
  "Technology", "Healthcare", "Manufacturing", "Financial Services", "Retail",
  "Education", "Logistics", "Energy", "Media", "Biotech",
];
const STAGES = [
  "Active Opportunity", "Discovery", "Proposal", "Negotiation", "Qualification",
];
const CITIES = [
  "San Francisco, CA", "Austin, TX", "New York, NY", "Denver, CO",
  "Seattle, WA", "Boston, MA", "Chicago, IL", "Atlanta, GA",
];

export function generateDemoAccounts(count: number): Account[] {
  const out: Account[] = [];
  for (let i = 0; i < count; i++) {
    const name = `${FIRST[i % FIRST.length]} ${SECOND[Math.floor(i / FIRST.length) % SECOND.length]}`;
    out.push({
      id: `demo_${String(i + 1).padStart(4, "0")}`,
      name,
      domain: `${name.toLowerCase().replace(/\s+/g, "")}.com`,
      industry: INDUSTRIES[i % INDUSTRIES.length],
      employee_count: 50 + ((i * 137) % 9950),
      annual_revenue: `$${10 + ((i * 13) % 990)}M`,
      hq_location: CITIES[i % CITIES.length],
      account_stage: STAGES[i % STAGES.length],
      account_owner: "Sarah Chen",
      tech_stack: ["AWS", "Snowflake", "Okta"],
      recent_news: "",
      icp_fit_score: 30 + ((i * 7) % 70),
      created_at: "2026-01-01T00:00:00Z",
    });
  }
  return out;
}
