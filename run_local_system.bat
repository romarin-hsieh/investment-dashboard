@echo off
echo ===================================================
echo   QUANT SYSTEM v6.0 - LOCAL DEPLOYMENT LAUNCHER
echo ===================================================

echo [1/3] Checking Environment...
python --version
node --version

echo.
echo [2/3] Running Data Pipeline (Daily Update)...
python scripts/production/daily_update.py
if errorlevel 1 goto Error

echo [SUCCESS] Data Pipeline Completed. Dashboard JSON Updated.
goto Launch

:Error
echo [WARNING] Python script finished with errors.
echo Proceeding anyway...

:Launch
echo.
echo [3/3] Launching Dashboard Interface...
echo Starting Vite Server...
npm run dev
pause
