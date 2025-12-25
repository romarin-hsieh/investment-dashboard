# 🚀 部署到正式環境 (GitHub Pages)
Write-Host "🚀 部署到正式環境 (GitHub Pages)" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# 檢查 Git 狀態
Write-Host "📋 檢查 Git 狀態..." -ForegroundColor Cyan
$gitStatus = git status --porcelain
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git 倉庫狀態異常" -ForegroundColor Red
    Read-Host "按 Enter 鍵退出"
    exit 1
}

# 檢查是否有未提交的變更
$changes = ($gitStatus | Measure-Object).Count
if ($changes -gt 0) {
    Write-Host "⚠️ 發現 $changes 個未提交的變更" -ForegroundColor Yellow
    Write-Host "📝 變更檔案:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $commitChoice = Read-Host "是否要提交這些變更? (y/N)"
    if ($commitChoice -eq "y" -or $commitChoice -eq "Y") {
        Write-Host "📝 提交變更..." -ForegroundColor Cyan
        git add .
        git commit -m "🚀 Production deployment: Update sector industry data with 24 stocks and deployment guide"
        Write-Host "✅ 變更已提交" -ForegroundColor Green
    } else {
        Write-Host "❌ 請先處理未提交的變更" -ForegroundColor Red
        Read-Host "按 Enter 鍵退出"
        exit 1
    }
}

# 檢查當前分支
$currentBranch = git branch --show-current
Write-Host "📍 當前分支: $currentBranch" -ForegroundColor Cyan

if ($currentBranch -ne "main") {
    Write-Host "⚠️ 不在 main 分支上" -ForegroundColor Yellow
    $switchChoice = Read-Host "是否切換到 main 分支? (y/N)"
    if ($switchChoice -eq "y" -or $switchChoice -eq "Y") {
        git checkout main
        Write-Host "✅ 已切換到 main 分支" -ForegroundColor Green
    } else {
        Write-Host "❌ 請切換到 main 分支後再部署" -ForegroundColor Red
        Read-Host "按 Enter 鍵退出"
        exit 1
    }
}

# 拉取最新變更
Write-Host "🔄 拉取最新變更..." -ForegroundColor Cyan
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 拉取失敗，請檢查網路連接或解決衝突" -ForegroundColor Red
    Read-Host "按 Enter 鍵退出"
    exit 1
}

# 安裝依賴
Write-Host "📦 安裝依賴..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 依賴安裝失敗" -ForegroundColor Red
    Read-Host "按 Enter 鍵退出"
    exit 1
}

# 建置專案
Write-Host "🔨 建置專案..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 建置失敗" -ForegroundColor Red
    Read-Host "按 Enter 鍵退出"
    exit 1
}

# 檢查建置結果
if (-not (Test-Path "dist\index.html")) {
    Write-Host "❌ 建置產物不完整" -ForegroundColor Red
    Read-Host "按 Enter 鍵退出"
    exit 1
}

Write-Host "✅ 建置完成" -ForegroundColor Green

# 推送到 main 分支 (觸發 GitHub Actions)
Write-Host "📤 推送到 main 分支..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 推送失敗" -ForegroundColor Red
    Read-Host "按 Enter 鍵退出"
    exit 1
}

Write-Host "✅ 推送完成" -ForegroundColor Green
Write-Host ""

# 部署狀態資訊
Write-Host "🎯 部署狀態檢查:" -ForegroundColor Green
Write-Host "   1. GitHub Actions 將自動觸發" -ForegroundColor White
Write-Host "   2. 靜態資料將自動更新 (24 組股票)" -ForegroundColor White
Write-Host "   3. 網站將部署到 gh-pages 分支" -ForegroundColor White
Write-Host ""

Write-Host "🌐 部署完成後可訪問:" -ForegroundColor Green
Write-Host "   - 主網站: https://your-username.github.io/investment-dashboard/" -ForegroundColor Cyan
Write-Host "   - 資料 API: https://your-username.github.io/investment-dashboard/data/sector_industry.json" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 監控連結:" -ForegroundColor Green
Write-Host "   - GitHub Actions: https://github.com/your-username/investment-dashboard/actions" -ForegroundColor Cyan
Write-Host "   - 部署狀態: https://github.com/your-username/investment-dashboard/deployments" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 24 組股票資料已準備:" -ForegroundColor Green
Write-Host "   - Technology (11): PL, ONDS, MDB, ORCL, TSM, CRM, NVDA, AVGO, CRWV, IONQ, PLTR" -ForegroundColor White
Write-Host "   - Communication Services (4): ASTS, GOOG, META, NFLX" -ForegroundColor White
Write-Host "   - Consumer Cyclical (3): RIVN, AMZN, TSLA" -ForegroundColor White
Write-Host "   - Industrials (3): RDW, AVAV, RKLB" -ForegroundColor White
Write-Host "   - Energy (2): LEU, SMR" -ForegroundColor White
Write-Host "   - Healthcare (1): HIMS" -ForegroundColor White
Write-Host ""

Write-Host "✅ 正式環境部署流程完成！" -ForegroundColor Green
Write-Host ""
Read-Host "按 Enter 鍵退出"