const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./db/init');
const pushupRoutes = require('./routes/pushups');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'pushups.db');
const ERROR_LOGGING = process.env.ERROR_LOGGING === 'true';

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow all origins when running behind a reverse proxy (Docker/nginx)
    // The nginx proxy handles external access, so we can trust internal requests
    // Also allow requests with no origin (same-origin, curl, etc.)
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Custom error class for API errors
class APIError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'APIError';
  }
}

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount pushup routes
app.use('/api', pushupRoutes);

// 404 Not Found handler - must come after all routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    status: 404
  });
});

// Global error handling middleware (MUST be last)
app.use((err, req, res, next) => {
  // Log the error
  if (ERROR_LOGGING || NODE_ENV === 'development') {
    console.error('=== ERROR ===');
    console.error('Message:', err.message);
    console.error('Status:', err.status || 500);
    if (err.details) {
      console.error('Details:', err.details);
    }
    console.error('Stack:', err.stack);
  }

  // Determine status code
  let status = err.status || 500;
  let errorMessage = err.message || 'Internal server error';
  let errorDetails = err.details || null;

  // Handle specific error types
  if (err.name === 'SyntaxError' && err instanceof SyntaxError) {
    // Handle JSON parse errors
    status = 400;
    errorMessage = 'Invalid JSON in request body';
    errorDetails = 'The request body contains invalid JSON';
  } else if (err.name === 'APIError') {
    // Already formatted as API error
    status = err.status;
    errorMessage = err.message;
    errorDetails = err.details;
  } else if (err.message && err.message.includes('Database')) {
    // Database errors
    status = 500;
    errorMessage = 'Internal server error';
    errorDetails = NODE_ENV === 'development' ? err.message : 'A database error occurred';
  } else if (!err.status) {
    // Unhandled errors
    status = 500;
    errorMessage = 'Internal server error';
    errorDetails = NODE_ENV === 'development' ? err.message : null;
  }

  // Build response
  const response = {
    error: errorMessage,
    status: status
  };

  // Include details in development mode or if explicitly provided
  if (errorDetails) {
    response.details = errorDetails;
  }

  // Send error response
  res.status(status).json(response);
});

// Start server
async function startServer() {
  try {
    const db = await initializeDatabase(DB_PATH);
    app.locals.db = db;
    console.log(`Database initialized at ${DB_PATH}`);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
      if (ERROR_LOGGING) {
        console.log('Error logging: ENABLED');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Export app and APIError for testing
module.exports = { app, APIError, startServer };

startServer();
