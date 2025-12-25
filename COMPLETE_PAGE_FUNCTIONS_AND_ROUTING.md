# 📚 Investment Dashboard 完整頁面功能與路由規則文件

## 📋 **文件概述**

本文件詳細說明 Investment Dashboard 專案中所有 18 個頁面的功能、路由規則、技術實現和使用場景。

---

## 🏠 **主要功能頁面 (4個)**

### **1. Market Overview (市場總覽)**
- **路由**: `/market-overview`
- **組件**: `MarketDashboard.vue`
- **路由名稱**: `market-overview`
- **功能描述**:
  - **市場指數顯示**: S&P 500, NASDAQ, DOW 即時指數
  - **恐懼貪婪指數**: Zeiierman Fear & Greed Gauge
  - **市場新聞**: TradingView Top Stories 整合
  - **股市洞察**: 市場分析和趨勢預測
- **技術實現**:
  - 使用 TradingView Widgets 顯示即時數據
  - 分階段載入 (高/中/低優先級)
  - 骨架屏載入狀態
  - 錯誤處理和重試機制
- **數據來源**:
  - TradingView API (即時指數)
  - 新聞 API 整合
  - 自定義恐懼貪婪指數算法
- **用戶場景**: 
  - 投資者查看市場整體狀況
  - 了解當日市場情緒和新聞
  - 作為投資決策的參考起點

### **2. Stock Overview (股票總覽)**
- **路由**: `/stock-overview`
- **組件**: `StockDashboard.vue` → `StockOverview.vue`
- **路由名稱**: `stock-overview`
- **功能描述**:
  - **股票清單**: 按 sector 分類顯示
  - **基本資訊**: 股價、漲跌幅、成交量
  - **技術指標預覽**: RSI, MACD, 移動平均線
  - **效能監控**: 頁面載入和數據更新狀態
- **技術實現**:
  - 虛擬滾動優化大量股票顯示
  - 股票卡片組件化設計
  - 即時價格更新 (TradingView Widgets)
  - 預計算技術指標整合
- **數據來源**:
  - Yahoo Finance API (基本數據)
  - 預計算技術指標文件
  - 股票元數據服務
- **用戶場景**:
  - 瀏覽所有追蹤的股票
  - 快速比較不同股票的表現
  - 選擇感興趣的股票進入詳情

### **3. Stock Detail (個股詳情)**
- **路由**: `/stock-overview/symbols/:symbol`
- **組件**: `StockDetail.vue`
- **路由名稱**: `stock-detail`
- **路由參數**: `symbol` (股票代號，如 ASTS, TSLA)
- **功能描述**:
  - **詳細圖表**: TradingView 完整圖表分析
  - **技術指標**: 完整的技術分析指標
  - **基本資料**: 公司資訊、財務數據
  - **相關新聞**: 個股相關新聞和分析
- **技術實現**:
  - 動態路由參數處理
  - 麵包屑導航
  - 多個 TradingView Widgets 整合
  - 滾動置頂功能 (已修復)
- **數據來源**:
  - TradingView Widgets (即時圖表)
  - Yahoo Finance API (基本資料)
  - 預計算技術指標
  - 新聞 API
- **用戶場景**:
  - 深入分析特定股票
  - 查看詳細的技術分析
  - 了解公司基本面資訊

### **4. Settings (系統設定)**
- **路由**: `/settings`
- **組件**: `Settings.vue`
- **路由名稱**: `settings`
- **功能描述**:
  - **隱私設定**: 追蹤和數據收集偏好
  - **系統診斷**: 查看系統狀態和數據新鮮度
  - **匯入匯出**: 配置備份和還原
- **技術實現**:
  - 基本框架已建立
  - 功能待完善 (標記為未來實施)
- **狀態**: ⚠️ 部分功能待實施
- **用戶場景**:
  - 個人化系統設定
  - 管理數據隱私偏好
  - 系統維護和診斷

---

## 🧪 **開發/測試頁面 (9個)**

### **API 測試頁面 (4個)**

#### **5. Top Stories Test**
- **路由**: `/top-stories-test`
- **組件**: `TopStoriesTest.vue`
- **路由名稱**: `top-stories-test`
- **功能描述**:
  - 測試 TradingView Top Stories Widget
  - 驗證新聞 API 整合
  - 配置參數測試
- **技術實現**:
  - TradingView Timeline Widget
  - 骨架屏載入
  - 錯誤處理機制
- **用途**: 開發階段測試新聞功能

