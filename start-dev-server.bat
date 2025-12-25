@echo off
echo 🚀 Investment Dashboard 本地測試環境
echo =====================================
echo.
echo 這將啟動本地開發服務器在 http://localhost:3000
echo.
echo 📋 測試步驟:
echo 1. 等待服務器啟動
echo 2. 瀏覽器會自動開啟
echo 3. 按 F12 開啟開發者工具
echo 4. 導航到 Stock Overview 頁面
echo 5. 查看 Console 中的除錯訊息
echo.
echo 🔧 除錯工具:
echo - http://localhost:3000/quick-debug-test.html (快速測試)
echo - http://localhost:3000/fix-metadata-cache.html (詳細分析)
echo.
echo 按任意鍵開始啟動服務器...
pause
echo.
echo 🔄 正在啟動開發服務器...
npm run dev