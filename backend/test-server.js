#!/usr/bin/env node

const http = require('http');
const path = require('path');

// Directly import the app and start it
process.env.DB_PATH = path.join(__dirname, 'test-data', 'pushups.db');

const { app, startServer } = require('./src/server');

// Simple test
async function test() {
  const http = require('http');
  
  // Test health endpoint
  const testReq = (path) => new Promise((resolve, reject) => {
    http.get(`http://localhost:3001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });

  setTimeout(async () => {
    try {
      const health = await testReq('/api/health');
      console.log(`Health: ${health.status}`);
      
      const history = await testReq('/api/history');
      console.log(`History: ${history.status}`);
      if (history.status === 200) {
        console.log('Response:', history.data);
      } else {
        console.log('Error response:', history.data.substring(0, 100));
      }
      process.exit(0);
    } catch (err) {
      console.error('Test error:', err.message);
      process.exit(1);
    }
  }, 2000);
}

test();
