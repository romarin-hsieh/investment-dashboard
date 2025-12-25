# 股票顯示問題分析和解決方案

## 問題現象
CRM、IONQ、HIMS 等股票在 .env 文件中配置了，但前端沒有顯示。

## 問題分析

### ✅ 確認正常的部分
1. **環境變數配置正確** - `.env` 包含 CRM, IONQ, HIMS
2. **symbolsConfig 載入正確** - 會優先讀取環境變數
3. **交易所映射正確** - 都被映射到 NASDAQ
4. **quotes 數據存在** - `public/data/quotes/latest.json` 包含這些股票
5. **metadata 存在** - `public/data/symbols_metadata.json` 包含這些股票
6. **技術指標數據存在** - 有對應的技術指標文件

### ❌ 發現的問題
1. **Daily 數據缺失** - `public/data/daily/2025-01-22.json` 的 universe 只包含 10 個股票
2. **數據不一致** - quotes 有 24 個股票，但 daily 只有 10 個

## 根本原因

### 主要問題：Exchange 映射錯誤
**CRM 股票的 exchange 映射錯誤**：
- **錯誤映射**: CRM 被映射到 "NASDAQ"
- **正確映射**: CRM 應該映射到 "NYSE"
- **影響**: TradingView widgets 使用錯誤的 `NASDAQ:CRM` 格式，導致無法載入

### 次要問題：Daily 數據不完整
**Daily 數據文件的 universe 不完整**，導致某些股票缺少 daily 信息，可能影響前端顯示邏輯。

## 解決方案

### ✅ 方案 1: 修正 Exchange 映射 (已完成)

**問題**: CRM 使用錯誤的 exchange 映射 (NASDAQ → NYSE)

**修復位置**:
1. **Metadata 文件**: `public/data/symbols_metadata.json`
   - 將 CRM 的 exchange 從 "NASDAQ" 改為 "NYSE"

2. **組件回退邏輯**: 
   - `src/components/StockCard.vue` - `getExchange()` 方法
   - `src/components/StockOverview.vue` - `getStockExchange()` 方法

3. **Exchange 服務**:
   - `src/utils/finnhubExchangeService.js` - `getDefaultExchange()` 方法
   - `scripts/update-exchanges.js` - 日常更新腳本

**當前正確的 Exchange 映射**:
```javascript
// NYSE 股票
const nyseSymbols = ['CRM', 'TSM', 'ORCL', 'RDW'];

// NASDAQ 股票  
const nasdaqSymbols = [
  'ASTS', 'RIVN', 'PL', 'ONDS', 'AVAV', 'MDB', 'RKLB', 
  'NVDA', 'AVGO', 'AMZN', 'GOOG', 'META', 'NFLX', 
  'LEU', 'SMR', 'CRWV', 'IONQ', 'PLTR', 'HIMS', 'TSLA'
];
```

**TradingView 符號格式**:
- CRM: `NYSE:CRM` ✅ (修復前: `NASDAQ:CRM` ❌)
- IONQ: `NASDAQ:IONQ` ✅
- HIMS: `NASDAQ:HIMS` ✅

### 方案 2: 修正 Daily 數據文件 (推薦)

更新 `public/data/daily/2025-01-22.json`，將 universe 擴展為完整的 24 個股票：

```json
{
  "as_of_date_taipei": "2025-01-22",
  "generated_at_utc": "2025-01-22T07:00:00Z",
  "universe": [
    "ASTS", "RIVN", "PL", "ONDS", "RDW", 
    "AVAV", "MDB", "ORCL", "TSM", "RKLB",
    "CRM", "NVDA", "AVGO", "AMZN", "GOOG",
    "META", "NFLX", "LEU", "SMR", "CRWV",
    "IONQ", "PLTR", "HIMS", "TSLA"
  ],
  "per_symbol": [
    // 為缺失的股票添加基本數據結構
  ]
}
```

### 方案 3: 修改前端邏輯處理缺失數據

