/**
 * Robustness / edge-case suite. Focused on the pure (framework-free) logic so it
 * runs without a DB, browser, or live CRM. Emphasis is on the nasty inputs the
 * happy-path tests don't hit: null/undefined/empty, boundaries, clamping,
 * determinism, idempotency, unicode, and tie-breaks.
 */
import { describe, it, expect } from "vitest";
import { parseYouTubeId, youTubeEmbedUrl } from "../youtube";
import { watchedPercent, thresholdsToFire, PROGRESS_THRESHOLDS } from "../progress";
import {
  initials,
  formatAmount,
  formatDate,
  formatDuration,
  contentTypeLabel,
} from "../format";
import { isEventType, validateEventBody, EVENT_TYPES } from "../events";
import { pickPrimaryOpportunity, stageIndex, STAGE_SEQUENCE } from "../deals";
import {
  orderCategories,
  isKnownCategory,
  categoryForContent,
  CATEGORY_ORDER,
} from "../categories";
import {
  isValidTarget,
  normalizeTarget,
  formatNoteTime,
  targetDomId,
  targetSectionKey,
  sectionDomId,
  NOTE_TARGETS,
} from "../notes";
import { orderKeys, parseSectionOrder, DEFAULT_SECTION_ORDER } from "../sections";
import { followUpForCategory } from "../followups";
import { computeInsights, type ContentMeta } from "../insights";
import type { EventRecord, Opportunity } from "../types";

/* ------------------------------- helpers ------------------------------ */

function opp(p: Partial<Opportunity>): Opportunity {
  return {
    id: "opp_1",
    account_id: "acc_1",
    name: "Deal",
    stage: "Discovery",
    amount: 1000,
    currency: "USD",
    close_date: "2026-06-30",
    type: "New Business",
    owner: "Rep",
    products: [],
    next_step: "",
    created_at: "2026-01-01T00:00:00.000Z",
    days_in_stage: 1,
    competitors: [],
    ...p,
  };
}

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

/* ============================ youtube ================================= */

describe("parseYouTubeId", () => {
  it("returns null for null", () => expect(parseYouTubeId(null)).toBeNull());
  it("returns null for undefined", () =>
    expect(parseYouTubeId(undefined)).toBeNull());
  it("returns null for empty string", () => expect(parseYouTubeId("")).toBeNull());
  it("parses watch?v= URLs", () =>
    expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    ));
  it("parses youtu.be short links", () =>
    expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ"));
  it("parses /embed/ URLs", () =>
    expect(parseYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    ));
  it("parses /shorts/ URLs", () =>
    expect(parseYouTubeId("https://www.youtube.com/shorts/abcdef123")).toBe(
      "abcdef123",
    ));
  it("ignores trailing params after v=", () =>
    expect(
      parseYouTubeId("https://www.youtube.com/watch?v=M7lc1UVf-VE&t=30s"),
    ).toBe("M7lc1UVf-VE"));
  it("finds v= even when not the first param", () =>
    expect(parseYouTubeId("https://www.youtube.com/watch?list=PL&v=abcdef")).toBe(
      "abcdef",
    ));
  it("returns null for a non-YouTube URL", () =>
    expect(parseYouTubeId("https://example.com/video")).toBeNull());
  it("keeps underscores and dashes in ids", () =>
    expect(parseYouTubeId("https://youtu.be/a_b-c123")).toBe("a_b-c123"));
  it("rejects too-short ids (<6 chars)", () =>
    expect(parseYouTubeId("https://youtu.be/abc")).toBeNull());
});

describe("youTubeEmbedUrl", () => {
  it("builds an embed URL for the id", () =>
    expect(youTubeEmbedUrl("abc123")).toBe(
      "https://www.youtube.com/embed/abc123?enablejsapi=1&rel=0&modestbranding=1",
    ));
  it("enables the IFrame API", () =>
    expect(youTubeEmbedUrl("x")).toContain("enablejsapi=1"));
});

/* ============================ progress =============================== */

