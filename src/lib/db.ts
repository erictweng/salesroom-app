/**
 * SQLite layer (better-sqlite3). This is the ONLY place the app persists state —
 * rooms, the curated resource list, and engagement events. The CRM is never
 * written to.
 *
 * better-sqlite3 is synchronous. At this data scale that is fine; just avoid
 * doing unbounded work inside tight loops on the request path.
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS rooms (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  account_id   TEXT NOT NULL,
  title        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  section_order TEXT,
  internal_notes TEXT,
  hidden_categories TEXT,
  created_by   TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- One account maps to at most one room (re-create opens the existing room).
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_account ON rooms(account_id);

CREATE TABLE IF NOT EXISTS room_resources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id     INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  content_id  TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  hidden      INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0,1)),
  category    TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (room_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_resources_room ON room_resources(room_id);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id     INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  content_id  TEXT,
  actor_email TEXT,
  actor_name  TEXT,
  actor_role  TEXT,
  metadata    TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_events_room ON events(room_id, created_at);

-- Rep-only, Google-Docs-style notes: a timestamped, attributed feed per room,
-- each note optionally targeting a section (e.g. "Stakeholder Map"). Never shown
-- to buyers. Supersedes the legacy single rooms.internal_notes field.
CREATE TABLE IF NOT EXISTS room_notes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id      INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  author_email TEXT,
  author_name  TEXT,
  target       TEXT,
  body         TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_room ON room_notes(room_id, created_at);
`;

let _db: Database.Database | null = null;

/** Lazily open (and initialise) the singleton database connection. */
export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = path.resolve(process.cwd(), env.databasePath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);

  _db = db;
  return db;
}

/**
 * Lightweight additive migrations for DBs created before a column existed.
 * `CREATE TABLE IF NOT EXISTS` won't add new columns to an existing table, so we
 * add them here, guarded by a check so it's safe to run on every startup.
 */
function migrate(db: Database.Database): void {
  const hasColumn = (table: string, column: string): boolean =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some(
      (c) => c.name === column,
    );

  // Per-room category override for a resource (null -> use the CRM's category).
  if (!hasColumn("room_resources", "category")) {
    db.exec("ALTER TABLE room_resources ADD COLUMN category TEXT");
  }

  // Per-room panel order for the seller room builder (JSON array; null -> default).
  if (!hasColumn("rooms", "section_order")) {
    db.exec("ALTER TABLE rooms ADD COLUMN section_order TEXT");
  }

  // Rep-only internal notes (never shown to buyers).
  if (!hasColumn("rooms", "internal_notes")) {
    db.exec("ALTER TABLE rooms ADD COLUMN internal_notes TEXT");
  }

  // Per-room hidden categories (JSON array; their resources are hidden from buyers).
  if (!hasColumn("rooms", "hidden_categories")) {
    db.exec("ALTER TABLE rooms ADD COLUMN hidden_categories TEXT");
  }
}
