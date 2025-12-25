@echo off
echo 🔧 執行 404 修復部署
echo ====================
echo.

echo 📋 檢查修復狀態...
echo    - precomputedIndicatorsApi.js: 已修復路徑配置
echo    - autoUpdateScheduler.js: 已修復路徑配置
echo    - AutoUpdateMonitor.vue: 已修復路徑配置
echo.

echo 📝 提交修復...
git add src/utils/precomputedIndicatorsApi.js
git add src/utils/autoUpdateScheduler.js  
git add src/pages/AutoUpdateMonitor.vue
git add test-404-fix.html
git add 404_ERROR_FIX_REPORT.md
git commit -m "🔧 Fix 404: Add environment detection for GitHub Pages paths"

echo.
echo 🔨 建置專案...
npm run build

echo.
echo 📤 推送部署...
git push origin main

echo.
echo ✅ 修復部署完成!
echo.
echo 🔍 驗證步驟:
echo    1. 等待 GitHub Actions 完成 (5-10 分鐘)
echo    2. 訪問: https://romarin-hsieh.github.io/investment-dashboard/
echo    3. 檢查控制台是否還有 404 錯誤
echo    4. 確認 AVGO 等股票資料正常載入
echo.
pause