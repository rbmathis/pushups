/**
 * Database model for Pushup Tracker
 * Handles all database operations for pushups
 */

const { formatInTimeZone } = require("date-fns-tz");

// Timezone used for storing timestamps - must match controller
const TIMEZONE = "America/Chicago";

/**
 * Get today's date in the same format/timezone as stored timestamps
 */
function getTodayDateString() {
  return formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
}

/**
 * Logs a pushup entry to the database
 * @param {sqlite3.Database} db - Database connection
 * @param {number} count - Number of pushups performed
 * @param {string} timestamp - Timestamp when pushups were performed (ISO 8601 in CST)
 * @param {string} sessionId - Optional session ID to group sets
 * @returns {Promise<{id, count, timestamp, created_at, sessionId}>} - Returns the inserted record
 */
function logPushup(db, count, timestamp, sessionId) {
  return new Promise((resolve, reject) => {
    const created_at = new Date().toISOString();

    const query = `
      INSERT INTO pushups (count, timestamp, created_at, session_id)
      VALUES (?, ?, ?, ?)
    `;

    db.run(query, [count, timestamp, created_at, sessionId || null], function (err) {
      if (err) {
        reject(new Error(`Failed to log pushup: ${err.message}`));
      } else {
        // Return the inserted record with the ID
        resolve({
          id: this.lastID,
          count,
          timestamp,
          created_at,
          sessionId: sessionId || null,
        });
      }
    });
  });
}

/**
 * Get the total pushups for today
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<{date: string, total: number, pushupDates: Array}>} Total pushups for today
 */
function getDailyTotal(db) {
  return new Promise((resolve, reject) => {
    // Get today's date in CST timezone (same as stored timestamps)
    const todayStr = getTodayDateString();

    // Query all individual entries for today (no aggregate in SELECT)
    const query = `
      SELECT
        DATE(timestamp) as date,
        timestamp,
        count
      FROM pushups
      WHERE DATE(timestamp) = ?
      ORDER BY timestamp ASC
    `;

    db.all(query, [todayStr], (err, rows) => {
      if (err) {
        reject(new Error(`Failed to get daily total: ${err.message}`));
      } else {
        if (!rows || rows.length === 0) {
          resolve({
            date: todayStr,
            total: 0,
            pushupDates: [],
          });
        } else {
          // Calculate total by summing all rows
          const total = rows.reduce((sum, row) => sum + row.count, 0);
          const date = rows[0].date;
          const pushupDates = rows.map((row) => ({
            timestamp: row.timestamp,
            count: row.count,
          }));

          resolve({
            date,
            total,
            pushupDates,
          });
        }
      }
    });
  });
}

/**
 * Get the 7-day average pushups per day
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<{average: number, daysWithPushups: number, totalPushups: number}>} Average pushups per day over the last 7 days
 */
function get7DayAverage(db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        SUM(count) as totalPushups,
        COUNT(DISTINCT DATE(timestamp)) as daysWithPushups
      FROM pushups
      WHERE datetime(timestamp) >= datetime('now', '-7 days')
    `;

    db.get(query, (err, row) => {
      if (err) {
        reject(new Error(`Failed to get 7-day average: ${err.message}`));
      } else {
        const totalPushups = row?.totalPushups || 0;
        const daysWithPushups = row?.daysWithPushups || 0;
        // Average over the full 7-day period, not just days with activity
        const average = totalPushups / 7;

        resolve({
          average: parseFloat(average.toFixed(2)),
          daysWithPushups,
          totalPushups,
        });
      }
    });
  });
}

/**
 * Get the 30-day average pushups per day
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<{average: number, daysWithPushups: number, totalPushups: number}>} Average pushups per day over the last 30 days
 */
function get30DayAverage(db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        SUM(count) as totalPushups,
        COUNT(DISTINCT DATE(timestamp)) as daysWithPushups
      FROM pushups
      WHERE datetime(timestamp) >= datetime('now', '-30 days')
    `;

    db.get(query, (err, row) => {
      if (err) {
        reject(new Error(`Failed to get 30-day average: ${err.message}`));
      } else {
        const totalPushups = row?.totalPushups || 0;
        const daysWithPushups = row?.daysWithPushups || 0;
        // Average over the full 30-day period, not just days with activity
        const average = totalPushups / 30;

        resolve({
          average: parseFloat(average.toFixed(2)),
          daysWithPushups,
          totalPushups,
        });
      }
    });
  });
}

/**
 * Get the current streak (consecutive days with pushups)
 * Counts consecutive days with pushups ending today
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<{currentStreak: number, lastPushupDate: string|null}>} Current streak in days and last pushup date
 */
