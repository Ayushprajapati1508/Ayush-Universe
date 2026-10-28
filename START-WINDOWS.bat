@echo off
setlocal
cd /d "%~dp0"
title Ayush Universe

py -3 --version >nul 2>&1
if not errorlevel 1 (
  set "AYUSH_PYTHON=py -3"
  goto launch
)

python -c "import sys; sys.exit(sys.version_info.major != 3)" >nul 2>&1
if not errorlevel 1 (
  set "AYUSH_PYTHON=python"
  goto launch
)

echo Python 3 was not found on this computer.
echo Install Python 3, then run this file again.
echo If Node.js is already installed, you can instead run: node serve.mjs
echo.
pause
exit /b 1

:launch
echo Starting Ayush Universe at http://localhost:8000
echo A separate server window will open. Keep it open while using the site.
echo To stop the server, press Ctrl+C in that window.
echo.
start "Ayush Universe Server" /D "%~dp0" cmd /k "%AYUSH_PYTHON% -m http.server 8000 --bind 127.0.0.1 --directory dist"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8000"
exit /b 0
