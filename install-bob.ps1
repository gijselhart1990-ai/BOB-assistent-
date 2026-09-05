# ============================================================
#  BOB - installatie op Windows
#  Rechtermuisknop op dit bestand -> "Uitvoeren met PowerShell"
#  of in een PowerShell-venster:   .\install-bob.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# ------------------------------------------------------------
#  Cartesia - de stem van BOB.
#  Bewust geen sleutel in dit bestand: een gedeeld script is geen
#  plek voor een geheim, en een hardgecodeerde sleutel die je later
#  rouleert zet stilletjes een dode waarde in een verse .env.
#  Je voice-ID is geen geheim, die mag hier wel als standaard staan.
# ------------------------------------------------------------
$defaultCartesiaVoice = "4b250449-c635-4b63-bd1d-b654b12ffcd4"

function Say($msg, $color = "White") { Write-Host "  $msg" -ForegroundColor $color }

Write-Host ""
Write-Host "  BOB" -ForegroundColor Green -NoNewline
Write-Host " - installatie"
Write-Host "  ------------------------------------------"
Write-Host ""

# --- 1. Node ---------------------------------------------------
try {
    $nodeVersion = (node --version) -replace "v", ""
    $major = [int]($nodeVersion -split "\.")[0]
    if ($major -lt 20) {
        Say "Node $nodeVersion gevonden, maar BOB heeft versie 20 of hoger nodig." "Red"
        Say "Download: https://nodejs.org  (kies de LTS-versie)" "Yellow"
        exit 1
    }
    Say "Node $nodeVersion" "Green"
} catch {
    Say "Node.js is niet gevonden." "Red"
    Say "Installeer het van https://nodejs.org (LTS), open daarna een NIEUW" "Yellow"
    Say "PowerShell-venster en draai dit script opnieuw." "Yellow"
    exit 1
}

# --- 2. Pakketten ----------------------------------------------
Say "Pakketten installeren..." "Cyan"
npm install --no-audit --no-fund --omit=optional
if ($LASTEXITCODE -ne 0) { Say "npm install is mislukt." "Red"; exit 1 }
Say "Pakketten geinstalleerd" "Green"

# --- 3. .env ---------------------------------------------------
$freshEnv = $false
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    $freshEnv = $true
    Say ".env aangemaakt vanuit .env.example" "Green"
} else {
    Say ".env bestond al - niet overschreven" "Green"
}

# --- 4. Cartesia-sleutels invullen -----------------------------
$env_content = Get-Content ".env" -Raw
if ($env_content -match "(?m)^CARTESIA_API_KEY=\s*$") {
    Write-Host ""
    Say "Cartesia (de stem van BOB)" "Cyan"
    Say "Haal je key op via play.cartesia.ai -> API Keys. Enter = later invullen." "DarkGray"
    $key = Read-Host "  Cartesia API key"

    if ($key) {
        $voice = Read-Host "  Cartesia voice ID (Enter = jouw eigen stem)"
        if (-not $voice) { $voice = $defaultCartesiaVoice }

        # Losse regels vervangen zonder -replace: in een vervangtekst heeft $
        # een speciale betekenis, wat stilzwijgend tekens uit je sleutel sloopt.
        $lines = Get-Content ".env"
        $lines = $lines | ForEach-Object {
            if ($_ -like "CARTESIA_API_KEY=*")  { "CARTESIA_API_KEY=$key" }
            elseif ($_ -like "CARTESIA_VOICE_ID=*") { "CARTESIA_VOICE_ID=$voice" }
            else { $_ }
        }
        Set-Content ".env" $lines
        $env_content = Get-Content ".env" -Raw
        Say "Stem ingesteld" "Green"
    } else {
        Say "Overgeslagen - vul later in met: .\bob set-secret CARTESIA_API_KEY" "DarkGray"
    }
}

# --- 4b. Demomodus, alleen bij een echt lege installatie -------
# Belangrijk: NOOIT aanzetten als er al een connector gekoppeld is. Anders
# zet een tweede run van dit script een werkende BOB terug op voorbeelddata
# en lijkt het alsof je koppelingen kwijt zijn.
$hasConnector = $env_content -match "(?m)^(TODOIST_API_TOKEN|GOOGLE_CLIENT_ID|MICROSOFT_CLIENT_ID|ANTHROPIC_API_KEY)=.+$"

if ($freshEnv -and -not $hasConnector) {
    $env_content = $env_content -replace "(?m)^BOB_DEMO=0", "BOB_DEMO=1"
    Set-Content ".env" $env_content -NoNewline
    Say "Demomodus aan voor de eerste start (zet BOB_DEMO=0 zodra je iets koppelt)" "Green"
} elseif ($env_content -match "(?m)^BOB_DEMO=1") {
    Write-Host ""
    Say "Let op: BOB_DEMO=1 staat aan, dus je ziet voorbeelddata" "Yellow"
    Say "in plaats van je eigen agenda en taken." "Yellow"
    $off = Read-Host "  Demomodus nu uitzetten? (j/n)"
    if ($off -eq "j" -or $off -eq "J" -or $off -eq "y") {
        $env_content = $env_content -replace "(?m)^BOB_DEMO=1", "BOB_DEMO=0"
        Set-Content ".env" $env_content -NoNewline
        Say "Demomodus uit - je ziet nu je echte data" "Green"
    }
}

# --- 5. MCP koppelen -------------------------------------------
Write-Host ""
$mcp = Read-Host "  BOB koppelen aan Claude Desktop en Claude Code? (j/n)"
if ($mcp -eq "j" -or $mcp -eq "J" -or $mcp -eq "y") {
    node scripts/install-mcp.js --write
}

# --- 6. Zelftest -----------------------------------------------
Write-Host ""
Say "Zelftest..." "Cyan"
node scripts/doctor.js

# --- 7. Snelkoppeling ------------------------------------------
# Altijd verversen: een snelkoppeling met een oud pad erin doet niets meer
# zodra je de map verplaatst of een nieuwe versie elders uitpakt.
node scripts/make-shortcut.js

Write-Host ""
Say "Klaar. Start BOB met:  .\bob" "Green"
Say "of dubbelklik op de BOB-snelkoppeling op je bureaublad." "Green"
Write-Host ""
