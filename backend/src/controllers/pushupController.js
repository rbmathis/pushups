/**
 * Pushup Controller
 * Handles business logic for pushup-related endpoints
 */

const { formatInTimeZone } = require("date-fns-tz");
const model = require("../db/model");

/**
 * Custom error class for validation and API errors
 */
class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.status = 400;
    this.details = details;
    this.name = "ValidationError";
  }
}

class DatabaseError extends Error {
  constructor(message, details = null) {
    super(message);
    this.status = 500;
    this.details = details;
    this.name = "DatabaseError";
  }
}

/**
 * Validates the pushup count
 * @param {any} count - The count to validate
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
function validateCount(count) {
  // Check if count is provided
  if (count === undefined || count === null) {
    return {
      valid: false,
      error: "Invalid input",
      details: "Count is required",
    };
  }

  // Convert to number if it's a string
  const numCount = Number(count);

  // Check if it's a valid number
  if (isNaN(numCount)) {
    return {
      valid: false,
      error: "Invalid input",
      details: "Count must be a valid number",
    };
  }

  // Check if it's an integer
  if (!Number.isInteger(numCount)) {
    return {
      valid: false,
      error: "Invalid input",
      details: "Count must be an integer",
    };
  }

  // Check if it's positive (> 0)
  if (numCount <= 0) {
    return {
      valid: false,
      error: "Invalid input",
      details: "Count must be greater than 0",
    };
  }

  // Sanity check: count should be <= 1000
  if (numCount > 1000) {
    return {
      valid: false,
      error: "Invalid input",
      details: "Count must be 1000 or less",
    };
  }

  return { valid: true };
}

/**
 * Validates the days parameter for history queries
 * @param {any} days - The days value to validate
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
function validateDays(days) {
  // Default to 90 if not provided
  if (days === undefined || days === null || days === "") {
    return { valid: true };
  }

  // Convert to number if it's a string
  const numDays = Number(days);

  // Check if it's a valid number
  if (isNaN(numDays)) {
    return {
      valid: false,
      error: "Invalid input",
      details: "Days must be a valid number",
    };
  }

  // Check if it's an integer
  if (!Number.isInteger(numDays)) {
    return {
      valid: false,
      error: "Invalid input",
      details: "Days must be an integer",
    };
  }

  // Check if it's positive (> 0)
  if (numDays <= 0) {
    return {
      valid: false,
      error: "Invalid input",
      details: "Days must be greater than 0",
    };
  }

  // Sanity check: days should be <= 365
  if (numDays > 365) {
    return {
      valid: false,
      error: "Invalid input",
      details: "Days must be 365 or less",
    };
  }

  return { valid: true };
}

/**
 * Logs a pushup entry
 * POST /api/pushups
 * Request body: {count: number, sessionId?: string}
 * Response: {id, count, timestamp, created_at, sessionId, message: "Pushup logged successfully"}
 */
async function logPushup(req, res, next) {
  try {
    const { count, sessionId } = req.body;

    // Validate count
    const validation = validateCount(count);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        status: 400,
        ...(validation.details && { details: validation.details }),
      });
    }

    // Get database connection from app locals
    const db = req.app.locals.db;
    if (!db) {
      console.error("Database connection not available");
      return res.status(500).json({
        error: "Internal server error",
        status: 500,
        details: "Database connection unavailable",
      });
    }

    // Get current time in CST timezone
    const cstTime = formatInTimeZone(
      new Date(),
      "America/Chicago",
      "yyyy-MM-dd'T'HH:mm:ss",
    );

    // Log pushup to database
    const result = await model.logPushup(db, count, cstTime, sessionId);

    // Return success response
    res.status(201).json({
      id: result.id,
      count: result.count,
      timestamp: result.timestamp,
      created_at: result.created_at,
      sessionId: result.sessionId,
      message: "Pushup logged successfully",
    });
  } catch (error) {
    console.error("Error logging pushup:", error.message);

    // Check if it's a database error
    if (error.message && error.message.includes("Failed to log pushup")) {
      return res.status(500).json({
        error: "Internal server error",
        status: 500,
        details: "Could not log pushup to database",
      });
    }

    // Pass to error handler
    next(error);
  }
}

/**
 * Get statistics for pushups
 * GET /api/statistics
 * Response: {
 *   dailyTotal: number,
 *   sevenDayAverage: number,
 *   currentStreak: number,
 *   allTimeStats: {totalPushups, totalDays, averagePerDay},
 *   thirtyDayAverage: number,
 *   lastPushupDate: string (ISO 8601)
 * }
 */
async function getStatistics(req, res, next) {
  try {
    // Get database connection from app locals
    const db = req.app.locals.db;
    if (!db) {
      console.error("Database connection not available");
      return res.status(500).json({
        error: "Internal server error",
        status: 500,
        details: "Database connection unavailable",
      });
    }

    // Fetch all statistics in parallel
    const [
      dailyTotal,
      sevenDayAverage,
      thirtyDayAverage,
      currentStreak,
      allTimeStats,
      lastPushupDate,
      avgPerSession,
      avgPerSet,
      lifelinesEarned,
    ] = await Promise.all([
      model.getDailyTotal(db),
      model.get7DayAverage(db),
      model.get30DayAverage(db),
      model.getStreak(db),
      model.getPushupStats(db),
      model.getLastPushupDate(db),
      model.getAvgPerSession(db),
      model.getAvgPerSet(db),
      model.getLifelinesEarned(db),
    ]);

    // Return all statistics
    res.status(200).json({
      dailyTotal,
      sevenDayAverage,
      currentStreak,
      allTimeStats,
      thirtyDayAverage,
      lastPushupDate,
      avgPerSession,
      avgPerSet,
      lifelinesEarned,
    });
  } catch (error) {
    console.error("Error getting statistics:", error.message);

    // Check if it's a database error
    if (error.message && error.message.includes("Failed to get")) {
      return res.status(500).json({
        error: "Internal server error",
        status: 500,
        details: "Could not retrieve statistics from database",
      });
    }

    // Pass to error handler
    next(error);
  }
}

