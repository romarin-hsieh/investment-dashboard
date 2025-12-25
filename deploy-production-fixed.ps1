# Production Deployment Script
Write-Host "Starting Production Deployment..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Yellow
Write-Host ""

# Check Git status
Write-Host "Checking Git status..." -ForegroundColor Cyan
$gitStatus = git status --porcelain
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git repository status error" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check for uncommitted changes
$changes = ($gitStatus | Measure-Object).Count
if ($changes -gt 0) {
    Write-Host "Found $changes uncommitted changes" -ForegroundColor Yellow
    Write-Host "Changed files:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $commitChoice = Read-Host "Commit these changes? (y/N)"
    if ($commitChoice -eq "y" -or $commitChoice -eq "Y") {
        Write-Host "Committing changes..." -ForegroundColor Cyan
        git add .
        git commit -m "Production deployment: Update sector industry data with 24 stocks"
        Write-Host "Changes committed" -ForegroundColor Green
    } else {
        Write-Host "Please handle uncommitted changes first" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Check current branch
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan

if ($currentBranch -ne "main") {
    Write-Host "Not on main branch" -ForegroundColor Yellow
    $switchChoice = Read-Host "Switch to main branch? (y/N)"
    if ($switchChoice -eq "y" -or $switchChoice -eq "Y") {
        git checkout main
        Write-Host "Switched to main branch" -ForegroundColor Green
    } else {
        Write-Host "Please switch to main branch before deployment" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Pull latest changes
Write-Host "Pulling latest changes..." -ForegroundColor Cyan
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Pull failed, please check network or resolve conflicts" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Dependency installation failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Build project
Write-Host "Building project..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check build output
if (-not (Test-Path "dist\index.html")) {
    Write-Host "Build output incomplete" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Build completed" -ForegroundColor Green

# Push to main branch (triggers GitHub Actions)
Write-Host "Pushing to main branch..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Push completed" -ForegroundColor Green
Write-Host ""

# Deployment status info
Write-Host "Deployment Status Check:" -ForegroundColor Green
Write-Host "   1. GitHub Actions will trigger automatically" -ForegroundColor White
Write-Host "   2. Static data will update (24 stocks)" -ForegroundColor White
Write-Host "   3. Website will deploy to gh-pages branch" -ForegroundColor White
Write-Host ""

Write-Host "Access after deployment:" -ForegroundColor Green
Write-Host "   - Main site: https://romarin-hsieh.github.io/investment-dashboard/" -ForegroundColor Cyan
Write-Host "   - Data API: https://romarin-hsieh.github.io/investment-dashboard/data/sector_industry.json" -ForegroundColor Cyan
Write-Host ""

Write-Host "Monitoring links:" -ForegroundColor Green
Write-Host "   - GitHub Actions: https://github.com/romarin-hsieh/investment-dashboard/actions" -ForegroundColor Cyan
Write-Host "   - Deployment status: https://github.com/romarin-hsieh/investment-dashboard/deployments" -ForegroundColor Cyan
Write-Host ""

Write-Host "Production deployment process completed!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"