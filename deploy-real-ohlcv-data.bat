@echo off
echo 🚀 Deploying Real OHLCV Data Refresh
echo =====================================

echo.
echo 📊 Step 1: Generate real OHLCV data using yfinance...
python scripts/generate-real-ohlcv-yfinance.py --days 90 --interval 1d --min-rows 24

if %ERRORLEVEL% neq 0 (
    echo ❌ OHLCV generation failed!
    exit /b 1
)

echo.
echo 🔍 Step 2: Validate OHLCV index.json...
python -c "import json; idx=json.load(open('public/data/ohlcv/index.json')); print(f'✅ Index OK: {len(idx[\"symbols\"])} symbols, {idx[\"totalFiles\"]} files'); exit(0 if idx.get('symbols') and len(idx['symbols']) > 0 else 2)"

if %ERRORLEVEL% neq 0 (
    echo ❌ Index validation failed!
    exit /b 1
)

echo.
echo 📈 Step 3: Generate technical indicators...
node scripts/generate-daily-technical-indicators.js

if %ERRORLEVEL% neq 0 (
    echo ❌ Technical indicators generation failed!
    exit /b 1
)

echo.
echo 📋 Step 4: Generate daily snapshot...
node scripts/generate-daily-snapshot.js

if %ERRORLEVEL% neq 0 (
    echo ❌ Daily snapshot generation failed!
    exit /b 1
)

echo.
echo 📊 Step 5: Update status.json...
node scripts/update-status.js

if %ERRORLEVEL% neq 0 (
    echo ❌ Status update failed!
    exit /b 1
)

echo.
echo 🎉 Real OHLCV Data Refresh Complete!
echo =====================================
echo.
echo 📊 Summary:
echo - OHLCV files: Real market data from yfinance
echo - Technical indicators: Updated with real data
echo - Daily snapshot: Generated
echo - Status: Updated for cache busting
echo.
echo 🚀 Ready for deployment to production!