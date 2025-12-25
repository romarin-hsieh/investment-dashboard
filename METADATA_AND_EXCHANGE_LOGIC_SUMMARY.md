# Metadata 和 Exchange 邏輯完整說明 (YFinance API 版本)

## 🆕 YFinance API Metadata 服務

### 新架構概述
改用 **YFinance API** 作為 Sector 和 Industry 的主要資料來源，提供：
- **絕對準確**: 直接從 Yahoo Finance 官方 API 獲取，confidence = 1.0
- **自動更新**: 每七日或 GitHub 部署時自動更新
- **智能快取**: 7天快取機制，避免重複 API 請求
- **無需驗證**: YFinance 資料絕對正確，不需要信心度驗證

### 更新觸發條件
1. **每七日自動更新**: 檢查上次更新時間，超過7天自動觸發
2. **GitHub 部署觸發**: 檢測到新版本部署時自動更新
3. **手動強制更新**: 支援手動觸發更新

## Sector 和 Industry 取得方式 (新版本)

### 資料來源和優先順序
1. **YFinance API**: 主要來源，confidence = 1.0 (絕對正確)
2. **本地快取**: 7天有效期的快取資料
3. **回退資料**: API 失敗時使用預定義的回退資料

### YFinance API 服務架構

#### 1. YFinance Metadata Service (`src/utils/yfinanceMetadataService.js`)
**功能**:
- 使用 Yahoo Finance `quoteSummary` API
- 獲取 `summaryProfile.sector` 和 `summaryProfile.industry`
- 7天快取機制 (localStorage)
- 批量處理支援 (3個股票/批次)
- 自動更新檢測

**API 詳情**:
- **Endpoint**: `https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=summaryProfile,defaultKeyStatistics,financialData`
- **CORS 處理**: 使用代理服務 (allorigins.win, corsproxy.io)
- **資料欄位**: sector, industry, marketCap, exchange, country, website, employeeCount

**快取策略**:
```javascript
// 快取結構
{
  last_updated: "2025-01-25T10:30:00Z",
  update_duration_ms: 15000,
  symbols_count: 24,
  items: [...], // metadata 陣列
  sector_grouping: {...},
  confidence_distribution: {...}
}
```

#### 2. 更新腳本 (`scripts/update-yfinance-metadata.js`)
**功能**:
- 批量更新所有股票的 metadata
- 自動備份和恢復機制
- 生成完整的 metadata 文件
- 驗證更新結果

**執行方式**:
```bash
# 手動執行
npm run update-yfinance

# 強制更新
npm run update-yfinance:force
```

#### 3. Enhanced Metadata Service (`src/utils/enhancedMetadataService.js`)
**功能**:
- 整合 YFinance API 和靜態文件
- 自動更新邏輯
- 多層回退機制
- 統一的 API 接口

**使用方式**:
```javascript
import { enhancedMetadataService } from '@/utils/enhancedMetadataService.js';

// 獲取單個股票
const metadata = await enhancedMetadataService.getSymbolMetadata('CRM');

// 批量獲取
const symbols = ['CRM', 'NVDA', 'TSLA'];
const metadataMap = await enhancedMetadataService.getBatchMetadata(symbols);

// 強制更新
const result = await enhancedMetadataService.forceUpdate(symbols);
```

### 自動化更新流程

#### GitHub Actions 工作流程 (`.github/workflows/update-metadata.yml`)
**觸發條件**:
- 每週日凌晨 2 點 (UTC)
- 每次推送到 main 分支
- 手動觸發

**執行步驟**:
1. 更新 YFinance metadata
2. 更新 Exchange 映射
3. 檢查變更並提交
4. 生成更新報告

#### 版本檢測機制
```javascript
// 檢測新部署版本
isNewDeployment() {
  const currentVersion = process.env.VITE_APP_VERSION || 
                        document.querySelector('meta[name="version"]')?.content;
  const lastVersion = localStorage.getItem('last_deployment_version');
  return lastVersion !== currentVersion;
}
```

### 新的 Metadata 結構

