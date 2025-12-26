@echo off
echo ========================================
echo 🚀 Performance Optimization Deployment
echo ========================================
echo.

echo 📋 部署內容:
echo - Industry 標籤顏色統一 (StockDetail.vue)
echo - 技術指標載入優化 (PrecomputedIndicatorsAPI)
echo - 減少 latest_index.json 重複載入
echo.

echo 🔍 檢查修改的文件...
git status --porcelain

echo.
echo 📝 添加修改的文件...
git add src/pages/StockDetail.vue
git add src/utils/precomputedIndicatorsApi.js
git add test-performance-optimization.html
git add deploy-performance-optimization.bat

echo.
echo 💾 提交變更...
git commit -m "🎨 Performance optimization: Industry tag color unification and technical indicators loading optimization

✅ Industry Tag Color Unification:
- Unified StockDetail industry tags to use gray color scheme
- Consistent with StockOverview page styling
- Removed colorful category-specific styles

✅ Technical Indicators Loading Optimization:
- Added index caching mechanism to PrecomputedIndicatorsAPI
- latest_index.json now cached for 10 minutes
- Prevents duplicate loading across multiple TechnicalIndicators components
- Reduces unnecessary network requests

✅ Performance Improvements:
- Reduced network requests on StockOverview page (multiple StockCards)
- Optimized StockDetail page loading
- Better caching strategy for technical indicators

🧪 Test Page: test-performance-optimization.html"

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
echo 📊 部署摘要:
echo - ✅ Industry 標籤顏色已統一為灰色
echo - ✅ 技術指標載入已優化，減少重複請求
echo - ✅ 性能測試頁面已創建
echo.
echo 🔗 測試連結:
echo - 本地測試: http://localhost:3000/test-performance-optimization.html
echo - StockDetail 測試: http://localhost:3000/#/stock-overview/symbols/CRM
echo - StockOverview 測試: http://localhost:3000/#/stock-overview
echo.
echo 🚀 GitHub Actions 將自動部署到正式環境 (2-3 分鐘)
echo 📱 正式環境: https://romarin-hsieh.github.io/investment-dashboard/
echo.

pause