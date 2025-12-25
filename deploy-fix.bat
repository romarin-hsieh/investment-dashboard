@echo off
echo Deploying Metadata Display Fix to Production
echo ==========================================
echo.
echo Fixed Issues:
echo - CRM shows "Software - Application"
echo - IONQ shows "Computer Hardware"  
echo - PL shows "NYSE" exchange
echo - All stocks display correct industry and exchange info
echo.

REM Check Git status
echo Checking Git status...
git status --porcelain > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git not available
    pause
    exit /b 1
)

REM Check for uncommitted changes
for /f %%i in ('git status --porcelain 2^>nul ^| find /c /v ""') do set changes=%%i
if %changes% gtr 0 (
    echo Found %changes% uncommitted changes
    echo.
    git status --short
    echo.
    set /p confirm="Commit and deploy? (y/n): "
    if /i not "!confirm!"=="y" (
        echo Deployment cancelled
        pause
        exit /b 1
    )
) else (
    echo No uncommitted changes found
)

REM Pull latest changes
echo.
echo Pulling latest changes...
git pull origin main --no-edit
if %errorlevel% neq 0 (
    echo ERROR: Failed to pull changes
    echo Please resolve conflicts manually and try again
    pause
    exit /b 1
)

REM Commit changes if any
if %changes% gtr 0 (
    echo.
    echo Committing changes...
    git add .
    git commit -m "Fix metadata display issues - CRM, IONQ, PL exchange info"
    if %errorlevel% neq 0 (
        echo ERROR: Commit failed
        pause
        exit /b 1
    )
    echo Changes committed successfully
)

REM Push to GitHub
echo.
echo Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo ERROR: Push failed
    pause
    exit /b 1
)

echo.
echo SUCCESS: Deployed to GitHub!
echo.
echo GitHub Actions will deploy to production automatically
echo Production URL: https://romarin-hsieh.github.io/investment-dashboard/
echo.
echo Wait 2-3 minutes for deployment to complete
echo Clear browser cache (Ctrl+F5) if needed
echo.
echo Monitor deployment: https://github.com/romarin-hsieh/investment-dashboard/actions
echo.
pause