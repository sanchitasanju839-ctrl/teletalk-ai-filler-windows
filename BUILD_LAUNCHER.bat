@echo off
REM Build the Teletalk Launcher executable

echo Building Teletalk Backend Launcher...
echo.

cd /d "%~dp0launcher"

echo Installing dependencies...
call npm install

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Building executable...
call npm run build

if errorlevel 1 (
    echo.
    echo ERROR: Failed to build executable
    pause
    exit /b 1
)

echo.
echo SUCCESS! Executable created in: launcher\dist\
echo.
pause
