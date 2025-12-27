@echo off
echo ========================================
echo 💰 Deploying Market Cap Sorting
echo ========================================
echo.

echo 📝 Change Summary:
echo - Added market cap-based sorting within each industry
echo - Stocks with larger market cap appear first within same industry
echo - Fallback to alphabetical sorting when market cap is missing or equal
echo - Maintains 4-level hierarchical sorting: Sector → Industry → Market Cap → Symbol
echo.

echo 🏆 Expected Market Cap Leaders:
echo - Semiconductors: NVDA (~$3.5T) → AVGO → TSM → LRCX
echo - Software - Infrastructure: MSFT (~$3.1T) → ORCL → ADBE → Others
echo - Internet Retail: AMZN (~$1.8T) → SE → MELI
echo - Auto Manufacturers: TSLA (~$1.3T) → RIVN
echo - Communication Equipment: ASTS → ONDS
echo.

echo 🔧 Technical Implementation:
echo - Market cap data from symbols_metadata.json
echo - Descending sort: marketCapB - marketCapA
echo - Fallback: localeCompare for equal/missing market cap
echo - Data source: Yahoo Finance API updated weekly
echo.

echo 🔧 Committing changes...
git add src/components/StockOverview.vue
git add test-market-cap-sorting.html
git add deploy-market-cap-sorting.bat

git commit -m "💰 Implement market cap sorting within industries

- Add market cap-based sorting within each industry group
- Larger market cap stocks appear first within same industry
- Maintain 4-level sorting: Sector → Industry → Market Cap → Symbol
- Fallback to alphabetical sorting when market cap missing/equal
- Use market_cap field from symbols_metadata.json

Examples:
- Semiconductors: NVDA → AVGO → TSM → LRCX (by market cap)
- Software - Infrastructure: MSFT → ORCL → ADBE (by market cap)
- Internet Retail: AMZN → SE → MELI (by market cap)
- Auto Manufacturers: TSLA → RIVN (by market cap)

Impact: Better user experience with most valuable companies first"

echo.
echo 🚀 Pushing to production...
git push origin main

echo.
echo ✅ Deployment completed!
echo 🔗 Production URL: https://romarin-hsieh.github.io/investment-dashboard/#/stock-overview
echo 💰 Expected: NVDA first in Semiconductors, MSFT first in Software - Infrastructure
echo 📊 Sorting: Sector → Industry → Market Cap (Large→Small) → Symbol (A→Z)

pause