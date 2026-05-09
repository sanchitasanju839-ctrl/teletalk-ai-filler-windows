@echo off
REM Quick test to see if npm start works

echo.
echo ========================================
echo   Testing npm start
echo ========================================
echo.
echo This will test if your backend can start.
echo The backend should start and then you can press Ctrl+C to stop.
echo.
echo If this closes immediately, check DIAGNOSE.bat for issues.
echo.
pause

echo Starting backend...
echo.

cd /d "%~dp0"
cmd /k npm start
