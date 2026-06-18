# Pushup Tracker Deployment Script for Synology NAS
# Dynamically finds changed files and copies them to Z:\pushup-tracker

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

# Get changed files from git (unstaged + staged)
Write-Host "📊 Scanning for changed files..." -ForegroundColor Yellow
Push-Location $sourceRoot
$changedFiles = @()
try {
  # Get list of changed files (both staged and unstaged, exclude WAL/lock files)
  $gitDiff = git diff --name-only --diff-filter=ACMR | Where-Object { $_ -notmatch '\.(db-shm|db-wal|db-journal)$' }
  $gitStatus = git status --porcelain | Where-Object { $_ -notmatch '\.(db-shm|db-wal|db-journal)$' } | ForEach-Object { $_.substring(3) }
  
  $changedFiles = @($gitDiff) + @($gitStatus) | Sort-Object -Unique | Where-Object { $_ -and (Test-Path (Join-Path $sourceRoot $_)) }
  
  if ($changedFiles.Count -eq 0) {
    Write-Host "⚠️  No changed files detected!" -ForegroundColor Yellow
    Write-Host "All files are committed. If you made changes, stage them first:" -ForegroundColor Gray
    Write-Host "  git add ." -ForegroundColor Gray
    exit 0
  }
} catch {
  Write-Host "❌ Error reading git status: $_" -ForegroundColor Red
  exit 1
} finally {
  Pop-Location
}

$allFiles = $changedFiles
$successCount = 0
$failCount = 0

Write-Host "📋 Files to copy:" -ForegroundColor Yellow
$allFiles | ForEach-Object { Write-Host "   • $_" -ForegroundColor Gray }
Write-Host ""

foreach ($file in $allFiles) {
  $srcPath = Join-Path $sourceRoot $file
  $dstPath = Join-Path $destRoot $file
  $dstDir = Split-Path $dstPath
  
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
