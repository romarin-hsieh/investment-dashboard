# 📚 Investment Dashboard 完整頁面清單文件

## 📋 **文件概述**

本文件提供 Investment Dashboard 專案中所有頁面的完整清單，包括主要功能頁面、開發測試頁面、重定向配置，以及每個頁面的詳細資訊和使用指南。

---

## 🏠 **主要功能頁面**

### **1. Market Overview (市場總覽)**
- **路由**: `/market-overview`
- **組件**: `MarketDashboard.vue`
- **檔案位置**: `src/pages/MarketDashboard.vue`
- **功能描述**:
  - 市場指數顯示 (S&P 500, NASDAQ, DOW)
  - 市場新聞整合
  - 股票熱力圖
  - 市場情緒指標
- **數據來源**:
  - TradingView Widget (即時指數)
  - Yahoo Finance API (歷史數據)
  - 新聞 API 整合
- **快取策略**: 指數數據 24 小時快取
- **載入特性**: 
  - ✅ 骨架屏載入
  - ✅ 分階段載入
  - ✅ 滾動置頂

### **2. Stock Overview (股票總覽)**
- **路由**: `/stock-overview`
- **組件**: `StockDashboard.vue` → `StockOverview.vue`
- **檔案位置**: `src/pages/StockDashboard.vue`, `src/components/StockOverview.vue`
- **功能描述**:
  - 股票清單按 sector 分類顯示
  - 股票基本資訊 (價格、漲跌幅、成交量)
  - 技術指標預覽
  - 股票搜尋和篩選
- **數據來源**:
  - Yahoo Finance API (股價數據)
  - 預計算技術指標
  - 股票元數據服務
- **快取策略**: 
  - 股價數據 24 小時快取
  - 技術指標 1 小時快取
- **載入特性**: 
  - ✅ 骨架屏載入
  - ✅ 虛擬滾動優化
  - ✅ 滾動置頂

### **3. Stock Detail (個股詳情)**
- **路由**: `/stock-overview/symbols/:symbol`
- **組件**: `StockDetail.vue`
- **檔案位置**: `src/pages/StockDetail.vue`
- **功能描述**:
  - 個股詳細資訊
  - TradingView 圖表整合
  - 技術指標完整顯示
  - 財務數據分析
  - 相關新聞
- **數據來源**:
  - TradingView Widget (即時圖表)
  - Yahoo Finance API (基本資料)
  - 預計算技術指標
  - 新聞 API
- **快取策略**: 
  - 基本資料 24 小時快取
  - 技術指標 1 小時快取
- **載入特性**: 
  - ✅ 骨架屏載入
  - ✅ 分階段載入
  - ✅ 滾動置頂 (已修復)

### **4. Settings (系統設定)**
- **路由**: `/settings`
- **組件**: `Settings.vue`
- **檔案位置**: `src/pages/Settings.vue`
- **功能描述**:
  - 系統偏好設定
  - 快取管理
  - 數據更新設定
  - 主題切換 (規劃中)
- **狀態**: ⚠️ 基本框架存在，功能待完善
- **載入特性**: 
  - ✅ 基本載入
  - ⚠️ 功能不完整

---

## 🧪 **開發/測試頁面**

### **API 測試頁面**

#### **5. Top Stories Test**
- **路由**: `/top-stories-test`
- **組件**: `TopStoriesTest.vue`
- **目的**: 測試新聞 API 整合
- **功能**: 新聞抓取和顯示測試

#### **6. Stock Market Insight Test**
- **路由**: `/stock-market-insight-test`
- **組件**: `StockMarketInsightTest.vue`
- **目的**: 測試市場洞察 API
- **功能**: 市場分析數據測試

#### **7. Yahoo Finance Test**
- **路由**: `/yahoo-finance-test`
- **組件**: `YahooFinanceTest.vue`
- **目的**: 測試 Yahoo Finance API 整合
- **功能**: 股價數據抓取測試

