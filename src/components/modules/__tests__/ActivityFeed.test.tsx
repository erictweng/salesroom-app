import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ActivityFeed } from "../ActivityFeed";
import type { EventRecord } from "@/lib/types";

function ev(p: Partial<EventRecord>): EventRecord {
  return {
    id: 1,
    room_id: 1,
    type: "VIDEO_PROGRESS",
    content_id: "cnt_1",
    actor_email: "d.park@x.com",
    actor_name: "David Park",
    actor_role: "buyer",
    metadata: null,
    created_at: "2026-06-03T10:00:00.000Z",
    ...p,
  };
}

const titles = { cnt_1: "Product Roadmap 2026" };

describe("ActivityFeed progress lines", () => {
  it("distinguishes two milestones crossed in the same second by percent", () => {
    render(
      <ActivityFeed
        contentTitles={titles}
        events={[
          ev({ id: 1, metadata: JSON.stringify({ percent: 50, seconds: 18 }) }),
          ev({ id: 2, metadata: JSON.stringify({ percent: 75, seconds: 18 }) }),
        ]}
      />,
    );
    // Same 18s, different percent → two visibly different lines (the bug fix).
    expect(
      screen.getByText("David Park watched 50% of Product Roadmap 2026 (18s in)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("David Park watched 75% of Product Roadmap 2026 (18s in)"),
    ).toBeInTheDocument();
  });

  it("falls back to seconds-only phrasing when percent is absent", () => {
    render(
      <ActivityFeed
        contentTitles={titles}
        events={[ev({ id: 3, metadata: JSON.stringify({ seconds: 42 }) })]}
      />,
    );
    expect(
      screen.getByText("David Park watched Product Roadmap 2026 for 42 seconds"),
    ).toBeInTheDocument();
  });

  it("renders played and completed lines", () => {
    render(
      <ActivityFeed
        contentTitles={titles}
        events={[
          ev({ id: 4, type: "VIDEO_PLAYED", metadata: null }),
          ev({ id: 5, type: "VIDEO_COMPLETED", metadata: null }),
        ]}
      />,
    );
    expect(
      screen.getByText("David Park started watching Product Roadmap 2026"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("David Park finished Product Roadmap 2026"),
    ).toBeInTheDocument();
  });
});
