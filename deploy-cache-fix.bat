@echo off
echo ========================================
echo 部署 StockOverview 緩存修復
echo ========================================

echo.
echo 1. 檢查修改的文件...
git status

echo.
echo 2. 添加修改的文件到 Git...
git add src/components/StockOverview.vue
git add emergency-fix-stock-overview.html
git add test-stock-overview-cache-fix.html
git add debug-symbols-config-cache.html
git add fix-symbols-config-cache.html
git add STOCK_OVERVIEW_CACHE_FIX_SUMMARY.md
git add deploy-cache-fix.bat

echo.
echo 3. 提交修改...
git commit -m "Fix StockOverview SymbolsConfig cache issue - root cause identified and resolved

- Root cause: symbolsConfig cached old 24-symbol list, filtering quotes to 24 instead of 67
- Modified StockOverview.vue to clear symbolsConfig cache on force reload
- Added comprehensive fix-symbols-config-cache.html tool for targeted repair
- Added debug-symbols-config-cache.html for detailed diagnosis
- Enhanced emergency-fix-stock-overview.html and test tools
- Updated refresh() method to clear both performanceCache and symbolsConfig cache

Technical details:
- symbolsConfig.getSymbolsList() was returning cached 24 symbols (60min TTL)
- StockOverview filtered quotes using this list: quotes.filter(q => configuredSymbols.includes(q.symbol))
- Even though quotes/latest.json had 67 symbols, only 24 were displayed
- Fix: Clear symbolsConfig internal cache via symbolsConfig.refresh()

Fixes: StockOverview page showing 24 stocks instead of 67 including RR"

echo.
echo 4. 推送到遠程倉庫...
git push origin main

echo.
echo 5. 檢查部署狀態...
echo 請訪問以下 URL 來測試修復:
echo.
echo 本地測試:
echo - SymbolsConfig 修復工具: http://localhost:3000/fix-symbols-config-cache.html
echo - SymbolsConfig 診斷工具: http://localhost:3000/debug-symbols-config-cache.html
echo - 緊急修復工具: http://localhost:3000/emergency-fix-stock-overview.html
echo - 測試工具: http://localhost:3000/test-stock-overview-cache-fix.html
echo - StockOverview 頁面: http://localhost:3000/
echo.
echo 生產環境測試 (部署完成後):
echo - 緊急修復工具: https://romarin-hsieh.github.io/investment-dashboard/emergency-fix-stock-overview.html
echo - 測試工具: https://romarin-hsieh.github.io/investment-dashboard/test-stock-overview-cache-fix.html
echo - StockOverview 頁面: https://romarin-hsieh.github.io/investment-dashboard/

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 下一步:
echo 1. 訪問緊急修復工具清除緩存
echo 2. 驗證 StockOverview 頁面顯示 67 個股票
echo 3. 確認 RR 符號出現在 Technology 分組中
echo.

pause