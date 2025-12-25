@echo off
chcp 65001 >nul
echo 🔧 修復 GitHub Actions 部署配置
echo ===============================
echo.

echo 📋 修復內容:
echo    - 添加 environment: github-pages 配置
echo    - 修復 GitHub Pages 部署要求
echo    - 增強路徑檢測邏輯
echo.

echo 📝 提交修復...
git add .
git commit -m "🔧 Fix GitHub Actions: Add environment config for Pages deployment"

echo.
echo 📤 推送修復...
git push origin main

echo.
echo 🎉 GitHub Actions 修復完成!
echo.
echo 📊 修復說明:
echo    - 解決了 "Missing environment" 錯誤
echo    - GitHub Pages 部署現在應該正常工作
echo    - 404 路徑修復也會一併部署
echo.
echo 🔍 監控部署:
echo    - GitHub Actions: https://github.com/romarin-hsieh/investment-dashboard/actions
echo    - 預計 5-10 分鐘完成部署
echo.
pause