# Pushup Tracker Deployment Script for Synology NAS
# Copies changed files to Z:\pushup-tracker

$sourceRoot = "C:\Users\rdpuser\Source\pushups"
$destRoot = "Z:\pushup-tracker"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "🚀 Pushup Tracker Deployment to Synology NAS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Source: $sourceRoot" -ForegroundColor Gray
Write-Host "Dest:   $destRoot" -ForegroundColor Gray
Write-Host "Time:   $timestamp" -ForegroundColor Gray
Write-Host ""

# Check if Z: drive is accessible
if (!(Test-Path $destRoot)) {
  Write-Host "❌ Error: $destRoot not found!" -ForegroundColor Red
  Write-Host "Make sure Synology NAS is mounted as Z: drive" -ForegroundColor Yellow
  exit 1
}

# Files to copy (frontend)
$frontendFiles = @(
  "frontend/src/components/QuickAddForm.vue",
  "frontend/src/components/SessionLinkBox.vue",
  "frontend/src/components/SessionStats.vue",
  "frontend/src/App.vue",
  "frontend/src/pages/Dashboard.vue",
  "frontend/src/pages/Session.vue",
  "frontend/src/components/PushupForm.vue",
  "frontend/src/components/StatsDashboard.vue"
)

# Files to copy (backend)
$backendFiles = @(
  "backend/src/db/migrations/002-add-session-tracking.js",
  "backend/src/db/init.js",
  "backend/src/db/model.js",
  "backend/src/controllers/pushupController.js",
  "backend/tests/setup.js"
)

$allFiles = $frontendFiles + $backendFiles
$successCount = 0
$failCount = 0

Write-Host "📋 Copying files..." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $allFiles) {
  $srcPath = Join-Path $sourceRoot $file
  $dstPath = Join-Path $destRoot $file
  $dstDir = Split-Path $dstPath
  
  # Check if source exists
  if (!(Test-Path $srcPath)) {
    Write-Host "⚠️  SKIP: $file (not found)" -ForegroundColor Yellow
    $failCount++
    continue
  }
  
  # Create destination directory if needed
  if (!(Test-Path $dstDir)) {
    New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
  }
  
  # Copy file
  try {
    Copy-Item -Path $srcPath -Destination $dstPath -Force
    Write-Host "✅ $file" -ForegroundColor Green
    $successCount++
  } catch {
    Write-Host "❌ $file - Error: $_" -ForegroundColor Red
    $failCount++
  }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Copied: $successCount files" -ForegroundColor Green
if ($failCount -gt 0) {
  Write-Host "❌ Failed: $failCount files" -ForegroundColor Red
}
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open Container Manager on Synology NAS" -ForegroundColor White
Write-Host "2. Go to Project → pushup-tracker" -ForegroundColor White
Write-Host "3. Click Action → Build (rebuilds frontend + backend)" -ForegroundColor White
Write-Host "4. Click Action → Start" -ForegroundColor White
Write-Host "5. Verify at http://<nas-ip>:8080" -ForegroundColor White
Write-Host ""
Write-Host "💡 If UI shows old version:" -ForegroundColor Cyan
Write-Host "   - Delete pushup-tracker-frontend image" -ForegroundColor Gray
Write-Host "   - Rebuild and start again" -ForegroundColor Gray
Write-Host "   - Hard refresh browser (Ctrl+F5)" -ForegroundColor Gray
Write-Host ""
