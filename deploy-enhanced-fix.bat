@echo off
chcp 65001 >nul
echo 🔧 部署增強版 404 修復
echo ========================
echo.

echo 📋 增強修復內容:
echo    - 更強健的環境檢測邏輯
echo    - 詳細的調試日誌
echo    - 多重路徑檢測機制
echo    - 調試工具頁面
echo.

echo 📝 提交增強修復...
git add .
git commit -m "🔧 Enhanced 404 fix: Robust environment detection with debug logging"

echo.
echo 🔨 建置專案...
npm run build

echo.
echo 📤 推送部署...
git push origin main

echo.
echo 🎉 增強修復部署完成!
echo.
echo 🔍 調試工具:
echo    - 本地測試: debug-path-detection.html
echo    - 正式環境: https://romarin-hsieh.github.io/investment-dashboard/debug-path-detection.html
echo.
echo 📊 預期修復:
echo    - 更準確的環境檢測
echo    - 詳細的調試資訊
echo    - 自動路徑修正
echo.
pause