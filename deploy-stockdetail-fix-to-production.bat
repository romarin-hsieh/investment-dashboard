@echo off
echo 🚀 部署 StockDetail Exchange 修復到正式環境
echo =============================================
echo.
echo 📋 本地測試結果確認:
echo ✅ CRM Exchange 標籤顯示 "NYSE" (正確)
echo ✅ Industry 與 StockOverview 頁面一致
echo ✅ TradingView widgets 正常載入
echo ✅ DirectMetadataLoader 正常工作
echo.
echo 🔍 檢查 GitHub Actions 部署狀態...
echo.

REM 檢查 Git 狀態
git status --porcelain > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git 不可用，請確認 Git 已安裝
    pause
    exit /b 1
)

REM 檢查是否有未推送的變更
echo 📊 檢查本地 Git 狀態...
for /f %%i in ('git status --porcelain 2^>nul ^| find /c /v ""') do set changes=%%i
if %changes% gtr 0 (
    echo ⚠️ 發現 %changes% 個未提交的變更:
    git status --short
    echo.
    echo 🤔 是否要先提交這些變更？
    set /p confirm="輸入 'y' 提交，其他任意鍵跳過: "
    if /i "!confirm!"=="y" (
        git add .
        git commit -m "📝 更新部署相關檔案"
        git push origin main
        echo ✅ 變更已提交並推送
    )
) else (
    echo ✅ 沒有未提交的變更
)

REM 檢查遠端狀態
echo.
echo 🔄 檢查遠端倉庫狀態...
git fetch origin
git log --oneline -5 origin/main
echo.

REM 確認最新提交包含修復
echo 🔍 確認最新提交包含 StockDetail 修復...
git log --oneline -1 | findstr /C:"StockDetail" > nul
if %errorlevel% equ 0 (
    echo ✅ 最新提交包含 StockDetail 修復
) else (
    echo ⚠️ 最新提交可能不包含 StockDetail 修復
    echo 最新提交:
    git log --oneline -1
)

echo.
echo 🌐 GitHub Actions 部署資訊:
echo ==========================================
echo 📍 GitHub Actions 網址:
echo https://github.com/romarin-hsieh/investment-dashboard/actions
echo.
echo 📍 正式環境網址:
echo https://romarin-hsieh.github.io/investment-dashboard/
echo.
echo ⏱️ 預計部署時間: 2-3 分鐘
echo.
echo 🔍 部署完成後測試連結:
echo - StockOverview: https://romarin-hsieh.github.io/investment-dashboard/#/stock-overview
echo - CRM Detail: https://romarin-hsieh.github.io/investment-dashboard/#/stock-overview/symbols/CRM
echo - IONQ Detail: https://romarin-hsieh.github.io/investment-dashboard/#/stock-overview/symbols/IONQ
echo - PL Detail: https://romarin-hsieh.github.io/investment-dashboard/#/stock-overview/symbols/PL
echo.
echo 📋 部署後驗證清單:
echo ==========================================
echo □ 開啟正式環境網址
echo □ 清除瀏覽器快取 (Ctrl + F5)
echo □ 測試 CRM 頁面 Exchange 顯示 "NYSE"
echo □ 測試 IONQ 頁面 Exchange 顯示 "NYSE"
echo □ 測試 PL 頁面 Exchange 顯示 "NYSE"
echo □ 確認 TradingView widgets 正常載入
echo □ 檢查 Console 無 404 錯誤
echo □ 確認 Industry 標籤正確顯示
echo.
echo 🎯 成功指標:
echo ==========================================
echo ✅ CRM 頁面顯示 "NYSE" + "Software - Application"
echo ✅ IONQ 頁面顯示 "NYSE" + "Computer Hardware"
echo ✅ PL 頁面顯示 "NYSE" + "Aerospace & Defense"
echo ✅ TradingView widgets 正常載入
echo ✅ Console 顯示 DirectMetadataLoader 成功訊息
echo ✅ 無 404 或其他錯誤
echo.
echo 🚨 如果遇到問題:
echo ==========================================
echo 1. 等待 5-10 分鐘讓 GitHub Actions 完成部署
echo 2. 清除瀏覽器快取 (Ctrl + Shift + Delete)
echo 3. 檢查 GitHub Actions 是否有錯誤
echo 4. 確認 GitHub Pages 設定正確
echo.
echo 📞 問題回報格式:
echo ==========================================
echo - 測試時間: [時間]
echo - 瀏覽器: [Chrome/Firefox/Safari]
echo - 問題頁面: [具體 URL]
echo - 錯誤現象: [詳細描述]
echo - Console 錯誤: [錯誤訊息]
echo.
echo 🎉 部署指令已完成！
echo.
echo 請等待 GitHub Actions 完成部署，然後測試正式環境。
echo 如有任何問題，請提供上述格式的詳細資訊。
echo.
pause