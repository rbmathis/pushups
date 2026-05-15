/**
 * Error Handling Tests
 * Comprehensive test suite for API error handling
 */

const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3001';
const tests = [];
let passedTests = 0;
let failedTests = 0;

/**
 * Helper function to make HTTP requests
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Test helper
 */
async function test(name, fn) {
  tests.push({ name, fn });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n=== ERROR HANDLING TEST SUITE ===\n');
  
  for (const t of tests) {
    try {
      console.log(`Testing: ${t.name}`);
      await t.fn();
      passedTests++;
      console.log(`✓ PASSED\n`);
    } catch (error) {
      failedTests++;
      console.error(`✗ FAILED: ${error.message}\n`);
    }
  }

  console.log('\n=== TEST SUMMARY ===');
  console.log(`Total: ${tests.length}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / tests.length) * 100).toFixed(1)}%\n`);

  process.exit(failedTests > 0 ? 1 : 0);
}

/**
 * Assertion helpers
 */
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertExists(value, message) {
  if (!value) {
    throw new Error(`${message}: value does not exist`);
  }
}

function assertStatusCode(response, expectedStatus, message) {
  if (response.status !== expectedStatus) {
    throw new Error(`${message}: expected status ${expectedStatus}, got ${response.status}. Response: ${JSON.stringify(response.body)}`);
  }
}

function assertErrorFormat(response, expectedError) {
  if (!response.body.error) {
    throw new Error('Response does not have error field');
  }
  if (response.body.error !== expectedError) {
    throw new Error(`Expected error "${expectedError}", got "${response.body.error}"`);
  }
  if (response.body.status === undefined) {
    throw new Error('Response does not have status field');
  }
}

/**
 * Define Tests
 */

// Health check - baseline test
test('Health check endpoint returns 200', async () => {
  const response = await makeRequest('GET', '/api/health');
  assertStatusCode(response, 200, 'Health check');
  assertEqual(response.body.status, 'ok', 'Health status');
});

// 404 Not Found Tests
test('GET unknown endpoint returns 404', async () => {
  const response = await makeRequest('GET', '/api/unknown');
  assertStatusCode(response, 404, '404 check');
  assertErrorFormat(response, 'Not found');
});

test('POST unknown endpoint returns 404', async () => {
  const response = await makeRequest('POST', '/api/missing');
  assertStatusCode(response, 404, '404 check');
  assertErrorFormat(response, 'Not found');
});

// Validation Error Tests - POST /api/pushups

test('POST /api/pushups with negative count returns 400', async () => {
  const response = await makeRequest('POST', '/api/pushups', { count: -5 });
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('POST /api/pushups with zero count returns 400', async () => {
  const response = await makeRequest('POST', '/api/pushups', { count: 0 });
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('POST /api/pushups with string count returns 400', async () => {
  const response = await makeRequest('POST', '/api/pushups', { count: 'abc' });
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('POST /api/pushups with float count returns 400', async () => {
  const response = await makeRequest('POST', '/api/pushups', { count: 10.5 });
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('POST /api/pushups with missing count returns 400', async () => {
  const response = await makeRequest('POST', '/api/pushups', {});
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('POST /api/pushups with count > 1000 returns 400', async () => {
  const response = await makeRequest('POST', '/api/pushups', { count: 1001 });
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('POST /api/pushups with valid count returns 201', async () => {
  const response = await makeRequest('POST', '/api/pushups', { count: 25 });
  assertStatusCode(response, 201, 'Valid pushup');
  assertEqual(response.body.message, 'Pushup logged successfully', 'Success message');
  assertExists(response.body.id, 'Response has id');
  assertExists(response.body.timestamp, 'Response has timestamp');
});

// Validation Error Tests - GET /api/history

test('GET /api/history without days parameter returns 400', async () => {
  const response = await makeRequest('GET', '/api/history');
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('GET /api/history with invalid days returns 400', async () => {
  const response = await makeRequest('GET', '/api/history?days=abc');
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('GET /api/history with negative days returns 400', async () => {
  const response = await makeRequest('GET', '/api/history?days=-10');
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('GET /api/history with zero days returns 400', async () => {
  const response = await makeRequest('GET', '/api/history?days=0');
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('GET /api/history with float days returns 400', async () => {
  const response = await makeRequest('GET', '/api/history?days=7.5');
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('GET /api/history with days > 10000 returns 400', async () => {
  const response = await makeRequest('GET', '/api/history?days=10001');
  assertStatusCode(response, 400, 'Validation error');
  assertErrorFormat(response, 'Invalid input');
  assertExists(response.body.details, 'Error details');
});

test('GET /api/history with valid days returns 200', async () => {
  const response = await makeRequest('GET', '/api/history?days=30');
  assertStatusCode(response, 200, 'Valid history request');
  assertExists(response.body.entries, 'Response has entries');
});

// Successful endpoints

test('GET /api/statistics returns 200', async () => {
  const response = await makeRequest('GET', '/api/statistics');
  assertStatusCode(response, 200, 'Statistics endpoint');
  assertExists(response.body.dailyTotal, 'Has dailyTotal');
  assertExists(response.body.sevenDayAverage, 'Has sevenDayAverage');
  assertExists(response.body.currentStreak, 'Has currentStreak');
});

// Invalid JSON tests

test('POST /api/pushups with invalid JSON returns 400', async () => {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/pushups', BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3001,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          if (res.statusCode === 400) {
            const body = JSON.parse(data);
            if (body.error && body.status === 400) {
              resolve();
            } else {
              reject(new Error('Invalid error response format'));
            }
          } else {
            reject(new Error(`Expected 400, got ${res.statusCode}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write('{ invalid json');
    req.end();
  });
});

// Run tests
runTests();
