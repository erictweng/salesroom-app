/**
 * Data-access helpers over the SQLite tables. Pure persistence logic; no HTTP or
 * CRM concerns live here.
 */

import { getDb } from "./db";
import type { EventRecord, Room, RoomResource } from "./types";

/* ------------------------------- slugs -------------------------------- */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "room";
}

/** Return a slug that is not yet taken, appending -2, -3, ... if needed. */
export function uniqueSlug(base: string): string {
  const db = getDb();
  const root = slugify(base);
  const exists = db.prepare("SELECT 1 FROM rooms WHERE slug = ?");
  if (!exists.get(root)) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!exists.get(candidate)) return candidate;
  }
  // Extremely unlikely fallback.
  return `${root}-${Date.now()}`;
}

/* ------------------------------- rooms -------------------------------- */

export function getRoomBySlug(slug: string): Room | undefined {
  return getDb()
    .prepare("SELECT * FROM rooms WHERE slug = ?")
    .get(slug) as Room | undefined;
}

export function getRoomByAccount(accountId: string): Room | undefined {
  return getDb()
    .prepare("SELECT * FROM rooms WHERE account_id = ?")
    .get(accountId) as Room | undefined;
}

export function getRoomById(id: number): Room | undefined {
  return getDb()
    .prepare("SELECT * FROM rooms WHERE id = ?")
    .get(id) as Room | undefined;
}

/**
 * Create a room for an account, or return the existing one (accounts are 1:1
 * with rooms). When created, seed room_resources from the supplied content ids
 * in order. Returns the room plus whether it was freshly created.
 */
export function createOrGetRoom(params: {
  accountId: string;
  title: string;
  createdBy: string;
  seedContentIds?: string[];
}): { room: Room; created: boolean } {
  const db = getDb();
  const existing = getRoomByAccount(params.accountId);
  if (existing) return { room: existing, created: false };

  const slug = uniqueSlug(params.title || params.accountId);

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        "INSERT INTO rooms (slug, account_id, title, created_by) VALUES (?, ?, ?, ?)",
      )
      .run(slug, params.accountId, params.title, params.createdBy);
    const roomId = Number(info.lastInsertRowid);

    const ids = params.seedContentIds ?? [];
    const insertRes = db.prepare(
      "INSERT OR IGNORE INTO room_resources (room_id, content_id, position) VALUES (?, ?, ?)",
    );
    ids.forEach((cid, idx) => insertRes.run(roomId, cid, idx));

    return getRoomById(roomId)!;
  });

  try {
    return { room: tx(), created: true };
  } catch (err) {
    // Concurrency guard: between the existence check above and this INSERT,
    // a parallel request may have created the room for this account (the
    // account_id UNIQUE index makes the second INSERT throw). Treat that as a
    // race we lost and return the room the winner created — never surface a
    // constraint error to the caller.
    if (
      err instanceof Error &&
      "code" in err &&
      typeof (err as { code?: unknown }).code === "string" &&
      (err as { code: string }).code.startsWith("SQLITE_CONSTRAINT")
    ) {
      const winner = getRoomByAccount(params.accountId);
      if (winner) return { room: winner, created: false };
    }
    throw err;
  }
}

export function listRoomResources(roomId: number): RoomResource[] {
  return getDb()
    .prepare(
      "SELECT * FROM room_resources WHERE room_id = ? ORDER BY position ASC, id ASC",
    )
    .all(roomId) as RoomResource[];
}

/* ------------------------------- events ------------------------------- */

export interface InsertEventInput {
  roomId: number;
  type: string;
  contentId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function insertEvent(input: InsertEventInput): EventRecord {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO events (room_id, type, content_id, actor_email, actor_name, actor_role, metadata)
       VALUES (@room_id, @type, @content_id, @actor_email, @actor_name, @actor_role, @metadata)`,
    )
    .run({
      room_id: input.roomId,
      type: input.type,
      content_id: input.contentId ?? null,
      actor_email: input.actorEmail ?? null,
      actor_name: input.actorName ?? null,
      actor_role: input.actorRole ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    });
  return getDb()
    .prepare("SELECT * FROM events WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as EventRecord;
}

/** Engagement feed for a room, newest first, capped to a recent window. */
export function getFeed(roomId: number, limit = 100): EventRecord[] {
  return getDb()
    .prepare(
      "SELECT * FROM events WHERE room_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
    )
    .all(roomId, limit) as EventRecord[];
}
