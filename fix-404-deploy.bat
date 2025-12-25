@echo off
chcp 65001 >nul
echo 🔧 修復 404 錯誤並重新部署
echo ===============================
echo.

echo 📋 修復內容:
echo    - 修正 PrecomputedIndicatorsAPI 路徑配置
echo    - 修正 AutoUpdateScheduler 路徑配置  
echo    - 修正 AutoUpdateMonitor 路徑配置
echo    - 添加環境檢測邏輯
echo.

echo 📝 Step 1: 提交修復...
git add .
git commit -m "🔧 Fix 404 error: Update paths for GitHub Pages deployment"
if %errorlevel% neq 0 (
    echo ❌ Git commit failed
    pause
    exit /b 1
)
echo ✅ 修復已提交

echo.
echo 🔨 Step 2: 重新建置...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)
echo ✅ 建置完成

echo.
echo 📤 Step 3: 推送觸發部署...
git push origin main
if %errorlevel% neq 0 (
    echo ❌ Push failed
    pause
    exit /b 1
)
echo ✅ 推送完成

echo.
echo 🎉 修復部署完成!
echo.
echo 📊 修復說明:
echo    - 現在會根據環境自動選擇正確的基礎路徑
echo    - 本地環境: /data/technical-indicators/
echo    - 正式環境: /investment-dashboard/data/technical-indicators/
echo.
echo 🔍 測試修復:
echo    1. 等待 GitHub Actions 完成 (約 5 分鐘)
echo    2. 開啟測試頁面: test-404-fix.html
echo    3. 或直接訪問: https://romarin-hsieh.github.io/investment-dashboard/
echo.
echo 🌐 預期結果:
echo    - latest_index.json 應該能正常載入
echo    - AVGO 等股票的預計算資料應該正常顯示
echo    - 不再出現 404 錯誤
echo.
pause