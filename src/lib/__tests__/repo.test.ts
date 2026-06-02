import { describe, it, expect, afterAll } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Point the repo at a throwaway DB before importing it (env reads this on load).
const tmp = path.join(os.tmpdir(), `salesroom-repo-test-${Date.now()}.db`);
process.env.DATABASE_PATH = tmp;

const {
  createOrGetRoom,
  listRoomResources,
  listVisibleRoomResources,
  moveResource,
  setResourceHidden,
} = await import("../repo");

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
});