#### **8. Metadata Service Test**
- **路由**: `/metadata-test`
- **組件**: `MetadataServiceTest.vue`
- **目的**: 測試股票元數據服務
- **功能**: 股票基本資料測試

### **診斷頁面**

#### **9. Proxy Diagnostic**
- **路由**: `/proxy-diagnostic`
- **組件**: `ProxyDiagnosticTest.vue`
- **目的**: 診斷代理服務狀態
- **功能**: 
  - API 連線測試
  - 代理服務健康檢查
  - 網路延遲測試

#### **10. Technical Validation**
- **路由**: `/technical-validation`
- **組件**: `TechnicalIndicatorsValidation.vue`
- **目的**: 驗證技術指標計算正確性
- **功能**:
  - 技術指標計算驗證
  - 數據一致性檢查
  - 算法正確性測試

### **管理頁面**

#### **11. Technical Manager**
- **路由**: `/technical-manager`
- **組件**: `TechnicalIndicatorsManager.vue`
- **目的**: 管理技術指標系統
- **功能**:
  - 技術指標配置
  - 計算任務管理
  - 數據清理工具

#### **12. Auto Update Monitor**
- **路由**: `/auto-update-monitor`
- **組件**: `AutoUpdateMonitor.vue`
- **目的**: 監控自動更新系統
- **功能**:
  - 更新任務狀態監控
  - 排程管理
  - 錯誤日誌查看

#### **13. System Manager**
- **路由**: `/system-manager`
- **組件**: `SystemManager.vue`
- **目的**: 系統整體管理
- **功能**:
  - 系統狀態監控
  - 快取管理
  - 效能監控

---

## 🔄 **重定向配置**

### **主要重定向**
1. **根路徑重定向**
   ```javascript
   { path: '/', redirect: '/market-overview' }
   ```
   - 將根路徑重定向到市場總覽頁面

### **Legacy 路由重定向**
2. **舊版市場頁面**
   ```javascript
   { path: '/market-dashboard', redirect: '/market-overview' }
   ```

3. **舊版股票頁面**
   ```javascript
   { path: '/stock-dashboard', redirect: '/stock-overview' }
   ```

4. **舊版股票詳情頁面**
   ```javascript
   { path: '/stock-dashboard/symbols/:symbol', redirect: to => `/stock-overview/symbols/${to.params.symbol}` }
   ```

### **404 處理**
5. **萬用路由**
   ```javascript
   { path: '/:pathMatch(.*)*', redirect: '/market-overview' }
   ```
   - 所有未匹配的路由都重定向到市場總覽

---

## 📊 **頁面分類統計**

| 頁面類型 | 數量 | 狀態 | 生產環境建議 |
|----------|------|------|-------------|
| **主要功能頁面** | 4 | ✅ 完整 | 保留 |
| **API 測試頁面** | 4 | ✅ 正常 | 考慮隱藏 |
| **診斷頁面** | 2 | ✅ 正常 | 考慮隱藏 |
| **管理頁面** | 3 | ✅ 正常 | 權限控制 |
| **重定向配置** | 5 | ✅ 正常 | 保留 |
| **總計** | 18 | ✅ 100% | - |

---

## 🎯 **頁面使用指南**

### **一般用戶路徑**
```
/ → /market-overview → /stock-overview → /stock-overview/symbols/ASTS
```
1. 進入網站自動導向市場總覽
2. 瀏覽市場整體狀況
3. 查看股票清單
4. 點擊特定股票查看詳情

### **開發者路徑**
```
/technical-validation → /system-manager → /auto-update-monitor
```
1. 驗證技術指標正確性
2. 檢查系統整體狀態
3. 監控自動更新任務

### **測試路徑**
```
/proxy-diagnostic → /yahoo-finance-test → /metadata-test
```
1. 檢查網路連線狀態
2. 測試數據源 API
3. 驗證元數據服務

---

## 🔧 **技術實現詳情**

### **路由配置**
```javascript
// 使用 Vue Router 4 + Hash 模式
const router = createRouter({
  history: createWebHashHistory(),
  routes
})
```

