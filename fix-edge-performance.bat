@echo off
echo 🚀 Edge 瀏覽器效能修復工具
echo ================================

echo 1. 清除瀏覽器快取建議...
echo    - 按 Ctrl+Shift+Delete 清除 Edge 瀏覽器快取
echo    - 選擇「所有時間」和「快取的圖片和檔案」
echo.

echo 2. 停止開發伺服器...
taskkill /f /im node.exe 2>nul

echo 3. 清除專案快取...
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist
if exist .vite rmdir /s /q .vite

echo 4. 清除 npm 快取...
npm cache clean --force

echo 5. 重新安裝依賴...
npm install

echo 6. 建置專案...
npm run build

echo 7. 啟動開發伺服器...
echo    請手動執行: npm run dev
echo.

echo ✅ 修復完成！
echo.
echo 📋 Edge 瀏覽器優化建議:
echo    1. 確保 Edge 瀏覽器已更新到最新版本
echo    2. 停用不必要的擴充功能
echo    3. 在開發者工具中停用快取 (F12 > Network > Disable cache)
echo    4. 如果問題持續，請嘗試使用無痕模式
echo.

pause