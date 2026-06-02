import { describe, it, expect } from "vitest";
import {
  orderKeys,
  parseSectionOrder,
  DEFAULT_SECTION_ORDER,
} from "../sections";

describe("orderKeys", () => {
  it("returns the default order when nothing is saved", () => {
    expect(orderKeys(null)).toEqual(DEFAULT_SECTION_ORDER);
    expect(orderKeys(undefined)).toEqual(DEFAULT_SECTION_ORDER);
    // Default: account context + stakeholders first, content, engagement last.
    expect(orderKeys(null)).toEqual([
      "snapshot",
      "stakeholders",
      "content",
      "engagement",
    ]);
  });

  it("respects the saved order and appends any missing panels", () => {
    expect(orderKeys(["engagement", "content"])).toEqual([
      "engagement",
      "content",
      "snapshot",
      "stakeholders",
    ]);
  });

  it("drops unknown keys and de-dupes", () => {
    expect(orderKeys(["bogus", "content", "content", "snapshot"])).toEqual([
      "content",
      "snapshot",
      "stakeholders",
      "engagement",
    ]);
  });
});

describe("parseSectionOrder", () => {
  it("parses a JSON string array", () => {
    expect(parseSectionOrder('["content","snapshot"]')).toEqual([
      "content",
      "snapshot",
    ]);
  });

  it("returns null for empty/invalid/non-array input", () => {
    expect(parseSectionOrder(null)).toBeNull();
    expect(parseSectionOrder("not json")).toBeNull();
    expect(parseSectionOrder('{"a":1}')).toBeNull();
  });
});