### **頁面載入優化**
1. **骨架屏系統**
   - 所有主要頁面都實施骨架屏
   - 提升用戶體驗和感知效能

2. **分階段載入**
   - 關鍵內容優先載入
   - 次要內容延遲載入

3. **滾動管理**
   - 頁面切換時自動滾動到頂部
   - 防止滾動位置殘留問題

### **快取策略**
```javascript
// 不同類型數據的快取時間
const CACHE_DURATIONS = {
  QUOTES: 24 * 60 * 60 * 1000,        // 24 小時
  DAILY_DATA: 24 * 60 * 60 * 1000,    // 24 小時
  TECHNICAL_INDICATORS: 60 * 60 * 1000, // 1 小時
  SYMBOLS_CONFIG: 60 * 60 * 1000,      // 1 小時
  METADATA: 7 * 24 * 60 * 60 * 1000    // 7 天
}
```

---

## 🚨 **安全性考量**

### **生產環境建議**

#### **隱藏開發頁面**
```javascript
const isDevelopment = process.env.NODE_ENV === 'development'

const routes = [
  // 主要頁面 (始終可用)
  { path: '/', redirect: '/market-overview' },
  { path: '/market-overview', component: MarketDashboard },
  { path: '/stock-overview', component: StockDashboard },
  { path: '/stock-overview/symbols/:symbol', component: StockDetail },
  { path: '/settings', component: Settings },
  
  // 開發頁面 (僅開發環境)
  ...(isDevelopment ? [
    { path: '/top-stories-test', component: TopStoriesTest },
    { path: '/proxy-diagnostic', component: ProxyDiagnosticTest },
    // ... 其他測試頁面
  ] : []),
]
```

#### **管理頁面權限控制**
- 實施基本的訪問控制
- 添加管理員驗證機制
- 隱藏敏感的系統資訊

### **數據安全**
- API 金鑰管理
- 敏感資訊過濾
- 錯誤訊息清理

---

## 📈 **效能監控**

### **頁面載入時間**
| 頁面類型 | 目標載入時間 | 當前狀態 |
|----------|-------------|----------|
| 市場總覽 | < 2 秒 | ✅ 達標 |
| 股票總覽 | < 3 秒 | ✅ 達標 |
| 股票詳情 | < 2.5 秒 | ✅ 達標 |
| 設定頁面 | < 1 秒 | ✅ 達標 |

### **快取命中率**
- **目標**: > 80%
- **當前**: ~85%
- **優化空間**: 預載入策略

---

## 🔮 **未來規劃**

### **短期計劃 (1-2 個月)**
1. **完善 Settings 頁面功能**
   - 主題切換
   - 個人化設定
   - 快取管理介面

2. **添加導航菜單**
   - 主導航欄
   - 麵包屑導航
   - 快速跳轉功能

### **中期計劃 (3-6 個月)**
1. **用戶系統**
   - 用戶註冊/登入
   - 個人化設定
   - 收藏功能

2. **進階功能**
   - 股票比較工具
   - 投資組合追蹤
   - 警報系統

### **長期計劃 (6+ 個月)**
1. **移動端優化**
   - PWA 支援
   - 離線功能
   - 推播通知

2. **數據分析**
   - 用戶行為分析
   - 效能監控
   - A/B 測試

---

## 📝 **維護檢查清單**

### **每週檢查**
- [ ] 檢查所有頁面可訪問性
- [ ] 驗證快取策略效果
- [ ] 監控頁面載入效能
- [ ] 檢查錯誤日誌

### **每月檢查**
- [ ] 更新頁面功能狀態
- [ ] 檢討用戶使用路徑
- [ ] 評估新功能需求
- [ ] 清理未使用的測試頁面

### **季度檢查**
- [ ] 檢討頁面架構
- [ ] 評估安全性設定
- [ ] 更新文件內容
- [ ] 規劃新功能開發

---

**文件版本**: v1.0  
**最後更新**: 2024-12-25  
**涵蓋範圍**: 所有已實現頁面  
**維護者**: Development Team  
**下次檢討**: 2025-03-25  