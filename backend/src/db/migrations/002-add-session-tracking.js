/**
 * Database Migration: Add Session Tracking
 * 
 * This migration adds session_id column to track which sets belong to a session.
 * Allows calculating avg per session (sum of all sets in one session).
 */

async function migrateSessionTracking(db) {
  return new Promise((resolve, reject) => {
    // Check if session_id column already exists
    db.all(
      "PRAGMA table_info(pushups)",
      (err, rows) => {
        if (err) {
          reject(new Error(`Failed to check table schema: ${err.message}`));
          return;
        }

        // Check if session_id column exists
        const hasSessionId = rows.some((row) => row.name === "session_id");

        if (hasSessionId) {
          // Column already exists, migration is idempotent
          resolve();
          return;
        }

        // Add session_id column (nullable to support old entries)
        const addColumnSQL = `
          ALTER TABLE pushups
          ADD COLUMN session_id TEXT
        `;

        db.run(addColumnSQL, (err) => {
          if (err) {
            reject(
              new Error(`Failed to add session_id column: ${err.message}`)
            );
            return;
          }

          // Create index on session_id for efficient session grouping queries
          const createSessionIndexSQL = `
            CREATE INDEX IF NOT EXISTS idx_pushups_session_id ON pushups(session_id)
          `;

          db.run(createSessionIndexSQL, (err) => {
            if (err) {
              reject(
                new Error(`Failed to create session_id index: ${err.message}`)
              );
              return;
            }

            resolve();
          });
        });
      }
    );
  });
}

module.exports = {
  migrateSessionTracking,
};
