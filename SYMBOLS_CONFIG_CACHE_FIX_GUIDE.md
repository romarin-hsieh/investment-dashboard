# SymbolsConfig 緩存問題修復指南

## 🚨 問題確認

**症狀**: StockOverview 頁面只顯示 24 個股票，但應該顯示 67 個股票（包括 RR）。

**根本原因**: `symbolsConfig` 緩存了舊的 24 個股票列表，導致 StockOverview 組件過濾 quotes 時只保留 24 個股票。

## 🔍 問題分析

### 數據流程
1. StockOverview 組件載入時調用 `symbolsConfig.getSymbolsList()`
2. `symbolsConfig` 返回緩存的 24 個股票列表（緩存有效期 60 分鐘）
3. StockOverview 使用這個列表過濾 quotes：
   ```javascript
   this.quotes = allQuotes.filter(quote => 
     this.configuredSymbols.includes(quote.symbol)
   )
   ```
4. 即使 `quotes/latest.json` 包含 67 個股票，也只顯示 24 個

### 緩存層級
```
StockOverview 組件
├── performanceCache (localStorage + 內存)
│   └── STOCK_OVERVIEW_DATA (24小時 TTL)
└── symbolsConfig (內存緩存)
    └── symbols (60分鐘 TTL) ← 問題所在
```

## 🛠️ 修復工具

### 1. 主要修復工具
- **`fix-symbols-config-cache.html`** - 專門修復 SymbolsConfig 緩存問題
- **`debug-symbols-config-cache.html`** - 診斷 SymbolsConfig 狀態

### 2. 輔助工具
- **`emergency-fix-stock-overview.html`** - 緊急修復所有緩存
- **`test-stock-overview-cache-fix.html`** - 自動化測試

## 📋 立即修復步驟

### 方案 1: 使用專用修復工具（推薦）
```
1. 訪問: http://localhost:3000/fix-symbols-config-cache.html
2. 點擊: "🚀 完整修復"
3. 等待自動重新導向到 StockOverview 頁面
4. 驗證顯示 67 個股票，包括 RR
```

### 方案 2: 手動修復
```
1. 打開瀏覽器開發者工具 Console
2. 執行以下代碼：
   ```javascript
   // 清除 symbolsConfig 緩存
   import('/src/utils/symbolsConfig.js').then(async (module) => {
     await module.symbolsConfig.refresh();
     console.log('SymbolsConfig cache cleared');
     
     // 檢查結果
     const symbols = await module.symbolsConfig.getSymbolsList();
     console.log(`Symbols count: ${symbols.length}, Has RR: ${symbols.includes('RR')}`);
   });
   
   // 清除 StockOverview 緩存
   localStorage.removeItem('investment_dashboard_cache_stock_overview_data');
   
   // 設置強制重新載入
   sessionStorage.setItem('force_reload_stock_overview', 'true');
   ```
3. 重新訪問 StockOverview 頁面
```

### 方案 3: 緊急重置
```
1. 訪問: http://localhost:3000/fix-symbols-config-cache.html
2. 點擊: "🆘 緊急重置"
3. 等待頁面自動重新載入
```

## 🔧 技術修復細節

### StockOverview.vue 改進
1. **緩存驗證**: 檢查緩存數據的股票數量
2. **強制刷新**: 支持通過 sessionStorage 標記清除緩存
3. **SymbolsConfig 清理**: 在強制刷新時也清除 symbolsConfig 緩存

```javascript
// 檢查緩存數據是否足夠
if (cachedSymbolCount >= expectedMinSymbols) {
  // 使用緩存
} else {
  // 清除無效緩存
  performanceCache.delete(CACHE_KEYS.STOCK_OVERVIEW_DATA)
}

// 強制刷新時清除 symbolsConfig
if (forceReload || emergencyFix || targetedFix) {
  await symbolsConfig.refresh()
  // ... 其他緩存清理
}
```

### SymbolsConfig 緩存機制
```javascript
class SymbolsConfigManager {
  constructor() {
    this.cache = new Map()
    this.updateInterval = 60 * 60 * 1000 // 60分鐘
  }
  
  async getSymbolsList() {
    // 1. 環境變數
    // 2. 緩存 (問題所在)
    // 3. universe.json
    // 4. Google Sheets
    // 5. 靜態 fallback
  }
}
```

## 🧪 驗證修復

### 自動化測試
```
1. 訪問: http://localhost:3000/test-stock-overview-cache-fix.html
2. 執行所有測試
3. 確認所有測試通過
```

### 手動驗證
```
1. 訪問 StockOverview 頁面
2. 檢查股票總數是否為 67 個
3. 搜索 "RR" 確認存在於 Technology 分組
4. 點擊 RR 進入詳情頁面確認正常
```

### 開發者工具驗證
```javascript
// 檢查 symbolsConfig 狀態
import('/src/utils/symbolsConfig.js').then(async (module) => {
  const symbols = await module.symbolsConfig.getSymbolsList();
  console.log('Symbols:', symbols.length, symbols.includes('RR'));
  console.log('Source:', module.symbolsConfig.getConfigSource());
  console.log('Cache info:', module.symbolsConfig.getCacheInfo());
});

// 檢查 quotes 數據
fetch('/data/quotes/latest.json').then(r => r.json()).then(d => {
  console.log('Quotes:', d.items.length, d.items.some(i => i.symbol === 'RR'));
});
```

## 🚀 部署到生產環境

```bash
# 執行部署腳本
deploy-cache-fix.bat

# 或手動部署
git add .
git commit -m "Fix SymbolsConfig cache issue"
git push origin main
```

## 📊 預期結果

修復成功後：
- ✅ StockOverview 頁面顯示 67 個股票
- ✅ RR 符號出現在 Technology 分組
- ✅ 所有股票的 StockCard 正常顯示
- ✅ 可以點擊進入各股票詳情頁面
- ✅ 緩存機制正常工作，不會重複出現問題

## 🔄 預防措施

### 1. 緩存版本化
```javascript
const CACHE_VERSION = '1.1.0'
const cacheKey = `symbols_v${CACHE_VERSION}`
```

### 2. 數據完整性檢查
```javascript
function validateSymbolsList(symbols) {
  return symbols.length >= 60 && symbols.includes('RR')
}
```

### 3. 自動緩存清理
```javascript
// 定期檢查緩存有效性
setInterval(() => {
  if (!validateSymbolsList(cachedSymbols)) {
    symbolsConfig.refresh()
  }
}, 30 * 60 * 1000) // 每30分鐘檢查
```

## 🆘 故障排除

### 如果修復後仍有問題

1. **檢查數據源**:
   ```bash
   # 確認 universe.json 包含 67 個股票
   cat config/universe.json | jq '.symbols | length'
   cat config/universe.json | jq '.symbols | contains(["RR"])'
   ```

2. **檢查 quotes 數據**:
   ```bash
   # 確認 quotes/latest.json 包含 67 個股票
   cat public/data/quotes/latest.json | jq '.items | length'
   cat public/data/quotes/latest.json | jq '.items | map(.symbol) | contains(["RR"])'
   ```

3. **重新生成數據**:
   ```bash
   # 重新生成 quotes
   node scripts/update-quotes.cjs
   
   # 重新生成 metadata
   node run-metadata-update.cjs
   ```

4. **完全重置**:
   - 清除所有瀏覽器數據
   - 重新啟動開發服務器
   - 使用無痕模式測試

---

**修復狀態**: ✅ 已修復
**最後更新**: 2025-12-28
**相關工具**: fix-symbols-config-cache.html, debug-symbols-config-cache.html