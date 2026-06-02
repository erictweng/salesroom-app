import { describe, it, expect } from "vitest";
import { parseYouTubeId } from "../youtube";

describe("parseYouTubeId", () => {
  it("parses the watch?v= form", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("parses youtu.be and /embed/ forms", () => {
    expect(parseYouTubeId("https://youtu.be/9bZkp7q19f0")).toBe("9bZkp7q19f0");
    expect(parseYouTubeId("https://www.youtube.com/embed/9bZkp7q19f0")).toBe(
      "9bZkp7q19f0",
    );
  });

  it("returns null for missing or non-YouTube urls", () => {
    expect(parseYouTubeId(null)).toBeNull();
    expect(parseYouTubeId("")).toBeNull();
    expect(parseYouTubeId("https://example.com/video")).toBeNull();
  });
});
