@echo off
echo ============================================
echo   MediaGuard Sports — Start All Services
echo ============================================
echo.
echo Starting FastAPI (port 8001)...
start "FastAPI" cmd /k "cd /d %~dp0Backend && python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"
timeout /t 5 >nul

echo Starting Node.js (port 8000)...
start "Node" cmd /k "cd /d %~dp0Backend\server && npm run dev"
timeout /t 3 >nul

echo Starting Frontend (port 5173)...
start "Frontend" cmd /k "cd /d %~dp0Frontend && npm run dev"
timeout /t 3 >nul

echo.
echo ============================================
echo   All services started!
echo   FastAPI:  http://localhost:8001
echo   Node.js:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo ============================================
echo.
echo To generate live data:
echo   1. Open http://localhost:5173
echo   2. Go to Asset Vault - ingest a video
echo   3. Go to Threat Hunter - run swarm
echo   4. Watch incidents, DMCA, contracts appear live
echo.
pause
