@echo off
cd /d "%~dp0"
title Auto Queue Installer
echo ==========================================
echo      Riot Client Automation Installer
echo ==========================================
echo.
echo The following packages will be installed:
echo.
type requirements.txt
echo.
echo ==========================================
set /p choice="Do you want to proceed with the installation? (Y/N): "
if /i "%choice%" neq "Y" goto :End

echo.
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Installation complete!
pause
exit

:End
echo.
echo Installation cancelled.
pause
