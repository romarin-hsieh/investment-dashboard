@echo off
echo 🚨 OHLCV Path Fix - Emergency Deployment
echo ==========================================

echo.
echo 🔍 Problem Identified:
echo - OHLCV API using absolute paths: /data/ohlcv/
echo - GitHub Pages base path: /investment-dashboard/
echo - Resulting in 404 errors: https://romarin1.github.io/data/ohlcv/CRWV.json
echo - Should be: https://romarin1.github.io/investment-dashboard/data/ohlcv/CRWV.json

echo.
echo 🔧 Solution Applied:
echo - Changed /data/ohlcv/ to ./data/ohlcv/ in src/services/ohlcvApi.js
echo - Changed /data/ohlcv to ./data/ohlcv in src/api/precomputedOhlcvApi.js
echo - Updated test file paths

echo.
echo 🏗️ Step 1: Building production bundle...
npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo 📝 Step 2: Committing path fixes...
git add .
git commit -m "🔧 Fix OHLCV API paths for GitHub Pages deployment"

echo.
echo 🚀 Step 3: Deploying to GitHub Pages...
git push origin main
if %ERRORLEVEL% neq 0 (
    echo ❌ Git push failed!
    pause
    exit /b 1
)

echo.
echo 🎉 OHLCV Path Fix Deployment Complete!
echo.
echo 🔗 Test URLs (should work now):
echo - https://romarin1.github.io/investment-dashboard/data/ohlcv/CRWV.json
echo - https://romarin1.github.io/investment-dashboard/#/stock/CRWV
echo.
echo ✅ MFI Volume Profile should now load data correctly!

pause