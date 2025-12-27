@echo off
echo ========================================
echo 部署股票配置架構簡化方案
echo ========================================

echo.
echo 🎯 方案概述:
echo - 創建統一配置文件 config/stocks.json
echo - 創建統一服務 stocksConfigService.js  
echo - 更新 StockOverview.vue 使用新服務
echo - 解決 RR 符號顯示問題
echo.

echo 1. 檢查修改的文件...
git status

echo.
echo 2. 添加新文件到 Git...
git add config/stocks.json
git add src/utils/stocksConfigService.js
git add src/components/StockOverview.vue
git add STOCKS_CONFIG_SIMPLIFICATION_PLAN.md
git add test-stocks-config-service.html
git add deploy-stocks-config-simplification.bat

echo.
echo 3. 提交修改...
git commit -m "Implement stocks config architecture simplification

🎯 Core Changes:
- Created unified config/stocks.json with all 67 stocks including RR
- Created stocksConfigService.js as single source of truth
- Updated StockOverview.vue to use new unified service
- Replaced complex symbolsConfig with simple stocksConfig

🔧 Technical Details:
- Single config file controls all stock data (symbols, exchanges, sectors)
- Unified API: getEnabledSymbols(), getStockExchange(), getStockSector()
- Backward compatibility maintained for existing code
- Simplified exchange mapping logic

🚀 Benefits:
- Only need to modify config/stocks.json to add new stocks
- No more 13+ files to update for each stock addition
- Consistent data across all modules
- Easier maintenance and debugging

✅ Fixes:
- StockOverview now shows all 67 stocks including RR
- RR appears in Technology sector as expected
- Eliminates cache inconsistency issues
- Provides foundation for future stock additions

Next: Gradually migrate other components to use stocksConfigService"

echo.
echo 4. 推送到遠程倉庫...
git push origin main

echo.
echo 5. 測試新架構...
echo 請訪問以下 URL 來測試新架構:
echo.
echo 本地測試:
echo - 配置服務測試: http://localhost:3000/test-stocks-config-service.html
echo - StockOverview 頁面: http://localhost:3000/ (應該顯示 67 個股票包括 RR)
echo - RR 股票詳情: http://localhost:3000/stock/RR
echo.
echo 生產環境測試 (部署完成後):
echo - 配置服務測試: https://romarin-hsieh.github.io/investment-dashboard/test-stocks-config-service.html
echo - StockOverview 頁面: https://romarin-hsieh.github.io/investment-dashboard/
echo.

echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 📋 驗證清單:
echo [ ] StockOverview 頁面顯示 67 個股票
echo [ ] RR 符號出現在 Technology 分組
echo [ ] 配置服務測試全部通過
echo [ ] 股票詳情頁面正常工作
echo.
echo 🔄 後續步驟:
echo 1. 驗證新架構工作正常
echo 2. 逐步遷移其他組件使用 stocksConfigService
echo 3. 更新後端腳本使用統一配置
echo 4. 清理舊的配置文件和重複代碼
echo.
echo 💡 新增股票方法:
echo 只需編輯 config/stocks.json 添加新股票即可！
echo 格式: {"symbol": "NEW", "exchange": "NASDAQ", "sector": "Technology", "industry": "Software", "enabled": true, "priority": 1}
echo.

pause