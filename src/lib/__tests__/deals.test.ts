import { describe, it, expect } from "vitest";
import { pickPrimaryOpportunity } from "../deals";
import type { Opportunity } from "../types";

function opp(overrides: Partial<Opportunity>): Opportunity {
  return {
    id: "opp",
    account_id: "acc",
    name: "Deal",
    stage: "Discovery",
    amount: 1000,
    currency: "USD",
    close_date: "2026-12-31",
    type: "New Business",
    owner: "Rep",
    products: [],
    next_step: "",
    created_at: "2026-01-01T00:00:00Z",
    days_in_stage: 1,
    competitors: [],
    ...overrides,
  };
}

describe("pickPrimaryOpportunity", () => {
  it("returns null for no opportunities", () => {
    expect(pickPrimaryOpportunity([])).toBeNull();
    expect(pickPrimaryOpportunity(undefined)).toBeNull();
  });

  it("prefers the most-advanced stage", () => {
    const picked = pickPrimaryOpportunity([
      opp({ id: "a", stage: "Discovery" }),
      opp({ id: "b", stage: "Negotiation" }),
      opp({ id: "c", stage: "Proposal" }),
    ]);
    expect(picked?.id).toBe("b");
  });

  it("breaks ties on the same stage by soonest close date", () => {
    const picked = pickPrimaryOpportunity([
      opp({ id: "later", stage: "Proposal", close_date: "2026-09-01" }),
      opp({ id: "sooner", stage: "Proposal", close_date: "2026-05-01" }),
    ]);
    expect(picked?.id).toBe("sooner");
  });
});
