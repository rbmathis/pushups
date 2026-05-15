const express = require('express');
const cors = require('cors');
const pushupRoutes = require('./src/routes/pushups');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount routes
app.use('/api', pushupRoutes);

// 404 handler
app.use((req, res) => {
  console.log('404 - Method:', req.method, 'URL:', req.url, 'Path:', req.path);
  res.status(404).json({ error: 'Not found', url: req.url, path: req.path });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

// Test the endpoints after a short delay
setTimeout(() => {
  const http = require('http');
  
  const endpoints = [
    '/api/health',
    '/api/statistics',
    '/api/history?days=30',
    '/api/pushups'
  ];
  
  endpoints.forEach(endpoint => {
    const req = http.get(`http://localhost:${PORT}${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`${endpoint}: ${res.statusCode}`);
      });
    });
    req.on('error', err => console.error(`Error for ${endpoint}:`, err.message));
  });
  
  // Close after testing
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}, 500);
