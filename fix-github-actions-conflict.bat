@echo off
echo 🔧 修復 GitHub Actions 部署衝突
echo =====================================
echo.
echo 📋 問題分析:
echo - GitHub Actions 自動更新 sector/industry 資料時發生衝突
echo - 遠端倉庫有本地沒有的變更
echo - 需要先拉取遠端變更再重新部署
echo.

REM 檢查 Git 狀態
echo 🔍 檢查 Git 狀態...
git status --porcelain > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git 不可用，請確認 Git 已安裝
    pause
    exit /b 1
)

REM 顯示當前狀態
echo 📊 當前 Git 狀態:
git status --short
echo.

REM 拉取遠端最新變更
echo 🔄 拉取遠端最新變更...
git fetch origin
if %errorlevel% neq 0 (
    echo ❌ 無法拉取遠端變更
    pause
    exit /b 1
)

REM 檢查是否有衝突
echo 🔍 檢查是否有衝突...
git merge-base --is-ancestor HEAD origin/main
if %errorlevel% neq 0 (
    echo ⚠️ 發現遠端有新的提交，嘗試合併...
    git pull origin main --no-edit
    if %errorlevel% neq 0 (
        echo ❌ 合併失敗，嘗試 rebase...
        git pull origin main --rebase
        if %errorlevel% neq 0 (
            echo ❌ Rebase 也失敗，可能有衝突需要手動解決
            echo.
            echo 🛠️ 手動解決步驟:
            echo 1. git status  # 查看衝突檔案
            echo 2. 編輯衝突檔案，解決衝突標記
            echo 3. git add .   # 標記衝突已解決
            echo 4. git rebase --continue  # 繼續 rebase
            echo 5. 重新執行此腳本
            pause
            exit /b 1
        )
    )
    echo ✅ 成功合併遠端變更
) else (
    echo ✅ 本地已是最新狀態
)

REM 檢查是否有未提交的變更
for /f %%i in ('git status --porcelain 2^>nul ^| find /c /v ""') do set changes=%%i
if %changes% gtr 0 (
    echo 📝 發現 %changes% 個未提交的變更:
    git status --short
    echo.
    echo 🤔 是否要提交這些變更？
    set /p confirm="輸入 'y' 確認，其他任意鍵跳過: "
    if /i "!confirm!"=="y" (
        echo 📝 提交變更...
        git add .
        git commit -m "🔧 修復 GitHub Actions 衝突

- 解決自動更新 sector/industry 資料時的衝突
- 更新 GitHub Actions workflow 以處理衝突
- 確保部署流程穩定運行"
        
        if %errorlevel% neq 0 (
            echo ❌ 提交失敗
            pause
            exit /b 1
        )
        echo ✅ 變更已提交
    )
)

REM 推送變更
echo 🚀 推送到 GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo ❌ 推送失敗，嘗試重新拉取並推送...
    git pull origin main --rebase
    git push origin main
    if %errorlevel% neq 0 (
        echo ❌ 推送仍然失敗
        echo 可能需要手動檢查網路連線或 GitHub 權限
        pause
        exit /b 1
    fi
)

echo ✅ 成功推送到 GitHub
echo.
echo 🎯 GitHub Actions 衝突已修復
echo 📍 GitHub Actions 網址: https://github.com/romarin-hsieh/investment-dashboard/actions
echo.
echo ⏱️ 下次自動更新將能正常處理衝突
echo 💡 修復內容:
echo - 更新 workflow 以先拉取遠端變更
echo - 添加衝突處理和重試邏輯
echo - 確保自動更新流程穩定
echo.
echo ✅ 修復完成！
pause