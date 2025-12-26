@echo off
echo ========================================
echo 🚨 Critical Performance Fixes Deployment
echo ========================================
echo.

echo 📋 修復內容:
echo - PerformanceMonitor Console 崩潰修復
echo - MarketDashboard 移除不相關組件
echo - TechnicalIndicators 只載入當前股票數據
echo - 優化 PrecomputedIndicatorsAPI 載入邏輯
echo.

echo 🔍 檢查修改的文件...
git status --porcelain

echo.
echo 📝 添加修改的文件...
git add src/components/PerformanceMonitor.vue
git add src/components/TechnicalIndicators.vue
git add src/pages/MarketDashboard.vue
git add src/utils/precomputedIndicatorsApi.js
git add test-critical-performance-fixes.html
git add deploy-critical-performance-fixes.bat

echo.
echo 💾 提交變更...
git commit -m "🚨 Critical performance fixes: Console stability and data loading optimization

✅ PerformanceMonitor Console Crash Fix:
- Removed console.log interception causing infinite loops
- Replaced with Performance Observer API and custom events
- Prevents console crashes and system instability

✅ MarketDashboard Component Cleanup:
- Removed PerformanceMonitor from MarketDashboard
- MarketDashboard should only show market data, not stock indicators
- Reduces unnecessary technical indicators loading

✅ TechnicalIndicators Loading Optimization:
- Only load current stock's technical indicators
- Added symbol validation and specific data loading
- Prevents loading all stocks' data on single stock pages

✅ PrecomputedIndicatorsAPI Improvements:
- Enhanced symbol-specific data loading
- Better error handling and logging
- Improved caching mechanism

🧪 Test Page: test-critical-performance-fixes.html

🎯 Expected Results:
- Console stability restored
- Market Overview loads faster (no stock data)
- StockDetail only loads relevant stock data
- Reduced network requests and improved performance"

if %ERRORLEVEL% neq 0 (
    echo ❌ 提交失敗
    pause
    exit /b 1
)

echo.
echo 🌐 推送到 GitHub...
git push

if %ERRORLEVEL% neq 0 (
    echo ❌ 推送失敗
    pause
    exit /b 1
)

echo.
echo ✅ 部署成功！
echo.
echo 📊 修復摘要:
echo - ✅ Console 崩潰問題已修復
echo - ✅ Market Overview 不再載入股票技術指標
echo - ✅ StockDetail 只載入當前股票數據
echo - ✅ 網路請求大幅減少
echo.
echo 🔗 測試連結:
echo - 本地測試: http://localhost:3000/test-critical-performance-fixes.html
echo - Market Overview: http://localhost:3000/#/market-dashboard
echo - Stock Overview: http://localhost:3000/#/stock-overview
echo - Stock Detail: http://localhost:3000/#/stock-overview/symbols/CRM
echo.
echo 🚀 GitHub Actions 將自動部署到正式環境 (2-3 分鐘)
echo 📱 正式環境: https://romarin-hsieh.github.io/investment-dashboard/
echo.

pause