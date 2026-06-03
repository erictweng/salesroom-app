import { describe, it, expect, afterAll } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Point the repo at a throwaway DB before importing it (env reads this on load).
const tmp = path.join(os.tmpdir(), `salesroom-repo-test-${Date.now()}.db`);
process.env.DATABASE_PATH = tmp;

const {
  createOrGetRoom,
  getRoomBySlug,
  listRoomResources,
  listVisibleRoomResources,
  moveResource,
  setResourceHidden,
  setResourceOrder,
  setResourceCategory,
  setSectionOrder,
  setHiddenCategories,
  parseHiddenCategories,
  setInternalNotes,
  addNote,
  listNotes,
  deleteNote,
  clearNotes,
  insertEvent,
  getFeed,
  pruneRoomEvents,
} = await import("../repo");
const { getDb } = await import("../db");

const { room } = createOrGetRoom({
  accountId: "acc_test",
  title: "Test Room",
  createdBy: "rep@example.com",
  seedContentIds: ["a", "b", "c"],
});

const order = () => listRoomResources(room.id).map((r) => r.content_id);
const visible = () => listVisibleRoomResources(room.id).map((r) => r.content_id);

afterAll(() => {
  for (const s of ["", "-shm", "-wal"]) {
    try {
      fs.rmSync(tmp + s);
    } catch {
      /* ignore */
    }
  }
});

describe("room resource reorder + hide", () => {
  it("seeds resources in the given order", () => {
    expect(order()).toEqual(["a", "b", "c"]);
  });

  it("moves a resource down then back up", () => {
    moveResource(room.id, "a", "down");
    expect(order()).toEqual(["b", "a", "c"]);
    moveResource(room.id, "a", "up");
    expect(order()).toEqual(["a", "b", "c"]);
  });

  it("is a no-op at the ends", () => {
    moveResource(room.id, "a", "up"); // already first
    moveResource(room.id, "c", "down"); // already last
    expect(order()).toEqual(["a", "b", "c"]);
  });

  it("hides a resource from the buyer view but keeps it in the full list", () => {
    setResourceHidden(room.id, "b", true);
    expect(visible()).toEqual(["a", "c"]);
    expect(order()).toEqual(["a", "b", "c"]); // still present for the seller
  });

  it("unhides a resource", () => {
    setResourceHidden(room.id, "b", false);
    expect(visible()).toEqual(["a", "b", "c"]);
  });

  it("applies an explicit drag-and-drop order", () => {
    setResourceOrder(room.id, ["c", "a", "b"]);
    expect(order()).toEqual(["c", "a", "b"]);
    setResourceOrder(room.id, ["a", "b", "c"]); // restore
    expect(order()).toEqual(["a", "b", "c"]);
  });

  it("overrides and clears a resource category", () => {
    setResourceCategory(room.id, "a", "Pricing");
    expect(
      listRoomResources(room.id).find((r) => r.content_id === "a")?.category,
    ).toBe("Pricing");
    setResourceCategory(room.id, "a", null);
    expect(
      listRoomResources(room.id).find((r) => r.content_id === "a")?.category,
    ).toBeNull();
  });

  it("saves and clears the per-room section order", () => {
    setSectionOrder(room.id, ["engagement", "content"]);
    expect(
      JSON.parse(getRoomBySlug(room.slug)!.section_order!),
    ).toEqual(["engagement", "content"]);
    setSectionOrder(room.id, null);
    expect(getRoomBySlug(room.slug)!.section_order).toBeNull();
  });

  it("saves and clears per-room hidden categories", () => {
    setHiddenCategories(room.id, ["Pricing", "Case Studies"]);
    expect(
      parseHiddenCategories(getRoomBySlug(room.slug)!.hidden_categories),
    ).toEqual(["Pricing", "Case Studies"]);
    setHiddenCategories(room.id, []);
    expect(getRoomBySlug(room.slug)!.hidden_categories).toBeNull();
    expect(parseHiddenCategories(null)).toEqual([]);
  });

  it("saves rep-only internal notes", () => {
    setInternalNotes(room.id, "competitor X is in play; push security");
    expect(getRoomBySlug(room.slug)!.internal_notes).toBe(
      "competitor X is in play; push security",
    );
  });
});

describe("room notes feed", () => {
  const { room } = createOrGetRoom({
    accountId: "acc_notes",
    title: "Notes Room",
    createdBy: "rep@example.com",
    seedContentIds: [],
  });

  it("adds an attributed, timestamped note and returns the row", () => {
    const note = addNote({
      roomId: room.id,
      authorEmail: "sarah@x.com",
      authorName: "Sarah",
      target: "Stakeholder Map",
      body: "This guy at the top of the food chain!",
    });
    expect(note.id).toBeGreaterThan(0);
    expect(note.author_name).toBe("Sarah");
    expect(note.target).toBe("Stakeholder Map");
    expect(note.body).toMatch(/food chain/);
    expect(note.created_at).toMatch(/^\d{4}-/); // ISO timestamp
  });

  it("stores a null target for an untagged (General) note", () => {
    const note = addNote({ roomId: room.id, authorName: "Marcus", body: "ping" });
    expect(note.target).toBeNull();
  });

  it("lists notes newest first", () => {
    const list = listNotes(room.id);
    expect(list.length).toBe(2);
    expect(list[0].body).toBe("ping"); // most recently added
  });

  it("deletes a single note, scoped to its room", () => {
    const list = listNotes(room.id);
    deleteNote(room.id, list[0].id);
    expect(listNotes(room.id).length).toBe(1);
  });

  it("clears all notes for a room", () => {
    addNote({ roomId: room.id, authorName: "Sarah", body: "another" });
    clearNotes(room.id);
    expect(listNotes(room.id).length).toBe(0);
  });
});

describe("event retention", () => {
  const { room } = createOrGetRoom({
    accountId: "acc_prune",
    title: "Prune Room",
    createdBy: "rep@example.com",
    seedContentIds: [],
  });

  it("drops events older than the retention window on insert", () => {
    // A raw event well outside the 7-day window.
    getDb()
      .prepare(
        "INSERT INTO events (room_id, type, created_at) VALUES (?, 'ROOM_VIEWED', ?)",
      )
      .run(room.id, "2020-01-01T00:00:00.000Z");
    insertEvent({ roomId: room.id, type: "ROOM_VIEWED" }); // triggers prune
    expect(
      getFeed(room.id, 100).every((e) => e.created_at > "2021"),
    ).toBe(true);
  });

  it("trims to the most recent N per room", () => {
    for (let i = 0; i < 6; i++) insertEvent({ roomId: room.id, type: "ROOM_VIEWED" });
    pruneRoomEvents(room.id, { maxPerRoom: 3 });
    expect(getFeed(room.id, 100).length).toBe(3);
  });
});
