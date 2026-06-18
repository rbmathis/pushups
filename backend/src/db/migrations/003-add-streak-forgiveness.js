/**
 * Migration: Add streak forgiveness tracking
 * Creates a table to track streak forgiveness tokens earned and used
 * Rule: Every 3 consecutive days with at least 4 sessions = 1 forgiveness token
 * Forgiveness allows 1 day without sessions while maintaining streak
 */

function migrateStreakForgiveness(db) {
  return new Promise((resolve, reject) => {
    // Check if table exists
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='streak_forgiveness'",
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row) {
          // Table already exists
          resolve();
          return;
        }

        // Create the streak_forgiveness table
        const createTableQuery = `
          CREATE TABLE streak_forgiveness (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            earned_date TEXT NOT NULL,
            used_date TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(earned_date)
          )
        `;

        db.run(createTableQuery, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    );
  });
}

module.exports = { migrateStreakForgiveness };
