# 📚 快取系統完整文件

## 🗂️ 快取系統概覽

本系統實施了多層快取架構，針對不同類型的數據採用不同的快取策略，以優化效能和使用者體驗。

## 📊 **快取系統詳細說明**

### 1. **效能快取 (performanceCache.js)**

#### **功能說明**
- 提供多層快取和預載入功能
- 支援內存快取和 localStorage 持久化
- 智能 TTL (Time To Live) 管理

#### **服務的功能**
- **Stock Overview 頁面**: 完整的股票概覽數據快取
- **Market Dashboard**: 市場數據快取
- **API 響應**: 各種 API 調用結果快取
- **配置數據**: 系統配置和設定快取

#### **快取時間設定 (已更新)**
```javascript
export const CACHE_TTL = {
  QUOTES: 24 * 60 * 60 * 1000,           // 24 小時 - 改為每日更新 (美股收盤後半小時觸發)
  DAILY_DATA: 24 * 60 * 60 * 1000,       // 24 小時 - 改為每日更新 (美股收盤後半小時觸發)
  METADATA: 24 * 60 * 60 * 1000,         // 24 小時 - 元數據變化很少
  CONFIG: 60 * 60 * 1000,                // 1 小時 - 配置數據保持不變
  TECHNICAL_INDICATORS: 24 * 60 * 60 * 1000 // 24 小時 - 技術指標每日更新
}
```

#### **快取鍵定義**
```javascript
export const CACHE_KEYS = {
  QUOTES_SNAPSHOT: 'quotes_snapshot',
  DAILY_SNAPSHOT: 'daily_snapshot',
  METADATA_BATCH: 'metadata_batch',
  SYMBOLS_CONFIG: 'symbols_config',
  STOCK_OVERVIEW_DATA: 'stock_overview_data'
}
```

#### **核心方法**
- `set(key, data, ttl)`: 設置快取項目
- `get(key)`: 獲取快取項目
- `has(key)`: 檢查快取是否存在
- `delete(key)`: 刪除特定快取
- `clear()`: 清除所有快取
- `getStats()`: 獲取快取統計信息

---

### 2. **技術指標快取 (technicalIndicatorsCache.js)**

#### **功能說明**
- 為股票提供每日技術指標快取
- 避免重複計算相同日期的技術指標
- 支援內存和 localStorage 雙層快取

#### **服務的功能**
- **TechnicalIndicators 組件**: 顯示股票技術指標
- **StockCard 組件**: 股票卡片中的技術指標數據
- **Stock Detail 頁面**: 詳細的技術分析數據

#### **快取時間設定**
```javascript
this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 小時緩存
```

#### **快取鍵格式**
```javascript
getCacheKey(symbol) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${this.cachePrefix}${symbol}_${today}`;
}
// 例如: technical_indicators_ASTS_2024-12-25
```

#### **核心方法**
- `getTechnicalIndicators(symbol)`: 獲取技術指標數據
- `setTechnicalIndicators(symbol, data)`: 設置技術指標快取
- `clearSymbolCache(symbol)`: 清除特定股票快取
- `clearAllCache()`: 清除所有技術指標快取
- `getCacheStats()`: 獲取快取統計信息

#### **數據新鮮度檢查**
- 每日自動更新 (基於日期鍵)
- 與 performanceCache 協調，避免數據不一致
- 支援手動清除和刷新

---

### 3. **符號配置快取 (symbolsConfig.js)**

#### **功能說明**
- 管理股票符號列表的配置
- 支援多種數據源的 fallback 策略
- 智能快取更新機制

#### **服務的功能**
- **Stock Overview**: 決定顯示哪些股票
- **系統配置**: 動態更新股票列表
- **API 調用**: 為其他服務提供股票符號列表

#### **快取時間設定 (已更新)**
```javascript
// 從環境變數讀取快取時間，預設 60 分鐘 (1 小時)
const cacheMinutes = import.meta.env.VITE_CACHE_SYMBOLS_MINUTES || 60
this.updateInterval = cacheMinutes * 60 * 1000 // 轉換為毫秒
```

#### **數據源優先級**
1. **環境變數** (最高優先級)
2. **快取數據** (如果在更新間隔內)
3. **universe.json** (新增)
4. **Google Sheets** (可選，非阻塞)
5. **靜態配置** (最終 fallback)

#### **核心方法**
- `getSymbolsList()`: 獲取股票符號列表
- `fetchFromUniverse()`: 從 universe.json 獲取
- `fetchFromGoogleSheets()`: 從 Google Sheets 獲取
- `getStaticSymbols()`: 獲取靜態符號列表
- `refresh()`: 手動刷新配置

---

### 4. **預計算指標快取 (precomputedIndicatorsApi.js)**

#### **功能說明**
- 快取預計算的技術指標數據
- 提供快速的技術指標查詢
- 支援批次數據載入

#### **服務的功能**
- **混合技術指標 API**: 作為數據源之一
- **技術指標驗證**: 提供預計算數據比對
- **效能優化**: 減少即時計算負擔

#### **快取時間設定 (已更新)**
```javascript
this.cacheTimeout = 60 * 60 * 1000; // 1小時緩存 (技術指標每日更新)
```

#### **快取鍵格式**
```javascript
// 格式: precomputed_${symbol}
// 例如: precomputed_ASTS
```

#### **核心方法**
- `getTechnicalIndicators(symbol)`: 獲取預計算指標
- `getAvailableSymbols()`: 獲取可用符號列表
- `getLatestIndex()`: 獲取最新索引信息

---

### 5. **Yahoo Finance API 快取**

#### **功能說明**
- 快取 Yahoo Finance API 的響應
- 減少 API 調用頻率
- 提供股票基本信息快取

#### **服務的功能**
- **元數據服務**: 獲取股票基本信息
- **動態數據更新**: 實時股票數據 (已改為每日更新)
- **API 限制管理**: 避免超出 API 調用限制

#### **快取時間設定**
```javascript
// API 請求快取
this.cacheTimeout = 5 * 60 * 1000; // 5 分鐘緩存