/**
 * Get pushup history
 * GET /api/history?days=90
 * Query params: days (number of days to retrieve)
 * Response: {entries: [{date: string, total: number}]}
 */
async function getHistory(req, res, next) {
  try {
    // Get days from query param, default to 90
    let days = req.query.days || "90";

    // Validate days parameter
    const validation = validateDays(days);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        status: 400,
        ...(validation.details && { details: validation.details }),
      });
    }

    const numDays = Number(days);

    // Get database connection from app locals
    const db = req.app.locals.db;
    if (!db) {
      console.error("Database connection not available");
      return res.status(500).json({
        error: "Internal server error",
        status: 500,
        details: "Database connection unavailable",
      });
    }

    // Fetch history from database
    const history = await model.getHistory(db, numDays);

    // Return history data
    res.status(200).json(history);
  } catch (error) {
    console.error("Error getting history:", error.message);

    // Check if it's a database error
    if (error.message && error.message.includes("Failed to get history")) {
      return res.status(500).json({
        error: "Internal server error",
        status: 500,
        details: "Could not retrieve history from database",
      });
    }

    // Pass to error handler
    next(error);
  }
}

/**
 * Get pushup totals by time-of-day block
 * GET /api/timeofday
 * Response: {morning, afternoon, evening, night}
 */
async function getTimeOfDay(req, res, next) {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({
        error: "Internal server error",
        status: 500,
        details: "Database connection unavailable",
      });
    }
    const data = await model.getTimeOfDay(db);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error getting time-of-day data:", error.message);
    next(error);
  }
}

// ============ ADMIN FUNCTIONS ============

/**
 * Get all pushup entries for admin management
 * GET /api/admin/entries
 */
async function getAllEntries(req, res, next) {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({
        error: "Internal server error",
        status: 500,
        details: "Database connection unavailable",
      });
    }

    const entries = await model.getAllEntries(db);
    res.status(200).json({ entries });
  } catch (error) {
    console.error("Error getting all entries:", error.message);
    next(error);
  }
}

/**
 * Update a pushup entry
 * PUT /api/admin/entries/:id
 */
async function updateEntry(req, res, next) {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({
        error: "Internal server error",
        status: 500,
        details: "Database connection unavailable",
      });
    }

    const { id } = req.params;
    const { count, timestamp } = req.body;

    // Validate ID
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        error: "Invalid input",
        status: 400,
        details: "Valid ID is required",
      });
    }

    // Validate count if provided
    if (count !== undefined) {
      const validation = validateCount(count);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error,
          status: 400,
          ...(validation.details && { details: validation.details }),
        });
      }
    }

    const result = await model.updateEntry(db, Number(id), {
      count,
      timestamp,
    });

    if (!result) {
      return res.status(404).json({
        error: "Not found",
        status: 404,
        details: "Entry not found",
      });
    }

    res.status(200).json({
      ...result,
      message: "Entry updated successfully",
    });
  } catch (error) {
    console.error("Error updating entry:", error.message);
    next(error);
  }
}

/**
 * Delete a pushup entry
 * DELETE /api/admin/entries/:id
 */
async function deleteEntry(req, res, next) {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({
        error: "Internal server error",
        status: 500,
        details: "Database connection unavailable",
      });
    }

    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        error: "Invalid input",
        status: 400,
        details: "Valid ID is required",
      });
    }

    const deleted = await model.deleteEntry(db, Number(id));

    if (!deleted) {
      return res.status(404).json({
        error: "Not found",
        status: 404,
        details: "Entry not found",
      });
    }

    res.status(200).json({ message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting entry:", error.message);
    next(error);
  }
}

/**
 * Create a pushup entry with custom timestamp
 * POST /api/admin/entries
 */
async function createEntry(req, res, next) {
  try {
    const db = req.app.locals.db;
    if (!db) {
      return res.status(500).json({
        error: "Internal server error",
        status: 500,
        details: "Database connection unavailable",
      });
    }

    const { count, timestamp } = req.body;

    // Validate count
    const validation = validateCount(count);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        status: 400,
        ...(validation.details && { details: validation.details }),
      });
    }

    // Validate timestamp
    if (!timestamp) {
      return res.status(400).json({
        error: "Invalid input",
        status: 400,
        details: "Timestamp is required",
      });
    }

    const result = await model.logPushup(db, count, timestamp);

    res.status(201).json({
      ...result,
      message: "Entry created successfully",
    });
  } catch (error) {
    console.error("Error creating entry:", error.message);
    next(error);
  }
}

module.exports = {
  logPushup,
  getStatistics,
  getHistory,
  getTimeOfDay,
  getAllEntries,
  updateEntry,
  deleteEntry,
  createEntry,
  ValidationError,
  DatabaseError,
};
