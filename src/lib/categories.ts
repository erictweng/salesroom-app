/**
 * Content categories and their canonical display order. Categories auto-sort by
 * this fixed sequence in both portals; the seller only controls ordering *within*
 * a category (and which category a resource belongs to). Anything not listed
 * sorts after these, alphabetically.
 */

export const CATEGORY_ORDER = [
  "Product Demo",
  "Customer Story",
  "Technical Overview",
  "Pricing",
  "Security",
] as const;

/** The set a seller can assign via the category dropdown. */
export const ASSIGNABLE_CATEGORIES: string[] = [...CATEGORY_ORDER];

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
