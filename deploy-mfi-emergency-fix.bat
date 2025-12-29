@echo off
echo ========================================
echo MFI Volume Profile Emergency Fix Deployment
echo ========================================
echo.

echo [1/5] Building project...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo [2/5] Running emergency fix tests...
echo Opening test page in browser...
start "" "test-mfi-volume-profile-emergency-fix.html"
echo.
echo Please verify the following fixes in the test page:
echo ✅ CORS Preflight Fix (yahooFinanceApi.js)
echo ✅ Precomputed API Error Handling (returns null, not throw)
echo ✅ OHLCV API Integration (local JSON priority)
echo ✅ MFI Volume Profile Calculation (with error handling)
echo ✅ DOM-based Rendering (no chart library dependencies)
echo.
set /p continue="Continue with deployment? (y/n): "
if /i "%continue%" neq "y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

echo.
echo [3/5] Copying files to dist...
copy "test-mfi-volume-profile-emergency-fix.html" "dist\"

echo.
echo [4/5] Deploying to GitHub Pages...
git add .
git commit -m "🚨 MFI Volume Profile Emergency Fix

Critical fixes implemented:
- Fixed CORS preflight issue in yahooFinanceApi.js (removed Content-Type from GET)
- Fixed precomputedOhlcvApi.js to return null instead of throwing
- Created new MFIVolumeProfilePanel.vue with DOM-based rendering
- Updated StockDetail.vue to use new panel component
- Added comprehensive error handling and graceful fallbacks

Architecture changes:
- Production: Local JSON data only (no CORS proxy dependency)
- DEV mode: Yahoo Finance fallback with proper headers
- DOM-based volume profile rendering (no chart library conflicts)
- All third-party failures now gracefully fallback without crashing

Test page: test-mfi-volume-profile-emergency-fix.html"

git push origin main
if %errorlevel% neq 0 (
    echo ❌ Git push failed!
    pause
    exit /b 1
)

echo.
echo [5/5] Deployment complete!
echo.
echo ✅ Emergency fixes deployed successfully!
echo.
echo 🔗 Production URL: https://romarin1.github.io/investment-dashboard/
echo 🧪 Test Page: https://romarin1.github.io/investment-dashboard/test-mfi-volume-profile-emergency-fix.html
echo.
echo Key improvements:
echo • No more CORS preflight errors
echo • Graceful error handling (no page crashes)
echo • DOM-based volume profile (stable rendering)
echo • Local JSON data priority (production stable)
echo • DEV fallback with proper headers
echo.
echo Next steps:
echo 1. Test the production deployment
echo 2. Verify MFI Volume Profile works on StockDetail pages
echo 3. Check browser console for any remaining errors
echo 4. Consider implementing GitHub Actions for OHLCV data pipeline
echo.
pause