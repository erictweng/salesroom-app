/**
 * Internal notes are a timestamped, attributed feed (see room_notes). A note can
 * optionally be tagged to a room section so the rep can say "this is about the
 * Stakeholder Map". "General" means no specific target (stored as null).
 *
 * Keep this in sync with the seller room's section titles in
 * app/(seller)/seller/rooms/[slug]/page.tsx.
 */
export const NOTE_TARGETS = [
  "General",
  "Account Snapshot",
  "Stakeholder Map",
  "Content Hub",
  "Deal Overview",
  "Activity & Engagement",
] as const;

export type NoteTarget = (typeof NOTE_TARGETS)[number];

const KNOWN_TARGETS = new Set<string>(NOTE_TARGETS);

/**
 * Map a note's target label to its room section key (see lib/sections.ts).
 * "General" and unknown labels have no section to jump to.
 */
const TARGET_TO_SECTION_KEY: Record<string, string> = {
  "Account Snapshot": "snapshot",
  "Stakeholder Map": "stakeholders",
  "Content Hub": "content",
  "Deal Overview": "deal",
  "Activity & Engagement": "engagement",
};

/** Stable DOM id for a section panel, so notes can scroll/anchor to it. */
export function sectionDomId(key: string): string {
  return `room-section-${key}`;
}

/** The section key a note targets, or null (untagged/"General"/unknown). */
export function targetSectionKey(target: string | null): string | null {
  if (!target) return null;
  return TARGET_TO_SECTION_KEY[target] ?? null;
}

/** Custom DOM event a note dispatches to expand a collapsed target section. */
export const EXPAND_SECTION_EVENT = "sr-expand-section";

/**
 * The DOM id to scroll to for a note's target, or null when there's nowhere to
 * go (untagged/"General"/unknown).
 */
export function targetDomId(target: string | null): string | null {
  if (!target) return null;
  const key = TARGET_TO_SECTION_KEY[target];
  return key ? sectionDomId(key) : null;
}

/** Whether a target string is one we offer (UI sends one of NOTE_TARGETS). */
export function isValidTarget(target: unknown): target is NoteTarget {
  return typeof target === "string" && KNOWN_TARGETS.has(target);
}

/**
 * Normalize a target for storage: a valid, non-"General" target is kept; anything
 * else (including "General") becomes null so a note with no specific target reads
 * cleanly as "General" in the UI.
 */
export function normalizeTarget(target: unknown): string | null {
  return isValidTarget(target) && target !== "General" ? target : null;
}

function ordinalSuffix(day: number): string {
  const v = day % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Render an ISO timestamp as the comment style the rep asked for, e.g.
 * "10:08 am, Jun 7th, 2026". Uses the viewer's local time. Returns "" for an
 * unparseable input rather than throwing.
 */
export function formatNoteTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  let hours = d.getHours();
  const ampm = hours < 12 ? "am" : "pm";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");

  const day = d.getDate();
  return `${hours}:${minutes} ${ampm}, ${MONTHS[d.getMonth()]} ${day}${ordinalSuffix(
    day,
  )}, ${d.getFullYear()}`;
}
