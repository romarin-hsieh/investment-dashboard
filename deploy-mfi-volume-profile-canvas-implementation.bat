@echo off
echo ========================================
echo MFI Volume Profile Canvas Implementation Deployment
echo ========================================

echo.
echo Building application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo ✅ Build successful!

echo.
echo Deploying to GitHub Pages...
git add .
git commit -m "feat: implement MFI Volume Profile Canvas with volume-weighted averaging

Major improvements to MFI Volume Profile widget:

🔧 Volume-Weighted MFI Averaging:
- Replace count-based averaging with volume-weighted calculation
- More accurate representation: Σ(mfi * volume) / Σ(volume)
- Legacy fallback mode for backward compatibility
- Better alignment with Pine Script methodology

🎨 Canvas Horizontal Volume Profile:
- Replace time-series histogram with proper price-based display
- Horizontal bars showing volume distribution by price level
- Three-segment bars: sell (red) | neutral (gray) | buy (green)
- Interactive tooltips with complete bin information
- POC and Value Area markers
- MFI heat overlay for visual sentiment indication

🖥️ Enhanced UI/UX:
- Desktop: left K-line chart, right Canvas volume profile
- Mobile: responsive vertical stacking
- All volume bars visible and readable on desktop
- Price labels (left) and volume labels (right)
- Click-to-pin tooltips for detailed analysis

⚙️ Technical Features:
- Feature flag for easy rollback (useCanvasVolumeProfile)
- High-DPI Canvas rendering with devicePixelRatio
- Efficient ResizeObserver for responsive updates
- Maintains existing widget API and structure
- No breaking changes

🧪 Testing:
- Comprehensive test suite for all features
- Manual testing guide for visual verification
- Performance optimizations implemented
- Backward compatibility verified

This implementation provides a more accurate and visually intuitive 
Volume Profile that properly represents price-based volume distribution
rather than time-based histogram display."

git push origin main
if %ERRORLEVEL% neq 0 (
    echo ❌ Push to main failed!
    pause
    exit /b 1
)

echo.
echo Deploying to gh-pages...
git subtree push --prefix dist origin gh-pages
if %ERRORLEVEL% neq 0 (
    echo ❌ Deploy to gh-pages failed!
    pause
    exit /b 1
)

echo.
echo ✅ MFI Volume Profile Canvas Implementation deployed successfully!
echo.
echo 🧪 Testing Guide:
echo.
echo 1. Desktop Testing (≥1024px):
echo    - Navigate to stock detail page with MFI Volume Profile widget
echo    - Verify left K-line chart, right Canvas volume profile layout
echo    - Check all volume bars are visible and readable
echo    - Test hover tooltips and click-to-pin functionality
echo    - Verify POC markers and Value Area highlighting
echo.
echo 2. Mobile Testing (<1024px):
echo    - Verify responsive vertical stacking
echo    - Check Canvas functionality on touch devices
echo    - Test tooltip interaction on mobile
echo.
echo 3. Feature Flag Testing:
echo    - Test useCanvasVolumeProfile=false for histogram fallback
echo    - Test mfiAvgMode='legacy' for old averaging method
echo    - Verify easy rollback capability
echo.
echo 4. Volume-Weighted MFI Verification:
echo    - Compare MFI values with legacy mode
echo    - Verify high-volume periods have more influence
echo    - Check MFI values remain in [0, 100] range
echo.
echo 📊 Key Improvements:
echo    ✅ More accurate volume-weighted MFI averaging
echo    ✅ Proper horizontal Volume Profile display
echo    ✅ Enhanced visual clarity and information density
echo    ✅ Better alignment with professional trading tools
echo    ✅ Maintained backward compatibility
echo.
pause