// Optional demo seeding: give existing rooms a few past-dated buyer events so the
// feed and insights look alive for a walkthrough. Pure SQLite — no app/CRM needed.
//
//   npm run seed
//
// Safe to re-run: rooms that already have events are skipped (no piling up).
// Only accounts with known demo buyers are seeded.
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.resolve(
  process.cwd(),
  process.env.DATABASE_PATH ?? "./data/salesroom.db",
);
if (!fs.existsSync(dbPath)) {
  console.error(
    `No database at ${dbPath}. Start the app once and create a room first.`,
  );
  process.exit(1);
}

const db = new Database(dbPath);

// Account -> its demo buyers (names match the CRM seed contacts).
const BUYERS = {
  acc_001: [{ email: "d.park@meridianrobotics.com", name: "David Park" }],
  acc_002: [
    { email: "p.sharma@velorahealth.com", name: "Priya Sharma" },
    { email: "e.rodriguez@velorahealth.com", name: "Elena Rodriguez" },
  ],
};
const VIDEO = "cnt_001"; // Platform Overview Demo
const DOC = "cnt_002"; // Case Study: Apex Manufacturing

const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();

const insert = db.prepare(
  `INSERT INTO events (room_id, type, content_id, actor_email, actor_name, actor_role, metadata, created_at)
   VALUES (@room_id, @type, @content_id, @actor_email, @actor_name, @actor_role, @metadata, @created_at)`,
);

const rooms = db.prepare("SELECT id, slug, account_id FROM rooms").all();
if (rooms.length === 0) {
  console.log("No rooms yet. Sign in as a rep, create a room, then re-run.");
  process.exit(0);
}

let seeded = 0;
let skipped = 0;

db.transaction(() => {
  for (const room of rooms) {
    const buyers = BUYERS[room.account_id];
    if (!buyers) {
      skipped++;
      continue;
    }
    const { c } = db
      .prepare("SELECT COUNT(*) c FROM events WHERE room_id = ?")
      .get(room.id);
    if (c > 0) {
      skipped++;
      continue;
    }

    buyers.forEach((b, bi) => {
      const dayOffset = bi * 1440; // stagger buyers a day apart
      const script = [
        { type: "ROOM_VIEWED", content_id: null, metadata: null },
        { type: "RESOURCE_OPENED", content_id: DOC, metadata: null },
        { type: "VIDEO_PLAYED", content_id: VIDEO, metadata: { seconds: 0 } },
        {
          type: "VIDEO_PROGRESS",
          content_id: VIDEO,
          metadata: { percent: 50, seconds: 170 },
        },
        {
          type: "VIDEO_COMPLETED",
          content_id: VIDEO,
          metadata: { seconds: 340 },
        },
      ];
      script.forEach((e, ei) => {
        insert.run({
          room_id: room.id,
          type: e.type,
          content_id: e.content_id,
          actor_email: b.email,
          actor_name: b.name,
          actor_role: "buyer",
          metadata: e.metadata ? JSON.stringify(e.metadata) : null,
          // newest events most recent; earlier in the script = a bit older
          created_at: ago(dayOffset + (script.length - ei) * 30),
        });
      });
    });
    seeded++;
  }
})();

console.log(
  `Seeded ${seeded} room(s) with historical buyer events; skipped ${skipped} (no known buyer, or already had events).`,
);
