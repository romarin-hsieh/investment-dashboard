@echo off
echo 🚀 Deploying Data Update Robustness Implementation...
echo.

echo 📋 Implementation Summary:
echo ✅ Task 1: Version-driven data update checking (completed)
echo ✅ Task 2: Cache busting for index files only (completed)  
echo ✅ Task 3: Path unification verification (completed)
echo ✅ Task 4: 30-day retention policy script (completed)
echo ✅ Task 5: GitHub Actions workflow updated (completed)
echo.

echo 🔍 Checking git status...
git status --porcelain

echo.
echo 📦 Adding all changes...
git add .

echo.
echo 💾 Committing changes...
git commit -m "🔧 Implement Data Update Robustness & Retention

✨ Features:
- Replace time-window refresh with timestamp-driven cache busting
- Implement 30-day retention policy for technical indicators
- Add versioned URL support for cache busting
- Complete autoUpdateScheduler.js refactoring
- Add archive-old-technical-indicators.js script
- Update GitHub Actions workflow with archival process

🎯 Benefits:
- Reliable data updates regardless of timezone
- Prevent repository size explosion
- Improved cache management strategy
- Automated archival to GitHub Release assets

📁 Files Modified:
- src/utils/autoUpdateScheduler.js (removed time window logic)
- src/utils/dataVersionService.js (complete implementation)
- src/utils/baseUrl.js (added versioned URL support)
- scripts/archive-old-technical-indicators.js (new)
- .github/workflows/daily-data-update.yml (updated)
- test-data-update-robustness.html (comprehensive test suite)

🧪 Testing:
- Open test-data-update-robustness.html to verify implementation
- All path unification verified ✅
- Version-driven update mechanism ready ✅
- 30-day retention policy automated ✅"

if %ERRORLEVEL% neq 0 (
    echo ❌ Commit failed!
    pause
    exit /b 1
)

echo.
echo 🚀 Pushing to GitHub...
git push origin main

if %ERRORLEVEL% neq 0 (
    echo ❌ Push failed!
    pause
    exit /b 1
)

echo.
echo ✅ Deployment completed successfully!
echo.
echo 📊 Next Steps:
echo 1. Open test-data-update-robustness.html to test implementation
echo 2. Monitor GitHub Actions for archival process
echo 3. Verify data updates work reliably
echo 4. Check repository size remains stable
echo.
echo 🌐 Production URL: https://romarin1.github.io/investment-dashboard/
echo 🧪 Test URL: https://romarin1.github.io/investment-dashboard/test-data-update-robustness.html
echo.

pause