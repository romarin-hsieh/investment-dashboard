@echo off
echo ========================================
echo 部署 67 符號數據修復
echo ========================================

echo.
echo 🎯 修復概述:
echo - 更新 quotes 和 daily 腳本使用統一配置
echo - 重新生成包含所有 67 個股票的數據文件
echo - 解決 StockOverview 頁面顯示問題
echo.

echo 1. 檢查修改的文件...
git status

echo.
echo 2. 重新生成 quotes 數據 (67 個股票)...
node scripts/update-quotes.cjs

echo.
echo 3. 驗證 quotes 數據...
echo 檢查 public/data/quotes/latest.json 是否包含 67 個股票...

echo.
echo 4. 檢查 daily 數據...
echo 檢查 public/data/daily/2025-12-28.json 是否包含 67 個股票...

echo.
echo 5. 添加修改到 Git...
git add scripts/update-quotes.cjs
git add scripts/generate-daily-snapshot.js
git add public/data/quotes/latest.json
git add public/data/daily/2025-12-28.json
git add test-stock-overview-67-symbols.html
git add deploy-67-symbols-fix.bat

echo.
echo 6. 提交修改...
git commit -m "Fix StockOverview data mismatch - Update to 67 symbols

🔧 Core Fixes:
- Updated update-quotes.cjs to use unified stocks.json config
- Updated generate-daily-snapshot.js to use unified stocks.json config
- Regenerated quotes/latest.json with all 67 stocks including RR
- Generated daily/2025-12-28.json with all 67 stocks

📊 Data Consistency:
- Config: 67 stocks (config/stocks.json)
- Quotes: 67 stocks (public/data/quotes/latest.json) 
- Daily: 67 stocks (public/data/daily/2025-12-28.json)
- Metadata: 67 stocks (public/data/symbols_metadata.json)

✅ Fixes:
- StockOverview now loads all 67 stocks instead of 24
- RR symbol appears correctly in Technology sector
- All data sources now synchronized with unified config
- Eliminates data mismatch causing blank page rendering

🧪 Testing:
- Created test-stock-overview-67-symbols.html for verification
- All data files now consistent with unified configuration
- StockOverview page should render properly with all stocks"

echo.
echo 7. 推送到遠程倉庫...
git push origin main

echo.
echo 8. 測試驗證...
echo.
echo 請訪問以下 URL 進行測試:
echo.
echo 本地測試:
echo - 數據一致性測試: http://localhost:3000/test-stock-overview-67-symbols.html
echo - StockOverview 頁面: http://localhost:3000/ (應該顯示 67 個股票)
echo - 統一配置測試: http://localhost:3000/test-unified-stocks-config.html
echo.
echo 生產環境測試 (部署完成後):
echo - 數據一致性測試: https://romarin-hsieh.github.io/investment-dashboard/test-stock-overview-67-symbols.html
echo - StockOverview 頁面: https://romarin-hsieh.github.io/investment-dashboard/
echo.

echo ========================================
echo 修復部署完成！
echo ========================================
echo.
echo 📋 驗證清單:
echo [ ] test-stock-overview-67-symbols.html 所有測試通過
echo [ ] StockOverview 頁面顯示 67 個股票 (不是 24 個)
echo [ ] RR 符號出現在 Technology 分組
echo [ ] 頁面正常渲染 (不再是空白頁面)
echo.
echo 🔍 問題診斷:
echo 如果 StockOverview 仍然顯示空白:
echo 1. 清除瀏覽器緩存 (Ctrl+Shift+R)
echo 2. 檢查瀏覽器開發者工具的 Console 錯誤
echo 3. 運行 test-stock-overview-67-symbols.html 診斷數據問題
echo 4. 確認所有數據文件都有 67 個股票
echo.
echo 💡 數據文件位置:
echo - 統一配置: config/stocks.json (67 stocks)
echo - 報價數據: public/data/quotes/latest.json (67 stocks)  
echo - 每日數據: public/data/daily/2025-12-28.json (67 stocks)
echo - 元數據: public/data/symbols_metadata.json (67 stocks)
echo.

pause