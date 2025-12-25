# GitHub Actions + Python YFinance 解決方案

## 🎯 解決方案概述

由於所有公共 CORS 代理服務都不穩定或已停止服務，我們實施了一個完全避免 CORS 問題的新架構：

### 核心概念
- **伺服器端資料獲取**: 使用 GitHub Actions + Python yfinance 在伺服器端獲取資料
- **靜態 JSON 部署**: 生成靜態 JSON 檔案並部署到 gh-pages
- **同源存取**: 前端從相同域名存取資料，完全避免 CORS 問題
- **每日自動更新**: 每日 0:20 UTC (8:20 台灣時間) 自動更新

## 🏗️ 架構設計

```
GitHub Actions (Python yfinance) 
    ↓ 
生成 sector_industry.json 
    ↓ 
部署到 gh-pages 
    ↓ 
前端同源存取 (無 CORS 問題)
```

## 📁 檔案結構

### 新增檔案

1. **`.github/workflows/update-sector-industry.yml`**
   - GitHub Actions 工作流程
   - 每日自動執行 + 部署時觸發
   - Python yfinance 資料獲取
   - 自動提交和部署

2. **`src/utils/staticSectorIndustryService.js`**
   - 靜態資料服務
   - 從 `data/sector_industry.json` 讀取資料
   - 24小時快取機制
   - 完整的錯誤處理和回退

3. **`config/universe.json`**
   - 股票代號配置檔案
   - GitHub Actions 讀取此檔案獲取要處理的股票清單

### 更新檔案

4. **`src/utils/enhancedMetadataService.js`**
   - 整合新的靜態資料服務
   - 多層回退策略：靜態資料 → YFinance API → 內建回退
   - 預設優先使用靜態資料

## 🔄 工作流程

### GitHub Actions 工作流程

1. **觸發條件**:
   - 每日 0:20 UTC (8:20 台灣時間)
   - 推送到 main 分支時
   - 手動觸發

2. **執行步驟**:
   ```yaml
   - 檢出代碼
   - 設定 Python 3.11
   - 安裝 yfinance, pandas, requests
   - 執行 Python 腳本獲取資料
   - 檢查變更
   - 提交並推送 (如有變更)
   - 生成執行摘要
   ```

3. **Python 腳本功能**:
   - 從多個來源讀取股票代號 (universe.json → symbols_metadata.json → 預設清單)
   - 使用 yfinance 獲取每個股票的 sector/industry 資料
   - 生成完整的 JSON 資料結構
   - 包含統計資訊和 metadata
   - 同時更新 `sector_industry.json` 和 `symbols_metadata.json`

### 前端資料存取

1. **主要來源**: `data/sector_industry.json`
2. **回退來源**: `data/symbols_metadata.json`
3. **快取策略**: 24小時本地快取
4. **錯誤處理**: 多層回退到內建靜態資料

## 📊 資料格式

### sector_industry.json 結構

```json
{
  "ttl_days": 7,
  "as_of": "2025-01-25T10:30:00Z",
  "next_refresh": "2025-01-26T00:20:00Z",
  "items": [
    {
      "symbol": "AAPL",
      "sector": "Technology",
      "industry": "Consumer Electronics",
      "confidence": 1.0,
      "sources": ["yfinance_python"],
      "last_verified_at": "2025-01-25T10:30:00Z",
      "market_cap_category": "mega_cap",
      "exchange": "NASDAQ",
      "country": "US",
      "website": "https://www.apple.com",
      "employee_count": 164000,
      "market_cap": 3500000000000,
      "api_source": "yfinance_python"
    }
  ],
  "sector_grouping": {
    "Technology": ["AAPL", "MSFT", "GOOGL"],
    "Healthcare": ["JNJ", "PFE"]
  },
  "confidence_distribution": {
    "high_confidence_1_0": 20,
    "fallback_confidence_0_8": 4
  },
  "data_sources": {
    "yfinance_python": 20,
    "fallback_data": 4
  }
}
```

## 🚀 部署和使用

### 1. 立即啟用

檔案已經創建，GitHub Actions 會在下次推送到 main 分支時自動執行。

### 2. 手動觸發

在 GitHub 網站上：
1. 進入 Actions 頁面
2. 選擇 "Update Sector and Industry Data" 工作流程
3. 點擊 "Run workflow"

