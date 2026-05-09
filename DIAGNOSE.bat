@echo off
REM Diagnostic script to check system setup

echo.
echo ========================================
echo   Teletalk Setup Diagnostic
echo ========================================
echo.

echo [1] Checking Node.js...
node --version
if errorlevel 1 (
    echo [X] Node.js NOT FOUND
    echo Solution: Download from https://nodejs.org/
) else (
    echo [OK] Node.js is installed
)

echo.
echo [2] Checking npm...
npm --version
if errorlevel 1 (
    echo [X] npm NOT FOUND
    echo Solution: Reinstall Node.js
) else (
    echo [OK] npm is installed
)

echo.
echo [3] Checking project files...
if exist "package.json" (
    echo [OK] package.json found
) else (
    echo [X] package.json NOT FOUND
)

if exist "src\index.ts" (
    echo [OK] src\index.ts found
) else (
    echo [X] src\index.ts NOT FOUND
)

if exist "launcher-simple.js" (
    echo [OK] launcher-simple.js found
) else (
    echo [X] launcher-simple.js NOT FOUND
)

echo.
echo [4] Checking Node.js dependencies...
if exist "node_modules" (
    echo [OK] node_modules folder exists
) else (
    echo [X] node_modules NOT FOUND
    echo Solution: Run 'npm install'
)

echo.
echo [5] Checking port 3000...
netstat -ano | findstr :3000
if errorlevel 1 (
    echo [OK] Port 3000 is available
) else (
    echo [!] Port 3000 is in use by another process
    echo You may need to stop that process or use a different port
)

echo.
echo ========================================
echo.
echo Everything looks OK! You can now:
echo   1. Double-click: START_BACKEND.bat
echo   2. Visit: https://teletalk.com.bd
echo   3. Click "Smart Fill" button
echo.
echo Press any key to close this window...
pause >nul
