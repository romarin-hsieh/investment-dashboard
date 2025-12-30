@echo off
echo 🧹 Deploying 30-Day Data Retention Policy...
echo.

echo 📋 Implementation Summary:
echo ✅ Task 1: Created cleanup-old-technical-indicators.js script
echo ✅ Task 2: Updated GitHub Actions workflow  
echo ✅ Task 3: Enhanced daily snapshot with timezone consistency
echo ✅ Task 4: Created comprehensive test suite
echo.

echo 🔍 Checking git status...
git status --porcelain

echo.
echo 📦 Adding all changes...
git add .

echo.
echo 💾 Committing changes...
git commit -m "🧹 Implement 30-Day Data Retention Policy

✨ Features:
- Add cleanup-old-technical-indicators.js script
- Integrate cleanup into daily GitHub Actions workflow
- Implement timezone-consistent date comparison
- Add comprehensive test suite and documentation

🎯 Benefits:
- Prevent repository size explosion
- Keep only last 30 days of technical indicator files
- Maintain latest_index.json and other essential files
- Automated daily cleanup with safety guardrails

📁 Files Added/Modified:
- scripts/cleanup-old-technical-indicators.js (new)
- .github/workflows/daily-data-update.yml (updated)
- scripts/generate-daily-snapshot.js (timezone fix)
- test-cleanup-old-technical-indicators.html (test suite)

🔒 Safety Features:
- Dry-run mode for testing
- Guardrails against excessive deletion
- Preserves latest_index.json and non-day files
- Detailed logging and error handling

🧪 Testing:
- Run: node scripts/cleanup-old-technical-indicators.js --dry-run --verbose
- Open: test-cleanup-old-technical-indicators.html for interactive testing"

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
echo 1. Test locally: node scripts/cleanup-old-technical-indicators.js --dry-run --verbose
echo 2. Open test suite: test-cleanup-old-technical-indicators.html
echo 3. Monitor GitHub Actions for automated cleanup
echo 4. Verify repository size remains stable
echo.
echo 🎯 Expected Results:
echo - Only last 30 days of YYYY-MM-DD_SYMBOL.json files retained
echo - latest_index.json always preserved
echo - Repository size stabilized, no longer growing linearly
echo - Daily automated cleanup with detailed logging
echo.

pause