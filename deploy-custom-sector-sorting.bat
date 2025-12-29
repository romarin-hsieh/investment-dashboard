@echo off
echo ========================================
echo 🎯 Deploying Custom Sector Sorting
echo ========================================
echo.

echo 📝 Change Summary:
echo - Replaced alphabetical sector sorting with custom priority order
echo - Technology moved to #1 position (was #8)
echo - Financial Services moved to #2 position (was #5)
echo - Only display sectors that have tracked symbols
echo - Hide empty sectors (Consumer Defensive, Real Estate)
echo - Maintain alphabetical sorting within each sector
echo.

echo 🏢 New Sector Order:
echo 1. Technology (24 stocks)
echo 2. Financial Services (10 stocks)
echo 3. Consumer Cyclical (6 stocks)
echo 4. Communication Services (4 stocks)
echo 5. Healthcare (5 stocks)
echo 6. Industrials (8 stocks)
echo 7. Energy (6 stocks)
echo 8. Basic Materials (2 stocks)
echo 9. Utilities (2 stocks)
echo.
echo Hidden: Consumer Defensive, Real Estate (no stocks)
echo.

echo 🔧 Committing changes...
git add src/components/StockOverview.vue
git add test-sector-custom-sorting.html
git add deploy-custom-sector-sorting.bat

git commit -m "🎯 Implement custom sector sorting in StockOverview

- Replace alphabetical sorting with business-priority order
- Technology sector moved to #1 position (most important)
- Financial Services moved to #2 position
- Only display sectors with tracked symbols
- Hide empty sectors (Consumer Defensive, Real Estate)
- Maintain stock alphabetical sorting within sectors

New order: Technology → Financial Services → Consumer Cyclical → 
Communication Services → Healthcare → Industrials → Energy → 
Basic Materials → Utilities

Impact: Better user experience with most relevant sectors first"

echo.
echo 🚀 Pushing to production...
git push origin main

echo.
echo ✅ Deployment completed!
echo 🔗 Production URL: https://romarin-hsieh.github.io/investment-dashboard/#/stock-overview
echo 🎯 Expected: Technology sector appears first with 24 stocks including RR
echo 📊 Total visible sectors: 9 (empty sectors hidden)

pause