describe("watchedPercent", () => {
  it("computes the midpoint", () => expect(watchedPercent(30, 60)).toBe(50));
  it("is 0 at the start", () => expect(watchedPercent(0, 60)).toBe(0));
  it("is 100 at the end", () => expect(watchedPercent(60, 60)).toBe(100));
  it("clamps above 100", () => expect(watchedPercent(120, 60)).toBe(100));
  it("clamps below 0", () => expect(watchedPercent(-10, 60)).toBe(0));
  it("returns 0 for zero duration", () => expect(watchedPercent(30, 0)).toBe(0));
  it("returns 0 for null duration", () => expect(watchedPercent(30, null)).toBe(0));
  it("returns 0 for undefined duration", () =>
    expect(watchedPercent(30, undefined)).toBe(0));
  it("returns 0 for negative duration", () =>
    expect(watchedPercent(30, -60)).toBe(0));
  it("computes a quarter", () => expect(watchedPercent(15, 60)).toBe(25));
});

describe("thresholdsToFire", () => {
  it("fires nothing at 0%", () =>
    expect(thresholdsToFire(0, new Set())).toEqual([]));
  it("fires 25 at exactly 25%", () =>
    expect(thresholdsToFire(25, new Set())).toEqual([25]));
  it("fires 25+50 at 50%", () =>
    expect(thresholdsToFire(50, new Set())).toEqual([25, 50]));
  it("fires all crossed at 80%", () =>
    expect(thresholdsToFire(80, new Set())).toEqual([25, 50, 75]));
  it("treats 100% as all-but-not-a-new-threshold", () =>
    expect(thresholdsToFire(100, new Set())).toEqual([25, 50, 75]));
  it("only fires the not-yet-emitted ones", () =>
    expect(thresholdsToFire(80, new Set([25, 50]))).toEqual([75]));
  it("is idempotent once all fired", () =>
    expect(thresholdsToFire(80, new Set([25, 50, 75]))).toEqual([]));
  it("fires nothing just below 25%", () =>
    expect(thresholdsToFire(24.9, new Set())).toEqual([]));
  it("returns [] for NaN", () =>
    expect(thresholdsToFire(Number.NaN, new Set())).toEqual([]));
  it("returns [] for Infinity (not finite)", () =>
    expect(thresholdsToFire(Infinity, new Set())).toEqual([]));
  it("exposes exactly three thresholds", () =>
    expect(PROGRESS_THRESHOLDS).toEqual([25, 50, 75]));
});

/* ============================= format =============================== */

describe("formatDate", () => {
  it("dashes null", () => expect(formatDate(null)).toBe("—"));
  it("dashes undefined", () => expect(formatDate(undefined)).toBe("—"));
  it("dashes empty string", () => expect(formatDate("")).toBe("—"));
  it("dashes an unparseable date", () => expect(formatDate("not-a-date")).toBe("—"));
  it("formats a valid local date", () =>
    expect(formatDate(new Date(2026, 2, 5).toISOString())).toBe("Mar 5, 2026"));
});

describe("formatDuration", () => {
  it("is blank for null", () => expect(formatDuration(null)).toBe(""));
  it("is blank for undefined", () => expect(formatDuration(undefined)).toBe(""));
  it("renders zero", () => expect(formatDuration(0)).toBe("0 min"));
  it("rounds 59s to 1 min", () => expect(formatDuration(59)).toBe("1 min"));
  it("renders 60s as 1 min", () => expect(formatDuration(60)).toBe("1 min"));
  it("rounds 90s to 2 min", () => expect(formatDuration(90)).toBe("2 min"));
  it("renders exactly one hour", () => expect(formatDuration(3600)).toBe("1 hr"));
  it("renders 1 hr 1 min", () => expect(formatDuration(3660)).toBe("1 hr 1 min"));
  it("renders 1 hr 30 min", () => expect(formatDuration(5400)).toBe("1 hr 30 min"));
  it("renders two hours flat", () => expect(formatDuration(7200)).toBe("2 hr"));
});

describe("formatAmount", () => {
  it("dashes null", () => expect(formatAmount(null)).toBe("—"));
  it("formats a large amount with commas", () =>
    expect(formatAmount(120000)).toBe("$120,000"));
  it("formats zero", () => expect(formatAmount(0)).toBe("$0"));
  it("respects an explicit currency arg", () =>
    expect(formatAmount(1000, "USD")).toBe("$1,000"));
});

describe("contentTypeLabel", () => {
  it("labels video", () => expect(contentTypeLabel("video")).toBe("Video"));
  it("labels document", () =>
    expect(contentTypeLabel("document")).toBe("Document"));
  it("labels case_study", () =>
    expect(contentTypeLabel("case_study")).toBe("Case study"));
  it("labels one_pager", () =>
    expect(contentTypeLabel("one_pager")).toBe("One-pager"));
  it("passes through an unknown type", () =>
    expect(contentTypeLabel("webinar")).toBe("webinar"));
});

