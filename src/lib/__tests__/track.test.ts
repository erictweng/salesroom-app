import { describe, it, expect, beforeEach } from "vitest";
import { firstTimeThisSession, seenThisSession } from "../track";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("session dedup helpers", () => {
  it("firstTimeThisSession fires once, then suppresses", () => {
    expect(firstTimeThisSession("room_viewed:x")).toBe(true);
    expect(firstTimeThisSession("room_viewed:x")).toBe(false);
    expect(firstTimeThisSession("room_viewed:x")).toBe(false);
  });

  it("distinct keys are tracked independently", () => {
    expect(firstTimeThisSession("a")).toBe(true);
    expect(firstTimeThisSession("b")).toBe(true);
    expect(firstTimeThisSession("a")).toBe(false);
  });

  it("seenThisSession reflects state without marking it", () => {
    expect(seenThisSession("doc:1")).toBe(false);
    // still not marked, so the first real open is OPENED not REVISITED
    firstTimeThisSession("doc:1");
    expect(seenThisSession("doc:1")).toBe(true);
  });
});
