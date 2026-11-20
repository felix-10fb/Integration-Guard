@echo off
title Integration Guard Launcher
echo ========================================================
echo   INTEGRATION GUARD // CR-26-047 DEFENSE CONSOLE
echo   Continuous Synthetic Security-Monitoring Prototype
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Initializing local database and running verification tests...
python backend\tests\test_simulation.py
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Verification tests failed. Please review errors.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Launching FastAPI Backend on http://127.0.0.1:8000...
start "Integration Guard Backend" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [3/3] Launching React Vite Frontend on http://127.0.0.1:5173...
cd frontend
start "Integration Guard Frontend" cmd /k "npm.cmd run dev"

echo.
echo ========================================================
echo   INTEGRATION GUARD IS NOW RUNNING!
echo   Dashboard UI: http://127.0.0.1:5173
echo   Backend API:  http://127.0.0.1:8000/docs
echo   WebSocket:    ws://127.0.0.1:8000/ws
echo ========================================================
echo.
pause
