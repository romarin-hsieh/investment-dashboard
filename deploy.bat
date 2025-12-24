@echo off
echo 🚀 開始部署 Investment Dashboard 到 GitHub Pages...

REM 檢查 Node.js 是否安裝
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: Node.js 未安裝或不在 PATH 中
    pause
    exit /b 1
)

REM 檢查 npm 是否可用
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤: npm 未安裝或不在 PATH 中
    pause
    exit /b 1
)

REM 安裝依賴
echo 📦 安裝依賴...
call npm ci
if errorlevel 1 (
    echo ❌ 依賴安裝失敗
    pause
    exit /b 1
)

REM 構建項目
echo 🔨 構建項目...
set NODE_ENV=production
call npm run build
if errorlevel 1 (
    echo ❌ 構建失敗
    pause
    exit /b 1
)

REM 檢查構建結果
if not exist "dist" (
    echo ❌ 構建失敗: dist 文件夾不存在
    pause
    exit /b 1
)

if not exist "dist\index.html" (
    echo ❌ 構建失敗: index.html 不存在
    pause
    exit /b 1
)

echo ✅ 構建成功!
echo 📁 構建文件:
dir dist

REM 提交並推送到 GitHub
echo 📤 推送到 GitHub...
git add .
git commit -m "Deploy: Update Investment Dashboard with Auto Update System %date% %time%"
git push origin main

if errorlevel 1 (
    echo ❌ Git 推送失敗
    pause
    exit /b 1
)

echo 🎉 部署完成!
echo 🌐 網站將在幾分鐘內更新: https://romarin-hsieh.github.io/investment-dashboard/
echo 📊 檢查部署狀態: https://github.com/romarin-hsieh/investment-dashboard/actions

pause