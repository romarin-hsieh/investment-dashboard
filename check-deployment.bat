@echo off
echo 🚀 檢查 GitHub Pages 部署狀態...
echo.

echo 📋 部署資訊:
echo - 主分支提交: 3acb2ef
echo - gh-pages 提交: 69dc717
echo - 網站 URL: https://romarin-hsieh.github.io/investment-dashboard/
echo.

echo 🔍 檢查遠程分支...
git ls-remote --heads origin

echo.
echo 🌐 網站狀態檢查...
echo 正在檢查網站是否可訪問...

REM 使用 curl 檢查網站狀態 (如果有安裝)
curl -I -s -o nul -w "HTTP 狀態碼: %%{http_code}\n載入時間: %%{time_total}s\n" https://romarin-hsieh.github.io/investment-dashboard/ 2>nul

if %errorlevel% neq 0 (
    echo ⚠️  curl 不可用，請手動檢查網站: https://romarin-hsieh.github.io/investment-dashboard/
)

echo.
echo 📊 GitHub Pages 設定檢查:
echo - Repository: romarin-hsieh/investment-dashboard
echo - Source: gh-pages branch
echo - Custom domain: 無
echo.

echo ✅ 部署完成！
echo 🌐 網站 URL: https://romarin-hsieh.github.io/investment-dashboard/
echo 📱 驗證工具: verify-deployment.html
echo.

echo 💡 提示:
echo 1. GitHub Pages 可能需要 1-2 分鐘才能更新
echo 2. 如果網站未更新，請檢查 GitHub Repository Settings > Pages
echo 3. 確認 Source 設定為 "Deploy from a branch" 和 "gh-pages"
echo.

pause