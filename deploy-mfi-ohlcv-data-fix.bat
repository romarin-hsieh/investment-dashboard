@echo off
echo 🚀 MFI Volume Profile OHLCV Data Fix Deployment
echo ================================================

echo.
echo 📊 Step 1: Generating OHLCV data for MFI Volume Profile...
node scripts/generate-ohlcv-data.cjs
if %ERRORLEVEL% neq 0 (
    echo ❌ OHLCV data generation failed!
    pause
    exit /b 1
)

echo.
echo 🔍 Step 2: Verifying OHLCV data files...
if not exist "public\data\ohlcv\AAPL.json" (
    echo ❌ AAPL.json not found!
    pause
    exit /b 1
)
if not exist "public\data\ohlcv\index.json" (
    echo ❌ index.json not found!
    pause
    exit /b 1
)
echo ✅ OHLCV data files verified

echo.
echo 🏗️ Step 3: Building production bundle...
npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo 📝 Step 4: Committing changes...
git add .
git commit -m "📊 Add OHLCV data for MFI Volume Profile production support"

echo.
echo 🚀 Step 5: Deploying to GitHub Pages...
git push origin main
if %ERRORLEVEL% neq 0 (
    echo ❌ Git push failed!
    pause
    exit /b 1
)

echo.
echo 🎉 MFI Volume Profile OHLCV Data Fix Deployment Complete!
echo.
echo 📊 Generated OHLCV data for 29 symbols
echo 🔗 Production URL: https://romarin1.github.io/investment-dashboard/
echo 🧪 Test MFI Volume Profile: https://romarin1.github.io/investment-dashboard/#/stock/AAPL
echo.
echo ✅ MFI Volume Profile should now work correctly in production!

pause