// Delete the local SQLite database so it is recreated fresh on next run.
import fs from "node:fs";
import path from "node:path";

const dbPath = path.resolve(
  process.cwd(),
  process.env.DATABASE_PATH ?? "./data/salesroom.db",
);

for (const suffix of ["", "-shm", "-wal"]) {
  const f = dbPath + suffix;
  if (fs.existsSync(f)) {
    fs.rmSync(f);
    console.log("removed", f);
  }
}
console.log("Database reset. It will be recreated on next app start.");
