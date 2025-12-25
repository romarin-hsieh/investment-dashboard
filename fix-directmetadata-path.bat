@echo off
echo 🔧 修復 DirectMetadataLoader 路徑問題
echo ========================================
echo.
echo 📋 問題分析:
echo - DirectMetadataLoader 在正式環境出現 404 錯誤
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
echo ✅ 添加 getMetadataUrl() 方法處理環境路徑
echo ✅ 與 precomputedIndicatorsApi.js 保持一致的邏輯
echo ✅ 添加詳細的載入日誌
echo ✅ 創建測試頁面驗證修復
echo.

REM 檢查修復檔案
if not exist "src/utils/directMetadataLoader.js" (
    echo ❌ directMetadataLoader.js 檔案不存在
    pause
    exit /b 1
)

if not exist "test-directmetadata-fix.html" (
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
    git commit -m "🔧 修復 DirectMetadataLoader 路徑問題

✅ 修復內容:
- 添加 getMetadataUrl() 方法處理環境路徑檢測
- 正式環境使用 /investment-dashboard/data/symbols_metadata.json
- 本地環境使用 /data/symbols_metadata.json
- 與 precomputedIndicatorsApi.js 保持一致的邏輯

🛠️ 技術實現:
- 檢測 hostname === 'romarin-hsieh.github.io'
- 檢測 pathname.includes('/investment-dashboard/')
- 添加詳細的載入日誌和錯誤處理
- 創建測試頁面驗證修復效果

📁 修改檔案:
- src/utils/directMetadataLoader.js (修復路徑邏輯)
- test-directmetadata-fix.html (新增測試頁面)

🎯 解決問題:
- 修復正式環境 404 錯誤
- CRM, IONQ, PL 等股票 metadata 正確顯示
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
echo 🎯 DirectMetadataLoader 路徑問題已修復
echo 📍 正式環境網址: https://romarin-hsieh.github.io/investment-dashboard/
echo.
echo ⏱️ 預計 2-3 分鐘後可以看到修復效果
echo 💡 如果沒有立即更新，請清除瀏覽器快取 (Ctrl+F5)
echo.
echo 🔍 測試修復效果:
echo - 本地測試: 開啟 test-directmetadata-fix.html
echo - 正式環境: 檢查 Console 是否還有 404 錯誤
echo - 驗證股票: CRM, IONQ, PL 是否顯示正確資訊
echo.
echo 🔍 監控部署狀態:
echo https://github.com/romarin-hsieh/investment-dashboard/actions
echo.
echo ✅ 修復完成！
pause