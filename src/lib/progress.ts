/**
 * Pure helpers for video progress milestones. Kept free of React/DOM so the
 * threshold logic can be unit-tested in isolation (the tricky part is making
 * sure seeking backward and re-crossing a threshold never re-fires it).
 */

export const PROGRESS_THRESHOLDS = [25, 50, 75] as const;
export type ProgressThreshold = (typeof PROGRESS_THRESHOLDS)[number];

/**
 * Given the current percent watched and the set of thresholds already fired,
 * return the thresholds that should fire now: those that have been crossed and
 * not yet emitted. Deterministic and idempotent — calling repeatedly with the
 * same `fired` set yields nothing once a threshold is recorded.
 *
 * 100% is intentionally NOT a progress threshold; completion is signaled by the
 * player's ENDED state so we never synthesize a false "completed".
 */
export function thresholdsToFire(
  percent: number,
  fired: ReadonlySet<number>,
): ProgressThreshold[] {
  if (!Number.isFinite(percent)) return [];
  return PROGRESS_THRESHOLDS.filter((t) => percent >= t && !fired.has(t));
}

/** Percent (0–100, clamped) watched given current time and total duration. */
export function watchedPercent(
  currentSeconds: number,
  durationSeconds: number | null | undefined,
): number {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  return Math.max(0, Math.min(100, (currentSeconds / durationSeconds) * 100));
}
