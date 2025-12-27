# Symbol Management Guide - 新增追蹤股票完整指南

## 📋 概述

本文件詳細說明如何在投資儀表板中新增追蹤的股票代號（symbol），包含所有需要修改的檔案、執行的操作，以及相關的快取機制。

**重要提醒**: 這是網站維護的核心文件，未來新增 symbol 時請嚴格按照此指南執行。

---

## 🏗️ 系統架構概覽

### 資料流程
```
config/universe.json → GitHub Actions → public/data/*.json → Frontend Components
```

### 快取層級
1. **前端快取**: `symbolsConfig.js` (60分鐘)
2. **靜態資料快取**: `staticSectorIndustryService.js` (24小時)
3. **GitHub Actions**: 每日自動更新 (0:20 UTC)

---

## 📁 需要修改的檔案清單

### 1. 核心配置檔案 (必須修改)

#### `config/universe.json`
- **作用**: 主要的股票代號配置檔案
- **格式**: JSON 陣列
- **GitHub Actions 依賴**: ✅ 是
- **修改方式**: 直接編輯 `symbols` 陣列

#### `src/utils/symbolsConfig.js`
- **作用**: 前端股票代號管理器
- **修改位置**: `getStaticSymbols()` 方法中的 fallback 陣列
- **快取時間**: 60分鐘 (可透過 `VITE_CACHE_SYMBOLS_MINUTES` 環境變數調整)

### 2. 自動更新腳本 (建議同步修改)

#### `scripts/update-metadata-python.py`
- **作用**: Python 版本的 metadata 更新腳本
- **修改位置**: `get_fallback_metadata()` 方法中的 `fallback_data` 字典

#### `scripts/update-yfinance-metadata.js`
- **作用**: JavaScript 版本的 metadata 更新腳本
- **修改位置**: `getFallbackMetadata()` 方法中的 `fallbackData` 物件

#### `src/utils/staticSectorIndustryService.js`
- **作用**: 靜態資料服務
- **修改位置**: `getMinimalFallbackData()` 方法中的 fallback 資料

### 3. GitHub Actions 工作流程 (無需修改)

#### `.github/workflows/update-sector-industry.yml`
- **觸發時機**: 每日 0:20 UTC / 推送到 main 分支
- **自動讀取**: `config/universe.json`

#### `.github/workflows/update-metadata.yml`
- **觸發時機**: 每週日 2:00 UTC / 推送到 main 分支
- **自動讀取**: `config/universe.json`

---

## 🔧 新增 Symbol 操作步驟

### 步驟 1: 修改主配置檔案

**編輯 `config/universe.json`**:
```json
{
  "description": "Stock universe configuration for GitHub Actions metadata updates",
  "version": "1.0.0",
  "last_updated": "2025-01-27T10:30:00Z",
  "symbols": [
    "ASTS", "RIVN", "PL", "ONDS", "RDW",
    "AVAV", "MDB", "ORCL", "TSM", "RKLB",
    "CRM", "NVDA", "AVGO", "AMZN", "GOOG",
    "META", "NFLX", "LEU", "SMR", "CRWV",
    "IONQ", "PLTR", "HIMS", "TSLA",
    "NEW_SYMBOL_1",  // 新增的股票代號
    "NEW_SYMBOL_2"   // 新增的股票代號
  ],
  "metadata": {
    "total_symbols": 26,  // 更新總數
    "sectors_covered": [
      "Technology",
      "Communication Services", 
      "Consumer Cyclical",
      "Industrials",
      "Energy",
      "Healthcare"
    ],
    "exchanges": [
      "NASDAQ",
      "NYSE"
    ],
    "update_frequency": "daily",
    "data_sources": [
      "yfinance_python"
    ]
  }
}
```

### 步驟 2: 更新前端 Fallback 資料

**編輯 `src/utils/symbolsConfig.js`**:
```javascript
getStaticSymbols() {
  return [
    'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 
    'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
    'CRM', 'NVDA', 'AVGO', 'AMZN', 'GOOG',
    'META', 'NFLX', 'LEU', 'SMR', 'CRWV',
    'IONQ', 'PLTR', 'HIMS', 'TSLA',
    'NEW_SYMBOL_1', 'NEW_SYMBOL_2'  // 新增
  ]
}
```

### 步驟 3: 更新 Python 腳本 Fallback 資料

**編輯 `scripts/update-metadata-python.py`**:
```python
def get_fallback_metadata(self, symbol):
    fallback_data = {
        # ... 現有資料 ...
        'NEW_SYMBOL_1': {
            'sector': 'Technology', 
            'industry': 'Software - Application', 
            'exchange': 'NASDAQ'
        },
        'NEW_SYMBOL_2': {
            'sector': 'Healthcare', 
            'industry': 'Biotechnology', 
            'exchange': 'NYSE'
        }
    }
    # ... 其餘程式碼保持不變 ...
```

