/**
 * Pushup Model - Database operations for pushup tracking
 * 
 * This module provides functions to:
 * - Log new pushup entries
 * - Calculate statistics (total, averages, streaks)
 * - Retrieve historical data
 */

/**
 * Logs a new pushup entry to the database
 * 
 * @param {sqlite3.Database} db - Database connection
 * @param {number} count - Number of pushups performed (must be > 0)
 * @param {string} timestamp - ISO 8601 CST timestamp string (e.g., "2026-04-20T12:19:05")
 * @returns {Promise<{id: number, count: number, timestamp: string, created_at: string}>}
 * @throws {Error} If count is not a positive integer or timestamp is invalid
 */
async function logPushup(db, count, timestamp) {
  return new Promise((resolve, reject) => {
    // Validate count
    if (!Number.isInteger(count) || count <= 0) {
      reject(new Error('Count must be a positive integer'));
      return;
    }

    // Validate timestamp format (basic ISO 8601 check)
    if (!timestamp || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timestamp)) {
      reject(new Error('Timestamp must be in ISO 8601 format (e.g., "2026-04-20T12:19:05")'));
      return;
    }

    // Get current UTC timestamp for created_at
    const createdAt = new Date().toISOString();

    const sql = `
      INSERT INTO pushups (count, timestamp, created_at)
      VALUES (?, ?, ?)
    `;

    db.run(sql, [count, timestamp, createdAt], function (err) {
      if (err) {
        reject(new Error(`Failed to log pushup: ${err.message}`));
        return;
      }

      resolve({
        id: this.lastID,
        count,
        timestamp,
        created_at: createdAt,
      });
    });
  });
}

/**
 * Gets all-time pushup statistics
 * 
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<{totalPushups: number, totalDays: number, averagePerDay: number}>}
 */
async function getPushupStats(db) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        SUM(count) as totalPushups,
        COUNT(DISTINCT DATE(timestamp)) as totalDays
      FROM pushups
    `;

    db.get(sql, (err, row) => {
      if (err) {
        reject(new Error(`Failed to get pushup stats: ${err.message}`));
        return;
      }

      const totalPushups = row?.totalPushups || 0;
      const totalDays = row?.totalDays || 0;
      const averagePerDay = totalDays > 0 ? totalPushups / totalDays : 0;

      resolve({
        totalPushups,
        totalDays,
        averagePerDay: parseFloat(averagePerDay.toFixed(2)),
      });
    });
  });
}

/**
 * Gets the current consecutive pushup streak
 * 
 * A streak is defined as consecutive calendar days with at least one pushup logged.
 * 
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<{currentStreak: number, lastPushupDate: string|null}>}
 */
async function getStreak(db) {
  return new Promise((resolve, reject) => {
    // First, get all unique dates with pushups, ordered most recent first
    const sql = `
      SELECT DISTINCT DATE(timestamp) as date
      FROM pushups
      ORDER BY DATE(timestamp) DESC
    `;

    db.all(sql, (err, rows) => {
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
      
      // Check if the streak is still active (includes today or yesterday)
      const today = new Date();
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
 * Gets the 7-day average statistics
 * 
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<{average: number, daysWithPushups: number, totalPushups: number}>}
 */
async function get7DayAverage(db) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        SUM(count) as totalPushups,
        COUNT(DISTINCT DATE(timestamp)) as daysWithPushups
      FROM pushups
      WHERE timestamp >= datetime('now', '-7 days')
    `;

    db.get(sql, (err, row) => {
      if (err) {
        reject(new Error(`Failed to get 7-day average: ${err.message}`));
        return;
      }

      const totalPushups = row?.totalPushups || 0;
      const daysWithPushups = row?.daysWithPushups || 0;
      const average = daysWithPushups > 0 ? totalPushups / daysWithPushups : 0;

      resolve({
        average: parseFloat(average.toFixed(2)),
        daysWithPushups,
        totalPushups,
      });
    });
  });
}

/**
 * Gets the 30-day average statistics
 * 
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<{average: number, daysWithPushups: number, totalPushups: number}>}
 */
async function get30DayAverage(db) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        SUM(count) as totalPushups,
        COUNT(DISTINCT DATE(timestamp)) as daysWithPushups
      FROM pushups
      WHERE timestamp >= datetime('now', '-30 days')
    `;

    db.get(sql, (err, row) => {
      if (err) {
        reject(new Error(`Failed to get 30-day average: ${err.message}`));
        return;
      }

      const totalPushups = row?.totalPushups || 0;
      const daysWithPushups = row?.daysWithPushups || 0;
      const average = daysWithPushups > 0 ? totalPushups / daysWithPushups : 0;

      resolve({
        average: parseFloat(average.toFixed(2)),
        daysWithPushups,
        totalPushups,
      });
    });
  });
}

/**
 * Gets today's total pushup count and all timestamps for today
 * 
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<{date: string, total: number, pushupDates: Array<{timestamp: string, count: number}>}>}
 */
async function getDailyTotal(db) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        DATE(timestamp) as date,
        SUM(count) as total,
        timestamp,
        count
      FROM pushups
      WHERE DATE(timestamp) = DATE('now')
      ORDER BY timestamp ASC
    `;

    db.all(sql, (err, rows) => {
      if (err) {
        reject(new Error(`Failed to get daily total: ${err.message}`));
        return;
      }

      if (!rows || rows.length === 0) {
        const today = new Date().toISOString().split('T')[0];
        resolve({
          date: today,
          total: 0,
          pushupDates: [],
        });
        return;
      }

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
    });
  });
}

/**
 * Gets historical pushup data for the specified number of days
 * 
 * @param {sqlite3.Database} db - Database connection
 * @param {number} days - Number of days to retrieve (e.g., 90)
 * @returns {Promise<Array<{date: string, total: number, sessions: Array<{timestamp: string, count: number}>}>>}
 */
async function getHistory(db, days) {
  return new Promise((resolve, reject) => {
    if (!Number.isInteger(days) || days <= 0) {
      reject(new Error('Days must be a positive integer'));
      return;
    }

    // First, get all sessions within the time range
    const sql = `
      SELECT
        DATE(timestamp) as date,
        timestamp,
        count
      FROM pushups
      WHERE timestamp >= datetime('now', '-' || ? || ' days')
      ORDER BY DATE(timestamp) ASC, timestamp ASC
    `;

    db.all(sql, [days], (err, rows) => {
      if (err) {
        reject(new Error(`Failed to get history: ${err.message}`));
        return;
      }

      // Group by date and calculate totals
      const historyMap = {};
      (rows || []).forEach((row) => {
        if (!historyMap[row.date]) {
          historyMap[row.date] = {
            date: row.date,
            total: 0,
            sessions: [],
          };
        }
        historyMap[row.date].total += row.count;
        historyMap[row.date].sessions.push({
          timestamp: row.timestamp,
          count: row.count,
        });
      });

      // Convert to array, already sorted by date ASC
      const entries = Object.values(historyMap);

      resolve(entries);
    });
  });
}

module.exports = {
  logPushup,
  getPushupStats,
  getStreak,
  get7DayAverage,
  get30DayAverage,
  getDailyTotal,
  getHistory,
};
