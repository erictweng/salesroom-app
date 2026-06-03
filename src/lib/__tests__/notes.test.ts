import { describe, it, expect } from "vitest";
import {
  isValidTarget,
  normalizeTarget,
  formatNoteTime,
  sectionDomId,
  targetDomId,
} from "../notes";

describe("note targets", () => {
  it("accepts known targets and rejects others", () => {
    expect(isValidTarget("Stakeholder Map")).toBe(true);
    expect(isValidTarget("General")).toBe(true);
    expect(isValidTarget("Nonsense")).toBe(false);
    expect(isValidTarget(42)).toBe(false);
  });

  it("normalizes General and unknowns to null, keeps real targets", () => {
    expect(normalizeTarget("General")).toBeNull();
    expect(normalizeTarget("bogus")).toBeNull();
    expect(normalizeTarget("Stakeholder Map")).toBe("Stakeholder Map");
  });
});

describe("note → section navigation", () => {
  it("maps a tagged note to its section's DOM id", () => {
    expect(targetDomId("Stakeholder Map")).toBe(sectionDomId("stakeholders"));
    expect(targetDomId("Deal Overview")).toBe(sectionDomId("deal"));
    expect(targetDomId("Activity & Engagement")).toBe(
      sectionDomId("engagement"),
    );
    expect(targetDomId("Content Hub")).toBe(sectionDomId("content"));
    expect(targetDomId("Account Snapshot")).toBe(sectionDomId("snapshot"));
  });

  it("has nowhere to jump for untagged/General/unknown notes", () => {
    expect(targetDomId(null)).toBeNull();
    expect(targetDomId("General")).toBeNull();
    expect(targetDomId("bogus")).toBeNull();
  });
});

describe("formatNoteTime", () => {
  it("renders the comment style with am/pm and an ordinal day", () => {
    // Construct a local-time date so the assertion is timezone-independent.
    const d = new Date(2026, 5, 7, 10, 8); // Jun 7 2026, 10:08 local
    expect(formatNoteTime(d.toISOString())).toBe("10:08 am, Jun 7th, 2026");
  });

  it("uses 12-hour clock with a 12 for noon and midnight", () => {
    expect(formatNoteTime(new Date(2026, 0, 1, 0, 5).toISOString())).toBe(
      "12:05 am, Jan 1st, 2026",
    );
    expect(formatNoteTime(new Date(2026, 0, 1, 12, 0).toISOString())).toBe(
      "12:00 pm, Jan 1st, 2026",
    );
  });

  it("uses the right ordinal suffixes (st/nd/rd/th, incl. 11-13)", () => {
    const at = (day: number) =>
      formatNoteTime(new Date(2026, 2, day, 9, 0).toISOString());
    expect(at(2)).toContain("Mar 2nd");
    expect(at(3)).toContain("Mar 3rd");
    expect(at(11)).toContain("Mar 11th");
    expect(at(12)).toContain("Mar 12th");
    expect(at(13)).toContain("Mar 13th");
    expect(at(21)).toContain("Mar 21st");
  });

  it("returns an empty string for an unparseable timestamp", () => {
    expect(formatNoteTime("not-a-date")).toBe("");
  });
});
