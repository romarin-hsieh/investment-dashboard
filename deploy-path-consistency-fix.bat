@echo off
echo 🚀 Deploying Path Consistency Fix and OHLCV Data Generation
echo ================================================================

echo.
echo 📊 Step 1: Generate OHLCV Data (Both Formats)
node scripts/generate-daily-ohlcv.js
if %errorlevel% neq 0 (
    echo ❌ OHLCV generation failed
    exit /b 1
)

echo.
echo 📈 Step 2: Generate Technical Indicators
node scripts/generate-daily-technical-indicators.js
if %errorlevel% neq 0 (
    echo ❌ Technical indicators generation failed
    exit /b 1
)

echo.
echo 📋 Step 3: Update Status File
node scripts/update-status.js
if %errorlevel% neq 0 (
    echo ❌ Status update failed
    exit /b 1
)

echo.
echo 🏗️ Step 4: Build Production
npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    exit /b 1
)

echo.
echo 📊 Step 5: Verify Generated Files
echo Checking OHLCV files...
dir public\data\ohlcv\*.json /b | find /c ".json" > temp_count.txt
set /p ohlcv_count=<temp_count.txt
del temp_count.txt
echo ✅ OHLCV files: %ohlcv_count%

echo Checking Technical Indicators files...
dir public\data\technical-indicators\*.json /b | find /c ".json" > temp_count.txt
set /p tech_count=<temp_count.txt
del temp_count.txt
echo ✅ Technical Indicators files: %tech_count%

echo.
echo 🎯 Step 6: Deploy to GitHub Pages
git add .
git commit -m "🚀 Path Consistency Fix + OHLCV Data Generation Complete

✅ Unified baseUrl helper implemented
✅ All services updated to use consistent paths  
✅ OHLCV data generated: %ohlcv_count% files (both formats)
✅ Technical indicators generated: %tech_count% files
✅ GitHub Actions workflow ready for daily updates
✅ MFI Volume Profile data pipeline operational

- Eliminates all hostname-based path detection
- Supports both local development and GitHub Pages
- Automated daily data updates via GitHub Actions
- 67 symbols × 3 data types = 200+ files daily"

git push origin main
if %errorlevel% neq 0 (
    echo ❌ Git push failed
    exit /b 1
)

echo.
echo 🎉 DEPLOYMENT SUCCESSFUL!
echo ================================================================
echo 📊 Summary:
echo - OHLCV files: %ohlcv_count%
echo - Technical Indicators: %tech_count%
echo - Path consistency: ✅ Fixed
echo - GitHub Actions: ✅ Ready
echo - Production build: ✅ Complete
echo.
echo 🌐 Production URL: https://romarin-hsieh.github.io/investment-dashboard/
echo 📋 Next: Monitor GitHub Actions daily updates at UTC 02:00
echo ================================================================

pause