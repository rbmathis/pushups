# Complete CST Timestamp Verification Tests

Write-Host "PUSHUP TRACKER - CST TIMESTAMP VERIFICATION TESTS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Helper function to extract JSON fields
function Get-JsonField {
    param([string]$json, [string]$field)
    $match = [System.Text.RegularExpressions.Regex]::Match($json, """$field"":""([^""]+)""")
    return $match.Groups[1].Value
}

function Send-PostRequest {
    param([int]$count)
    $uri = "http://localhost:3001/api/pushups"
    $body = @{count = $count} | ConvertTo-Json
    
    $webRequest = [System.Net.HttpWebRequest]::Create($uri)
    $webRequest.Method = "POST"
    $webRequest.ContentType = "application/json"
    $webRequest.ContentLength = $body.Length
    
    $streamWriter = [System.IO.StreamWriter]::new($webRequest.GetRequestStream())
    $streamWriter.Write($body)
    $streamWriter.Flush()
    
    $response = $webRequest.GetResponse()
    $streamReader = [System.IO.StreamReader]::new($response.GetResponseStream())
    $rawJson = $streamReader.ReadToEnd()
    $streamReader.Close()
    return $rawJson
}

# TEST 1: Backend Timestamp Capture
Write-Host "TEST 1: Backend Timestamp Capture" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""

$json1 = Send-PostRequest 30
$timestamp1 = Get-JsonField $json1 "timestamp"
$createdAt1 = Get-JsonField $json1 "created_at"
$idMatch = [System.Text.RegularExpressions.Regex]::Match($json1, '"id":(\d+)')
$id1 = $idMatch.Groups[1].Value

Write-Host "Response:"
Write-Host "  ID: $id1"
Write-Host "  Timestamp: $timestamp1"
Write-Host "  Created At: $createdAt1"
Write-Host ""

# Verify ISO 8601 format
$iso8601Pattern = '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$'
$isISO = $timestamp1 -match $iso8601Pattern
Write-Host "Verification:"
Write-Host "  ISO 8601 Format (timestamp): $isISO"

$utcPattern = '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
$isUTC = $createdAt1 -match $utcPattern
Write-Host "  UTC Format (created_at): $isUTC"

# Check timezone offset
$utcTime = Get-Date -AsUTC
$cstZone = [System.TimeZoneInfo]::FindSystemTimeZoneById("Central Standard Time")
$cstTime = [System.TimeZoneInfo]::ConvertTime($utcTime, $cstZone)
$offset = $cstZone.GetUtcOffset($cstTime).Hours

Write-Host "  Current UTC Offset: $offset hours (CDT is -5, CST is -6)"
Write-Host "  Daylight Saving Time Active: $($cstZone.IsDaylightSavingTime($cstTime))"

Write-Host ""
$test1Pass = $isISO -and $isUTC
Write-Host "Test 1 Status: $(if ($test1Pass) {'PASS'} else {'FAIL'})" -ForegroundColor $(if ($test1Pass) {'Green'} else {'Red'})
Write-Host ""

# TEST 2: Database Storage
Write-Host "TEST 2: Database Storage" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host ""

$dbPath = "C:\Users\rmathis\source\pushups\backend\data\pushups.db"
Write-Host "Database Path: $dbPath"
Write-Host "Database Exists: $(Test-Path $dbPath)"

if (Test-Path $dbPath) {
    # Import SQLite module or use raw commands
    Add-Type -Path "C:\Users\rmathis\source\pushups\backend\node_modules\sqlite3\build\Release\node_sqlite3.node" -ErrorAction SilentlyContinue
    
    # Query database using Node.js sqlite3 (via npm)
    $queryScript = @"
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('$dbPath', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

// Query recent pushups
db.all('SELECT id, count, timestamp, created_at FROM pushups ORDER BY id DESC LIMIT 3', (err, rows) => {
  if (err) {
    console.error('Error querying database:', err.message);
    db.close();
    process.exit(1);
  }
  
  console.log('Recent Entries (last 3):');
  rows.forEach(row => {
    console.log(`  ID: \${row.id}, Count: \${row.count}, Timestamp: \${row.timestamp}, Created: \${row.created_at}`);
  });
  
  // Verify DATE extraction works
  db.all('SELECT DATE(timestamp) as date, COUNT(*) as count FROM pushups GROUP BY DATE(timestamp) ORDER BY DATE(timestamp) DESC LIMIT 3', (err, rows) => {
    if (err) {
      console.error('Error with DATE query:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log('');
    console.log('Entries by Date (GROUP BY DATE):');
    rows.forEach(row => {
      console.log(`  Date: \${row.date}, Count: \${row.count}`);
    });
    
    db.close();
  });
});
"@
    
    Write-Host "Querying database..."
    Write-Host ""
    
    $testFile = "C:\Users\rmathis\source\pushups\backend\query_db.js"
    $queryScript | Set-Content $testFile
    
    cd C:\Users\rmathis\source\pushups\backend
    node $queryScript
}

Write-Host ""
