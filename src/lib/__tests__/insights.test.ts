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
  cnt_1: { title: "Pricing Sheet", category: "Custom Proposal" },
  cnt_2: { title: "Platform Demo", category: "Product Demos" },
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

  it("produces analytics breakdowns (by type, top people, top resources)", () => {
    const r = computeInsights(
      [
        ev({ actor_email: "a@x.com", actor_name: "Alice", type: "ROOM_VIEWED" }),
        ev({ actor_email: "a@x.com", actor_name: "Alice", type: "VIDEO_PLAYED", content_id: "cnt_2" }),
        ev({ actor_email: "b@x.com", actor_name: "Bob", type: "RESOURCE_OPENED", content_id: "cnt_1" }),
      ],
      meta,
    );
    expect(r.eventsByType.ROOM_VIEWED).toBe(1);
    expect(r.eventsByType.VIDEO_PLAYED).toBe(1);
    expect(r.eventsByType.RESOURCE_OPENED).toBe(1);
    expect(r.topStakeholders[0]).toEqual({ name: "Alice", eventCount: 2 });
    expect(r.topResources.map((x) => x.contentId)).toContain("cnt_2");
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

  it("builds a zero-filled per-day trend anchored to `now`", () => {
    const r = computeInsights(
      [
        ev({ created_at: "2026-03-05T10:00:00.000Z" }),
        ev({ created_at: "2026-03-05T11:00:00.000Z" }),
        ev({ created_at: "2026-03-07T09:00:00.000Z" }),
      ],
      meta,
      { now: "2026-03-07T23:00:00.000Z" },
    );
    expect(r.eventsByDay).toHaveLength(7);
    expect(r.eventsByDay[0].date).toBe("2026-03-01");
    expect(r.eventsByDay[6].date).toBe("2026-03-07");
    const byDate = Object.fromEntries(r.eventsByDay.map((d) => [d.date, d.count]));
    expect(byDate["2026-03-05"]).toBe(2);
    expect(byDate["2026-03-07"]).toBe(1);
    expect(byDate["2026-03-06"]).toBe(0); // zero-filled gap
  });

  it("groups content engagement by category (desc)", () => {
    const r = computeInsights(
      [
        ev({ type: "RESOURCE_OPENED", content_id: "cnt_1" }), // Pricing
        ev({ type: "VIDEO_PLAYED", content_id: "cnt_2" }), // Product Demo
        ev({ type: "VIDEO_PROGRESS", content_id: "cnt_2" }), // Product Demo
        ev({ type: "ROOM_VIEWED" }), // no content → ignored
      ],
      meta,
    );
    expect(r.eventsByCategory[0]).toEqual({ category: "Product Demos", count: 2 });
    expect(r.eventsByCategory).toContainEqual({ category: "Custom Proposal", count: 1 });
  });

  it("lists per-person engagement totals (desc)", () => {
    const r = computeInsights(
      [
        ev({ actor_email: "a@x.com", actor_name: "Alice" }),
        ev({ actor_email: "a@x.com", actor_name: "Alice" }),
        ev({ actor_email: "b@x.com", actor_name: "Bob" }),
      ],
      meta,
    );
    expect(r.peopleEngagement[0]).toEqual({ name: "Alice", eventCount: 2 });
    expect(r.peopleEngagement[1]).toEqual({ name: "Bob", eventCount: 1 });
  });
});
