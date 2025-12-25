@echo off
echo 🚀 部署 Metadata 顯示修復到正式環境
echo ========================================
echo.
echo 📋 修復內容:
echo ✅ CRM 顯示 "Software - Application" 
echo ✅ IONQ 顯示 "Computer Hardware"
echo ✅ PL 顯示 "NYSE" 交易所
echo ✅ 所有股票正確的產業和交易所資訊
echo.
echo 🔧 技術修復:
echo - 新增 DirectMetadataLoader 直接載入 JSON
echo - 修復 Exchange 代碼映射 (NYQ → NYSE)
echo - 清理過多的除錯訊息
echo.

REM 檢查 Git 狀態
echo 🔍 檢查 Git 狀態...
git status --porcelain > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git 不可用，請確認 Git 已安裝
    pause
    exit /b 1
)

REM 檢查是否有未提交的變更
for /f %%i in ('git status --porcelain 2^>nul ^| find /c /v ""') do set changes=%%i
if %changes% gtr 0 (
    echo 📝 發現 %changes% 個未提交的變更
    echo.
    git status --short
    echo.
    echo 🤔 是否要提交這些變更並部署？
    set /p confirm="輸入 'y' 確認，其他任意鍵取消: "
    if /i not "!confirm!"=="y" (
        echo ❌ 部署已取消
        pause
        exit /b 1
    )
) else (
    echo ✅ 沒有未提交的變更
)

REM 拉取最新變更以避免衝突
echo.
echo 🔄 拉取遠端最新變更...
git fetch origin
if %errorlevel% neq 0 (
    echo ❌ 無法拉取遠端變更
    pause
    exit /b 1
)

REM 檢查是否有衝突
git merge-base --is-ancestor HEAD origin/main
if %errorlevel% neq 0 (
    echo ⚠️ 發現遠端有新的提交，嘗試合併...
    git pull origin main --no-edit
    if %errorlevel% neq 0 (
        echo ❌ 合併失敗，可能有衝突需要手動解決
        echo 請執行以下命令解決衝突：
        echo   git status
        echo   git add .
        echo   git commit -m "解決合併衝突"
        echo   然後重新執行此腳本
        pause
        exit /b 1
    )
    echo ✅ 成功合併遠端變更
)

REM 如果有變更，進行提交
if %changes% gtr 0 (
    echo.
    echo 📝 提交變更...
    git add .
    git commit -m "🔧 修復 Metadata 顯示問題

✅ 修復內容:
- CRM 正確顯示 'Software - Application'
- IONQ 正確顯示 'Computer Hardware'  
- PL 正確顯示 'NYSE' 交易所
- 所有股票的產業和交易所資訊正確顯示

🛠️ 技術實現:
- 新增 DirectMetadataLoader 繞過複雜的 metadataService
- 修復 Exchange 代碼映射 (NYQ → NYSE, NMS → NASDAQ)
- 清理過多的 Console 除錯訊息
- 優化 Vue 組件的 metadata 載入邏輯

📁 修改檔案:
- src/utils/directMetadataLoader.js (新增)
- src/components/StockCard.vue
- src/components/StockOverview.vue"
    
    if %errorlevel% neq 0 (
        echo ❌ 提交失敗
        pause
        exit /b 1
    )
    echo ✅ 變更已提交
)

REM 推送到遠端
echo.
echo 🚀 推送到 GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo ❌ 推送失敗
    echo 可能的原因：
    echo - 網路連線問題
    echo - GitHub 權限問題
    echo - 遠端有新的提交
    echo.
    echo 請檢查錯誤訊息並重試
    pause
    exit /b 1
)

echo ✅ 成功推送到 GitHub
echo.
echo 🎯 GitHub Actions 將自動部署到正式環境
echo 📍 正式環境網址: https://romarin-hsieh.github.io/investment-dashboard/
echo.
echo ⏱️ 預計 2-3 分鐘後可以看到更新
echo 💡 如果沒有立即更新，請清除瀏覽器快取 (Ctrl+F5)
echo.
echo 🔍 監控部署狀態:
echo https://github.com/romarin-hsieh/investment-dashboard/actions
echo.
echo ✅ 部署完成！
pause