#### **6. Stock Market Insight Test**
- **路由**: `/stock-market-insight-test`
- **組件**: `StockMarketInsightTest.vue`
- **路由名稱**: `stock-market-insight-test`
- **功能描述**:
  - 測試市場洞察 API
  - 驗證市場分析數據
  - 測試數據格式和顯示
- **用途**: 開發階段測試市場分析功能

#### **7. Yahoo Finance Test**
- **路由**: `/yahoo-finance-test`
- **組件**: `YahooFinanceTest.vue`
- **路由名稱**: `yahoo-finance-test`
- **功能描述**:
  - 測試 Yahoo Finance API 整合
  - 驗證技術指標數據獲取
  - 測試不同股票代號
- **技術實現**:
  - 動態股票代號輸入
  - 預設股票快速測試
  - API 響應時間監控
- **用途**: 開發階段測試數據源 API

#### **8. Metadata Service Test**
- **路由**: `/metadata-test`
- **組件**: `MetadataServiceTest.vue`
- **路由名稱**: `metadata-test`
- **功能描述**:
  - 測試股票元數據服務
  - 驗證股票基本資料
  - 測試數據完整性
- **用途**: 開發階段測試元數據功能

### **診斷頁面 (2個)**

#### **9. Proxy Diagnostic**
- **路由**: `/proxy-diagnostic`
- **組件**: `ProxyDiagnosticTest.vue`
- **路由名稱**: `proxy-diagnostic`
- **功能描述**:
  - 診斷 CORS 代理服務狀態
  - 測試 Yahoo Finance API 連線
  - 網路延遲和可用性檢查
- **技術實現**:
  - 多個代理服務並行測試
  - 響應時間監控
  - 詳細錯誤報告
- **用途**: 
  - 網路問題診斷
  - API 服務狀態監控
  - 生產環境故障排除

#### **10. Technical Validation**
- **路由**: `/technical-validation`
- **組件**: `TechnicalIndicatorsValidation.vue`
- **路由名稱**: `technical-validation`
- **功能描述**:
  - 驗證技術指標計算正確性
  - 對比我們的計算與 TradingView 數據
  - 數據一致性檢查
- **技術實現**:
  - 並行數據獲取和比較
  - 差異分析和報告
  - 視覺化對比圖表
- **用途**:
  - 算法正確性驗證
  - 數據品質保證
  - 技術指標調試

### **管理頁面 (3個)**

#### **11. Technical Manager**
- **路由**: `/technical-manager`
- **組件**: `TechnicalIndicatorsManager.vue`
- **路由名稱**: `technical-manager`
- **功能描述**:
  - 管理技術指標系統
  - 配置計算參數
  - 數據清理和維護
- **用途**:
  - 系統管理員工具
  - 技術指標配置
  - 數據維護操作

#### **12. Auto Update Monitor**
- **路由**: `/auto-update-monitor`
- **組件**: `AutoUpdateMonitor.vue`
- **路由名稱**: `auto-update-monitor`
- **功能描述**:
  - 監控自動更新系統
  - 查看排程任務狀態
  - 錯誤日誌和診斷
- **用途**:
  - 監控預計算任務
  - 系統健康檢查
  - 自動化流程管理

#### **13. System Manager**
- **路由**: `/system-manager`
- **組件**: `SystemManager.vue`
- **路由名稱**: `system-manager`
- **功能描述**:
  - 系統整體管理
  - 快取狀態監控
  - 效能指標查看
- **用途**:
  - 系統整體監控
  - 效能優化管理
  - 快取策略調整

---

## 🔄 **重定向配置 (5個)**

### **14. 根路徑重定向**
```javascript
{ path: '/', redirect: '/market-overview' }
```
- **功能**: 將網站根路徑重定向到市場總覽頁面
- **用途**: 確保用戶訪問網站時有明確的起始頁面
- **邏輯**: 無條件重定向

### **15. Legacy 市場頁面重定向**
```javascript
{ path: '/market-dashboard', redirect: '/market-overview' }
```
- **功能**: 舊版市場頁面路由重定向
- **用途**: 向後兼容，確保舊連結仍可使用
- **邏輯**: 靜態重定向到新路由

### **16. Legacy 股票頁面重定向**
```javascript
{ path: '/stock-dashboard', redirect: '/stock-overview' }
```
- **功能**: 舊版股票頁面路由重定向
- **用途**: 向後兼容，確保舊連結仍可使用
- **邏輯**: 靜態重定向到新路由

### **17. Legacy 股票詳情重定向**
```javascript
{ path: '/stock-dashboard/symbols/:symbol', redirect: to => `/stock-overview/symbols/${to.params.symbol}` }
```
- **功能**: 舊版股票詳情頁面路由重定向
- **用途**: 向後兼容，保持參數傳遞
- **邏輯**: 動態重定向，保留 symbol 參數