#### YFinance API 回傳格式
```json
{
  "symbol": "CRM",
  "sector": "Technology",
  "industry": "Enterprise Software",
  "confidence": 1.0,
  "sources": ["yfinance_api"],
  "last_verified_at": "2025-01-25T10:30:00Z",
  "market_cap_category": "large_cap",
  "exchange": "NYSE",
  "country": "US",
  "website": "https://www.salesforce.com",
  "employee_count": 73000,
  "business_summary": "Salesforce, Inc. provides...",
  "market_cap": 250000000000,
  "api_source": "yfinance"
}
```

#### 信心度系統 (簡化)
- **confidence = 1.0**: YFinance API 資料 (絕對正確)
- **confidence = 0.8**: 回退資料 (預定義資料)
- **不再需要**: < 0.7 的信心度驗證 (YFinance 資料絕對可信)

### 組件整合

#### StockCard.vue 和 StockOverview.vue 更新
```javascript
// 新的 sector 取得邏輯
getSector() {
  if (!this.metadata) return 'Unknown';
  
  // YFinance 資料不需要信心度驗證
  if (this.metadata.api_source === 'yfinance' || this.metadata.confidence === 1.0) {
    return this.metadata.sector || 'Unknown';
  }
  
  // 回退資料仍需信心度驗證
  if (this.metadata.confidence >= 0.7) {
    return this.metadata.sector || 'Unknown';
  }
  
  return 'Unknown';
}
```

## Exchange 映射邏輯 (保持不變)

### 取得方式和優先順序
1. **Metadata 優先**: 從 `public/data/symbols_metadata.json` 讀取 exchange 欄位
2. **組件回退**: 如果 metadata 缺失，使用組件內建的回退邏輯
3. **API 更新**: 使用 Finnhub API 定期更新 exchange 映射

### 當前正確的 Exchange 映射
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

### TradingView 符號格式
- **CRM**: `NYSE:CRM` ✅ (修復前: `NASDAQ:CRM` ❌)
- **RDW**: `NYSE:RDW` ✅
- **IONQ**: `NASDAQ:IONQ` ✅
- **HIMS**: `NASDAQ:HIMS` ✅

### Exchange 服務架構

#### 1. Finnhub Exchange Service (`src/utils/finnhubExchangeService.js`)
**功能**:
- 使用 Finnhub API 獲取準確的 exchange 信息
- 智能映射 Finnhub 格式到 TradingView 格式
- 24小時緩存機制
- 批量處理支援 (3個股票/批次)
- 多層回退機制

**API 詳情**:
- **Endpoint**: `/stock/profile2?symbol=SYMBOL&token=API_KEY`
- **API Key**: `d56iuopr01qkgd81vo8gd56iuopr01qkgd81vo90`
- **支援格式**: 33種國際交易所格式

**映射邏輯**:
```javascript
// 特殊映射規則
const mappingRules = {
  'NASDAQ/NMS (GLOBAL MARKET)': 'NASDAQ',
  'NEW YORK STOCK EXCHANGE': 'NYSE',
  'NYSE AMERICAN': 'AMEX',
  'OVER THE COUNTER': 'OTC'
  // ... 更多映射規則
};
```

#### 2. 日常更新腳本 (`scripts/update-exchanges.js`)
**功能**:
- 自動化更新所有股票的 exchange 映射
- 批量處理避免 API 限制
- 容錯處理和快取回退
- 更新 metadata 文件和 exchange 快取

**執行方式**:
```bash
# 手動執行
node scripts/update-exchanges.js

# 建議設定每日 cron job
0 2 * * * cd /path/to/project && node scripts/update-exchanges.js
```

#### 3. 組件回退邏輯
所有相關組件 (`StockCard.vue`, `StockOverview.vue`) 都包含統一的回退邏輯：

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

## Sector 和 Industry 取得方式

### 資料來源和優先順序
1. **靜態 Metadata**: `public/data/symbols_metadata.json` (主要來源)
2. **動態 API**: Yahoo Finance API (備用，因 CORS 限制較少使用)
3. **回退邏輯**: 組件內建的預設分類

### Metadata 文件結構
```json
{
  "symbol": "CRM",
  "sector": "Technology",
  "industry": "Enterprise Software",
  "confidence": 0.90,
  "sources": ["yahoo_finance", "sec_filings", "company_website"],
  "last_verified_at": "2025-01-25T10:30:00Z",
  "market_cap_category": "large_cap",
  "exchange": "NYSE"
}
```

