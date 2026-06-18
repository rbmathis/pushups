/**
 * Test setup and utilities
 */
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Test database path
const TEST_DB_PATH = path.join(__dirname, "test.db");

/**
 * Create a fresh test database
 */
async function createTestDatabase() {
  // Remove existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(TEST_DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create the pushups table
      const schema = `
        CREATE TABLE IF NOT EXISTS pushups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          count INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          created_at TEXT NOT NULL,
          session_id TEXT
        )
      `;

      db.run(schema, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(db);
        }
      });
    });
  });
}

/**
 * Close and cleanup test database
 */
async function closeTestDatabase(db) {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          // Clean up test database file
          if (fs.existsSync(TEST_DB_PATH)) {
            fs.unlinkSync(TEST_DB_PATH);
          }
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

/**
 * Insert test data into the database
 */
async function insertTestData(db, entries) {
  const promises = entries.map((entry) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO pushups (count, timestamp, created_at) VALUES (?, ?, ?)`;
      db.run(
        query,
        [
          entry.count,
          entry.timestamp,
          entry.created_at || new Date().toISOString(),
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...entry });
        },
      );
    });
  });
  return Promise.all(promises);
}

/**
 * Clear all data from test database
 */
async function clearTestData(db) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM pushups", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Get all entries from the database
 */
async function getAllEntries(db) {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM pushups ORDER BY id", (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/**
 * Generate a timestamp for a specific number of days ago
 */
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().replace("Z", "").split(".")[0];
}

/**
 * Generate today's timestamp
 */
function today() {
  return new Date().toISOString().replace("Z", "").split(".")[0];
}

// Export utilities
module.exports = {
  TEST_DB_PATH,
  createTestDatabase,
  closeTestDatabase,
  insertTestData,
  clearTestData,
  getAllEntries,
  daysAgo,
  today,
};

// Global test timeout
jest.setTimeout(30000);
