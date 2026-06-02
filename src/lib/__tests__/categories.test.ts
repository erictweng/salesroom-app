import { describe, it, expect } from "vitest";
import { orderCategories, isKnownCategory } from "../categories";

describe("orderCategories", () => {
  it("orders by the canonical sequence, unknowns last alphabetically", () => {
    expect(
      orderCategories(["Security", "Pricing", "Zebra", "Product Demo", "Alpha"]),
    ).toEqual(["Product Demo", "Pricing", "Security", "Alpha", "Zebra"]);
  });

  it("is stable for an already-ordered list", () => {
    expect(orderCategories(["Product Demo", "Customer Story"])).toEqual([
      "Product Demo",
      "Customer Story",
    ]);
  });
});

describe("isKnownCategory", () => {
  it("accepts known categories and rejects others", () => {
    expect(isKnownCategory("Pricing")).toBe(true);
    expect(isKnownCategory("Security")).toBe(true);
    expect(isKnownCategory("Nonsense")).toBe(false);
    expect(isKnownCategory(null)).toBe(false);
  });
});
