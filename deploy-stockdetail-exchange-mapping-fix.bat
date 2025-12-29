@echo off
echo ========================================
echo StockDetail Exchange Mapping Fix Deployment
echo ========================================
echo.

echo [1/3] Building application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Deploying to GitHub Pages...
call npm run deploy:github
if %ERRORLEVEL% neq 0 (
    echo ❌ Deployment failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Verification...
echo ✅ StockDetail Exchange Mapping Fix deployed successfully!
echo.
echo 🧪 Test the fix:
echo 1. Open Stock Overview page
echo 2. Check UUUU and UMAC exchange tags show "AMEX"
echo 3. Check TOC navigation panel shows "AMEX" badges
echo 4. Click UUUU or UMAC to open Stock Detail page
echo 5. Verify header shows "AMEX" exchange tag
echo.
echo 📊 Fixed components:
echo - StockDetail.vue: Added ASE → AMEX mapping
echo - StockOverview.vue: Added mapExchangeCode method
echo - TOCTree.vue: Now displays mapped exchange names
echo.

pause