確保 StockOverview 組件能正確處理 dailyData 缺失的情況：

```javascript
// 在 StockOverview.vue 中
this.quotes.forEach(quote => {
  const symbolMetadata = this.metadata.items.find(m => m.symbol === quote.symbol)
  const symbolDailyData = this.dailyData?.per_symbol.find(d => d.symbol === quote.symbol)
  
  // 即使沒有 dailyData 也要顯示股票
  // ... 現有邏輯
})
```

### 方案 4: 調試和驗證

使用調試工具 `debug-stock-loading.html` 來：
1. 確認 symbolsConfig 載入的股票列表
2. 檢查 dataFetcher 載入的 quotes 數據
3. 驗證前端顯示邏輯

## Exchange 映射邏輯說明

### 取得方式優先順序
1. **Metadata 優先**: 從 `public/data/symbols_metadata.json` 讀取 exchange 欄位
2. **組件回退**: 如果 metadata 缺失，使用組件內建的回退邏輯
3. **API 更新**: 使用 Finnhub API 定期更新 exchange 映射

### Exchange 服務架構

#### 1. Finnhub Exchange Service (`src/utils/finnhubExchangeService.js`)
- **API 來源**: Finnhub `/stock/profile2` endpoint
- **API Key**: `d56iuopr01qkgd81vo8gd56iuopr01qkgd81vo90`
- **映射邏輯**: 將 Finnhub 格式轉換為 TradingView 格式
- **緩存機制**: 24小時緩存，避免重複 API 請求
- **回退機制**: API 失敗時使用預設映射

#### 2. 日常更新腳本 (`scripts/update-exchanges.js`)
- **執行頻率**: 建議每日執行
- **批量處理**: 3個股票/批次，避免 API 限制
- **容錯處理**: API 失敗時使用前一天的快取
- **自動更新**: 更新 metadata 文件和 exchange 快取

#### 3. 組件回退邏輯
所有相關組件都包含相同的回退邏輯：
```javascript
getExchange(symbol) {
  // 1. 優先使用 metadata
  if (this.metadata && this.metadata.exchange) {
    return this.metadata.exchange;
  }
  
  // 2. 回退到預設映射
  const nyseSymbols = ['CRM', 'TSM', 'ORCL', 'RDW'];
  if (nyseSymbols.includes(symbol)) {
    return 'NYSE';
  }
  
  return 'NASDAQ'; // 預設值
}
```

### TradingView 支援的 Exchange 格式
NYSE, NASDAQ, AMEX, OTC, TSX, TSXV, LSE, EURONEXT, XETR, FWB, SIX, MIL, BME, TSE, TWSE, HKEX, SSE, SZSE, KRX, NSE, BSE, ASX, SGX, SET, TADAWUL, JSE, BMV, BMFBOVESPA, IDX, TASE, BIST, GPW, RUS

## Sector 和 Industry 取得方式

### 資料來源優先順序
1. **靜態 Metadata**: `public/data/symbols_metadata.json` (主要來源)
2. **動態 API**: Yahoo Finance API (備用，目前因 CORS 限制較少使用)
3. **回退邏輯**: 組件內建的預設分類

### Sector/Industry 服務架構

#### 1. 靜態 Metadata 文件 (`public/data/symbols_metadata.json`)
**資料結構**:
```json
{
  "symbol": "CRM",
  "sector": "Technology",
  "industry": "Enterprise Software", 
  "confidence": 0.90,
  "sources": ["yahoo_finance", "sec_filings", "company_website"],
  "exchange": "NYSE"
}
```

**信心度分級**:
- `confidence >= 0.90`: 高信心度 (多重來源驗證)
- `confidence >= 0.75`: 中信心度 (部分來源驗證)
- `confidence < 0.70`: 低信心度 (歸類為 Unknown)