function getStreak(db) {
  return new Promise((resolve, reject) => {
    // Get all unique dates with pushups, ordered most recent first
    const query = `
      SELECT DISTINCT DATE(timestamp) as date
      FROM pushups
      ORDER BY DATE(timestamp) DESC
    `;

    db.all(query, (err, rows) => {
      if (err) {
        reject(new Error(`Failed to get streak: ${err.message}`));
        return;
      }

      if (!rows || rows.length === 0) {
        resolve({
          currentStreak: 0,
          lastPushupDate: null,
        });
        return;
      }

      const lastPushupDate = rows[0].date;

      // Get today's date in CST
      // Create a date object and format it using the timezone formatter
      const now = new Date();
      const cstFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour12: false,
      });
      const parts = cstFormatter.formatToParts(now);
      const values = {};
      parts.forEach((part) => {
        values[part.type] = part.value;
      });
      const todayCST = `${values.year}-${values.month}-${values.day}`;

      // Check if the streak is still active (includes today or yesterday)
      const today = new Date(todayCST);
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastDate = new Date(lastPushupDate);
      lastDate.setHours(0, 0, 0, 0);

      const timeDiff = Math.abs(today.getTime() - lastDate.getTime());
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      // If last pushup was more than 1 day ago, streak is broken
      if (daysDiff > 1) {
        resolve({
          currentStreak: 0,
          lastPushupDate,
        });
        return;
      }

      // Calculate current streak by comparing consecutive dates
      let streak = 1;
      for (let i = 0; i < rows.length - 1; i++) {
        const currentDate = new Date(rows[i].date);
        const nextDate = new Date(rows[i + 1].date);

        const diffTime = Math.abs(currentDate.getTime() - nextDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }

      resolve({
        currentStreak: streak,
        lastPushupDate,
      });
    });
  });
}

/**
 * Get all-time pushup statistics
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<{totalPushups: number, totalDays: number, averagePerDay: number}>}
 */
