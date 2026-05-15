/**
 * Database Migration: Create Pushups Table
 * 
 * This migration creates the initial schema for the pushup tracker database.
 * It runs during database initialization and creates the pushups table with
 * appropriate indexes for efficient querying.
 */

/**
 * Migrates the database by creating the pushups table and indexes
 * 
 * This function creates:
 * - pushups table with id, count, timestamp, and created_at columns
 * - idx_pushups_timestamp index for date-based queries
 * - idx_pushups_timestamp_count composite index for aggregation queries
 * 
 * @param {sqlite3.Database} db - SQLite database connection
 * @returns {Promise<void>}
 */
async function migratePushups(db) {
  return new Promise((resolve, reject) => {
    // Create the pushups table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS pushups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        count INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `;

    db.run(createTableSQL, (err) => {
      if (err) {
        reject(new Error(`Failed to create pushups table: ${err.message}`));
        return;
      }

      // Create index on timestamp for date-based queries
      const createTimestampIndexSQL = `
        CREATE INDEX IF NOT EXISTS idx_pushups_timestamp ON pushups(timestamp)
      `;

      db.run(createTimestampIndexSQL, (err) => {
        if (err) {
          reject(new Error(`Failed to create timestamp index: ${err.message}`));
          return;
        }

        // Create composite index on (timestamp, count) for aggregation queries
        const createCompositeIndexSQL = `
          CREATE INDEX IF NOT EXISTS idx_pushups_timestamp_count ON pushups(timestamp, count)
        `;

        db.run(createCompositeIndexSQL, (err) => {
          if (err) {
            reject(new Error(`Failed to create composite index: ${err.message}`));
            return;
          }

          resolve();
        });
      });
    });
  });
}

module.exports = {
  migratePushups,
};
