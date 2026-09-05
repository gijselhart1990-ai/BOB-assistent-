# Start BOB en open het dashboard in je browser.

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path "node_modules")) {
    Write-Host "  Pakketten ontbreken - eerst installeren..." -ForegroundColor Yellow
    npm install --no-audit --no-fund --omit=optional
}

$port = 4321
if (Test-Path ".env") {
    $line = (Get-Content ".env" | Where-Object { $_ -match "^PORT=" } | Select-Object -First 1)
    if ($line) { $port = ($line -split "=")[1].Trim() }
}

Start-Process "http://localhost:$port"
node server/index.js
