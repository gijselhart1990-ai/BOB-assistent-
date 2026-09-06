@echo off
REM ============================================================
REM  BOB-bridge starten op Windows.
REM
REM  Werkt om de PowerShell-uitvoeringspolicy heen: .cmd mag wel,
REM  .ps1 vaak niet op een beheerde laptop.
REM ============================================================

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is niet gevonden. Open een nieuw venster of zet Node in je PATH.
  echo.
  exit /b 1
)

if not exist ".env" (
  echo.
  echo   Er is nog geen .env. Kopieer .env.example naar .env en vul hem in.
  echo.
  exit /b 1
)

if /i "%~1"=="install" goto install
if /i "%~1"=="link-whatsapp" goto linkwa

node agent.mjs
exit /b %errorlevel%

:install
REM playwright-core en whatsapp-web.js sturen een browser aan; ze downloaden er
REM geen. BOB gebruikt de Chrome of Edge die hier al staat, want een download
REM van ~150 MB wordt op beheerde laptops vaak geblokkeerd.
set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
set PUPPETEER_SKIP_DOWNLOAD=1
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
echo   Pakketten installeren...
call npm.cmd install --no-audit --no-fund
exit /b %errorlevel%

:linkwa
node link-whatsapp.mjs
exit /b %errorlevel%
