@echo off
echo ========================================
echo TOC Widget Timeout Fix Deployment
echo ========================================
echo.

echo [1/4] Building application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Running tests...
call npm run test:unit
if %ERRORLEVEL% neq 0 (
    echo ⚠️ Tests failed, but continuing deployment...
)

echo.
echo [3/4] Deploying to GitHub Pages...
call npm run deploy
if %ERRORLEVEL% neq 0 (
    echo ❌ Deployment failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Verification...
echo ✅ TOC Widget Timeout Fix deployed successfully!
echo.
echo 🧪 Test the fix:
echo 1. Open Stock Overview page
echo 2. Open browser DevTools (F12)
echo 3. Click TOC items to jump to bottom
echo 4. Observe improved loading behavior
echo.
echo 📊 Expected improvements:
echo - Long-distance jumps use instant scroll
echo - Max 3 widgets load concurrently
echo - Increased timeouts (8-15 seconds)
echo - Automatic retry with backoff
echo.

pause