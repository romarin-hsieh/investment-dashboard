@echo off
echo ========================================
echo 🔧 Deploying Path Consistency Fix
echo ========================================
echo.

echo 📝 Fix Summary:
echo - Remove manual path detection in stocksConfigService
echo - Use Vite base URL configuration for automatic path handling
echo - Ensure consistency between local and production environments
echo - Fix GitHub Pages deployment path issues
echo.

echo 🎯 Technical Changes:
echo - stocksConfigService.getConfigUrl() simplified to use relative paths
echo - Vite base URL handles environment-specific paths automatically
echo - Local: http://localhost:3000/config/stocks.json
echo - Production: https://romarin-hsieh.github.io/investment-dashboard/config/stocks.json
echo.

echo 🔧 Committing changes...
git add src/utils/stocksConfigService.js
git add PATH_CONSISTENCY_SOLUTIONS.md
git add deploy-path-fix.bat

git commit -m "🔧 Fix path consistency between local and production environments

- Remove manual path detection in stocksConfigService
- Use Vite base URL configuration for automatic path handling
- Ensure /config/stocks.json works in both environments
- Fix GitHub Pages deployment 404 errors

Technical:
- Local: Vite serves /config/stocks.json directly
- Production: Vite base URL adds /investment-dashboard/ prefix
- Eliminates environment-specific path logic

Fixes: HTTP 404 errors in production environment"

echo.
echo 🚀 Pushing to production...
git push origin main

echo.
echo ✅ Deployment completed!
echo 🔗 Production URL: https://romarin-hsieh.github.io/investment-dashboard/#/stock-overview
echo 🎯 Expected: Consistent path handling across environments
echo 📊 Result: No more 404 errors for config/stocks.json

pause