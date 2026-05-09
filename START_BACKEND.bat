@echo off
REM Teletalk Backend Launcher - Simple Version
REM Double-click to start, press Ctrl+C to stop

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ========================================
echo   Teletalk Backend Launcher
echo ========================================
echo.
echo Location: %cd%
echo.

REM Check if node is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is NOT installed!
    echo.
    echo Steps to fix:
    echo   1. Download Node.js from: https://nodejs.org/
    echo   2. Install it (LTS version recommended)
    echo   3. Restart your computer
    echo   4. Try this launcher again
    echo.
    pause
    exit /b 1
)

REM Get Node version
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER% is installed
echo.

REM Check if npm is installed
echo Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] npm is NOT installed!
    echo.
    echo This should have come with Node.js. Try:
    echo   1. Uninstall Node.js completely
    echo   2. Restart computer
    echo   3. Reinstall Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Get npm version
for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
echo [OK] npm %NPM_VER% is installed
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies (this may take a minute)...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies!
        echo.
        echo Try this:
        echo   1. Delete the node_modules folder (if it exists)
        echo   2. Run this launcher again
        echo   3. Or run in Command Prompt: npm install
        echo.
        pause
        exit /b 1
    )
    echo.
)

REM Check if launcher-simple.js exists
if not exist "launcher-simple.js" (
    echo.
    echo [ERROR] launcher-simple.js not found!
    echo.
    echo Make sure you're in the correct directory:
    echo Current: %cd%
    echo.
    pause
    exit /b 1
)

echo Starting backend service...
echo.
echo ----------------------------------------
echo.

cmd /k node launcher-simple.js
