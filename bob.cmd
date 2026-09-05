@echo off
REM ============================================================
REM  BOB - startpunt dat om PowerShell heen werkt.
REM
REM  Op beheerde werklaptops staat "running scripts is disabled"
REM  vaak aan. Dat blokkeert .ps1-bestanden en ook npm.ps1, maar
REM  niet .cmd-bestanden en niet node.exe zelf. Vandaar dit bestand.
REM
REM  Gebruik:
REM     bob                              start BOB
REM     bob doctor                       controleer de installatie
REM     bob check-microsoft              test je Microsoft-secret
REM     bob set-secret                   zet een sleutel in .env
REM     bob set-secret MICROSOFT_CLIENT_SECRET
REM     bob install                      installeer de pakketten
REM ============================================================

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is niet gevonden.
  echo   Open een nieuw venster, of zet Node in je PATH.
  echo.
  exit /b 1
)

if "%~1"=="" goto start
if /i "%~1"=="start" goto start
if /i "%~1"=="doctor" goto doctor
if /i "%~1"=="check-microsoft" goto checkms
if /i "%~1"=="set-secret" goto setsecret
if /i "%~1"=="install" goto install
if /i "%~1"=="demo" goto demo
if /i "%~1"=="env" goto env
if /i "%~1"=="shortcut" goto shortcut
if /i "%~1"=="connect-google" goto connectgoogle
if /i "%~1"=="connect-microsoft" goto connectms
if /i "%~1"=="connect-whatsapp" goto connectwa

echo.
echo   Onbekend commando: %~1
echo.
echo   bob                       start BOB
echo   bob env                   welke .env gebruikt deze BOB
echo   bob env scan              zoek andere kopieen op deze computer
echo   bob env import            neem de meest complete .env over
echo   bob doctor                controleer alles
echo   bob connect-google        koppel Google Agenda en Gmail
echo   bob connect-microsoft     koppel Outlook zonder client secret
echo   bob connect-whatsapp      koppel WhatsApp via je eigen Chrome
echo   bob check-microsoft       test je Microsoft client secret
echo   bob set-secret NAAM       zet een sleutel veilig in .env
echo   bob demo off              zet voorbeelddata uit
echo   bob shortcut              zet de snelkoppeling op je bureaublad
echo   bob install               installeer de pakketten
echo.
exit /b 1

:start
if not exist "node_modules" call :install
set "BOBPORT=4321"
if exist ".env" for /f "usebackq tokens=2 delims==" %%p in (`findstr /b /c:"PORT=" ".env"`) do set "BOBPORT=%%p"
start "" "http://localhost:%BOBPORT%"
node server/index.js
exit /b %errorlevel%

:doctor
node scripts/doctor.js
exit /b %errorlevel%

:checkms
node scripts/check-microsoft.js
exit /b %errorlevel%

:setsecret
node scripts/set-secret.js %~2
exit /b %errorlevel%

:demo
node scripts/set-demo.js %~2
exit /b %errorlevel%

:env
node scripts/env-tool.js %~2
exit /b %errorlevel%

:shortcut
node scripts/make-shortcut.js
exit /b %errorlevel%

:connectgoogle
node scripts/connect-google.js
exit /b %errorlevel%

:connectms
node scripts/connect-microsoft.js
exit /b %errorlevel%

:connectwa
node scripts/connect-whatsapp.js %~2
exit /b %errorlevel%

:install
echo   Pakketten installeren...
call npm.cmd install --no-audit --no-fund --omit=optional
exit /b %errorlevel%
