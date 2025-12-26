@echo off
echo 🔧 修復 StockDetail 頁面 Exchange 和 Metadata 問題
echo ================================================
echo.
echo 📋 修復內容:
echo ✅ 修復 CRM 等股票的 Exchange 顯示錯誤 (NYSE vs NASDAQ)
echo ✅ StockDetail 頁面使用 DirectMetadataLoader 保持一致性
echo ✅ 優先使用 metadata 中的實際交易所資訊
echo ✅ 修正股票分類列表 (根據 symbols_metadata.json)
echo.

REM 檢查 Git 狀態
echo 🔍 檢查 Git 狀態...
git status --porcelain > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git 不可用，請確認 Git 已安裝
    pause
    exit /b 1
)

REM 顯示具體修復
echo 🛠️ 具體修復:
echo - CRM: NASDAQ → NYSE (正確)
echo - IONQ: NASDAQ → NYSE (正確)
echo - PL: NASDAQ → NYSE (正確)
echo - 使用 DirectMetadataLoader 替代 metadataService
echo - 添加 exchange 代碼映射邏輯
echo.

REM 檢查修復檔案
if not exist "src/pages/StockDetail.vue" (
    echo ❌ StockDetail.vue 檔案不存在
    pause
    exit /b 1
)

if not exist "test-stockdetail-exchange-fix.html" (
    echo ❌ 測試檔案不存在
    pause
    exit /b 1
)

echo ✅ 修復檔案確認存在
echo.

REM 檢查是否有未提交的變更
for /f %%i in ('git status --porcelain 2^>nul ^| find /c /v ""') do set changes=%%i
if %changes% gtr 0 (
    echo 📝 發現 %changes% 個未提交的變更:
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
    git commit -m "🔧 修復 StockDetail 頁面 Exchange 和 Metadata 問題

✅ 修復內容:
- 修復 CRM, IONQ, PL 等股票的 Exchange 顯示錯誤
- CRM: NASDAQ → NYSE (根據 symbols_metadata.json)
- IONQ: NASDAQ → NYSE (根據實際交易所)
- PL: NASDAQ → NYSE (根據實際交易所)

🛠️ 技術實現:
- StockDetail.vue 使用 DirectMetadataLoader 保持一致性
- 優先使用 metadata 中的實際交易所資訊
- 添加 exchange 代碼映射邏輯 (NYQ → NYSE, NMS → NASDAQ)
- 修正股票分類列表以符合實際資料

📁 修改檔案:
- src/pages/StockDetail.vue (修復 exchange 邏輯和 metadata 載入)
- test-stockdetail-exchange-fix.html (新增測試頁面)

🎯 解決問題:
- TradingView widgets 因 exchange 錯誤無法正常顯示
- StockDetail 和 StockOverview 頁面 metadata 不一致
- 產業標籤顯示不正確"
    
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
    echo ❌ 推送失敗，嘗試重新拉取並推送...
    git pull origin main --rebase
    git push origin main
    if %errorlevel% neq 0 (
        echo ❌ 推送仍然失敗
        pause
        exit /b 1
    fi
)

echo ✅ 成功推送到 GitHub
echo.
echo 🎯 StockDetail Exchange 問題已修復
echo 📍 本地測試: http://localhost:3000/test-stockdetail-exchange-fix.html
echo 📍 正式環境: https://romarin-hsieh.github.io/investment-dashboard/
echo.
echo ⏱️ 預計 2-3 分鐘後可以看到修復效果
echo.
echo 🔍 測試重點:
echo - CRM 頁面: Exchange 應顯示 "NYSE" (不是 NASDAQ)
echo - IONQ 頁面: Exchange 應顯示 "NYSE"
echo - PL 頁面: Exchange 應顯示 "NYSE"
echo - TradingView widgets 應正常載入
echo - Industry 標籤與 StockOverview 一致
echo.
echo 📋 測試連結:
echo - http://localhost:3000/#/stock-overview/symbols/CRM
echo - http://localhost:3000/#/stock-overview/symbols/IONQ
echo - http://localhost:3000/#/stock-overview/symbols/PL
echo.
echo ✅ 修復完成！
pause