### **18. 404 萬用路由**
```javascript
{ path: '/:pathMatch(.*)*', redirect: '/market-overview' }
```
- **功能**: 捕獲所有未匹配的路由
- **用途**: 404 錯誤處理，避免空白頁面
- **邏輯**: 重定向到市場總覽作為預設頁面

---

## 🛠 **路由技術實現**

### **路由器配置**
```javascript
const router = createRouter({
  history: createWebHashHistory(),
  routes
})
```

### **路由模式**
- **模式**: Hash 模式 (`createWebHashHistory()`)
- **原因**: 適合靜態部署 (GitHub Pages)
- **URL 格式**: `https://domain.com/#/market-overview`

### **路由守衛**
- **全域守衛**: 無 (目前未實施權限控制)
- **滾動行為**: 頁面切換時自動滾動到頂部
- **載入狀態**: 每個頁面都有獨立的載入狀態管理

---

## 📊 **頁面分類統計**

| 頁面類型 | 數量 | 路由類型 | 生產環境建議 |
|----------|------|----------|-------------|
| **主要功能頁面** | 4 | 組件路由 | ✅ 保留 |
| **API 測試頁面** | 4 | 組件路由 | ⚠️ 考慮隱藏 |
| **診斷頁面** | 2 | 組件路由 | ⚠️ 權限控制 |
| **管理頁面** | 3 | 組件路由 | ⚠️ 權限控制 |
| **重定向配置** | 5 | 重定向路由 | ✅ 保留 |
| **總計** | 18 | - | - |

---

## 🎯 **用戶導航路徑**

### **一般投資者路徑**
```
/ → /market-overview → /stock-overview → /stock-overview/symbols/ASTS
```
1. 進入網站 (自動重定向到市場總覽)
2. 查看市場整體狀況和新聞
3. 瀏覽股票清單
4. 點擊感興趣的股票查看詳情

### **開發者測試路徑**
```
/proxy-diagnostic → /yahoo-finance-test → /technical-validation
```
1. 檢查網路連線和 API 狀態
2. 測試數據源 API 功能
3. 驗證技術指標計算正確性

### **系統管理員路徑**
```
/system-manager → /auto-update-monitor → /technical-manager
```
1. 查看系統整體狀態
2. 監控自動更新任務
3. 管理技術指標配置

---

## 🔧 **路由參數處理**

### **動態路由參數**
- **股票詳情**: `/stock-overview/symbols/:symbol`
  - 參數: `symbol` (必需)
  - 範例: `/stock-overview/symbols/ASTS`
  - 驗證: 組件內驗證股票代號有效性

### **查詢參數**
- **目前未使用**: 所有頁面都使用路徑參數
- **未來擴展**: 可考慮添加篩選、排序等查詢參數

### **路由元數據**
```javascript
// 範例: 未來可添加的元數據
{
  path: '/settings',
  component: Settings,
  meta: {
    requiresAuth: false,
    title: 'Settings',
    description: 'System configuration'
  }
}
```

---

## 🚨 **安全性考量**

### **生產環境路由過濾**
```javascript
// 建議的生產環境配置
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
  
  // 重定向 (始終可用)
  { path: '/market-dashboard', redirect: '/market-overview' },
  // ...
]
```

### **權限控制建議**
- **管理頁面**: 添加基本的訪問控制
- **診斷頁面**: 限制生產環境訪問
- **測試頁面**: 僅在開發環境顯示

---

## 📈 **效能優化**

### **路由層級優化**
- **懶載入**: 所有頁面組件都支援懶載入
- **代碼分割**: 按頁面類型分割 JavaScript 包
- **預載入**: 關鍵頁面的預載入策略

### **導航優化**
- **滾動管理**: 頁面切換時重置滾動位置
- **載入狀態**: 統一的載入狀態管理
- **錯誤處理**: 完善的錯誤邊界處理

---

## 🔮 **未來擴展**

### **新頁面規劃**
1. **投資組合頁面**: `/portfolio`
2. **警報設定頁面**: `/alerts`
3. **用戶登入頁面**: `/login`
4. **股票比較頁面**: `/compare`

### **路由增強**
1. **權限路由**: 基於用戶角色的路由控制
2. **動態路由**: 基於配置的動態路由生成
3. **國際化路由**: 多語言路由支援

---

**文件版本**: v1.0  
**最後更新**: 2024-12-25  
**涵蓋範圍**: 所有 18 個頁面的完整功能和路由規則  
**維護者**: Development Team  
**下次檢討**: 2025-03-25  