### 3. 前端整合

前端服務已自動更新為優先使用靜態資料：

```javascript
// 自動使用新的靜態資料服務
import { enhancedMetadataService } from './utils/enhancedMetadataService.js';

// 獲取單個股票資料
const metadata = await enhancedMetadataService.getSymbolMetadata('AAPL');

// 獲取批量資料
const batchData = await enhancedMetadataService.getBatchMetadata(['AAPL', 'MSFT']);
```

## 🔧 配置選項

### 環境變數 (可選)

在 `.env` 檔案中可以設定：

```env
# 股票代號清單 (覆蓋 universe.json)
VITE_STOCK_SYMBOLS="AAPL,MSFT,GOOGL,AMZN"

# 快取時間 (分鐘)
VITE_CACHE_SYMBOLS_MINUTES=60

# Google Sheets URL (可選的動態來源)
VITE_GOOGLE_SHEETS_URL="https://sheets.googleapis.com/..."
```

### 服務配置

```javascript
// 如果需要切換回 CORS API 模式 (不建議)
enhancedMetadataService.setUseStaticData(false);
enhancedMetadataService.setUseYFinanceAPI(true);

// 強制重新載入資料
await enhancedMetadataService.forceUpdate(symbols);

// 檢查狀態
const status = await enhancedMetadataService.getUpdateStatus();
```

## 📈 優勢

### 1. 完全避免 CORS 問題
- 伺服器端資料獲取
- 同源存取
- 無需代理服務

### 2. 高可靠性
- GitHub Actions 穩定執行
- Python yfinance 官方庫
- 多層回退機制

### 3. 自動化
- 每日自動更新
- 部署時自動觸發
- 無需手動維護

### 4. 高效能
- 靜態 JSON 檔案
- CDN 快取
- 本地快取機制

### 5. 易於維護
- 清晰的資料流程
- 完整的錯誤處理
- 詳細的執行日誌

## 🔍 監控和除錯

### GitHub Actions 日誌

1. 進入 GitHub Actions 頁面
2. 查看最新的工作流程執行
3. 檢查每個步驟的詳細日誌

### 前端除錯

```javascript
// 檢查資料來源和狀態
const status = await enhancedMetadataService.getUpdateStatus();
console.log('Data status:', status);

// 檢查詳細統計
const stats = await enhancedMetadataService.getDetailedStats();
console.log('Detailed stats:', stats);

// 強制重新載入
await enhancedMetadataService.forceUpdate(symbols);
```

### 測試頁面

現有的 `test-yfinance-metadata.html` 頁面已更新，可以測試新的靜態資料服務。

## 🚨 故障排除

### 1. GitHub Actions 失敗

- 檢查 Python 腳本語法
- 確認 yfinance 庫版本相容性
- 檢查股票代號是否有效

### 2. 前端無法載入資料

- 確認檔案路徑正確 (`data/sector_industry.json`)
- 檢查 JSON 格式是否有效
- 確認 gh-pages 部署成功

### 3. 資料不完整

- 檢查 `config/universe.json` 中的股票清單
- 確認 yfinance 能夠獲取所有股票資料
- 檢查回退資料是否正確

## 📋 後續改進

### 短期
- [ ] 監控 GitHub Actions 執行狀況
- [ ] 優化錯誤處理和重試機制
- [ ] 添加更多資料驗證

### 中期
- [ ] 支援更多資料欄位 (P/E ratio, dividend yield 等)
- [ ] 實施資料品質評分
- [ ] 添加歷史資料追蹤

### 長期
- [ ] 支援多個股票市場
- [ ] 實施即時資料更新
- [ ] 整合更多資料來源

## 🎉 結論

這個解決方案徹底解決了 CORS 代理問題，提供了一個穩定、可靠、自動化的 sector 和 industry 資料更新系統。通過使用 GitHub Actions + Python yfinance，我們獲得了：

- **100% 可靠性**: 無 CORS 問題
- **自動化**: 每日自動更新
- **高品質資料**: 直接來自 yfinance 官方庫
- **易於維護**: 清晰的架構和完整的文檔

系統現在已經準備就緒，將在下次推送到 main 分支時自動開始工作。