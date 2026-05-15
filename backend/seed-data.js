/**
 * Seed script: inserts ~30 days of sample pushup data for local dev/testing.
 * Run with: node seed-data.js
 * Safe to run multiple times -- clears existing data first (dev only).
 */

const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "pushups.db");
const db = new sqlite3.Database(DB_PATH);

const today = new Date("2026-05-15T00:00:00");

const timeSlots = [
  [6, 30], [7, 15], [8, 45], [10, 0],   // morning
  [12, 30], [13, 45], [15, 0], [16, 30], // afternoon
  [17, 30], [18, 45], [19, 15], [20, 0], // evening
  [21, 30], [22, 15],                    // night
];

const skipDays = new Set([3, 7, 14, 21, 25]);

const rows = [];
for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
  if (skipDays.has(daysAgo)) continue;
  const date = new Date(today);
  date.setDate(today.getDate() - daysAgo);
  const dateStr = date.toISOString().slice(0, 10);

  const numSets = 2 + Math.floor(Math.random() * 3);
  const shuffled = [...timeSlots].sort(() => Math.random() - 0.5).slice(0, numSets);
  shuffled.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  for (const [hour, minute] of shuffled) {
    rows.push({
      count: 20 + Math.floor(Math.random() * 31),
      timestamp: `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
      created_at: new Date().toISOString(),
    });
  }
}

db.serialize(() => {
  db.run("DELETE FROM pushups", (err) => {
    if (err) { console.error("Clear failed:", err.message); process.exit(1); }
    console.log("Cleared existing pushup data.");
  });

  const stmt = db.prepare("INSERT INTO pushups (count, timestamp, created_at) VALUES (?, ?, ?)");
  for (const { count, timestamp, created_at } of rows) {
    stmt.run(count, timestamp, created_at);
  }
  stmt.finalize();

  db.run("SELECT 1", () => {
    console.log(`Inserted ${rows.length} sample pushup entries across 30 days.`);
    db.close();
  });
});
