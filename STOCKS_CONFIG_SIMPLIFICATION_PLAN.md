# 股票配置架構簡化方案

## 🚨 現狀問題

目前每次新增股票需要修改 **13+ 個文件**，架構過於複雜：

### 配置文件 (5個)
- `config/universe.json` - 主要配置
- `src/utils/symbolsConfig.js` - 靜態 fallback 列表  
- `scripts/update-metadata-python.py` - Python 腳本 fallback
- `scripts/update-yfinance-metadata.js` - Node.js 腳本 fallback
- `src/utils/staticSectorIndustryService.js` - 靜態 sector/industry 數據

### 前端組件 (3個)
- `src/components/StockOverview.vue` - 交易所映射
- `src/pages/StockDetail.vue` - 交易所判斷邏輯
- `.env.example` - 環境變數範例

### 數據文件 (多個)
- `public/data/daily/*.json` - 每日快照
- GitHub Actions workflows
- 各種測試和診斷文件

## 🎯 簡化方案

### 方案 1: 單一配置文件架構 (推薦)

#### 核心理念
**一個文件控制一切** - 所有模組都參考 `config/stocks.json`

#### 新架構
```
config/stocks.json (唯一配置文件)
├── 股票符號列表
├── 交易所信息  
├── Sector/Industry 信息
├── 啟用/禁用狀態
└── 優先級設定

src/utils/stocksConfigService.js (統一服務)
├── 載入配置
├── 緩存管理
├── 數據查詢 API
└── 向後兼容接口
```

#### 配置文件格式
```json
{
  "version": "2.0.0",
  "stocks": [
    {
      "symbol": "RR",
      "exchange": "NASDAQ", 
      "sector": "Technology",
      "industry": "Software - Application",
      "enabled": true,
      "priority": 2
    }
  ],
  "metadata": {
    "total_stocks": 67,
    "exchanges": ["NYSE", "NASDAQ", "AMEX"],
    "sectors": ["Technology", "Healthcare", ...]
  }
}
```

#### 統一服務 API
```javascript
// 基本查詢
await stocksConfig.getEnabledSymbols()           // ['ASTS', 'RIVN', ...]
await stocksConfig.getStockExchange('RR')        // 'NASDAQ'
await stocksConfig.getStockSector('RR')          // 'Technology'

// 分組查詢
await stocksConfig.getStocksByExchange()         // {NYSE: [...], NASDAQ: [...]}
await stocksConfig.getStocksBySector()           // {Technology: [...], Healthcare: [...]}

// 向後兼容
await stocksConfig.getSymbolsList()              // 兼容舊的 symbolsConfig
```

## 🔄 遷移步驟

### 階段 1: 創建新架構 ✅
- [x] 創建 `config/stocks.json` 統一配置文件
- [x] 創建 `src/utils/stocksConfigService.js` 統一服務
- [x] 包含所有 67 個股票的完整配置

### 階段 2: 更新前端組件
```javascript
// 舊代碼 (StockOverview.vue)
import { symbolsConfig } from '@/utils/symbolsConfig'
const symbols = await symbolsConfig.getSymbolsList()

// 新代碼
import { stocksConfig } from '@/utils/stocksConfigService'
const symbols = await stocksConfig.getEnabledSymbols()
const exchange = await stocksConfig.getStockExchange(symbol)
```

### 階段 3: 更新後端腳本
```python
# 舊代碼 (update-metadata-python.py)
fallback_symbols = ['ASTS', 'RIVN', ...]

# 新代碼
import json
with open('config/stocks.json') as f:
    config = json.load(f)
    symbols = [s['symbol'] for s in config['stocks'] if s['enabled']]
```

### 階段 4: 清理舊文件
- 移除 `src/utils/symbolsConfig.js`
- 移除各腳本中的 hardcoded 列表
- 移除組件中的交易所映射邏輯

## 🚀 立即實施方案

### 快速修復 StockOverview 問題
1. **替換 symbolsConfig**:
   ```javascript
   // src/components/StockOverview.vue
   import { stocksConfig } from '@/utils/stocksConfigService'
   
   async loadSymbolsConfig() {
     this.configuredSymbols = await stocksConfig.getEnabledSymbols()
   }
   
   getStockExchange(symbol, metadata) {
     return stocksConfig.getStockExchange(symbol)
   }
   ```

2. **更新 StockDetail.vue**:
   ```javascript
   // src/pages/StockDetail.vue  
   import { stocksConfig } from '@/utils/stocksConfigService'
   
   async getExchange() {
     return await stocksConfig.getStockExchange(this.symbol)
   }
   ```

3. **更新後端腳本**:
   ```javascript
   // scripts/update-quotes.cjs
   const fs = require('fs')
   const config = JSON.parse(fs.readFileSync('config/stocks.json'))
   const symbols = config.stocks.filter(s => s.enabled).map(s => s.symbol)
   ```

## 📊 方案比較

| 方案 | 優點 | 缺點 | 實施難度 |
|------|------|------|----------|
| **單一配置文件** | 🟢 只需修改一個文件<br>🟢 數據一致性<br>🟢 易於維護 | 🟡 需要重構現有代碼 | 🟡 中等 |
| 現狀維持 | 🟢 無需修改 | 🔴 每次新增股票需修改13+文件<br>🔴 容易出錯<br>🔴 維護困難 | 🟢 無 |
| 部分簡化 | 🟡 減少部分文件 | 🟡 仍需修改多個文件 | 🟡 中等 |

## 🎯 建議執行順序

### 立即執行 (解決當前問題)
1. **使用新的 stocksConfigService** 替換 StockOverview.vue 中的 symbolsConfig
2. **測試驗證** RR 符號是否正確顯示
3. **部署修復** 到生產環境

### 後續優化 (架構重構)
1. **逐步遷移** 其他組件使用新服務
2. **更新後端腳本** 使用統一配置
3. **清理舊代碼** 移除重複的配置文件
4. **文檔更新** 更新 SYMBOL_MANAGEMENT_GUIDE.md

## 🔧 實施工具

### 創建遷移腳本
```bash
# migrate-to-stocks-config.js
# 自動替換所有文件中的 symbolsConfig 引用
```

### 創建驗證腳本  
```bash
# validate-stocks-config.js
# 驗證新配置文件的完整性和正確性
```

### 創建測試工具
```html
# test-stocks-config-service.html
# 測試新服務的所有功能
```

## ✅ 成功標準

修復成功後：
- ✅ 只需修改 `config/stocks.json` 即可新增股票
- ✅ StockOverview 顯示所有 67 個股票
- ✅ RR 符號正確顯示在 Technology 分組
- ✅ 所有頁面使用統一的股票配置
- ✅ 後端腳本自動讀取統一配置
- ✅ 無需修改多個文件

---

**下一步**: 立即實施 StockOverview.vue 的修復，使用新的 stocksConfigService 替換舊的 symbolsConfig。