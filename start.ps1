# Integration Guard - Local PowerShell Startup Script
$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  INTEGRATION GUARD // CR-26-047 DEFENSE CONSOLE" -ForegroundColor Cyan
Write-Host "  Continuous Synthetic Security-Monitoring Prototype" -ForegroundColor DarkCyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "[1/3] Running backend verification tests..." -ForegroundColor Yellow
python backend/tests/test_simulation.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Verification tests failed." -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/3] Launching FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
$backendProc = Start-Process python -ArgumentList "-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000" -PassThru

Write-Host "[3/3] Launching Vite Frontend on http://127.0.0.1:5173..." -ForegroundColor Green
Set-Location (Join-Path $ScriptDir "frontend")
$frontendProc = Start-Process npm.cmd -ArgumentList "run dev" -PassThru

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  INTEGRATION GUARD IS RUNNING LOCALLY!" -ForegroundColor Green
Write-Host "  Dashboard: http://127.0.0.1:5173" -ForegroundColor White
Write-Host "  Backend:   http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  WebSocket: ws://127.0.0.1:8000/ws" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C or close the terminal to stop.`n"