#### 2. 動態 Metadata 服務 (`src/utils/dynamicMetadataService.js`)
- **API 來源**: Yahoo Finance `quoteSummary` endpoint
- **CORS 處理**: 使用代理服務 (allorigins.win, corsproxy.io)
- **回退數據**: API 失敗時使用內建的靜態映射
- **緩存策略**: 24小時緩存成功的 API 結果

#### 3. Metadata 服務 (`src/utils/metadataService.js`)
- **雙模式**: 動態 API + 靜態文件
- **運行時切換**: `setUseDynamicAPI(true/false)`
- **批量處理**: 支援多股票同時查詢
- **向後兼容**: 保持原有 API 接口

### 分類邏輯

#### Sector 分組
根據 `metadata.sector` 和 `confidence >= 0.7` 進行分組：
- **Technology**: 軟體、硬體、半導體等
- **Communication Services**: 衛星通訊、網路內容等
- **Consumer Cyclical**: 電動車、網路零售等
- **Industrials**: 航太國防、太空基礎設施等
- **Energy**: 鈾礦、核能等
- **Healthcare**: 健康資訊服務等
- **Unknown**: confidence < 0.7 的股票

#### Industry 細分
提供更詳細的產業分類：
- **Enterprise Software** (CRM, ORCL)
- **Semiconductors** (NVDA, AVGO, TSM)
- **Quantum Computing** (IONQ)
- **Electric Vehicles** (RIVN)
- **Satellite Communications** (ASTS)
- 等等...

### 組件使用方式

#### StockCard.vue 和 StockOverview.vue
```javascript
getSector() {
  if (!this.metadata) return 'Unknown';
  
  // 根據信心度決定分類
  if (this.metadata.confidence < 0.7) {
    return 'Unknown';
  }
  
  return this.metadata.sector || 'Unknown';
}

getIndustry() {
  if (!this.metadata) return 'Unknown Industry';
  
  if (this.metadata.confidence < 0.7) {
    return 'Unknown Industry';
  }
  
  return this.metadata.industry || this.metadata.sector || 'Unknown Industry';
}
```

### 更新和維護

#### 手動更新
```bash
# 更新 metadata
npm run update-metadata

# 更新 exchange 映射
node scripts/update-exchanges.js
```

#### 自動化建議
- **每日執行**: exchange 更新腳本
- **每週執行**: metadata 更新腳本  
- **監控**: API 成功率和資料品質

## 立即解決步驟

### 1. 驗證 Exchange 修復
```bash
# 在瀏覽器中打開測試頁面
test-exchange-fix.html
```

### 2. 使用調試工具
```bash
# 在瀏覽器中打開
debug-stock-loading.html
```

### 3. 檢查瀏覽器 Console
```javascript
// 在 Stock Overview 頁面的 Console 中執行
console.log('Configured symbols:', await symbolsConfig.getSymbolsList());
console.log('Loaded quotes:', quotes);
console.log('Daily data universe:', dailyData?.universe);
```

### 4. 清除快取測試
```javascript
// 清除所有快取
localStorage.clear();
sessionStorage.clear();
// 重新載入頁面
```

### 5. 檢查數據一致性
確認以下文件的股票列表一致：
- `.env` 中的 `VITE_STOCK_SYMBOLS`
- `public/data/quotes/latest.json` 中的股票
- `public/data/daily/2025-01-22.json` 中的 universe
- `public/data/symbols_metadata.json` 中的股票

## 預期結果

修正後，所有 24 個股票都應該在 Stock Overview 頁面顯示，包括：
- CRM (Technology - Enterprise Software)
- IONQ (Technology - Quantum Computing)  
- HIMS (Healthcare - Health Information Services)

## 驗證方法

1. **前端顯示** - 在 Stock Overview 頁面看到所有股票
2. **分組正確** - 股票按正確的 sector 分組
3. **數據完整** - 每個股票都有基本的 quote 和 metadata 信息
4. **技術指標正常** - ADX 等技術指標顯示正確數值

---

**建議優先執行方案 1 (Exchange 修復，已完成)，然後執行方案 2 (修正 Daily 數據文件)。**