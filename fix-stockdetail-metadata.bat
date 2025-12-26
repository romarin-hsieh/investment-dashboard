@echo off
echo 🔧 修復 StockDetail 頁面 Metadata 路徑問題
echo =============================================
echo.
echo 📋 問題分析:
echo - StockDetail 頁面 (/stock-overview/symbols/{股票代碼}) 使用 metadataService
echo - metadataService 在正式環境可能出現 404 錯誤
echo - 原因: 沒有處理 GitHub Pages 的路徑前綴
echo - 本地: /data/symbols_metadata.json
echo - 正式: /investment-dashboard/data/symbols_metadata.json
echo.

REM 檢查 Git 狀態
echo 🔍 檢查 Git 狀態...
git status --porcelain > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git 不可用，請確認 Git 已安裝
    pause
    exit /b 1
)

REM 顯示修復內容
echo 🛠️ 修復內容:
echo ✅ 在 metadataService.js 中添加 getMetadataUrl() 方法
echo ✅ 與 DirectMetadataLoader 保持一致的環境檢測邏輯
echo ✅ 修復 refreshMetadata() 方法使用正確路徑
echo ✅ 創建測試頁面驗證 StockDetail 頁面修復
echo.

REM 檢查修復檔案
if not exist "src/utils/metadataService.js" (
    echo ❌ metadataService.js 檔案不存在
    pause
    exit /b 1
)

if not exist "test-stockdetail-fix.html" (
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
    git commit -m "🔧 修復 StockDetail 頁面 Metadata 路徑問題

✅ 修復內容:
- 在 metadataService.js 中添加 getMetadataUrl() 方法
- 正式環境使用 /investment-dashboard/data/symbols_metadata.json
- 本地環境使用 /data/symbols_metadata.json
- 與 DirectMetadataLoader 保持一致的環境檢測邏輯

🛠️ 技術實現:
- 檢測 hostname === 'romarin-hsieh.github.io'
- 檢測 pathname.includes('/investment-dashboard/')
- 修復 refreshMetadata() 方法使用動態路徑
- 添加詳細的載入日誌

📁 修改檔案:
- src/utils/metadataService.js (修復路徑邏輯)
- test-stockdetail-fix.html (新增測試頁面)

🎯 解決問題:
- 修復 StockDetail 頁面 (/stock-overview/symbols/{股票代碼}) 404 錯誤
- CRM, IONQ, PL 等股票在詳細頁面正確顯示 metadata
- 與其他 API 服務路徑邏輯統一"
    
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
echo 🎯 StockDetail 頁面 Metadata 路徑問題已修復
echo 📍 正式環境網址: https://romarin-hsieh.github.io/investment-dashboard/
echo.
echo ⏱️ 預計 2-3 分鐘後可以看到修復效果
echo 💡 如果沒有立即更新，請清除瀏覽器快取 (Ctrl+F5)
echo.
echo 🔍 測試修復效果:
echo - 本地測試: 開啟 test-stockdetail-fix.html
echo - StockDetail 頁面: 檢查 /stock-overview/symbols/CRM
echo - 驗證股票: CRM, IONQ, PL 是否顯示正確 metadata
echo.
echo 📋 測試步驟:
echo 1. 開啟 https://romarin-hsieh.github.io/investment-dashboard/#/stock-overview/symbols/CRM
echo 2. 打開 Developer Tools Console
echo 3. 檢查是否還有 404 錯誤
echo 4. 確認 CRM 顯示 "Software - Application"
echo 5. 測試其他股票: IONQ, PL 等
echo.
echo 🔍 監控部署狀態:
echo https://github.com/romarin-hsieh/investment-dashboard/actions
echo.
echo ✅ 修復完成！
pause