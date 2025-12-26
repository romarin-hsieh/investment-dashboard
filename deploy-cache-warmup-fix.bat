@echo off
echo ========================================
echo 🔥 Cache Warmup Service Fix Deployment
echo ========================================
echo.

echo 📋 修復內容:
echo - 修復 cacheWarmupService 過度預熱問題
echo - 開發模式下默認不預熱
echo - 提高預熱觸發條件
echo - 延長預熱間隔到 24 小時
echo.

echo 🔍 檢查修改的文件...
git status --porcelain

echo.
echo 📝 添加修改的文件...
git add src/utils/cacheWarmupService.js
git add deploy-cache-warmup-fix.bat

echo.
echo 💾 提交變更...
git commit -m "🔥 Fix cache warmup service over-eager loading

✅ Cache Warmup Service Optimization:
- Prevent automatic warmup in development mode
- Only warmup when explicitly requested (?warmup=1)
- Increase cache coverage threshold from 80% to 90%
- Extend warmup interval from 6h to 24h
- Skip warmup on errors to avoid user experience issues

🎯 Expected Results:
- StockDetail pages only load current stock data
- Development environment: no automatic warmup
- Production environment: smarter warmup decisions
- Reduced network requests and improved performance

🧪 Test:
- Normal: http://localhost:3000/#/stock-overview/symbols/NFLX
- Force warmup: http://localhost:3000/#/stock-overview/symbols/NFLX?warmup=1"

if %ERRORLEVEL% neq 0 (
    echo ❌ 提交失敗
    pause
    exit /b 1
)

echo.
echo 🌐 推送到 GitHub...
git push

if %ERRORLEVEL% neq 0 (
    echo ❌ 推送失敗
    pause
    exit /b 1
)

echo.
echo ✅ 部署成功！
echo.
echo 📊 修復摘要:
echo - ✅ 開發模式不再自動預熱
echo - ✅ StockDetail 只載入當前股票數據
echo - ✅ 大幅減少不必要的網路請求
echo - ✅ 更智能的緩存預熱策略
echo.
echo 🔗 測試連結:
echo - 正常模式: http://localhost:3000/#/stock-overview/symbols/NFLX
echo - 強制預熱: http://localhost:3000/#/stock-overview/symbols/NFLX?warmup=1
echo - Market Overview: http://localhost:3000/#/market-dashboard
echo - Stock Overview: http://localhost:3000/#/stock-overview
echo.
echo 🚀 GitHub Actions 將自動部署到正式環境 (2-3 分鐘)
echo 📱 正式環境: https://romarin-hsieh.github.io/investment-dashboard/
echo.

pause