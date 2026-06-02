import { describe, it, expect } from "vitest";
import { thresholdsToFire, watchedPercent } from "../progress";

describe("watchedPercent", () => {
  it("computes a clamped percentage", () => {
    expect(watchedPercent(50, 200)).toBe(25);
    expect(watchedPercent(300, 200)).toBe(100); // clamped
    expect(watchedPercent(10, 0)).toBe(0); // no/zero duration
    expect(watchedPercent(10, null)).toBe(0);
  });
});

describe("thresholdsToFire", () => {
  it("returns crossed thresholds not yet fired", () => {
    expect(thresholdsToFire(60, new Set())).toEqual([25, 50]);
    expect(thresholdsToFire(80, new Set([25, 50]))).toEqual([75]);
  });

  it("never re-fires an already-fired threshold (seek backward then forward)", () => {
    const fired = new Set<number>();
    // forward to 60% -> fire 25, 50
    for (const t of thresholdsToFire(60, fired)) fired.add(t);
    expect([...fired]).toEqual([25, 50]);
    // seek back to 10% -> nothing
    expect(thresholdsToFire(10, fired)).toEqual([]);
    // forward again past 50% -> still nothing (already fired)
    expect(thresholdsToFire(55, fired)).toEqual([]);
    // forward past 75% -> only 75 fires
    expect(thresholdsToFire(80, fired)).toEqual([75]);
  });

  it("ignores non-finite input", () => {
    expect(thresholdsToFire(NaN, new Set())).toEqual([]);
  });
});
