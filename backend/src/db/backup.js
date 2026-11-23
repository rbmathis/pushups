const fs = require("fs");
const path = require("path");

function formatTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function createDatabaseBackup(db, backupDir, options = {}) {
  const retention = options.retention ?? 14;
  const timestamp = options.now || new Date();
  const filename = `pushups-${formatTimestamp(timestamp)}.db`;
  const targetPath = path.join(backupDir, filename);
  const tempPath = `${targetPath}.tmp`;

  fs.mkdirSync(backupDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const backup = db.backup(tempPath);
    backup.step(-1, (error) => {
      backup.finish((finishError) => {
        const backupError = error || finishError;
        if (backupError) {
          removeIfPresent(tempPath);
          reject(new Error(`Failed to back up database: ${backupError.message}`));
          return;
        }

        waitForFileReady(tempPath)
          .then(() => {
            if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size === 0) {
              throw new Error("Backup file was not created or is empty");
            }

            removeIfPresent(targetPath);
            fs.renameSync(tempPath, targetPath);
            pruneBackups(backupDir, retention);
            resolve(targetPath);
          })
          .catch((backupError) => {
            removeIfPresent(tempPath);
            reject(new Error(`Failed to finalize database backup: ${backupError.message}`));
          });
      });
    });
  });
}

function waitForFileReady(filePath, attempts = 20) {
  return new Promise((resolve, reject) => {
    const check = (remaining) => {
      try {
        const handle = fs.openSync(filePath, "r");
        fs.closeSync(handle);
        resolve();
      } catch (error) {
        if (remaining === 0) {
          reject(error);
          return;
        }
        setTimeout(() => check(remaining - 1), 50);
      }
    };
    check(attempts);
  });
}

function removeIfPresent(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // The backup handle may still be releasing; the next backup can replace it.
  }
}

function pruneBackups(backupDir, retention) {
  const backups = fs
    .readdirSync(backupDir)
    .filter((name) => /^pushups-\d{8}T\d{6}Z\.db$/.test(name))
    .map((name) => ({
      name,
      path: path.join(backupDir, name),
      mtime: fs.statSync(path.join(backupDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  backups.slice(Math.max(0, retention)).forEach((backup) => {
    fs.unlinkSync(backup.path);
  });
}

module.exports = {
  createDatabaseBackup,
};
