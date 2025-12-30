@echo off
echo ========================================
echo Hash Router Widget Refresh Fix Deployment
echo ========================================

echo.
echo Building application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo ✅ Build successful!

echo.
echo Deploying to GitHub Pages...
git add .
git commit -m "feat: implement hash router widget refresh fix

- Add router-view key for forced component remounting on path changes
- Replace NavigationService focus handling with Vue Router queries  
- Add focus parameter cleanup on route navigation
- Add deprecation warnings to NavigationService methods
- Ensure hash router query format consistency (#/route?focus=X)

Fixes:
- Manual URL symbol changes now refresh TradingView widgets
- Focus parameters appear in correct hash router format
- No more focus parameter leakage across pages"

git push origin main
if %ERRORLEVEL% neq 0 (
    echo ❌ Push to main failed!
    pause
    exit /b 1
)

echo.
echo Deploying to gh-pages...
git subtree push --prefix dist origin gh-pages
if %ERRORLEVEL% neq 0 (
    echo ❌ Deploy to gh-pages failed!
    pause
    exit /b 1
)

echo.
echo ✅ Hash Router Widget Refresh Fix deployed successfully!
echo.
echo Test the fix:
echo 1. Navigate to a stock detail page (e.g., #/symbols/NVDA)
echo 2. Manually change URL to different symbol (e.g., #/symbols/ONDS)  
echo 3. Verify TradingView widgets refresh with new symbol data
echo 4. Test focus parameters in stock overview (#/stock-overview?focus=SYMBOL)
echo 5. Verify focus parameters are cleared when navigating away
echo.
pause