function getPushupStats(db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        COALESCE(SUM(count), 0) as totalPushups,
        COUNT(DISTINCT date(timestamp)) as totalDays
      FROM pushups
    `;

    db.get(query, (err, row) => {
      if (err) {
        reject(new Error(`Failed to get pushup stats: ${err.message}`));
      } else {
        const totalPushups = row?.totalPushups || 0;
        const totalDays = row?.totalDays || 0;
        const averagePerDay =
          totalDays > 0
            ? Math.round((totalPushups / totalDays) * 100) / 100
            : 0;

        resolve({
          totalPushups,
          totalDays,
          averagePerDay,
        });
      }
    });
  });
}

/**
 * Get the last pushup date
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<string|null>} Last pushup date in ISO 8601 format
 */
function getLastPushupDate(db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT timestamp
      FROM pushups
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    db.get(query, (err, row) => {
      if (err) {
        reject(new Error(`Failed to get last pushup date: ${err.message}`));
      } else {
        // Convert to ISO 8601 format if timestamp exists
        const timestamp = row?.timestamp;
        if (timestamp) {
          // Parse the timestamp and convert to ISO format
          const date = new Date(timestamp);
          resolve(date.toISOString());
        } else {
          resolve(null);
        }
      }
    });
  });
}

/**
 * Get historical data for the specified number of days
 * @param {sqlite3.Database} db - Database connection
 * @param {number} days - Number of days to retrieve (default: 30)
 * @returns {Promise<Array>} Array of daily pushup totals with dates
 */
function get30DayHistory(db, days = 30) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        date(timestamp) as date,
        COALESCE(SUM(count), 0) as total,
        COUNT(*) as sessions
      FROM pushups
      WHERE datetime(timestamp) >= datetime('now', '-' || ? || ' days')
      GROUP BY date(timestamp)
      ORDER BY date(timestamp) ASC
    `;

    db.all(query, [days], (err, rows) => {
      if (err) {
        reject(new Error(`Failed to get history: ${err.message}`));
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Alias for get30DayHistory for backward compatibility
 */
function getHistory(db, days = 30) {
  return get30DayHistory(db, days);
}

// ============ ADMIN FUNCTIONS ============

/**
 * Get average pushups per session (all-time)
 * A session is a group of sets logged with the same session_id.
 * Sessions are created when a user runs the session mode.
 * @param {sqlite3.Database} db
 * @returns {Promise<{avgPerSession: number, totalSessions: number}>}
 */
function getAvgPerSession(db) {
  return new Promise((resolve, reject) => {
    // Count distinct sessions (groups with same session_id) and their totals
    const query = `
      SELECT
        COUNT(DISTINCT session_id) as totalSessions,
        ROUND(CAST(SUM(count) AS FLOAT) / NULLIF(COUNT(DISTINCT session_id), 0), 1) as avgPerSession
      FROM pushups
      WHERE session_id IS NOT NULL
    `;
    db.get(query, (err, row) => {
      if (err) {
        reject(new Error(`Failed to get avg per session: ${err.message}`));
      } else {
        resolve({
          totalSessions: row?.totalSessions || 0,
          avgPerSession: row?.avgPerSession || 0,
        });
      }
    });
  });
}

/**
 * Get average pushups per set (individual entries)
 * @param {sqlite3.Database} db
 * @returns {Promise<{avgPerSet: number, totalSets: number}>}
 */
function getAvgPerSet(db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        COUNT(*) as totalSets,
        ROUND(CAST(SUM(count) AS FLOAT) / NULLIF(COUNT(*), 0), 1) as avgPerSet
      FROM pushups
    `;
    db.get(query, (err, row) => {
      if (err) {
        reject(new Error(`Failed to get avg per set: ${err.message}`));
      } else {
        resolve({
          totalSets: row?.totalSets || 0,
          avgPerSet: row?.avgPerSet || 0,
        });
      }
    });
  });
}


/**
 * Get all pushup entries for admin management
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<Array>} Array of all pushup entries
 */
function getAllEntries(db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id, count, timestamp, created_at
      FROM pushups
      ORDER BY timestamp DESC
    `;

    db.all(query, (err, rows) => {
      if (err) {
        reject(new Error(`Failed to get all entries: ${err.message}`));
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Update a pushup entry
 * @param {sqlite3.Database} db - Database connection
 * @param {number} id - Entry ID
 * @param {Object} updates - Fields to update {count?, timestamp?}
 * @returns {Promise<Object|null>} Updated entry or null if not found
 */
function updateEntry(db, id, updates) {
  return new Promise((resolve, reject) => {
    // Build dynamic update query
    const fields = [];
    const values = [];

    if (updates.count !== undefined) {
      fields.push("count = ?");
      values.push(updates.count);
    }
    if (updates.timestamp !== undefined) {
      fields.push("timestamp = ?");
      values.push(updates.timestamp);
    }

    if (fields.length === 0) {
      // No fields to update, just return existing entry
      db.get(
        "SELECT id, count, timestamp, created_at FROM pushups WHERE id = ?",
        [id],
        (err, row) => {
          if (err) reject(new Error(`Failed to get entry: ${err.message}`));
          else resolve(row || null);
        },
      );
      return;
    }

    values.push(id);

    const query = `
      UPDATE pushups
      SET ${fields.join(", ")}
      WHERE id = ?
    `;

    db.run(query, values, function (err) {
      if (err) {
        reject(new Error(`Failed to update entry: ${err.message}`));
      } else if (this.changes === 0) {
        resolve(null);
      } else {
        // Return updated entry
        db.get(
          "SELECT id, count, timestamp, created_at FROM pushups WHERE id = ?",
          [id],
          (err, row) => {
            if (err)
              reject(new Error(`Failed to get updated entry: ${err.message}`));
            else resolve(row);
          },
        );
      }
    });
  });
}

/**
 * Delete a pushup entry
 * @param {sqlite3.Database} db - Database connection
 * @param {number} id - Entry ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
function deleteEntry(db, id) {
  return new Promise((resolve, reject) => {
    const query = "DELETE FROM pushups WHERE id = ?";

    db.run(query, [id], function (err) {
      if (err) {
        reject(new Error(`Failed to delete entry: ${err.message}`));
      } else {
        resolve(this.changes > 0);
      }
    });
  });
}

/**
 * Get pushup totals bucketed by time-of-day block
 * Buckets: Morning (6-11), Afternoon (12-16), Evening (17-20), Night (21-5)
 * @param {sqlite3.Database} db
 * @returns {Promise<{morning: number, afternoon: number, evening: number, night: number}>}
 */
function getTimeOfDay(db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        CAST(strftime('%H', timestamp) AS INTEGER) as hour,
        SUM(count) as total
      FROM pushups
      GROUP BY hour
    `;

    db.all(query, (err, rows) => {
      if (err) {
        reject(new Error(`Failed to get time-of-day data: ${err.message}`));
        return;
      }

      const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
      (rows || []).forEach(({ hour, total }) => {
        if (hour >= 6 && hour < 12) buckets.morning += total;
        else if (hour >= 12 && hour < 17) buckets.afternoon += total;
        else if (hour >= 17 && hour < 21) buckets.evening += total;
        else buckets.night += total;
      });

      resolve(buckets);
    });
  });
}

module.exports = {
  logPushup,
  getDailyTotal,
  get7DayAverage,
  get30DayAverage,
  getStreak,
  getPushupStats,
  getLastPushupDate,
  get30DayHistory,
  getHistory,
  getAvgPerSession,
  getAvgPerSet,
  getAllEntries,
  updateEntry,
  deleteEntry,
  getTimeOfDay,
};
