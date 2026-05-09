@echo off
REM Teletalk Smart Fill - Controller Launcher
REM This starts the controller service which manages the backend

echo Starting Teletalk Smart Fill Controller...
echo.
echo The controller will start on http://127.0.0.1:3001
echo The backend will auto-start when you click "Smart Fill" on teletalk.com.bd
echo.
echo Keep this window open while using the tool.
echo.

cd /d "%~dp0"
node controller.js

if errorlevel 1 (
    echo.
    echo ERROR: Could not start controller. Make sure:
    echo   1. Node.js is installed
    echo   2. You have the required packages (npm install)
    echo   3. You're in the correct directory
    echo.
    pause
)
