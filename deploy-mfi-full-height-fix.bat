@echo off
echo ========================================
echo MFI Volume Profile Full Height Fix Deployment
echo ========================================
echo.

echo [1/4] Building project...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Opening test page...
start "" "test-mfi-volume-profile-full-height.html"
echo.
echo ✅ 修改內容：
echo • 移除 chart-container 的 max-height 限制
echo • 移除 overflow-y: auto 滾動條
echo • 新增動態高度計算 (binCount * binHeight)
echo • 所有響應式斷點都已更新
echo.
set /p continue="Continue with deployment? (y/n): "
if /i "%continue%" neq "y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

echo.
echo [3/4] Deploying to GitHub Pages...
git add .
git commit -m "📊 MFI Volume Profile Full Height Expansion

修改內容：
- 移除 chart-container 的 max-height 和 overflow-y 限制
- 新增 totalChartHeight computed property 動態計算高度
- 圖表容器現在根據 bin 數量 (預設50) 自動展開
- 使用者無需滾動即可看到完整的 Volume Profile
- 保持響應式設計，所有螢幕尺寸都支援完全展開
- 最小高度保護確保在數據較少時仍有合理顯示

技術實現：
- totalChartHeight = Math.max(binCount * binHeight, 300)
- 移除所有 max-height 和 overflow-y 限制
- 響應式斷點全部更新支援完全展開"

git push origin main
if %errorlevel% neq 0 (
    echo ❌ Git push failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Deployment complete!
echo.
echo ✅ MFI Volume Profile 完全展開功能已部署！
echo.
echo 🔗 Production URL: https://romarin1.github.io/investment-dashboard/
echo 📊 測試方式：進入任一 StockDetail 頁面查看 MFI Volume Profile 區塊
echo.
echo 預期效果：
echo • Volume Profile 圖表完全展開，無滾動條
echo • 50個 bins 全部可見，無需滾動
echo • 響應式設計在所有設備上都正常工作
echo • 圖表高度 = bin數量 × 12px (預設) + header
echo.
pause