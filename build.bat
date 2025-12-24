@echo off
echo 🔨 開始構建項目...

REM 設置生產環境變數
set NODE_ENV=production

REM 清理舊的構建文件
if exist "dist\assets" (
    echo 🗑️ 清理舊的構建文件...
    rmdir /s /q "dist\assets"
)

if exist "dist\index.html" (
    del "dist\index.html"
)

REM 執行構建
echo 📦 執行 Vite 構建...
call npx vite build

REM 檢查構建結果
if exist "dist\index.html" (
    echo ✅ 構建成功!
    echo 📁 構建文件:
    dir dist
    echo.
    echo 📄 檢查 index.html:
    type dist\index.html | findstr "auto-update"
) else (
    echo ❌ 構建失敗!
    exit /b 1
)

pause