### 信心度分級系統
- **confidence >= 0.90**: 高信心度 (多重來源驗證)
- **confidence >= 0.75**: 中信心度 (部分來源驗證)
- **confidence < 0.70**: 低信心度 (歸類為 Unknown)

### Sector 分組邏輯
根據 `metadata.sector` 和 `confidence >= 0.7` 進行分組：

#### Technology (11 stocks)
- **Enterprise Software**: CRM, ORCL
- **Semiconductors**: NVDA, AVGO, TSM
- **Database Software**: MDB
- **Quantum Computing**: IONQ
- **Software - Infrastructure**: PLTR
- **Software - Application**: CRWV
- **Industrial IoT Solutions**: ONDS
- **Satellite Imaging & Analytics**: PL

#### Communication Services (4 stocks)
- **Satellite Communications**: ASTS
- **Internet Content & Information**: GOOG, META
- **Entertainment**: NFLX

#### Consumer Cyclical (3 stocks)
- **Electric Vehicles**: RIVN
- **Internet Retail**: AMZN
- **Auto Manufacturers**: TSLA

#### Industrials (3 stocks)
- **Aerospace & Defense**: RKLB, AVAV
- **Space Infrastructure**: RDW

#### Energy (2 stocks)
- **Uranium**: LEU
- **Nuclear Energy**: SMR

#### Healthcare (1 stock)
- **Health Information Services**: HIMS

### 組件使用邏輯

#### Sector 取得
```javascript
getSector() {
  if (!this.metadata) return 'Unknown';
  
  // 根據信心度決定分類
  if (this.metadata.confidence < 0.7) {
    return 'Unknown';
  }
  
  return this.metadata.sector || 'Unknown';
}
```

#### Industry 取得
```javascript
getIndustry() {
  if (!this.metadata) return 'Unknown Industry';
  
  if (this.metadata.confidence < 0.7) {
    return 'Unknown Industry';
  }
  
  // 優先顯示 industry，回退到 sector
  return this.metadata.industry || this.metadata.sector || 'Unknown Industry';
}
```

### 動態 API 服務 (備用)

#### Yahoo Finance API (`src/utils/dynamicMetadataService.js`)
**功能**:
- 從 Yahoo Finance 獲取即時 sector/industry 信息
- CORS 代理處理 (allorigins.win, corsproxy.io)
- 24小時緩存機制
- 靜態回退數據

**API 詳情**:
- **Endpoint**: `https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=summaryProfile`
- **數據字段**: `summaryProfile.sector` 和 `summaryProfile.industry`

**當前狀況**: 由於 CORS 限制和代理服務不穩定，主要依賴靜態 metadata 文件

## 更新和維護流程

### 手動更新
```bash
# 更新 exchange 映射
node scripts/update-exchanges.js

# 更新 metadata (如果有相關腳本)
npm run update-metadata
```

### 自動化建議
```bash
# 每日更新 exchange 映射
0 2 * * * cd /path/to/project && node scripts/update-exchanges.js

# 每週更新 metadata
0 3 * * 0 cd /path/to/project && npm run update-metadata
```

### 監控指標
- API 成功率
- 快取命中率
- 數據品質 (confidence 分佈)
- TradingView widget 載入成功率

## 測試和驗證

### 測試頁面
- **YFinance 測試**: `test-yfinance-metadata.html`
- **Exchange 測試**: `test-exchange-fix.html`
- **股票載入測試**: `debug-stock-loading.html`

### 驗證步驟
1. **檢查更新狀態**: 確認快取年齡和更新需求
2. **測試單個股票**: 驗證 API 連接和資料格式
3. **測試批量更新**: 確認批量處理和快取機制
4. **檢查 Sector 分組**: 驗證前端顯示邏輯

### 監控指標
- **API 成功率**: YFinance API 請求成功比例
- **快取命中率**: 快取使用效率
- **更新頻率**: 自動更新觸發頻率
- **資料品質**: Sector/Industry 分類準確性

