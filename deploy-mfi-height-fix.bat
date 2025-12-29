@echo off
echo ========================================
echo MFI Volume Profile Complete Height Fix
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
start "" "test-mfi-container-height-fix.html"
echo.
echo 🔧 完整修正內容：
echo.
echo 第一階段修正 (已完成)：
echo • 移除 MFIVolumeProfilePanel 內部的 flex 限制
echo • chart-container 現在正確使用 600px 高度
echo.
echo 第二階段修正 (本次)：
echo • 移除 StockDetail.vue 中外層容器的高度限制
echo • insight-full-widget.mfi-volume-profile 從 750px → auto
echo • 所有響應式斷點都已更新 (650px/550px/500px → auto)
echo • 讓 MFI Volume Profile 完全展開 (954.52px)
echo.
echo 預期結果：
echo • 外層容器不再限制內容高度
echo • 所有 50 個 Volume Profile bins 完全可見
echo • 內容總高度約 954px，無截斷
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
git commit -m "🔧 Complete MFI Volume Profile Height Fix

完整解決方案：

第一階段 (MFIVolumeProfilePanel.vue)：
- 移除內部 flex 限制，確保 chart-container 使用完整 600px
- 修正 .volume-profile-chart 和 .chart-container 的 CSS
- 移除 .panel-content 的 height: 100%% 限制

第二階段 (StockDetail.vue)：
- 移除外層容器 .insight-full-widget.mfi-volume-profile 的高度限制
- 桌面版：750px → auto
- 平板版：650px → auto  
- 手機版：550px → auto
- 小螢幕：500px → auto

技術細節：
- MFI Volume Profile 內容總高度：~954px
  - metrics-header: ~120px
  - volume-profile-chart: 653.82px (header 52px + container 600px)
  - trading-signals: ~180px
- 外層容器現在能完全容納所有內容
- 50個 bins × 12px = 600px 完全展開
- 響應式設計保持正常

用戶體驗改善：
- 完整的 Volume Profile 視覺化
- 無內容截斷或滾動需求
- 所有設備都有良好顯示效果"

git push origin main
if %errorlevel% neq 0 (
    echo ❌ Git push failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Deployment complete!
echo.
echo ✅ MFI Volume Profile 完整高度修正已部署！
echo.
echo 🔗 Production URL: https://romarin1.github.io/investment-dashboard/
echo 🧪 Test Page: https://romarin1.github.io/investment-dashboard/test-mfi-container-height-fix.html
echo.
echo 驗證重點：
echo 1. 外層容器高度 ≥ 954px (不再限制為 750px)
echo 2. chart-container 高度 = 600px (50 bins × 12px)
echo 3. 所有內容完整可見，無截斷
echo 4. 響應式設計在所有設備正常
echo.
echo 高度分配：
echo • metrics-header: ~120px
echo • volume-profile-chart: 653.82px
echo • trading-signals: ~180px
echo • 總計: ~954px (完全展開)
echo.
pause