# StockOverview.vue 改進建議

## 已修正的問題

### 1. ✅ 新增 Symbol 顯示問題
- **問題**: `expectedSymbols` 只包含舊的 24 個 symbols，新增的 44 個 symbols 沒有顯示
- **修正**: 更新為從 `symbolsConfig.getStaticSymbols()` 動態獲取完整的 68 個 symbols
- **影響**: 現在所有新增的 symbols (如 RR, VST, KTOS 等) 都會正確顯示

### 2. ✅ 交易所映射不完整
- **問題**: `getStockExchange` 方法只支援舊的 symbols
- **修正**: 添加完整的 symbol-to-exchange 映射，包含所有 68 個 symbols
- **新增支援**: NYSE (21個), NASDAQ (45個), AMEX (2個)

### 3. ✅ 硬編碼配置問題
- **問題**: 配置散佈在代碼各處，難以維護
- **修正**: 創建 `STOCK_OVERVIEW_CONFIG` 集中管理所有配置
- **改進**: 更易維護和擴展

## 進一步改進建議

### 1. 🔄 配置外部化 (建議實施)
```javascript
// 建議創建 src/config/stockOverviewConfig.js
export const STOCK_OVERVIEW_CONFIG = {
  // 將所有配置移到外部文件
  EXCHANGE_MAPPINGS: { /* ... */ },
  MARKET_INDEX_CONFIG: { /* ... */ },
  // 可以從環境變數或 API 動態載入
}
```

### 2. 🔄 緩存策略優化 (建議實施)
```javascript
// 當前問題：緩存邏輯複雜，可能導致數據不一致
// 建議：簡化緩存策略
const CACHE_STRATEGY = {
  STOCK_OVERVIEW: {
    TTL: 5 * 60 * 1000, // 5分鐘
    KEY: 'stock_overview_v2',
    INVALIDATION_TRIGGERS: ['symbol_config_change', 'market_close']
  }
}
```

### 3. 🔄 錯誤處理增強 (建議實施)
```javascript
// 當前：基本錯誤處理
// 建議：分層錯誤處理
const ERROR_HANDLING = {
  NETWORK_ERROR: 'retry_with_fallback',
  DATA_INCOMPLETE: 'partial_display',
  CONFIG_ERROR: 'use_static_fallback'
}
```

### 4. 🔄 性能優化 (建議實施)
```javascript
// 建議：虛擬滾動 + 懶加載
// 當 symbols 數量增加時，考慮分頁或虛擬滾動
const PERFORMANCE_CONFIG = {
  VIRTUAL_SCROLLING: true,
  ITEMS_PER_PAGE: 20,
  LAZY_LOAD_THRESHOLD: 10
}
```

### 5. 🔄 組件拆分 (建議實施)
```
StockOverview.vue (主容器)
├── MarketIndexWidget.vue (市場指數)
├── SectorGroup.vue (行業分組)
│   └── StockCard.vue (個股卡片)
├── LoadingState.vue (載入狀態)
└── ErrorState.vue (錯誤狀態)
```

## 代碼架構改進

### 當前架構問題
1. **單一組件過大**: StockOverview.vue 包含太多邏輯
2. **配置散佈**: 硬編碼配置分散在各處
3. **緩存複雜**: 多層緩存邏輯難以理解和維護
4. **錯誤處理不一致**: 不同錯誤的處理方式不統一

### 建議的新架構
```
src/
├── components/
│   ├── StockOverview/
│   │   ├── StockOverview.vue (主組件，簡化)
│   │   ├── MarketIndexSection.vue
│   │   ├── SectorGroupList.vue
│   │   ├── SectorGroup.vue
│   │   └── StockOverviewSkeleton.vue
│   └── shared/
│       ├── StockCard.vue
│       └── ErrorBoundary.vue
├── config/
│   ├── stockOverviewConfig.js (集中配置)
│   └── exchangeMappings.js (交易所映射)
├── services/
│   ├── stockDataService.js (數據獲取)
│   └── cacheService.js (緩存管理)
└── utils/
    ├── stockOverviewHelpers.js (輔助函數)
    └── errorHandlers.js (錯誤處理)
```

## 具體實施步驟

### Phase 1: 立即修正 (已完成)
- [x] 修正 expectedSymbols 列表
- [x] 更新 getStockExchange 映射
- [x] 集中配置到 STOCK_OVERVIEW_CONFIG

### Phase 2: 架構優化 (建議)
- [ ] 創建外部配置文件
- [ ] 簡化緩存策略
- [ ] 增強錯誤處理
- [ ] 添加單元測試

### Phase 3: 性能優化 (可選)
- [ ] 實施虛擬滾動
- [ ] 添加懶加載
- [ ] 優化重新渲染

### Phase 4: 組件拆分 (長期)
- [ ] 拆分為多個小組件
- [ ] 創建可重用的 hooks
- [ ] 實施狀態管理

## 測試建議

### 單元測試
```javascript
// 建議添加的測試
describe('StockOverview', () => {
  test('should display all configured symbols', () => {})
  test('should handle missing symbols gracefully', () => {})
  test('should map exchanges correctly', () => {})
  test('should cache data appropriately', () => {})
})
```

### 集成測試
```javascript
// 建議添加的集成測試
describe('StockOverview Integration', () => {
  test('should load data from multiple sources', () => {})
  test('should handle API failures', () => {})
  test('should update when symbols config changes', () => {})
})
```

## 維護性改進

### 1. 文檔化
- 添加 JSDoc 註釋
- 創建組件使用說明
- 記錄配置選項

### 2. 類型安全
```typescript
// 建議遷移到 TypeScript
interface StockOverviewConfig {
  exchangeMappings: Record<string, string>
  marketIndexConfig: MarketIndexConfig
  minConfidenceThreshold: number
}
```

### 3. 監控和日誌
```javascript
// 建議添加監控
const MONITORING = {
  PERFORMANCE_METRICS: ['load_time', 'render_time', 'api_response_time'],
  ERROR_TRACKING: ['api_errors', 'cache_misses', 'render_errors'],
  USER_INTERACTIONS: ['symbol_clicks', 'refresh_actions']
}
```

---

**總結**: 當前修正已解決主要問題，建議按階段實施進一步改進以提高代碼質量和維護性。