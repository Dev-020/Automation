@echo off
cd /d "%~dp0"
title Auto-Q Launcher
:Menu
cls
echo ==========================================
echo      Riot Client Automation Launcher
echo ==========================================
echo.
echo 1. Open League of Legends
echo 2. Accept Queue Automation
echo 3. Champion Picker
echo 4. Exit
echo.
echo ==========================================
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto :OpenLeague
if "%choice%"=="2" goto :AcceptQueue
if "%choice%"=="3" goto :AIPicker
if "%choice%"=="4" goto :Exit

echo.
echo Invalid choice. Please try again.
pause
goto :Menu

:OpenLeague
cls
echo Starting Open League Automation...
python src/open_league.py
pause
goto :Menu

:AcceptQueue
cls
echo Starting Accept Queue Automation...
python src/accept_queue.py
pause
goto :Menu

:AIPicker
cls
echo Starting Champion Picker...
python src/champion_picker.py
pause
goto :Menu

:Exit
exit
