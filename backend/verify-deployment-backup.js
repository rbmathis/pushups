const fs = require("fs");
const os = require("os");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

async function verifyBackup(backupDir) {
  const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "pushup-backup-check-"));
  let db;
  try {
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      const source = path.join(backupDir, `pushups.db${suffix}`);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(temporaryDir, `pushups.db${suffix}`));
      } else if (!suffix) {
        throw new Error("Backup database is missing");
      }
    }
    const databasePath = path.join(temporaryDir, "pushups.db");
    db = await new Promise((resolve, reject) => {
      const connection = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY, (error) =>
        error ? reject(error) : resolve(connection),
      );
    });
    const all = (sql) =>
      new Promise((resolve, reject) => {
        db.all(sql, (error, rows) => (error ? reject(error) : resolve(rows)));
      });

    const integrity = await all("PRAGMA integrity_check");
    if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") {
      throw new Error(`SQLite integrity check failed: ${JSON.stringify(integrity)}`);
    }
    const [stats] = await all(
      "SELECT COUNT(*) AS entries, COALESCE(SUM(count), 0) AS pushups FROM pushups",
    );
    return stats;
  } finally {
    try {
      if (db) {
        await new Promise((resolve, reject) =>
          db.close((error) => (error ? reject(error) : resolve())),
        );
      }
    } finally {
      fs.rmSync(temporaryDir, { recursive: true, force: true });
    }
  }
}

if (require.main === module) {
  const backupDir = process.argv[2];
  if (!backupDir) {
    console.error("Usage: node verify-deployment-backup.js <backup directory>");
    process.exitCode = 1;
  } else {
    verifyBackup(backupDir)
      .then(({ entries, pushups }) =>
        console.log(`Backup integrity OK: ${entries} entries, ${pushups} pushups.`),
      )
      .catch((error) => {
        console.error(`Backup verification failed: ${error.message}`);
        process.exitCode = 1;
      });
  }
}

module.exports = { verifyBackup };
