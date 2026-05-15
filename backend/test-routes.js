const express = require('express');
const routes = require('./src/routes/pushups');
const app = express();

app.use('/api', routes);

// Test if history route works
const testServer = app.listen(0, 'localhost', () => {
  const port = testServer.address().port;
  console.log(`Test server listening on port ${port}`);
  
  setTimeout(() => {
    // Try to fetch the route
    const http = require('http');
    http.get(`http://localhost:${port}/api/history`, (res) => {
      console.log(`GET /api/history returned status: ${res.statusCode}`);
      testServer.close();
      process.exit(0);
    }).on('error', (err) => {
      console.error('Error:', err);
      testServer.close();
      process.exit(1);
    });
  }, 100);
});


