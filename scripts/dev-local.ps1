$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$databasePort = 27018
$databaseHost = "127.0.0.1:$databasePort"
$databaseUri = "mongodb://$databaseHost/admin"
$databaseRoot = Join-Path $env:LOCALAPPDATA 'Veloop\MongoDB'
$databasePath = Join-Path $databaseRoot 'data'
$databaseLog = Join-Path $databaseRoot 'mongod.log'
$environmentFile = Join-Path $projectRoot 'backend\.env'

function Find-Executable($name, $fallbackPaths) {
  $command = Get-Command $name -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  foreach ($path in $fallbackPaths) {
    if (Test-Path $path) { return $path }
  }
  return $null
}

function Test-TcpPort($port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $client.Connect('127.0.0.1', $port)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

$mongod = Find-Executable 'mongod.exe' @(
  'C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe',
  'C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe',
  'C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe'
)
$mongosh = Find-Executable 'mongosh.exe' @(
  (Join-Path $env:LOCALAPPDATA 'Programs\mongosh\mongosh.exe'),
  'C:\Program Files\MongoDB\mongosh\bin\mongosh.exe'
)

if (-not $mongod) {
  throw 'MongoDB Server was not found. Install MongoDB Server or add mongod.exe to PATH.'
}
if (-not $mongosh) {
  throw 'MongoDB Shell (mongosh) was not found. Install mongosh or add mongosh.exe to PATH.'
}

New-Item -ItemType Directory -Force -Path $databasePath | Out-Null

if (-not (Test-TcpPort $databasePort)) {
  $arguments = @(
    '--replSet', 'rs0',
    '--port', "$databasePort",
    '--dbpath', "`"$databasePath`"",
    '--bind_ip', '127.0.0.1',
    '--logpath', "`"$databaseLog`"",
    '--logappend'
  ) -join ' '
  Start-Process -FilePath $mongod -ArgumentList $arguments -WindowStyle Hidden | Out-Null

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    if (Test-TcpPort $databasePort) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) {
    throw "MongoDB did not start. Check its local log at $databaseLog."
  }
}

$helloOutput = & $mongosh $databaseUri --quiet --eval 'JSON.stringify(db.adminCommand({hello:1}))'
if ($LASTEXITCODE -ne 0) { throw 'Could not query the local MongoDB instance.' }
$hello = ($helloOutput -join "`n") | ConvertFrom-Json
if ($hello.setName -and $hello.setName -ne 'rs0') {
  throw "Port $databasePort is used by a different MongoDB replica set ($($hello.setName))."
}
if (-not $hello.setName) {
  if (-not $hello.isreplicaset) {
    throw "Port $databasePort is occupied by a standalone MongoDB server; refusing to reconfigure it."
  }
  & $mongosh $databaseUri --quiet --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '$databaseHost' }] })" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not initialize the local MongoDB replica set.' }
}

$primary = $false
for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
  $primaryOutput = & $mongosh $databaseUri --quiet --eval 'db.adminCommand({hello:1}).isWritablePrimary'
  if ($LASTEXITCODE -eq 0 -and ($primaryOutput -join '').Trim() -eq 'true') {
    $primary = $true
    break
  }
  Start-Sleep -Seconds 1
}
if (-not $primary) { throw 'The local MongoDB replica set did not elect a primary.' }

if (-not (Test-Path $environmentFile)) {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $jwtBytes = New-Object byte[] 32
  $deviceBytes = New-Object byte[] 32
  $claimBytes = New-Object byte[] 32
  $rng.GetBytes($jwtBytes)
  $rng.GetBytes($deviceBytes)
  $rng.GetBytes($claimBytes)
  $jwtSecret = [BitConverter]::ToString($jwtBytes).Replace('-', '')
  $deviceSecret = [BitConverter]::ToString($deviceBytes).Replace('-', '')
  $claimKey = [BitConverter]::ToString($claimBytes).Replace('-', '')
  @(
    'NODE_ENV=development'
    'DEMO_MODE=true'
    'PORT=4000'
    "MONGO_URI=mongodb://127.0.0.1:$databasePort/veloop_rewards?replicaSet=rs0&directConnection=true"
    'CLIENT_URL=http://localhost:5173'
    "JWT_SECRET=$jwtSecret"
    "CLAIM_ENCRYPTION_KEY=$claimKey"
    "DEVICE_HASH_SECRET=$deviceSecret"
    'ADMIN_EMAIL='
    'ADMIN_PASSWORD='
  ) | Set-Content -Path $environmentFile -Encoding Ascii
  Write-Host 'Created backend/.env with local development secrets.'
}

$mongoSetting = Select-String -Path $environmentFile -Pattern '^MONGO_URI=(.*)$' | Select-Object -First 1
if (-not $mongoSetting -or $mongoSetting.Matches[0].Groups[1].Value -notmatch '^mongodb://127\.0\.0\.1:27018/veloop_rewards\?replicaSet=rs0(&directConnection=true)?$') {
  throw 'backend/.env must point MONGO_URI to the local replica set on 127.0.0.1:27018 to use this launcher. For a custom database, run npm run dev:app instead.'
}

$countOutput = & $mongosh "mongodb://127.0.0.1:$databasePort/veloop_rewards?replicaSet=rs0&directConnection=true" --quiet --eval 'db.giveaways.countDocuments({})'
if ($LASTEXITCODE -ne 0) { throw 'Could not check the local giveaway seed data.' }
$giveawayCount = [int](($countOutput -join '').Trim())
if ($giveawayCount -eq 0) {
  Push-Location $projectRoot
  try {
    npm run seed --workspace backend
    if ($LASTEXITCODE -ne 0) { throw 'Could not seed the local development giveaways.' }
  } finally {
    Pop-Location
  }
}

Write-Host "Local MongoDB replica set ready at 127.0.0.1:$databasePort."
Write-Host 'Starting VELOOP API and frontend. Demo balances and giveaway entries are test data.'
Push-Location $projectRoot
try {
  npm run dev:app
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
