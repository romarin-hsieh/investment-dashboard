@echo off
echo 🚀 部署到正式環境 (GitHub Pages)
echo ============================================
echo.

REM 檢查 Git 狀態
echo 📋 檢查 Git 狀態...
git status --porcelain > nul
if %errorlevel% neq 0 (
    echo ❌ Git 倉庫狀態異常
    pause
    exit /b 1
)

REM 檢查是否有未提交的變更
for /f %%i in ('git status --porcelain ^| find /c /v ""') do set changes=%%i
if %changes% gtr 0 (
    echo ⚠️ 發現 %changes% 個未提交的變更
    echo 📝 變更檔案:
    git status --short
    echo.
    set /p commit_choice="是否要提交這些變更? (y/N): "
    if /i "!commit_choice!"=="y" (
        echo 📝 提交變更...
        git add .
        git commit -m "🚀 Production deployment: Update sector industry data with 24 stocks"
        echo ✅ 變更已提交
    ) else (
        echo ❌ 請先處理未提交的變更
        pause
        exit /b 1
    )
)

REM 檢查當前分支
for /f "tokens=*" %%i in ('git branch --show-current') do set current_branch=%%i
echo 📍 當前分支: %current_branch%

if not "%current_branch%"=="main" (
    echo ⚠️ 不在 main 分支上
    set /p switch_choice="是否切換到 main 分支? (y/N): "
    if /i "!switch_choice!"=="y" (
        git checkout main
        echo ✅ 已切換到 main 分支
    ) else (
        echo ❌ 請切換到 main 分支後再部署
        pause
        exit /b 1
    )
)

REM 拉取最新變更
echo 🔄 拉取最新變更...
git pull origin main
if %errorlevel% neq 0 (
    echo ❌ 拉取失敗，請檢查網路連接或解決衝突
    pause
    exit /b 1
)

REM 建置專案
echo 🔨 建置專案...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 建置失敗
    pause
    exit /b 1
)

REM 檢查建置結果
if not exist "dist\index.html" (
    echo ❌ 建置產物不完整
    pause
    exit /b 1
)

echo ✅ 建置完成

REM 推送到 main 分支 (觸發 GitHub Actions)
echo 📤 推送到 main 分支...
git push origin main
if %errorlevel% neq 0 (
    echo ❌ 推送失敗
    pause
    exit /b 1
)

echo ✅ 推送完成

echo.
echo 🎯 部署狀態檢查:
echo    1. GitHub Actions 將自動觸發
echo    2. 靜態資料將自動更新 (24 組股票)
echo    3. 網站將部署到 gh-pages 分支
echo.
echo 🌐 部署完成後可訪問:
echo    - 主網站: https://your-username.github.io/investment-dashboard/
echo    - 資料 API: https://your-username.github.io/investment-dashboard/data/sector_industry.json
echo.
echo 📊 監控連結:
echo    - GitHub Actions: https://github.com/your-username/investment-dashboard/actions
echo    - 部署狀態: https://github.com/your-username/investment-dashboard/deployments
echo.
echo ✅ 正式環境部署流程完成！
echo.
pause