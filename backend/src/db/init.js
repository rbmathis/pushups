/**
 * Database initialization module for Pushup Tracker
 * Handles SQLite database setup and table creation
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { migratePushups } = require('./migrations/001-create-pushups');
const { migrateSessionTracking } = require('./migrations/002-add-session-tracking');

/**
 * Initializes the SQLite database
 * - Creates database file if it doesn't exist
 * - Executes schema to create tables and indexes
 * - Runs migrations
 * - Enables proper SQLite configuration for reliability
 *
 * @param {string} dbPath - Path to the SQLite database file
 * @returns {Promise<sqlite3.Database>} - Returns the initialized database connection
 */
async function initializeDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create or open database connection
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(new Error(`Failed to connect to database: ${err.message}`));
      }
    });

    // Enable foreign keys for referential integrity (good practice for future extensions)
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        reject(new Error(`Failed to enable foreign keys: ${err.message}`));
        return;
      }

      // Set journal mode to WAL (Write-Ahead Logging) for better concurrency
      db.run('PRAGMA journal_mode = WAL', (err) => {
        if (err) {
          reject(new Error(`Failed to set journal mode: ${err.message}`));
          return;
        }

        // Set synchronous to NORMAL for balance between speed and safety
        db.run('PRAGMA synchronous = NORMAL', (err) => {
          if (err) {
            reject(new Error(`Failed to set synchronous mode: ${err.message}`));
            return;
          }

          // Read and execute schema file
          const schemaPath = path.join(__dirname, 'schema.sql');
          fs.readFile(schemaPath, 'utf8', (err, schema) => {
            if (err) {
              reject(new Error(`Failed to read schema file: ${err.message}`));
              return;
            }

            // Execute schema SQL (split by semicolon to handle multiple statements)
            const statements = schema
              .split(';')
              .map((stmt) => stmt.trim())
              .filter((stmt) => stmt.length > 0);

            let index = 0;

            const executeNext = () => {
              if (index >= statements.length) {
                // Schema execution complete, now run migrations
                runMigrations(db)
                  .then(() => resolve(db))
                  .catch((err) => reject(err));
                return;
              }

              const statement = statements[index];
              db.run(statement, (err) => {
                if (err) {
                  reject(
                    new Error(
                      `Failed to execute schema statement: ${err.message}\nStatement: ${statement}`
                    )
                  );
                  return;
                }
                index++;
                executeNext();
              });
            };

            executeNext();
          });
        });
      });
    });

    // Handle errors after connection is established
    db.on('error', (err) => {
      console.error('Database error:', err.message);
    });
  });
}

/**
 * Runs all database migrations in sequence
 * Ensures migrations are idempotent (safe to run multiple times)
 *
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<void>}
 */
async function runMigrations(db) {
  try {
    // Run the pushups migration
    await migratePushups(db);
    // Run the session tracking migration
    await migrateSessionTracking(db);
    console.log('Migrations completed successfully');
  } catch (err) {
    throw new Error(`Migration failed: ${err.message}`);
  }
}

/**
 * Closes the database connection gracefully
 *
 * @param {sqlite3.Database} db - Database connection to close
 * @returns {Promise<void>}
 */
function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(new Error(`Failed to close database: ${err.message}`));
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initializeDatabase,
  closeDatabase,
};
