-- Pushup Tracker Database Schema
-- SQLite database for tracking daily pushup counts with analytics support

-- Main pushups table: stores individual pushup entries
CREATE TABLE IF NOT EXISTS pushups (
  -- Unique identifier for each pushup entry
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Number of pushups performed (e.g., 30, 50, 100)
  -- NOT NULL: every entry must have a count
  count INTEGER NOT NULL,
  
  -- Timestamp when pushups were performed (ISO 8601 format in CST)
  -- Example: "2026-04-20T12:19:05"
  -- NOT NULL: every entry must have a timestamp for analytics
  -- This is the primary key for date-based queries
  timestamp TEXT NOT NULL,
  
  -- When the record was created (ISO 8601 format in UTC)
  -- Used for audit trail and data integrity verification
  -- NOT NULL: tracks when data was entered into the system
  created_at TEXT NOT NULL
);

-- Index on timestamp for efficient date-based queries
-- Supports:
--   - Daily totals: GROUP BY date(timestamp)
--   - 7-day and 30-day averages
--   - Streak detection (consecutive days)
--   - All-time statistics filtering
-- INDEXED column: timestamp (used in WHERE and GROUP BY clauses)
CREATE INDEX IF NOT EXISTS idx_pushups_timestamp ON pushups(timestamp);

-- Index on (timestamp, count) for optimized aggregation queries
-- This composite index supports:
--   - Fast COUNT() and SUM() operations with timestamp filters
--   - Covering queries without table lookups
CREATE INDEX IF NOT EXISTS idx_pushups_timestamp_count ON pushups(timestamp, count);
