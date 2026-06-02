/**
 * The seller room is composed of reorderable panels. Their order is saved per
 * room (rooms.section_order); when absent, this default applies. Keys are stable
 * identifiers so saved orders survive copy/title changes.
 */

export const SECTION_KEYS = [
  "content",
  "snapshot",
  "stakeholders",
  "engagement",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const DEFAULT_SECTION_ORDER: SectionKey[] = [...SECTION_KEYS];

const KNOWN = new Set<string>(SECTION_KEYS);

/**
 * Resolve the effective panel order from a (possibly stale/partial) saved order:
 * keep saved keys that are still known (de-duped), then append any known keys the
 * saved order is missing, in default order. Guarantees every panel appears once.
 */
export function orderKeys(saved?: string[] | null): SectionKey[] {
  const result: SectionKey[] = [];
  if (Array.isArray(saved)) {
    for (const k of saved) {
      if (KNOWN.has(k) && !result.includes(k as SectionKey)) {
        result.push(k as SectionKey);
      }
    }
  }
  for (const k of DEFAULT_SECTION_ORDER) {
    if (!result.includes(k)) result.push(k);
  }
  return result;
}

/** Parse the JSON column value into a string array, or null if absent/invalid. */
export function parseSectionOrder(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}
