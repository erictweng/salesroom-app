import { describe, it, expect } from "vitest";
import { computeInsights, type ContentMeta } from "../insights";
import type { EventRecord } from "../types";

function ev(p: Partial<EventRecord>): EventRecord {
  return {
    id: 1,
    room_id: 1,
    type: "ROOM_VIEWED",
    content_id: null,
    actor_email: "a@x.com",
    actor_name: "Alice",
    actor_role: "buyer",
    metadata: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...p,
  };
}

const meta: Record<string, ContentMeta> = {
  cnt_1: { title: "Pricing Sheet", category: "Pricing" },
  cnt_2: { title: "Platform Demo", category: "Product Demo" },
};

describe("computeInsights", () => {
  it("returns an all-empty result for no events (no divide-by-zero)", () => {
    const r = computeInsights([], meta);
    expect(r.totalEvents).toBe(0);
    expect(r.topStakeholder).toBeNull();
    expect(r.mostViewedResource).toBeNull();
    expect(r.lastActivityAt).toBeNull();
    expect(r.suggestedFollowUp).toBeNull();
  });

  it("picks the top stakeholder by event count", () => {
    const r = computeInsights(
      [
        ev({ actor_email: "a@x.com", actor_name: "Alice" }),
        ev({ actor_email: "b@x.com", actor_name: "Bob" }),
        ev({ actor_email: "b@x.com", actor_name: "Bob" }),
      ],
      meta,
    );
    expect(r.topStakeholder?.name).toBe("Bob");
    expect(r.topStakeholder?.eventCount).toBe(2);
    expect(r.uniqueVisitors).toBe(2);
  });

  it("breaks stakeholder ties by latest activity, then name", () => {
    const laterWins = computeInsights(
      [
        ev({ actor_email: "a@x.com", actor_name: "Alice", created_at: "2026-01-01T00:00:00.000Z" }),
        ev({ actor_email: "b@x.com", actor_name: "Bob", created_at: "2026-01-02T00:00:00.000Z" }),
      ],
      meta,
    );
    expect(laterWins.topStakeholder?.name).toBe("Bob");

    const nameWins = computeInsights(
      [
        ev({ actor_email: "z@x.com", actor_name: "Zoe", created_at: "2026-01-01T00:00:00.000Z" }),
        ev({ actor_email: "a@x.com", actor_name: "Alice", created_at: "2026-01-01T00:00:00.000Z" }),
      ],
      meta,
    );
    expect(nameWins.topStakeholder?.name).toBe("Alice");
  });

  it("counts only content events for most-viewed and maps follow-up by category", () => {
    const r = computeInsights(
      [
        ev({ type: "ROOM_VIEWED" }),
        ev({ type: "RESOURCE_OPENED", content_id: "cnt_1" }),
        ev({ type: "VIDEO_PLAYED", content_id: "cnt_2" }),
        ev({ type: "VIDEO_PROGRESS", content_id: "cnt_2" }),
      ],
      meta,
    );
    expect(r.mostViewedResource?.contentId).toBe("cnt_2");
    expect(r.mostViewedResource?.title).toBe("Platform Demo");
    expect(r.mostViewedResource?.eventCount).toBe(2);
    expect(r.suggestedFollowUp).toMatch(/walkthrough/i);
  });

  it("excludes rep events from insights when asked", () => {
    const r = computeInsights(
      [
        ev({ actor_email: "rep@x.com", actor_name: "Rep", actor_role: "rep", type: "VIDEO_PLAYED", content_id: "cnt_1" }),
        ev({ actor_email: "buyer@x.com", actor_name: "Buyer", actor_role: "buyer" }),
      ],
      meta,
      { excludeRoles: ["rep"] },
    );
    expect(r.totalEvents).toBe(1);
    expect(r.topStakeholder?.name).toBe("Buyer");
    expect(r.mostViewedResource).toBeNull(); // the only content event was the rep's
  });

  it("computes last activity as the maximum timestamp", () => {
    const r = computeInsights(
      [
        ev({ created_at: "2026-01-01T00:00:00.000Z" }),
        ev({ created_at: "2026-03-01T00:00:00.000Z" }),
        ev({ created_at: "2026-02-01T00:00:00.000Z" }),
      ],
      meta,
    );
    expect(r.lastActivityAt).toBe("2026-03-01T00:00:00.000Z");
  });
});
