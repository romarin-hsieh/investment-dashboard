@echo off
echo 🚀 Deploying yfinance Indicators Implementation
echo ================================================

echo.
echo 📋 Phase 1: Generate yfinance indicators locally
echo ------------------------------------------------
python scripts/generate-yfinance-indicators.py
if %ERRORLEVEL% neq 0 (
    echo ❌ yfinance indicators generation failed
    pause
    exit /b 1
)

echo.
echo 📋 Phase 2: Test generated data
echo --------------------------------
echo Testing NVDA data file...
python -c "
import json
from pathlib import Path
from datetime import datetime

today = datetime.now().strftime('%%Y-%%m-%%d')
file_path = Path('public/data/technical-indicators') / f'{today}_NVDA.json'

if file_path.exists():
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    if 'yf' in data.get('indicators', {}):
        yf = data['indicators']['yf']
        print(f'✅ NVDA yfinance data found:')
        print(f'   Volume: {yf.get(\"volume_last_day\", \"N/A\")}')
        print(f'   Market Cap: {yf.get(\"market_cap\", \"N/A\")}')
        print(f'   Beta 1Y: {yf.get(\"beta_1y\", \"N/A\")}')
    else:
        print('❌ No yfinance data found in NVDA file')
        exit(1)
else:
    print(f'❌ NVDA file not found: {file_path}')
    exit(1)
"

if %ERRORLEVEL% neq 0 (
    echo ❌ Data validation failed
    pause
    exit /b 1
)

echo.
echo 📋 Phase 3: Build and deploy
echo -----------------------------
echo Building project...
npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo.
echo 📋 Phase 4: Commit and push changes
echo ------------------------------------
git add -A
git status

echo.
set /p CONFIRM="Continue with commit and push? (y/N): "
if /i "%CONFIRM%" neq "y" (
    echo ❌ Deployment cancelled by user
    pause
    exit /b 1
)

git commit -m "🚀 Implement yfinance indicators (Volume, Market Cap, Beta) - 6 new indicators in Technical Indicators section"
git push

if %ERRORLEVEL% neq 0 (
    echo ❌ Git push failed
    pause
    exit /b 1
)

echo.
echo 🎉 Deployment Summary
echo =====================
echo ✅ yfinance indicators generated successfully
echo ✅ Data validation passed
echo ✅ Build completed
echo ✅ Changes committed and pushed
echo.
echo 📊 New indicators added:
echo    13. Volume (with %% change vs previous day)
echo    14. 5D Avg Volume (with %% change vs previous 5 days)
echo    15. Market Cap
echo    16. Beta (3mo)
echo    17. Beta (1y)
echo    18. Beta (5y)
echo.
echo 🌐 Production URL: https://romarin-hsieh.github.io/investment-dashboard/
echo 📋 Test page: test-yfinance-indicators.html
echo.
echo 🎯 Next steps:
echo    1. Wait for GitHub Pages deployment (2-3 minutes)
echo    2. Test on production: /#/stock-overview/symbols/NVDA
echo    3. Verify all 6 new indicators display correctly
echo    4. Check mobile responsiveness
echo.
pause