## 遷移和部署

### 從舊系統遷移
1. **保持向後兼容**: 現有組件無需修改
2. **漸進式啟用**: 可選擇性啟用 YFinance API
3. **回退機制**: 確保 API 失敗時系統正常運作

### 部署檢查清單
- [ ] 確認 GitHub Actions 工作流程已設定
- [ ] 驗證 CORS 代理服務可用性
- [ ] 測試自動更新觸發機制
- [ ] 檢查快取機制運作正常
- [ ] 驗證前端組件整合

### 效能考量
- **API 限制**: 使用批量處理和延遲避免限制
- **快取策略**: 7天快取減少 API 請求
- **回退速度**: 快速回退到靜態資料
- **更新頻率**: 平衡資料新鮮度和 API 使用量

## 故障排除 (更新版)

### 常見問題和解決方案 (更新版)

#### 1. YFinance API 無法連接
**症狀**: 所有股票使用回退資料，confidence = 0.8
**原因**: CORS 代理服務失效或 API 限制
**解決**: 
- 檢查代理服務狀態
- 嘗試手動更新: `npm run update-yfinance:force`
- 檢查網路連接和防火牆設定

#### 2. 快取過期但未自動更新
**症狀**: 快取年齡超過7天但未觸發更新
**原因**: 自動更新邏輯失效
**解決**: 
- 手動清除快取: `enhancedMetadataService.clearAllCache()`
- 強制更新: `enhancedMetadataService.forceUpdate(symbols)`
- 檢查版本檢測邏輯

#### 3. GitHub Actions 更新失敗
**症狀**: 工作流程執行失敗
**原因**: API 限制或網路問題
**解決**: 
- 檢查 GitHub Actions 日誌
- 手動執行更新腳本
- 調整 API 請求頻率

#### 4. Sector 顯示為 Unknown
**症狀**: 股票被歸類到 Unknown sector
**原因**: API 回傳空值或回退資料
**解決**: 
- 檢查 YFinance API 回傳資料
- 更新回退資料定義
- 驗證組件邏輯

### 調試工具 (更新版)
- **YFinance 測試頁面**: `test-yfinance-metadata.html`
- **服務狀態檢查**: `enhancedMetadataService.getUpdateStatus()`
- **詳細統計**: `enhancedMetadataService.getDetailedStats()`
- **快取管理**: `yfinanceMetadataService.getCacheStats()`

## 技術架構總結 (更新版)

### 新數據流向
```
YFinance API → CORS Proxy → Metadata Service → Cache → Components → UI
     ↓              ↓            ↓            ↓         ↓        ↓
  官方資料        跨域處理      智能更新      7天快取   統一接口  顯示
```

### 更新機制
```
時間檢查 → 版本檢查 → API 更新 → 快取存儲 → 組件刷新
    ↓         ↓         ↓         ↓         ↓
  每7天    新部署時   批量處理   本地存儲   自動更新
```

### 容錯機制 (增強版)
1. **API 失敗**: 多代理輪換 → 回退資料
2. **快取過期**: 自動更新 → 延用舊快取
3. **網路問題**: 靜態文件回退
4. **版本衝突**: 智能版本檢測

### 性能優化 (增強版)
- **智能快取**: 7天有效期 + 版本檢測
- **批量處理**: 3個股票/批次 + 1秒延遲
- **代理輪換**: 多代理服務容錯
- **按需更新**: 只在需要時觸發更新

## 結論 (更新版)

新的 YFinance API Metadata 系統提供了：

1. **絕對準確性**: 直接從 Yahoo Finance 官方 API 獲取，confidence = 1.0
2. **自動化管理**: 每七日或部署時自動更新，無需手動維護
3. **智能快取**: 7天快取機制，平衡資料新鮮度和性能
4. **完整回退**: 多層回退機制確保系統穩定運行
5. **無縫整合**: 保持現有 API 接口，組件無需修改
6. **豐富資料**: 除了 sector/industry，還包含市值、國家、網站等資訊

系統已成功解決原有的 metadata 維護問題，並建立了可持續的自動化更新架構。通過 YFinance API 的整合，確保了 Sector 和 Industry 分類的準確性和時效性。