const fs = require("fs");
const os = require("os");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { createDatabaseBackup } = require("../src/db/backup");
const {
  initializeDatabase,
  closeDatabase,
} = require("../src/db/init");

describe("Database initialization", () => {
  let dbPath;

  beforeEach(() => {
    dbPath = path.join(
      os.tmpdir(),
      `pushup-test-${Date.now()}-${Math.random()}.db`,
    );
  });

  afterEach(() => {
    for (const suffix of ["", "-shm", "-wal"]) {
      const file = `${dbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  test("creates the schema and runs migrations", async () => {
    const db = await initializeDatabase(dbPath);

    const tables = await new Promise((resolve, reject) => {
      db.all(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
        (error, rows) => (error ? reject(error) : resolve(rows.map((r) => r.name))),
      );
    });

    expect(tables).toEqual(
      expect.arrayContaining(["pushups", "streak_forgiveness"]),
    );
    await closeDatabase(db);
  });

  test("is safe to initialize an existing database twice", async () => {
    const first = await initializeDatabase(dbPath);
    await closeDatabase(first);

    const second = await initializeDatabase(dbPath);
    await expect(closeDatabase(second)).resolves.toBeUndefined();
  });

  test("closeDatabase accepts no connection", async () => {
    await expect(closeDatabase(null)).resolves.toBeUndefined();
  });

  test("creates a consistent backup and applies retention", async () => {
    const db = await initializeDatabase(dbPath);
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO pushups (count, timestamp, created_at) VALUES (10, '2026-11-23T12:00:00', '2026-11-23T18:00:00Z')",
        (error) => (error ? reject(error) : resolve()),
      );
    });

    const backupDir = path.join(os.tmpdir(), `pushup-backups-${Date.now()}`);
    const backupPath = await createDatabaseBackup(db, backupDir, {
      retention: 1,
      now: new Date("2026-11-23T12:00:00Z"),
    });

    expect(fs.statSync(backupPath).size).toBeGreaterThan(0);
    const backupDb = new sqlite3.Database(backupPath);
    const count = await new Promise((resolve, reject) => {
      backupDb.get("SELECT COUNT(*) AS count FROM pushups", (error, row) =>
        error ? reject(error) : resolve(row.count),
      );
    });
    expect(count).toBe(1);

    await new Promise((resolve, reject) =>
      backupDb.close((error) => (error ? reject(error) : resolve())),
    );
    await closeDatabase(db);
    fs.rmSync(backupDir, { recursive: true, force: true });
  });
});
