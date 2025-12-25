@echo off
chcp 65001 >nul
echo 🔍 Verifying Deployment Status...
echo ================================
echo.

echo 📋 Checking deployment status...
echo.
echo 🌐 Please manually check these URLs:
echo.
echo 1. Main Website:
echo    https://romarin-hsieh.github.io/investment-dashboard/
echo.
echo 2. Data API (should show 24 stocks):
echo    https://romarin-hsieh.github.io/investment-dashboard/data/sector_industry.json
echo.
echo 3. Market Dashboard:
echo    https://romarin-hsieh.github.io/investment-dashboard/#/market-dashboard
echo.
echo 4. Stock Dashboard:
echo    https://romarin-hsieh.github.io/investment-dashboard/#/stock-dashboard
echo.
echo 📊 GitHub Actions Status:
echo    https://github.com/romarin-hsieh/investment-dashboard/actions
echo.
echo 🚀 Deployment Status:
echo    https://github.com/romarin-hsieh/investment-dashboard/deployments
echo.
echo ✅ Verification checklist:
echo    [ ] Main website loads correctly
echo    [ ] Data API returns 24 stocks
echo    [ ] All pages navigate properly
echo    [ ] TradingView widgets load
echo    [ ] No JavaScript errors in console
echo.
echo 📝 Expected data structure:
echo    - Technology (11 stocks): PL, ONDS, MDB, ORCL, TSM, CRM, NVDA, AVGO, CRWV, IONQ, PLTR
echo    - Communication Services (4): ASTS, GOOG, META, NFLX
echo    - Consumer Cyclical (3): RIVN, AMZN, TSLA
echo    - Industrials (3): RDW, AVAV, RKLB
echo    - Energy (2): LEU, SMR
echo    - Healthcare (1): HIMS
echo.
echo 🎯 If all checks pass, deployment is successful!
echo.
pause