// 股票信息快取 (已更新為每日)
stockInfoCache: 24 * 60 * 60 * 1000 // 24 小時
```

#### **重要變更**
- **股價數據**: 現在使用 TradingView Widget 實時顯示
- **Yahoo Finance API**: 改為每日更新，觸發時機為美股收盤後半小時
- **數據同步**: 與其他快取系統協調更新時間

---

## ⏰ **自動更新調度器 (autoUpdateScheduler.js)**

### **更新時機設定 (已更新)**

#### **技術指標更新**
```javascript
technicalIndicators: {
  enabled: true,
  interval: 24 * 60 * 60 * 1000,        // 24 小時 (每日更新)
  marketHoursOnly: true,
  updateTimeWindow: { start: 16.5, end: 17 }, // 美東時間 16:30-17:00 (收盤後半小時)
  retryAttempts: 3,
  retryDelay: 5 * 60 * 1000             // 5 分鐘
}
```

#### **元數據更新**
```javascript
metadata: {
  enabled: true,
  interval: 24 * 60 * 60 * 1000,        // 24 小時 (每日更新)
  marketHoursOnly: true,
  updateTimeWindow: { start: 16.5, end: 17 }, // 美東時間 16:30-17:00 (收盤後半小時)
  retryAttempts: 2,
  retryDelay: 30 * 60 * 1000            // 30 分鐘
}
```

### **時區處理**
- 使用 `Intl.DateTimeFormat` 正確處理夏令時
- 自動轉換為美東時間 (EST/EDT)
- 支援更新時間窗口檢查

### **更新觸發邏輯**
1. **檢查更新時間窗口**: 是否在美股收盤後半小時內
2. **檢查數據年齡**: 是否需要更新
3. **執行更新**: 清除相關快取，觸發數據重新載入
4. **重試機制**: 失敗時自動重試

---

## 🔄 **快取協調和數據一致性**

### **快取間的協調機制**

#### **數據新鮮度檢查**
- **performanceCache** 與 **technicalIndicatorsCache** 協調
- 確保技術指標數據與股價數據的時間一致性
- 避免顯示過期或不匹配的數據

#### **更新順序**
1. **Yahoo Finance API** 數據更新 (美股收盤後半小時)
2. **技術指標** 重新計算和快取
3. **performanceCache** 清除相關項目
4. **前端組件** 自動重新載入新數據

#### **快取失效策略**
- **時間基礎**: 根據 TTL 自動失效
- **版本基礎**: 系統版本更新時清除快取
- **手動觸發**: 用戶手動刷新或管理員操作

---

## 📈 **效能監控和統計**

### **快取效能指標**
- **命中率**: 快取命中與總請求的比例
- **存儲大小**: 各快取系統佔用的存儲空間
- **更新頻率**: 快取更新的頻率統計
- **錯誤率**: 快取操作失敗的比例

### **監控工具**
- **performanceMonitor.js**: 追蹤快取操作效能
- **SystemManager**: 顯示快取統計信息
- **自動警告**: 快取效能異常時發出警告

---

## 🛠️ **維護和故障排除**

### **常見問題**
1. **快取不一致**: 不同快取系統間數據不匹配
2. **存儲空間**: localStorage 空間不足
3. **更新失敗**: 自動更新機制失效

### **解決方案**
1. **手動清除快取**: 通過 SystemManager 清除所有快取
2. **重新初始化**: 重新啟動快取系統
3. **降級模式**: 使用靜態數據作為備案

### **最佳實踐**
- 定期監控快取效能
- 及時清理過期快取
- 保持快取系統間的協調
- 實施適當的錯誤處理

---

## 🔮 **未來改進計劃**

### **短期改進**
1. **智能預載入**: 根據用戶行為預測需要的數據
2. **壓縮快取**: 使用 LZ-string 壓縮大型數據
3. **快取分析**: 更詳細的快取使用分析

### **長期改進**
1. **分散式快取**: 支援多節點快取同步
2. **機器學習**: AI 驅動的快取策略優化
3. **邊緣快取**: CDN 層級的快取實施

---

**文件版本**: 1.0  
**最後更新**: 2024-12-25  
**維護者**: 系統開發團隊  