describe("initials", () => {
  it("takes first letters of both names", () =>
    expect(initials("David", "Park")).toBe("DP"));
  it("falls back to ? when both blank", () => expect(initials("", "")).toBe("?"));
  it("handles a missing last name", () => expect(initials("alice")).toBe("A"));
  it("falls back to ? for undefined/undefined", () =>
    expect(initials(undefined, undefined)).toBe("?"));
  it("trims whitespace before taking the initial", () =>
    expect(initials("  bob ", "   ")).toBe("B"));
});

/* ============================= events =============================== */

describe("isEventType", () => {
  it("accepts a known type", () => expect(isEventType("ROOM_VIEWED")).toBe(true));
  it("rejects an unknown type", () => expect(isEventType("BOGUS")).toBe(false));
  it("rejects null", () => expect(isEventType(null)).toBe(false));
  it("rejects a number", () => expect(isEventType(123)).toBe(false));
  it("exposes exactly six types", () => expect(EVENT_TYPES).toHaveLength(6));
});

describe("validateEventBody", () => {
  it("rejects null body", () => expect(validateEventBody(null).ok).toBe(false));
  it("rejects a string body", () =>
    expect(validateEventBody("nope").ok).toBe(false));
  it("rejects a missing type", () => expect(validateEventBody({}).ok).toBe(false));
  it("rejects an unknown type", () =>
    expect(validateEventBody({ type: "BOGUS" }).ok).toBe(false));
  it("accepts a bare ROOM_VIEWED", () => {
    const r = validateEventBody({ type: "ROOM_VIEWED" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.content_id).toBeNull();
  });
  it("requires content_id for VIDEO_PLAYED", () =>
    expect(validateEventBody({ type: "VIDEO_PLAYED" }).ok).toBe(false));
  it("accepts VIDEO_PLAYED with content_id", () =>
    expect(
      validateEventBody({ type: "VIDEO_PLAYED", content_id: "cnt_1" }).ok,
    ).toBe(true));
  it("rejects a non-string content_id", () =>
    expect(
      validateEventBody({ type: "RESOURCE_OPENED", content_id: 123 }).ok,
    ).toBe(false));
  it("rejects an empty-string content_id where required", () =>
    expect(
      validateEventBody({ type: "RESOURCE_REVISITED", content_id: "" }).ok,
    ).toBe(false));
  it("rejects array metadata", () =>
    expect(validateEventBody({ type: "ROOM_VIEWED", metadata: [] }).ok).toBe(
      false,
    ));
  it("accepts object metadata", () => {
    const r = validateEventBody({ type: "ROOM_VIEWED", metadata: { a: 1 } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.metadata).toEqual({ a: 1 });
  });
  it("accepts a full progress event", () =>
    expect(
      validateEventBody({
        type: "VIDEO_PROGRESS",
        content_id: "c",
        metadata: { percent: 50 },
      }).ok,
    ).toBe(true));
});

/* ============================== deals =============================== */

describe("pickPrimaryOpportunity", () => {
  it("returns null for null", () =>
    expect(pickPrimaryOpportunity(null)).toBeNull());
  it("returns null for undefined", () =>
    expect(pickPrimaryOpportunity(undefined)).toBeNull());
  it("returns null for an empty list", () =>
    expect(pickPrimaryOpportunity([])).toBeNull());
  it("returns the only opportunity", () =>
    expect(pickPrimaryOpportunity([opp({ id: "solo" })])?.id).toBe("solo"));
  it("prefers the most-advanced stage", () =>
    expect(
      pickPrimaryOpportunity([
        opp({ id: "early", stage: "Discovery" }),
        opp({ id: "late", stage: "Negotiation" }),
      ])?.id,
    ).toBe("late"));
  it("breaks a stage tie by soonest close date", () =>
    expect(
      pickPrimaryOpportunity([
        opp({ id: "far", stage: "Proposal", close_date: "2026-09-01" }),
        opp({ id: "soon", stage: "Proposal", close_date: "2026-05-01" }),
      ])?.id,
    ).toBe("soon"));
  it("breaks a stage+close tie by most recent created_at", () =>
    expect(
      pickPrimaryOpportunity([
        opp({ id: "old", stage: "Negotiation", created_at: "2026-01-01T00:00:00Z" }),
        opp({ id: "new", stage: "Negotiation", created_at: "2026-02-01T00:00:00Z" }),
      ])?.id,
    ).toBe("new"));
  it("ranks an unknown stage below known ones", () =>
    expect(
      pickPrimaryOpportunity([
        opp({ id: "unknown", stage: "Closed Won" }),
        opp({ id: "disc", stage: "Discovery" }),
      ])?.id,
    ).toBe("disc"));
});

describe("stageIndex / STAGE_SEQUENCE", () => {
  it("indexes the first stage at 0", () =>
    expect(stageIndex("Discovery")).toBe(0));
  it("indexes the last stage at 3", () =>
    expect(stageIndex("Negotiation")).toBe(3));
  it("returns -1 for an unknown stage", () =>
    expect(stageIndex("Closed")).toBe(-1));
  it("has four stages", () => expect(STAGE_SEQUENCE).toHaveLength(4));
});

/* ============================ categories ============================ */

describe("categories", () => {
  it("orders by canonical sequence, unknowns last alphabetically", () =>
    expect(
      orderCategories(["Case Studies", "Product Demos", "Zed", "Custom Proposal", "Abe"]),
    ).toEqual(["Custom Proposal", "Product Demos", "Case Studies", "Abe", "Zed"]));
  it("returns [] for an empty list", () => expect(orderCategories([])).toEqual([]));
  it("accepts a current category", () =>
    expect(isKnownCategory("Custom Proposal")).toBe(true));
  it("rejects an old (retired) category", () =>
    expect(isKnownCategory("Pricing")).toBe(false));
  it("rejects null", () => expect(isKnownCategory(null)).toBe(false));
  it("has six categories", () => expect(CATEGORY_ORDER).toHaveLength(6));
  it("delegates a known content id (case study)", () =>
    expect(categoryForContent("cnt_002", "x")).toBe("Case Studies"));
  it("delegates a known content id (demo)", () =>
    expect(categoryForContent("cnt_001", "x")).toBe("Product Demos"));
  it("delegates a known content id (onboarding)", () =>
    expect(categoryForContent("cnt_007", "x")).toBe(
      "Getting Started with Your Trial",
    ));
  it("falls back for an unmapped content id", () =>
    expect(categoryForContent("cnt_zzz", "Fallback")).toBe("Fallback"));
});

/* ============================== notes =============================== */

describe("note targets", () => {
  it("accepts General", () => expect(isValidTarget("General")).toBe(true));
  it("accepts a section target", () =>
    expect(isValidTarget("Stakeholder Map")).toBe(true));
  it("rejects an unknown target", () =>
    expect(isValidTarget("Nonsense")).toBe(false));
  it("rejects a non-string", () => expect(isValidTarget(42)).toBe(false));
  it("has seven targets (General + six sections-ish)", () =>
    expect(NOTE_TARGETS.length).toBeGreaterThanOrEqual(6));
  it("normalizes General to null", () =>
    expect(normalizeTarget("General")).toBeNull());
  it("normalizes an unknown to null", () =>
    expect(normalizeTarget("bogus")).toBeNull());
  it("keeps a real target", () =>
    expect(normalizeTarget("Stakeholder Map")).toBe("Stakeholder Map"));
});

describe("note → section navigation", () => {
  it("maps Stakeholder Map", () =>
    expect(targetDomId("Stakeholder Map")).toBe("room-section-stakeholders"));
  it("maps Deal Overview", () =>
    expect(targetSectionKey("Deal Overview")).toBe("deal"));
  it("builds a section DOM id", () =>
    expect(sectionDomId("content")).toBe("room-section-content"));
  it("has nowhere to go for null", () =>
    expect(targetDomId(null)).toBeNull());
  it("has nowhere to go for General", () =>
    expect(targetDomId("General")).toBeNull());
  it("has nowhere to go for unknown", () =>
    expect(targetDomId("bogus")).toBeNull());
});

describe("formatNoteTime", () => {
  it("renders the comment style", () =>
    expect(formatNoteTime(new Date(2026, 5, 7, 10, 8).toISOString())).toBe(
      "10:08 am, Jun 7th, 2026",
    ));
  it("uses 12 for noon", () =>
    expect(formatNoteTime(new Date(2026, 0, 1, 12, 0).toISOString())).toBe(
      "12:00 pm, Jan 1st, 2026",
    ));
  it("uses 12 for midnight", () =>
    expect(formatNoteTime(new Date(2026, 0, 1, 0, 5).toISOString())).toBe(
      "12:05 am, Jan 1st, 2026",
    ));
  it("pads minutes", () =>
    expect(formatNoteTime(new Date(2026, 0, 1, 9, 5).toISOString())).toContain(
      "9:05 am",
    ));
  it("uses 'nd' for the 2nd", () =>
    expect(formatNoteTime(new Date(2026, 2, 2, 9, 0).toISOString())).toContain(
      "Mar 2nd",
    ));
  it("uses 'rd' for the 3rd", () =>
    expect(formatNoteTime(new Date(2026, 2, 3, 9, 0).toISOString())).toContain(
      "Mar 3rd",
    ));
  it("uses 'th' for the 11th", () =>
    expect(formatNoteTime(new Date(2026, 2, 11, 9, 0).toISOString())).toContain(
      "Mar 11th",
    ));
  it("uses 'th' for the 13th", () =>
    expect(formatNoteTime(new Date(2026, 2, 13, 9, 0).toISOString())).toContain(
      "Mar 13th",
    ));
  it("uses 'st' for the 21st", () =>
    expect(formatNoteTime(new Date(2026, 2, 21, 9, 0).toISOString())).toContain(
      "Mar 21st",
    ));
  it("returns empty string for garbage", () =>
    expect(formatNoteTime("not-a-date")).toBe(""));
});

/* ============================= sections ============================= */

describe("sections", () => {
  it("returns the default order for null", () =>
    expect(orderKeys(null)).toEqual(DEFAULT_SECTION_ORDER));
  it("returns the default order for undefined", () =>
    expect(orderKeys(undefined)).toEqual(DEFAULT_SECTION_ORDER));
  it("respects saved order and appends the rest", () =>
    expect(orderKeys(["engagement", "content"]).slice(0, 2)).toEqual([
      "engagement",
      "content",
    ]));
  it("drops unknown keys and de-dupes", () => {
    const r = orderKeys(["bogus", "content", "content"]);
    expect(r.filter((k) => k === "content")).toHaveLength(1);
    expect(r).not.toContain("bogus");
  });
  it("always returns every known section once", () =>
    expect(new Set(orderKeys([])).size).toBe(DEFAULT_SECTION_ORDER.length));
  it("parses a JSON array", () =>
    expect(parseSectionOrder('["a","b"]')).toEqual(["a", "b"]));
  it("returns null for null", () => expect(parseSectionOrder(null)).toBeNull());
  it("returns null for invalid JSON", () =>
    expect(parseSectionOrder("not json")).toBeNull());
  it("returns null for a non-array JSON", () =>
    expect(parseSectionOrder('{"a":1}')).toBeNull());
  it("filters non-strings out of the array", () =>
    expect(parseSectionOrder('["a",1,"b"]')).toEqual(["a", "b"]));
});

/* ============================= followups ============================ */

describe("followUpForCategory", () => {
  it("suggests a quote for Custom Proposal", () =>
    expect(followUpForCategory("Custom Proposal")).toMatch(/quote|pricing/i));
  it("suggests a walkthrough for Product Demos", () =>
    expect(followUpForCategory("Product Demos")).toMatch(/walkthrough/i));
  it("suggests a reference for Case Studies", () =>
    expect(followUpForCategory("Case Studies")).toMatch(/reference|customer/i));
  it("suggests onboarding help for Getting Started", () =>
    expect(followUpForCategory("Getting Started with Your Trial")).toMatch(
      /trial|set up|onboard/i,
    ));
  it("defaults for null", () =>
    expect(followUpForCategory(null)).toMatch(/follow up/i));
  it("defaults for an unknown category", () =>
    expect(followUpForCategory("Mystery")).toMatch(/follow up/i));
});

/* ============================= insights ============================= */

describe("computeInsights edge cases", () => {
  it("returns an all-empty result for no events", () => {
    const r = computeInsights([], meta);
    expect(r.totalEvents).toBe(0);
    expect(r.topStakeholder).toBeNull();
    expect(r.mostViewedResource).toBeNull();
    expect(r.lastActivityAt).toBeNull();
    expect(r.eventsByDay).toEqual([]);
  });
  it("returns all-empty when every event is excluded by role", () => {
    const r = computeInsights(
      [ev({ actor_role: "rep" })],
      meta,
      { excludeRoles: ["rep"] },
    );
    expect(r.totalEvents).toBe(0);
  });
  it("counts unique visitors by email", () => {
    const r = computeInsights(
      [
        ev({ actor_email: "a@x.com" }),
        ev({ actor_email: "a@x.com" }),
        ev({ actor_email: "b@x.com" }),
      ],
      meta,
    );
    expect(r.uniqueVisitors).toBe(2);
  });
  it("picks the top stakeholder by count", () => {
    const r = computeInsights(
      [
        ev({ actor_email: "a@x.com", actor_name: "Alice" }),
        ev({ actor_email: "b@x.com", actor_name: "Bob" }),
        ev({ actor_email: "b@x.com", actor_name: "Bob" }),
      ],
      meta,
    );
    expect(r.topStakeholder?.name).toBe("Bob");
  });
  it("counts only content events for most-viewed", () => {
    const r = computeInsights(
      [
        ev({ type: "ROOM_VIEWED" }),
        ev({ type: "VIDEO_PLAYED", content_id: "cnt_2" }),
        ev({ type: "VIDEO_PROGRESS", content_id: "cnt_2" }),
      ],
      meta,
    );
    expect(r.mostViewedResource?.contentId).toBe("cnt_2");
    expect(r.mostViewedResource?.eventCount).toBe(2);
  });
  it("takes last activity as the maximum timestamp", () => {
    const r = computeInsights(
      [
        ev({ created_at: "2026-01-01T00:00:00.000Z" }),
        ev({ created_at: "2026-05-01T00:00:00.000Z" }),
        ev({ created_at: "2026-03-01T00:00:00.000Z" }),
      ],
      meta,
    );
    expect(r.lastActivityAt).toBe("2026-05-01T00:00:00.000Z");
  });
  it("zero-fills the trend window from `now`", () => {
    const r = computeInsights(
      [ev({ created_at: "2026-03-07T09:00:00.000Z" })],
      meta,
      { now: "2026-03-07T23:00:00.000Z" },
    );
    expect(r.eventsByDay).toHaveLength(7);
    expect(r.eventsByDay[6]).toEqual({ date: "2026-03-07", count: 1 });
    expect(r.eventsByDay[0].count).toBe(0);
  });
  it("groups content engagement by category", () => {
    const r = computeInsights(
      [
        ev({ type: "RESOURCE_OPENED", content_id: "cnt_1" }),
        ev({ type: "VIDEO_PLAYED", content_id: "cnt_2" }),
      ],
      meta,
    );
    const cats = Object.fromEntries(
      r.eventsByCategory.map((c) => [c.category, c.count]),
    );
    expect(cats["Custom Proposal"]).toBe(1);
    expect(cats["Product Demos"]).toBe(1);
  });
  it("falls back to Uncategorized for unknown content meta", () => {
    const r = computeInsights(
      [ev({ type: "RESOURCE_OPENED", content_id: "cnt_unknown" })],
      meta,
    );
    expect(r.eventsByCategory[0].category).toBe("Uncategorized");
  });
  it("handles a content event with a null content_id gracefully", () => {
    const r = computeInsights(
      [ev({ type: "VIDEO_PLAYED", content_id: null })],
      meta,
    );
    expect(r.mostViewedResource).toBeNull();
    expect(r.totalEvents).toBe(1);
  });
  it("ranks people engagement descending", () => {
    const r = computeInsights(
      [
        ev({ actor_email: "a@x.com", actor_name: "Alice" }),
        ev({ actor_email: "a@x.com", actor_name: "Alice" }),
        ev({ actor_email: "b@x.com", actor_name: "Bob" }),
      ],
      meta,
    );
    expect(r.peopleEngagement[0]).toEqual({ name: "Alice", eventCount: 2 });
  });
  it("is deterministic across repeated calls", () => {
    const events = [
      ev({ actor_email: "a@x.com", type: "VIDEO_PLAYED", content_id: "cnt_2" }),
      ev({ actor_email: "b@x.com", type: "RESOURCE_OPENED", content_id: "cnt_1" }),
    ];
    expect(JSON.stringify(computeInsights(events, meta))).toBe(
      JSON.stringify(computeInsights(events, meta)),
    );
  });
});
