[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$TargetPath,

    [switch]$Mirror,

    [switch]$ListOnly
)

$scriptDir = Split-Path -Parent $PSCommandPath
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path

if (-not (Get-Command robocopy -ErrorAction SilentlyContinue)) {
    throw "robocopy is required but was not found on this machine."
}

if (-not (Test-Path $TargetPath)) {
    New-Item -ItemType Directory -Force -Path $TargetPath | Out-Null
}

$robocopyArgs = @(
    $repoRoot,
    $TargetPath,
    "*",
    "/E",
    "/R:2",
    "/W:2",
    "/XJ",
    "/XD", ".git", "node_modules", "data", "coverage", "test-data", "test-results", "dist", "deploy", "tests", "e2e",
    "/XF", "*.db", "*.db-shm", "*.db-wal", "*.test.js", "test-*.js", "test_*.js", "test_*.ps1", "verify_*.js", "query_db.js"
)

if ($Mirror) {
    $robocopyArgs += "/MIR"
}

if ($ListOnly) {
    $robocopyArgs += "/L"
}

Write-Host "Syncing project files to $TargetPath" -ForegroundColor Cyan
& robocopy @robocopyArgs
$exitCode = $LASTEXITCODE

if ($exitCode -ge 8) {
    throw "robocopy failed with exit code $exitCode"
}

$dataPath = Join-Path $TargetPath "backend\data"
if (-not $ListOnly) {
    if (-not (Test-Path $dataPath)) {
        New-Item -ItemType Directory -Force -Path $dataPath | Out-Null
    }
    Write-Host "Ensured runtime data folder exists at $dataPath" -ForegroundColor DarkGray
}

Write-Host "Sync complete (robocopy exit code: $exitCode)." -ForegroundColor Green
Write-Host "Excluded: .git, node_modules, data, coverage, dist, test files, SQLite files." -ForegroundColor DarkGray