### 步驟 4: 更新 JavaScript 腳本 Fallback 資料

**編輯 `scripts/update-yfinance-metadata.js`**:
```javascript
getFallbackMetadata(symbol) {
  const fallbackData = {
    // ... 現有資料 ...
    'NEW_SYMBOL_1': { 
      sector: 'Technology', 
      industry: 'Software - Application' 
    },
    'NEW_SYMBOL_2': { 
      sector: 'Healthcare', 
      industry: 'Biotechnology' 
    }
  };
  // ... 其餘程式碼保持不變 ...
}
```

### 步驟 5: 更新靜態服務 Fallback 資料

**編輯 `src/utils/staticSectorIndustryService.js`**:
```javascript
getMinimalFallbackData() {
  const fallbackSymbols = [
    'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 
    'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
    'CRM', 'NVDA', 'AVGO', 'AMZN', 'GOOG',
    'META', 'NFLX', 'LEU', 'SMR', 'CRWV',
    'IONQ', 'PLTR', 'HIMS', 'TSLA',
    'NEW_SYMBOL_1', 'NEW_SYMBOL_2'  // 新增
  ];

  const fallbackData = {
    // ... 現有資料 ...
    'NEW_SYMBOL_1': { 
      sector: 'Technology', 
      industry: 'Software - Application' 
    },
    'NEW_SYMBOL_2': { 
      sector: 'Healthcare', 
      industry: 'Biotechnology' 
    }
  };
  // ... 其餘程式碼保持不變 ...
}
```

---

## 🚀 部署和驗證流程

### 1. 提交變更
```bash
git add .
git commit -m "✨ Add new symbols: NEW_SYMBOL_1, NEW_SYMBOL_2"
git push origin main
```

### 2. 自動觸發流程
- **GitHub Actions** 會自動執行
- **update-sector-industry.yml** 會讀取新的 `universe.json`
- **YFinance API** 會獲取新股票的 metadata
- **靜態 JSON 檔案** 會自動更新

### 3. 驗證步驟

#### 檢查 GitHub Actions
1. 前往 `https://github.com/your-username/investment-dashboard/actions`
2. 確認 "Update Sector and Industry Data" 工作流程成功執行
3. 檢查是否有錯誤訊息

#### 檢查生成的資料檔案
1. 確認 `public/data/sector_industry.json` 包含新股票
2. 確認 `public/data/symbols_metadata.json` 包含新股票
3. 檢查新股票的 sector 和 industry 資訊是否正確

#### 前端驗證
1. 清除瀏覽器快取
2. 訪問網站首頁，確認新股票出現在列表中
3. 點擊新股票，確認詳細頁面正常載入
4. 檢查所有 TradingView widgets 是否正常顯示

---

## 🔄 快取管理

### 前端快取清除
```javascript
// 在瀏覽器 Console 中執行
import { symbolsConfig } from './src/utils/symbolsConfig.js';
symbolsConfig.refresh();

import { staticSectorIndustryService } from './src/utils/staticSectorIndustryService.js';
staticSectorIndustryService.forceReload();
```

### 手動觸發 GitHub Actions
1. 前往 GitHub Actions 頁面
2. 選擇 "Update Sector and Industry Data" 工作流程
3. 點擊 "Run workflow" 按鈕
4. 選擇 main 分支並執行

---

## 📊 資料結構說明

### Universe.json 結構
```json
{
  "description": "說明文字",
  "version": "版本號",
  "last_updated": "ISO 8601 時間戳",
  "symbols": ["股票代號陣列"],
  "metadata": {
    "total_symbols": "總股票數",
    "sectors_covered": ["涵蓋的產業"],
    "exchanges": ["交易所"],
    "update_frequency": "更新頻率",
    "data_sources": ["資料來源"]
  }
}
```

### 生成的 Metadata 結構
```json
{
  "ttl_days": 7,
  "as_of": "2025-01-27T10:30:00Z",
  "next_refresh": "2025-01-28T00:20:00Z",
  "items": [
    {
      "symbol": "AAPL",
      "sector": "Technology",
      "industry": "Consumer Electronics",
      "confidence": 1.0,
      "sources": ["yfinance_python"],
      "last_verified_at": "2025-01-27T10:30:00Z",
      "market_cap_category": "mega_cap",
      "exchange": "NASDAQ",
      "country": "United States",
      "website": "https://www.apple.com",
      "employee_count": 164000,
      "business_summary": "Apple Inc. designs...",
      "market_cap": 3500000000000,
      "api_source": "yfinance_python"
    }
  ],
  "sector_grouping": {
    "Technology": ["AAPL", "MSFT"],
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

---

## ⚠️ 注意事項和最佳實踐

### 股票代號選擇
- **使用正確的 ticker symbol**: 確認在 Yahoo Finance 上可以找到
- **檢查交易所**: 確認是 NYSE 或 NASDAQ 上市
- **避免重複**: 檢查是否已存在於現有列表中

### Exchange 對應規則
```javascript
// NYSE 股票 (需要在 fallback 中明確指定)
const nyseSymbols = ['CRM', 'TSM', 'ORCL', 'RDW', 'PL'];

