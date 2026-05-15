/**
 * Pushup Routes
 * Defines all routes related to pushup operations
 */

const express = require("express");
const router = express.Router();
const pushupController = require("../controllers/pushupController");

/**
 * POST /api/pushups
 * Logs a new pushup entry
 * Request body: {count: number}
 * Response: {id, count, timestamp, created_at, message: "Pushup logged successfully"}
 */
router.post("/pushups", pushupController.logPushup);

/**
 * GET /api/statistics
 * Retrieves pushup statistics
 * Response: {
 *   dailyTotal: number,
 *   sevenDayAverage: number,
 *   currentStreak: number,
 *   allTimeStats: {totalPushups, totalDays, averagePerDay},
 *   thirtyDayAverage: number,
 *   lastPushupDate: string (ISO 8601)
 * }
 */
router.get("/statistics", pushupController.getStatistics);

/**
 * GET /api/history
 * Retrieves pushup history for the specified number of days
 * Query params: days (number of days to retrieve, required)
 * Response: {entries: [{date: string, total: number}]}
 */
router.get("/history", pushupController.getHistory);

/**
 * GET /api/timeofday
 * Returns pushup totals bucketed by time-of-day (morning/afternoon/evening/night)
 */
router.get("/timeofday", pushupController.getTimeOfDay);

// ============ ADMIN ROUTES ============

/**
 * GET /api/admin/entries
 * Retrieves all pushup entries for admin management
 * Response: {entries: [{id, count, timestamp, created_at}]}
 */
router.get("/admin/entries", pushupController.getAllEntries);

/**
 * PUT /api/admin/entries/:id
 * Updates a pushup entry
 * Request body: {count?: number, timestamp?: string}
 * Response: {id, count, timestamp, created_at, message: "Entry updated successfully"}
 */
router.put("/admin/entries/:id", pushupController.updateEntry);

/**
 * DELETE /api/admin/entries/:id
 * Deletes a pushup entry
 * Response: {message: "Entry deleted successfully"}
 */
router.delete("/admin/entries/:id", pushupController.deleteEntry);

/**
 * POST /api/admin/entries
 * Creates a pushup entry with custom timestamp
 * Request body: {count: number, timestamp: string}
 * Response: {id, count, timestamp, created_at, message: "Entry created successfully"}
 */
router.post("/admin/entries", pushupController.createEntry);

module.exports = router;
