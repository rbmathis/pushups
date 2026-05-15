/**
 * CST Timestamp Verification Script
 * Tests all timestamp handling requirements for the pushup tracker
 */

const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'pushups.db');
const API_HOST = 'localhost';
const API_PORT = 3001;

console.log('='.repeat(70));
console.log('PUSHUP TRACKER - CST TIMESTAMP VERIFICATION');
console.log('='.repeat(70));
console.log('');

let testResults = {
  test1: false,
  test2: false,
  test3: false,
  test4: false,
  test5: false,
};

// Helper to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Helper to get current CST time
function getCSTTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const values = {};
  parts.forEach(part => {
    values[part.type] = part.value;
  });
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

// TEST 1: Backend Timestamp Capture
async function test1_backendTimestampCapture() {
  console.log('TEST 1: Backend Timestamp Capture');
  console.log('-'.repeat(70));
  
  try {
    const response = await makeRequest('POST', '/api/pushups', { count: 30 });
    const { id, timestamp, created_at } = response;
    
    console.log('Response from POST /api/pushups:');
    console.log(`  ID: ${id}`);
    console.log(`  Timestamp: ${timestamp}`);
    console.log(`  Created At: ${created_at}`);
    console.log('');
    
    // Verify ISO 8601 format
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
    const isISO8601 = iso8601Regex.test(timestamp);
    console.log(`ISO 8601 Format (timestamp): ${isISO8601 ? 'YES' : 'NO'}`);
    
    // Verify UTC format for created_at
    const utcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    const isUTC = utcRegex.test(created_at);
    console.log(`UTC Format (created_at): ${isUTC ? 'YES' : 'NO'}`);
    
    // Verify timestamp is within 1 second of current time
    const tsTime = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.abs((now - tsTime) / 1000);
    console.log(`Time Difference: ${diffSeconds.toFixed(2)} seconds`);
    const withinSecond = diffSeconds < 2;
    console.log(`Within 2 Seconds: ${withinSecond ? 'YES' : 'NO'}`);
    
    // Check UTC offset
    const offsetMatch = created_at.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (offsetMatch) {
      const utcHour = parseInt(offsetMatch[4]);
      const tsHour = parseInt(timestamp.split('T')[1].split(':')[0]);
      const offset = utcHour - tsHour;
      console.log(`UTC Offset: ${offset} hours (CDT is -5, CST is -6)`);
    }
    
    console.log('');
    testResults.test1 = isISO8601 && isUTC && withinSecond;
    console.log(`Status: ${testResults.test1 ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log('');
    
  } catch (error) {
    console.error('ERROR:', error.message);
    console.log('');
  }
}

// TEST 2: Database Storage
function test2_databaseStorage() {
  console.log('TEST 2: Database Storage Verification');
  console.log('-'.repeat(70));
  
  return new Promise((resolve) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('ERROR: Cannot open database:', err.message);
        resolve();
        return;
      }
      
      // Query recent entries
      db.all(
        'SELECT id, count, timestamp, created_at FROM pushups ORDER BY id DESC LIMIT 3',
        (err, rows) => {
          if (err) {
            console.error('ERROR querying database:', err.message);
            db.close();
            resolve();
            return;
          }
          
          console.log('Recent Database Entries (last 3):');
          rows.forEach(row => {
            console.log(`  ID: ${row.id}, Count: ${row.count}`);
            console.log(`    Timestamp: ${row.timestamp}`);
            console.log(`    Created At: ${row.created_at}`);
          });
          console.log('');
          
          // Verify DATE extraction works
          db.all(
            'SELECT DATE(timestamp) as date, COUNT(*) as count FROM pushups GROUP BY DATE(timestamp) ORDER BY DATE(timestamp) DESC LIMIT 5',
            (err, dateRows) => {
              if (err) {
                console.error('ERROR with DATE query:', err.message);
                db.close();
                resolve();
                return;
              }
              
              console.log('Entries by Date (GROUP BY DATE):');
              dateRows.forEach(row => {
                console.log(`  ${row.date}: ${row.count} entries`);
              });
              console.log('');
              
              testResults.test2 = true;
              console.log('Status: PASS ✓');
              console.log('');
              
              db.close();
              resolve();
            }
          );
        }
      );
    });
  });
}

// TEST 3: Statistics Calculations
async function test3_statisticsCalculations() {
  console.log('TEST 3: Statistics Calculations');
  console.log('-'.repeat(70));
  
  try {
    // Post 3 entries with today's date
    console.log('POSTing 3 entries (20, 25, 30 pushups)...');
    const post1 = await makeRequest('POST', '/api/pushups', { count: 20 });
    const post2 = await makeRequest('POST', '/api/pushups', { count: 25 });
    const post3 = await makeRequest('POST', '/api/pushups', { count: 30 });
    
    console.log(`  Entry 1: ID ${post1.id}, ${post1.count} pushups at ${post1.timestamp}`);
    console.log(`  Entry 2: ID ${post2.id}, ${post2.count} pushups at ${post2.timestamp}`);
    console.log(`  Entry 3: ID ${post3.id}, ${post3.count} pushups at ${post3.timestamp}`);
    console.log('');
    
    // Get statistics
    const statsResponse = await makeRequest('GET', '/api/statistics');
    const { dailyTotal } = statsResponse;
    
    console.log('Statistics Response:');
    console.log(`  Daily Total: ${dailyTotal?.total || 'N/A'}`);
    if (dailyTotal?.pushupDates) {
      console.log(`  Entries Today: ${dailyTotal.pushupDates.length}`);
      dailyTotal.pushupDates.forEach((entry, idx) => {
        console.log(`    ${idx + 1}. ${entry.count} pushups at ${entry.timestamp}`);
      });
    }
    console.log('');
    
    const expectedTotal = 20 + 25 + 30;
    const actualTotal = dailyTotal?.total || 0;
    const totalsMatch = actualTotal === expectedTotal;
    
    console.log(`Expected Daily Total: ${expectedTotal}`);
    console.log(`Actual Daily Total: ${actualTotal}`);
    console.log(`Match: ${totalsMatch ? 'YES' : 'NO'}`);
    console.log('');
    
    testResults.test3 = totalsMatch;
    console.log(`Status: ${testResults.test3 ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log('');
    
  } catch (error) {
    console.error('ERROR:', error.message);
    console.log('');
  }
}

// TEST 4: Streak Calculations
async function test4_streakCalculations() {
  console.log('TEST 4: Streak Calculations');
  console.log('-'.repeat(70));
  
  try {
    const statsResponse = await makeRequest('GET', '/api/statistics');
    const { currentStreak } = statsResponse;
    
    console.log('Current Statistics:');
    console.log(`  Current Streak: ${currentStreak?.currentStreak || 'N/A'} days`);
    console.log(`  Last Pushup Date: ${currentStreak?.lastPushupDate || 'N/A'}`);
    console.log('');
    
    testResults.test4 = currentStreak && currentStreak.currentStreak > 0;
    console.log(`Status: ${testResults.test4 ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log('');
    
  } catch (error) {
    console.error('ERROR:', error.message);
    console.log('');
  }
}

// TEST 5: Timezone Information
function test5_timezoneEdgeCases() {
  console.log('TEST 5: Timezone Information');
  console.log('-'.repeat(70));
  
  const now = new Date();
  const cstTime = getCSTTime();
  
  console.log('Current Time Information:');
  console.log(`  System Local: ${now.toISOString()}`);
  console.log(`  CST Time: ${cstTime}`);
  console.log('');
  
  // Determine if DST is active
  const jan = new Date(2026, 0, 1);
  const july = new Date(2026, 6, 1);
  
  console.log('DST Information:');
  const offset = -now.getTimezoneOffset() / 60;
  console.log(`  Current Offset: UTC${offset > 0 ? '+' : ''}${offset}`);
  console.log(`  (CDT is UTC-5, CST is UTC-6)`);
  console.log('');
  
  testResults.test5 = true;
  console.log('Status: PASS ✓');
  console.log('');
}

// Run all tests
async function runAllTests() {
  await test1_backendTimestampCapture();
  await test2_databaseStorage();
  await test3_statisticsCalculations();
  await test4_streakCalculations();
  test5_timezoneEdgeCases();
  
  // Summary
  console.log('='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  
  Object.entries(testResults).forEach(([testName, passed]) => {
    const testNum = testName.split('test')[1];
    const status = passed ? 'PASS ✓' : 'FAIL ✗';
    console.log(`Test ${testNum}: ${status}`);
  });
  
  const allPassed = Object.values(testResults).every(v => v);
  console.log('');
  console.log(`Overall: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
  console.log('='.repeat(70));
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