// 其他股票預設為 NASDAQ
const defaultExchange = 'NASDAQ';
```

### Sector 和 Industry 分類
- **Technology**: Software, Semiconductors, Hardware
- **Healthcare**: Biotechnology, Pharmaceuticals, Medical Devices
- **Communication Services**: Internet, Telecommunications, Media
- **Consumer Cyclical**: Retail, Automotive, Travel
- **Industrials**: Aerospace, Manufacturing, Transportation
- **Energy**: Oil & Gas, Renewable Energy, Utilities

### 錯誤處理
- **API 失敗**: 自動使用 fallback 資料
- **網路問題**: 使用本地快取
- **資料格式錯誤**: 回退到最小可用資料集

---

## 🛠️ 故障排除

### 常見問題

#### 1. 新股票沒有出現在前端
**可能原因**:
- GitHub Actions 尚未完成
- 瀏覽器快取未清除
- 前端快取尚未過期

**解決方案**:
```bash
# 檢查 GitHub Actions 狀態
# 清除瀏覽器快取
# 手動觸發前端快取刷新
```

#### 2. 股票資料顯示為 "Unknown"
**可能原因**:
- YFinance API 無法找到該股票
- 股票代號拼寫錯誤
- 股票已下市或更名

**解決方案**:
- 驗證股票代號在 Yahoo Finance 上的正確性
- 更新 fallback 資料中的正確資訊
- 檢查是否需要使用不同的 ticker symbol

#### 3. GitHub Actions 執行失敗
**可能原因**:
- YFinance API 限制
- 網路連線問題
- Python 套件版本衝突

**解決方案**:
- 檢查 Actions 日誌
- 重新執行工作流程
- 更新 Python 套件版本

### 除錯工具

#### 前端除錯
```javascript
// 檢查 symbols 配置
console.log(await symbolsConfig.getSymbolsList());

// 檢查 metadata 服務
console.log(await staticSectorIndustryService.getDataStats());

// 檢查特定股票
console.log(await staticSectorIndustryService.getSymbolMetadata('AAPL'));
```

#### 後端除錯
```bash
# 本地執行 Python 腳本
cd scripts
python update-metadata-python.py

# 檢查生成的檔案
cat ../public/data/sector_industry.json | jq '.items[] | select(.symbol=="NEW_SYMBOL")'
```

---

## 📈 效能考量

### 批次處理
- **GitHub Actions**: 每次處理所有股票，避免頻繁 API 呼叫
- **前端載入**: 一次載入所有 metadata，減少網路請求
- **快取策略**: 多層快取減少 API 依賴

### API 限制
- **YFinance**: 每秒最多 1-2 個請求
- **延遲機制**: Python 腳本中加入 0.5 秒延遲
- **錯誤重試**: 自動回退到 fallback 資料

### 資料大小
- **目前**: ~24 股票，JSON 檔案約 50KB
- **建議上限**: 100 股票以內，保持載入速度
- **壓縮**: GitHub Pages 自動啟用 gzip 壓縮

---

## 🔮 未來擴展

### 支援更多資料來源
- **Alpha Vantage API**: 備用資料來源
- **Finnhub API**: 即時資料
- **手動資料**: CSV 匯入功能

### 動態股票管理
- **管理介面**: 網頁版股票管理工具
- **即時新增**: 無需重新部署的新增機制
- **使用者自訂**: 允許使用者自訂追蹤列表

### 進階功能
- **股票分組**: 按產業、市值、地區分組
- **效能監控**: 追蹤 API 成功率和回應時間
- **資料品質**: 自動驗證和清理資料

---

## 📝 變更記錄

### 2025-01-27
- 建立初始版本的 Symbol Management Guide
- 涵蓋完整的新增流程和故障排除
- 包含所有相關檔案的修改說明

### 未來更新
- 根據實際使用經驗更新最佳實踐
- 新增更多故障排除案例
- 擴展支援的資料來源和功能

---

## 🤝 維護責任

### 開發者責任
- 按照本指南執行所有 symbol 新增操作
- 測試新增的股票在前端的顯示效果
- 更新 fallback 資料以確保系統穩定性

### 系統管理員責任
- 監控 GitHub Actions 的執行狀況
- 定期檢查資料品質和 API 成功率
- 維護和更新本文件內容

---

**重要提醒**: 本文件是網站維護的核心參考資料，任何 symbol 相關的操作都應該參照此指南執行。如有疑問或發現問題，請及時更新本文件以供未來參考。