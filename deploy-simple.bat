@echo off
chcp 65001 >nul
echo 🚀 Starting Production Deployment...
echo ====================================
echo.

echo 📋 Step 1: Checking Git status...
git status --short
if %errorlevel% neq 0 (
    echo ❌ Git error
    pause
    exit /b 1
)

echo.
echo 📝 Step 2: Adding and committing changes...
git add .
git commit -m "🚀 Production deployment: 24 stocks data ready"
echo ✅ Changes committed

echo.
echo 🔄 Step 3: Ensuring on main branch...
git checkout main
git pull origin main
if %errorlevel% neq 0 (
    echo ❌ Git pull failed
    pause
    exit /b 1
)
echo ✅ On main branch and up to date

echo.
echo 📦 Step 4: Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)
echo ✅ Dependencies installed

echo.
echo 🔨 Step 5: Building project...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)
echo ✅ Build completed

echo.
echo 📤 Step 6: Pushing to trigger deployment...
git push origin main
if %errorlevel% neq 0 (
    echo ❌ Push failed
    pause
    exit /b 1
)
echo ✅ Push completed

echo.
echo 🎉 Deployment initiated successfully!
echo.
echo 📊 What happens next:
echo    1. GitHub Actions will automatically trigger
echo    2. Your 24 stocks data will be deployed
echo    3. Website will be available in 5-10 minutes
echo.
echo 🌐 Check these links:
echo    - Website: https://romarin-hsieh.github.io/investment-dashboard/
echo    - Actions: https://github.com/romarin-hsieh/investment-dashboard/actions
echo.
echo ✅ Deployment process completed!
pause