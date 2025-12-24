# Investment Dashboard - GitHub Pages 部署腳本 (PowerShell)

Write-Host "🚀 開始部署 Investment Dashboard 到 GitHub Pages..." -ForegroundColor Green

# 檢查 Node.js 是否安裝
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 錯誤: Node.js 未安裝或不在 PATH 中" -ForegroundColor Red
    exit 1
}

# 檢查 npm 是否可用
try {
    $npmVersion = npm --version
    Write-Host "✅ npm 版本: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 錯誤: npm 未安裝或不在 PATH 中" -ForegroundColor Red
    exit 1
}

# 安裝依賴
Write-Host "📦 安裝依賴..." -ForegroundColor Yellow
try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
    Write-Host "✅ 依賴安裝成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 依賴安裝失敗: $_" -ForegroundColor Red
    exit 1
}

# 構建項目
Write-Host "🔨 構建項目..." -ForegroundColor Yellow
try {
    $env:NODE_ENV = "production"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
    Write-Host "✅ 構建成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 構建失敗: $_" -ForegroundColor Red
    exit 1
}

# 檢查構建結果
if (-not (Test-Path "dist")) {
    Write-Host "❌ 構建失敗: dist 文件夾不存在" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "dist\index.html")) {
    Write-Host "❌ 構建失敗: index.html 不存在" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 構建驗證成功!" -ForegroundColor Green
Write-Host "📁 構建文件:" -ForegroundColor Cyan
Get-ChildItem dist | Format-Table Name, Length, LastWriteTime

# 提交並推送到 GitHub
Write-Host "📤 推送到 GitHub..." -ForegroundColor Yellow
try {
    git add .
    $commitMessage = "Deploy: Update Investment Dashboard with Auto Update System $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    git commit -m $commitMessage
    git push origin main
    
    if ($LASTEXITCODE -ne 0) { throw "git push failed" }
    Write-Host "✅ Git 推送成功" -ForegroundColor Green
} catch {
    Write-Host "❌ Git 推送失敗: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 部署完成!" -ForegroundColor Green
Write-Host "🌐 網站將在幾分鐘內更新: https://romarin-hsieh.github.io/investment-dashboard/" -ForegroundColor Cyan
Write-Host "📊 檢查部署狀態: https://github.com/romarin-hsieh/investment-dashboard/actions" -ForegroundColor Cyan

# 等待用戶按鍵
Write-Host "按任意鍵繼續..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")