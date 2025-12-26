@echo off
echo ========================================
echo   Cache Warmup Service Fix Deployment
echo ========================================
echo.

echo [1/4] Building production version...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Committing changes...
git add .
git commit -m "fix: Disable cache warmup service in development environment

- Add environment detection to prevent bulk loading in development
- Only enable cache warmup in production (GitHub Pages)
- Increase cache coverage requirement to 95%
- Disable warmup on first load and version change
- Extend warmup interval to 24 hours

This fixes the issue where StockDetail pages were loading all 24 stocks'
technical indicators data instead of just the current stock."

echo.
echo [3/4] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo ERROR: Push failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Deployment completed successfully!
echo.
echo Next steps:
echo 1. Wait for GitHub Actions to complete deployment
echo 2. Test the fix using: test-cache-warmup-fix.html
echo 3. Navigate to StockDetail pages and verify no bulk loading
echo.
echo Expected behavior:
echo - Development: Cache warmup completely disabled
echo - Production: Cache warmup only when cache coverage ^< 95%%
echo - StockDetail pages should only load current stock data
echo.
pause