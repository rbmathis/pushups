# Copy changed application files to a stopped Synology project after backing up its database.
$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$destRoot = if ($env:PUSHUP_NAS_ROOT) { $env:PUSHUP_NAS_ROOT } else { 'Z:\pushup-tracker' }
$dataRoot = Join-Path $destRoot 'data'
$backupRoot = Join-Path $destRoot 'backups'
$database = Join-Path $dataRoot 'pushups.db'
$verifier = Join-Path $sourceRoot 'backend\verify-deployment-backup.js'

function Get-Sha256($filePath) {
  $stream = [System.IO.File]::OpenRead($filePath)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '')
  } finally {
    $sha.Dispose()
    $stream.Dispose()
  }
}

function Get-InputHash($inputFiles) {
  $lines = foreach ($file in ($inputFiles | Sort-Object -CaseSensitive)) {
    "$file $(Get-Sha256 (Join-Path $sourceRoot $file))"
  }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($lines -join "`n"))
    return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Test-ReleaseFiles($releaseDir, $inputFiles) {
  if (-not (Test-Path -LiteralPath $releaseDir -PathType Container)) { return $false }
  $expected = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($file in $inputFiles) {
    [void]$expected.Add($file.Replace('/', '\'))
    $staged = Join-Path $releaseDir $file
    if (-not (Test-Path -LiteralPath $staged -PathType Leaf) -or
        (Get-Sha256 $staged) -ne (Get-Sha256 (Join-Path $sourceRoot $file))) {
      return $false
    }
  }
  foreach ($service in @('backend', 'frontend')) {
    $tree = Join-Path $releaseDir $service
    foreach ($item in Get-ChildItem -LiteralPath $tree -File -Recurse -Force) {
      $relative = $item.FullName.Substring($releaseDir.TrimEnd('\').Length + 1)
      if (-not $expected.Contains($relative)) { return $false }
    }
  }
  return $true
}

function Write-DeploymentState($state, $statePath) {
  $tempPath = "$statePath.$([guid]::NewGuid().ToString('N')).tmp"
  try {
    $state | ConvertTo-Json | Set-Content -LiteralPath $tempPath -Encoding UTF8
    Move-Item -LiteralPath $tempPath -Destination $statePath -Force
  } finally {
    if (Test-Path -LiteralPath $tempPath) { Remove-Item -LiteralPath $tempPath -Force }
  }
}

function Read-ContinueChoice($prompt) {
  while ($true) {
    $choice = Read-Host "$prompt [C] Continue / [Q] Quit"
    if ([string]::IsNullOrWhiteSpace($choice)) {
      Write-Host 'No choice entered; quitting.'
      return $false
    }
    switch ($choice.Trim().ToUpperInvariant()) {
      'C' { return $true }
      'Q' { return $false }
      default { Write-Host 'Please enter C or Q.' }
    }
  }
}

try {
  if (-not (Test-Path -LiteralPath $destRoot -PathType Container)) {
    throw "Project folder not found: $destRoot"
  }
  $destRoot = (Resolve-Path -LiteralPath $destRoot).Path.TrimEnd('\')
  $dataRoot = Join-Path $destRoot 'data'
  $backupRoot = Join-Path $destRoot 'backups'
  $database = Join-Path $dataRoot 'pushups.db'
  if (-not (Test-Path -LiteralPath (Join-Path $destRoot 'docker-compose.yml') -PathType Leaf)) {
    throw "Compose file not found in project folder: $destRoot"
  }
  if (-not (Test-Path -LiteralPath $database -PathType Leaf)) {
    throw "Database not found: $database. Refusing to deploy."
  }

  $pathspecs = @(
    'backend\src', 'frontend\src', 'frontend\public',
    'backend\Dockerfile', 'backend\package.json', 'backend\package-lock.json', 'backend\.dockerignore',
    'frontend\Dockerfile', 'frontend\index.html', 'frontend\nginx.conf',
    'frontend\package.json', 'frontend\package-lock.json', 'frontend\.dockerignore',
    'frontend\postcss.config.js', 'frontend\tailwind.config.js', 'frontend\vite.config.js',
    'docker-compose.yml'
  )
  $rawFiles = git -C $sourceRoot ls-files -z -- @pathspecs
  if ($LASTEXITCODE -ne 0) { throw 'Could not list tracked deployment files.' }
  $files = @($rawFiles -split "`0" | Where-Object { $_ })
  if ($files.Count -eq 0) { throw 'No tracked deployment files found.' }
  $rawUntracked = git -C $sourceRoot ls-files --others --exclude-standard -z -- @pathspecs
  if ($LASTEXITCODE -ne 0) { throw 'Could not check for untracked application files.' }
  $untracked = @($rawUntracked -split "`0" | Where-Object { $_ })
  if ($untracked.Count -gt 0) {
    throw "Untracked application files must be added to Git before deployment: $($untracked -join ', ')"
  }

  foreach ($file in $files) {
    $src = Join-Path $sourceRoot $file
    if (-not (Test-Path -LiteralPath $src -PathType Leaf)) {
      throw "Tracked deployment file is missing locally: $file"
    }
  }

  $backendFiles = @($files | Where-Object { $_ -like 'backend/*' })
  $frontendFiles = @($files | Where-Object { $_ -like 'frontend/*' })
  if ($backendFiles.Count -eq 0 -or $frontendFiles.Count -eq 0) {
    throw 'Missing tracked backend or frontend build inputs.'
  }
  $backendHash = Get-InputHash $backendFiles
  $frontendHash = Get-InputHash $frontendFiles
  $composeSource = Join-Path $sourceRoot 'docker-compose.yml'
  $composeHash = Get-Sha256 $composeSource
  $releasesRoot = Join-Path $destRoot 'deployment-releases'
  $statePath = Join-Path $releasesRoot 'state.json'
  $state = $null
  if (Test-Path -LiteralPath $statePath -PathType Leaf) {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    if ($state.releaseId -notmatch '^\d{8}-\d{6}-[a-f0-9]{32}$') {
      throw "Invalid deployment state: $statePath"
    }
  }

  if ($state -and $state.status -eq 'confirmed' -and
      $state.backendHash -eq $backendHash -and $state.frontendHash -eq $frontendHash -and
      $state.composeSourceHash -eq $composeHash -and
      $state.composeDeployedHash -eq (Get-Sha256 (Join-Path $destRoot 'docker-compose.yml'))) {
    $previousRelease = Join-Path $releasesRoot $state.releaseId
    if (Test-ReleaseFiles $previousRelease @($backendFiles + $frontendFiles)) {
      Write-Host 'Inputs match the last operator-confirmed release. No files copied or backup taken.'
      Write-Host 'The script cannot inspect running containers. Check their image tags in Container Manager if unsure.'
      exit 0
    }
    Write-Warning 'The staged release no longer matches its inputs; a fresh release is required.'
  }

  if ($state -and $state.status -ne 'confirmed') {
    Write-Warning 'The previous deployment was not confirmed. Staging files alone does not mean images were built or started.'
  }
  $backendTag = "pushup-tracker-backend:sha256-$backendHash"
  $frontendTag = "pushup-tracker-frontend:sha256-$frontendHash"
  Write-Host "Backend image: $backendTag"
  Write-Host "Frontend image: $frontendTag"
  Write-Host "Tracked build inputs to stage: $($backendFiles.Count + $frontendFiles.Count)"
  Write-Host 'Existing NAS source folders and old images will not be deleted.'
  Write-Host ''
  Write-Host 'Before continuing:'
  Write-Host "  1. In Container Manager, verify the running backend data mount matches $dataRoot on the NAS."
  Write-Host '     For the default mapping, the NAS path is /volume1/docker/pushup-tracker/data.'
  Write-Host '     If it points elsewhere, quit and locate the actual database.'
  Write-Host '  2. Note the current history and total in the app.'
  Write-Host '  3. Stop the pushup-tracker project in Container Manager.'
  Write-Host '  4. Ensure no other process is using the database and keep the project stopped during backup and staging.'
  Write-Host '  5. The NAS docker-compose.yml will be replaced with this repository version, with release paths and image tags.'
  Write-Host '     Preserve any custom settings separately; review the new compose file before applying it.'
  if (-not (Read-ContinueChoice 'Confirm all database users are stopped')) {
    Write-Host 'Deployment cancelled. No database or application files were copied.'
    exit 2
  }

  $names = @('pushups.db', 'pushups.db-wal', 'pushups.db-shm', 'pushups.db-journal')
  $present = @($names | Where-Object { Test-Path -LiteralPath (Join-Path $dataRoot $_) -PathType Leaf })
  if ('pushups.db' -notin $present -or (Get-Item -LiteralPath $database).Length -eq 0) {
    throw 'The source database is missing or empty.'
  }

  New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
  $backupName = 'pre-deploy-{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), [guid]::NewGuid().ToString('N')
  $backupDir = Join-Path $backupRoot $backupName
  New-Item -ItemType Directory -Path $backupDir | Out-Null
  Write-Host "Backing up database files to $backupDir"
  foreach ($name in $present) {
    $src = Join-Path $dataRoot $name
    $dst = Join-Path $backupDir $name
    $before = Get-Sha256 $src
    Copy-Item -LiteralPath $src -Destination $dst
    if ((Get-Sha256 $dst) -ne $before -or (Get-Sha256 $src) -ne $before) {
      throw "Database file changed during backup or copy verification failed: $name"
    }
  }
  $after = @($names | Where-Object { Test-Path -LiteralPath (Join-Path $dataRoot $_) -PathType Leaf })
  if (Compare-Object $present $after) {
    throw 'Database files changed during backup. Ensure all database users are stopped.'
  }
  foreach ($name in $present) {
    if ((Get-Sha256 (Join-Path $dataRoot $name)) -ne
        (Get-Sha256 (Join-Path $backupDir $name))) {
      throw "Database file changed during backup: $name"
    }
  }

  & node $verifier $backupDir
  if ($LASTEXITCODE -ne 0) { throw "Backup verification failed: $backupDir" }

  $releaseId = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), [guid]::NewGuid().ToString('N')
  $releaseDir = Join-Path $releasesRoot $releaseId
  New-Item -ItemType Directory -Path $releaseDir | Out-Null
  foreach ($file in @($backendFiles + $frontendFiles)) {
    $src = Join-Path $sourceRoot $file
    $dst = Join-Path $releaseDir $file
    New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst
  }
  if ((Get-InputHash $backendFiles) -ne $backendHash -or
      (Get-InputHash $frontendFiles) -ne $frontendHash -or
      (Get-Sha256 $composeSource) -ne $composeHash -or
      -not (Test-ReleaseFiles $releaseDir @($backendFiles + $frontendFiles))) {
    throw 'Build inputs changed during staging or failed verification. The live compose file was not changed.'
  }

  $compose = Get-Content -LiteralPath $composeSource -Raw
  foreach ($service in @('backend', 'frontend')) {
    $pattern = "(?m)^([ \t]*)context: \./$service[ \t]*\r?$"
    if ([regex]::Matches($compose, $pattern).Count -ne 1) {
      throw "Expected exactly one $service build context in docker-compose.yml."
    }
    $context = "./deployment-releases/$releaseId/$service"
    $compose = [regex]::Replace($compose, $pattern, "`${1}context: $context")
    $servicePattern = "(?m)^  ${service}:[ \t]*\r?$"
    if ([regex]::Matches($compose, $servicePattern).Count -ne 1) {
      throw "Expected exactly one $service service in docker-compose.yml."
    }
    $tag = if ($service -eq 'backend') { $backendTag } else { $frontendTag }
    $compose = [regex]::Replace($compose, $servicePattern, "  ${service}:`n    image: $tag")
  }

  $stagedCompose = Join-Path $releaseDir 'docker-compose.yml'
  [System.IO.File]::WriteAllText($stagedCompose, $compose, [System.Text.UTF8Encoding]::new($false))
  $currentCompose = Join-Path $destRoot 'docker-compose.yml'
  $previousCompose = Join-Path $releaseDir 'previous-compose.yml'
  $previousComposeHash = Get-Sha256 $currentCompose
  Copy-Item -LiteralPath $currentCompose -Destination $previousCompose
  if ((Get-Sha256 $previousCompose) -ne $previousComposeHash -or
      (Get-Sha256 $currentCompose) -ne $previousComposeHash) {
    throw 'The existing compose file changed or its backup failed verification.'
  }
  $state = [pscustomobject]@{
    status = 'pending'
    releaseId = $releaseId
    backendHash = $backendHash
    frontendHash = $frontendHash
    composeSourceHash = $composeHash
    composeDeployedHash = Get-Sha256 $stagedCompose
  }
  Write-DeploymentState $state $statePath
  Copy-Item -LiteralPath $stagedCompose -Destination $currentCompose -Force
  if ((Get-Sha256 $currentCompose) -ne $state.composeDeployedHash) {
    throw 'Copied compose file failed verification.'
  }
  Write-Host "Backup verified: $backupDir"
  Write-Host "Staged release: $releaseDir"
  Write-Host "Previous compose file saved: $previousCompose"
  Write-Host ''
  Write-Host 'Release staged, not yet deployed. Finish manually:'
  Write-Host '  1. In Container Manager, update the project using the NAS docker-compose.yml and review the settings.'
  Write-Host "  2. Confirm its backend data mount still matches $dataRoot on the NAS."
  Write-Host '  3. Build with cache enabled, then recreate and start the project. Do not clean images, data, backups, or volumes.'
  Write-Host "  4. Verify the running backend uses the built image $backendTag"
  Write-Host "     and the running frontend uses the built image $frontendTag"
  Write-Host '     Compare running container image IDs with the newly built image IDs in Container Manager.'
  Write-Host '  5. Check http://<nas-ip>:3001/api/health and the backend logs.'
  Write-Host '  6. Compare the dashboard history and total with the values noted before deployment.'
  Write-Host '     If they differ, stop and investigate before logging more data.'
  if (-not (Read-ContinueChoice 'Confirm the image tags, startup, and history checks are complete')) {
    Write-Host 'Release remains pending; the manual deployment and checks were not confirmed.'
    exit 2
  }
  if ((Get-Sha256 $currentCompose) -ne $state.composeDeployedHash -or
      (Get-InputHash $backendFiles) -ne $backendHash -or
      (Get-InputHash $frontendFiles) -ne $frontendHash -or
      -not (Test-ReleaseFiles $releaseDir @($backendFiles + $frontendFiles))) {
    throw 'The compose file or staged inputs changed before confirmation. Release remains pending.'
  }
  $state.status = 'confirmed'
  Write-DeploymentState $state $statePath
  Write-Host 'Manual deployment and checks confirmed by the operator.'
} catch {
  Write-Error "Deployment stopped: $($_.Exception.Message)" -ErrorAction Continue
  exit 1
}
