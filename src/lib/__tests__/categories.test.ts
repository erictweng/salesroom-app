import { describe, it, expect } from "vitest";
import { orderCategories, isKnownCategory, categoryForContent } from "../categories";

describe("orderCategories", () => {
  it("orders by the canonical sequence, unknowns last alphabetically", () => {
    expect(
      orderCategories([
        "Case Studies",
        "Product Demos",
        "Zebra",
        "Custom Proposal",
        "Alpha",
      ]),
    ).toEqual(["Custom Proposal", "Product Demos", "Case Studies", "Alpha", "Zebra"]);
  });

  it("is stable for an already-ordered list", () => {
    expect(
      orderCategories(["Custom Proposal", "Secureframe Overview & Our Team"]),
    ).toEqual(["Custom Proposal", "Secureframe Overview & Our Team"]);
  });
});

describe("isKnownCategory", () => {
  it("accepts known categories and rejects others", () => {
    expect(isKnownCategory("Custom Proposal")).toBe(true);
    expect(isKnownCategory("Case Studies")).toBe(true);
    expect(isKnownCategory("Nonsense")).toBe(false);
    expect(isKnownCategory(null)).toBe(false);
  });
});

describe("categoryForContent", () => {
  it("delegates a known CRM item to its dedicated category", () => {
    expect(categoryForContent("cnt_002", "Customer Story")).toBe("Case Studies");
    expect(categoryForContent("cnt_003", "Pricing")).toBe("Custom Proposal");
    expect(categoryForContent("cnt_007", "Technical Overview")).toBe(
      "Getting Started with Your Trial",
    );
  });

  it("falls back to the CRM category for an unmapped item", () => {
    expect(categoryForContent("cnt_999", "Product Demo")).toBe("Product Demo");
  });
});
