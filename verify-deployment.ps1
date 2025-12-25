# 🔍 部署驗證腳本
Write-Host "🔍 正式環境部署驗證" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Yellow
Write-Host ""

# 配置
$baseUrl = "https://romarin-hsieh.github.io/investment-dashboard"
$dataUrl = "$baseUrl/data/sector_industry.json"
$fallbackUrl = "$baseUrl/data/symbols_metadata.json"

# 測試函數
function Test-Url {
    param($url, $description)
    
    try {
        Write-Host "🔍 測試 $description..." -ForegroundColor Cyan
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $description 可訪問 (HTTP $($response.StatusCode))" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $description 錯誤 (HTTP $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $description 連接失敗: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-JsonData {
    param($url, $description)
    
    try {
        Write-Host "📊 測試 $description..." -ForegroundColor Cyan
        $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 10
        
        if ($response.items -and $response.sector_grouping) {
            $itemCount = $response.items.Count
            $sectorCount = $response.sector_grouping.PSObject.Properties.Count
            Write-Host "✅ $description 資料正常 ($itemCount 個股票, $sectorCount 個 Sector)" -ForegroundColor Green
            
            # 顯示資料統計
            if ($response.refresh_metadata) {
                $updateSource = $response.refresh_metadata.update_source
                $lastUpdate = $response.as_of
                Write-Host "   📅 最後更新: $lastUpdate" -ForegroundColor White
                Write-Host "   🔄 資料來源: $updateSource" -ForegroundColor White
            }
            
            return $true
        } else {
            Write-Host "❌ $description 資料結構不完整" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $description 資料載入失敗: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 開始驗證
Write-Host "🚀 開始驗證部署狀態..." -ForegroundColor Green
Write-Host ""

$results = @()

# 測試 1: 主網站
$results += Test-Url $baseUrl "主網站"

# 測試 2: 主要資料檔案
$results += Test-JsonData $dataUrl "主要資料檔案"

# 測試 3: 回退資料檔案
$results += Test-JsonData $fallbackUrl "回退資料檔案"

# 測試 4: 特定頁面
$pages = @(
    @{ url = "$baseUrl/#/market-dashboard"; name = "Market Dashboard" },
    @{ url = "$baseUrl/#/stock-dashboard"; name = "Stock Dashboard" },
    @{ url = "$baseUrl/#/stock/AAPL"; name = "股票詳細頁面" }
)

foreach ($page in $pages) {
    $results += Test-Url $page.url $page.name
}

Write-Host ""
Write-Host "📊 驗證結果摘要:" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Yellow

$successCount = ($results | Where-Object { $_ -eq $true }).Count
$totalCount = $results.Count
$successRate = [math]::Round(($successCount / $totalCount) * 100, 1)

if ($successRate -eq 100) {
    Write-Host "✅ 所有測試通過 ($successCount/$totalCount)" -ForegroundColor Green
    Write-Host "🎉 部署驗證成功！網站已準備就緒" -ForegroundColor Green
} elseif ($successRate -ge 80) {
    Write-Host "⚠️ 部分測試通過 ($successCount/$totalCount, $successRate%)" -ForegroundColor Yellow
    Write-Host "🔧 建議檢查失敗的項目" -ForegroundColor Yellow
} else {
    Write-Host "❌ 多數測試失敗 ($successCount/$totalCount, $successRate%)" -ForegroundColor Red
    Write-Host "🚨 部署可能存在問題，請檢查" -ForegroundColor Red
}

Write-Host ""
Write-Host "🌐 網站連結:" -ForegroundColor Green
Write-Host "   - 主網站: $baseUrl" -ForegroundColor Cyan
Write-Host "   - Market Dashboard: $baseUrl/#/market-dashboard" -ForegroundColor Cyan
Write-Host "   - Stock Dashboard: $baseUrl/#/stock-dashboard" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 資料 API:" -ForegroundColor Green
Write-Host "   - 主要資料: $dataUrl" -ForegroundColor Cyan
Write-Host "   - 回退資料: $fallbackUrl" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔧 如果發現問題:" -ForegroundColor Yellow
Write-Host "   1. 檢查 GitHub Actions 執行狀態" -ForegroundColor White
Write-Host "   2. 確認 gh-pages 分支已更新" -ForegroundColor White
Write-Host "   3. 清除瀏覽器快取後重試" -ForegroundColor White
Write-Host "   4. 檢查 DNS 傳播狀態" -ForegroundColor White
Write-Host ""

Read-Host "按 Enter 鍵退出"