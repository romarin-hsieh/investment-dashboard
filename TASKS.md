# Investment Dashboard - 開發任務清單

## 專案狀態
- **完成度**: 98-99% 🎉
- **核心架構**: ✅ 完成
- **UI 實現**: ✅ 完成  
- **TradingView 整合**: ✅ 完成
- **響應式設計**: ✅ 完成
- **頁面重構**: ✅ 完成
- **性能優化**: ✅ 完成
- **部署配置**: ✅ 完成
- **路由修復**: ✅ 完成
- **Market Dashboard**: ✅ 完成
- **Stock Dashboard**: ✅ 完成
- **Fear & Greed Index**: ✅ 完成
- **GitHub Pages 部署**: ✅ 完成
- **Yahoo Finance API 整合**: ✅ 完成
- **技術指標擴展**: ✅ 完成

---

## ✅ 已完成任務 (2025-12-24 最新狀態)

### Phase 1: 核心 UI 功能 ✅

#### 1.1 實現 DataFetcher 層 📡 ✅
**檔案**: `src/lib/fetcher.ts`
- ✅ 實現 status-first fetch 策略
- ✅ 實現 fallback 機制 (網路快照 → localStorage cache → N/A)
- ✅ 實現 cache-busting
- ✅ 錯誤處理和重試邏輯
- ✅ 生產環境路徑修復 (GitHub Pages 兼容)

#### 1.2 實現 Market Dashboard 📊 ✅
**檔案**: `src/pages/MarketDashboard.vue`
- ✅ Major Market Indices (TradingView Tickers)
- ✅ VIX Indicator 和 VIX Chart
- ✅ Fear & Greed Index (Zeiierman 算法實現)
- ✅ Top Stories (TradingView Timeline)
- ✅ Stock Market Insight (Daily/Weekly)
- ✅ Stock Heatmap (TradingView)
- ✅ 響應式佈局和容器優化

#### 1.3 實現 Stock Dashboard 🏢 ✅
**檔案**: `src/pages/StockDashboard.vue`, `src/components/StockOverview.vue`
- ✅ 符號配置管理 (環境變數 + Google Sheets + 靜態 fallback)
- ✅ 10 分鐘緩存機制
- ✅ 按行業分組 (Yahoo Finance 11 標準分類)
- ✅ 信心閾值 >= 0.7，< 0.7 歸類為 Unknown
- ✅ 組內按 symbol A-Z 排序
- ✅ TradingView Ticker Tape 整合

#### 1.4 實現 Yahoo Finance API 技術指標 📈 ✅
**檔案**: `src/utils/yahooFinanceApi.js`, `src/pages/YahooFinanceTest.vue`
- ✅ Yahoo Finance API 整合 (CORS 代理支持)
- ✅ 完整技術指標計算：
  - ✅ 移動平均線：MA5, SMA5, MA10, SMA10, MA30, SMA30, SMA50
  - ✅ 一目均衡表：轉換線(9), 基準線(26), 遲行線(26)
  - ✅ 成交量加權移動平均線：VWMA(20)
  - ✅ 技術指標：RSI(14), ADX(14), MACD Level(12,26)
- ✅ 算法文檔化 (`TECHNICAL_INDICATORS_ALGORITHMS.md`)
- ✅ 測試頁面 UI 重構 (按類別分組顯示)
- ✅ 5分鐘數據緩存機制
- ✅ 移除模擬數據，完全使用真實 API 數據
- ✅ **每日緩存系統** - 為股票提供24小時緩存，避免重複計算
- ✅ **Stock Overview 整合** - 替換原有 TradingView widget，使用新算法指標
- ✅ **指標佈局優化** - 4行3列網格佈局，移除展開按鈕

#### 1.5 實現 StockCard 組件 🎯 ✅
**檔案**: `src/components/StockCard.vue`
- ✅ Symbol Overview (2/3) + Technical Analysis (1/3) 佈局
- ✅ 容器高度優化 (440px)
- ✅ 行業標籤彩色編碼
- ✅ Detail 按鈕導航功能
- ✅ 響應式設計 (桌面/平板/手機)

#### 1.6 實現 StockDetail 頁面 📋 ✅
**檔案**: `src/pages/StockDetail.vue`
- ✅ 三行佈局結構 (Symbol Overview + Technical / Company Profile / Fundamental Data)
- ✅ 麵包屑導航和返回按鈕
- ✅ Widget 高度對齊 (440px/400px/600px)
- ✅ 行業標籤一致性
- ✅ 響應式設計

#### 1.6 性能優化系統 ⚡ ✅
**檔案**: `src/components/FastTradingViewWidget.vue`, `src/utils/widgetCache.js`
- ✅ FastTradingViewWidget 高性能組件
- ✅ Widget 緩存和節流機制
- ✅ 預載入系統
- ✅ 性能監控工具
- ✅ IntersectionObserver 延遲載入

#### 1.7 符號配置管理 🔧 ✅
**檔案**: `src/utils/symbolsConfig.js`
- ✅ 4 層 fallback 策略 (環境變數 → 緩存 → Google Sheets → 靜態)
- ✅ 10 分鐘緩存機制
- ✅ Google Sheets 整合 (3 秒超時)
- ✅ 配置來源監控

### Phase 2: TradingView 整合和 UI 優化 ✅

#### 2.1 TradingView Widgets 整合 📈 ✅
**檔案**: 多個 TradingView 組件
- ✅ Symbol Overview Widget (淺色主題，透明背景)
- ✅ Technical Analysis Widget
- ✅ Company Profile Widget
- ✅ Fundamental Data Widget
- ✅ Stock Heatmap Widget
- ✅ Ticker Tape Widget
- ✅ VIX Chart Widget
- ✅ Top Stories Timeline Widget
- ✅ Major Market Indices Tickers

#### 2.2 Fear & Greed Index 實現 🎭 ✅
**檔案**: `src/components/ZeiiermanFearGreedGauge.vue`
- ✅ Zeiierman 7 組件算法精確實現
- ✅ 半圓形儀表盤設計 (CNN 風格)
- ✅ 低飽和度配色方案
- ✅ 當前情緒顯示 (58 - Greed)
- ✅ 組件分解顯示
- ✅ 響應式設計

#### 2.3 容器高度優化 📏 ✅
- ✅ StockCard widgets: 440px (Symbol Overview + Technical Analysis)
- ✅ StockDetail widgets: 440px/400px/600px
- ✅ Market Dashboard widgets: 各自優化高度
- ✅ 移除不必要的 padding 和 margin
- ✅ 完整內容顯示，無浪費空間

#### 2.4 版權和樣式清理 🧹 ✅
- ✅ 移除所有 TradingView 版權元素
- ✅ 在 Footer 統一顯示 TradingView 歸屬
- ✅ 清理相關 CSS 樣式
- ✅ 容器溢出問題修復

### Phase 3: 路由和部署 🚀 ✅

#### 3.1 路由系統重構 🛣️ ✅
**檔案**: `src/main.js`
- ✅ 改用 Hash 路由模式 (createWebHashHistory)
- ✅ GitHub Pages 完全兼容
- ✅ 所有導航按鈕路由修復
- ✅ SPA 路由處理 (index.html + 404.html)

#### 3.2 GitHub Pages 部署 📦 ✅
**檔案**: `.github/workflows/deploy.yml`, 部署腳本
- ✅ GitHub Actions 自動部署工作流程
- ✅ gh-pages 手動部署支持
- ✅ 靜態資源正確複製
- ✅ 基礎路徑配置 (/investment-dashboard/)
- ✅ 404 錯誤處理和 SPA 重定向

#### 3.3 生產環境優化 🏭 ✅
**檔案**: `vite.config.js`, `src/lib/fetcher.ts`
- ✅ Vite 生產環境配置
- ✅ DataFetcher 路徑自動檢測
- ✅ 靜態資源正確部署
- ✅ 環境變數支持

### Phase 4: 最終優化和清理 🎨 ✅

#### 4.1 UI/UX 最終調整 ✨ ✅
- ✅ Header 置頂 (sticky positioning)
- ✅ 導航樣式優化 (水平/垂直居中)
- ✅ 頁面標題統一 ("Overview" 而非 "Dashboard")
- ✅ Footer 重新設計 (單行佈局，移除邊框)
- ✅ 行業標籤顏色一致性

#### 4.2 性能測試和監控 📊 ✅
**檔案**: `src/pages/PerformanceTestNew.vue`
- ✅ Clear Results 功能修復
- ✅ Mock widgets 測試模式
- ✅ Console.log 恢復機制
- ✅ 組件卸載清理

#### 4.3 代碼清理和文檔 📚 ✅
- ✅ 刪除所有測試頁面 (保留必要的開發工具)
- ✅ 清理未使用的組件和樣式
- ✅ 路由配置簡化
- ✅ 導航選單清理

---

## 🎯 當前狀態總結

### 已完成的核心功能
1. **Market Dashboard** - 完整的市場概覽頁面
   - Major Market Indices, VIX, Fear & Greed Index
   - Top Stories, Stock Market Insight, Stock Heatmap

2. **Stock Dashboard** - 完整的股票分析頁面
   - 符號配置管理，行業分組，Ticker Tape
   - 高性能 StockCard 組件

3. **Stock Detail** - 詳細的個股分析頁面
   - 三層佈局，完整的 TradingView 整合

4. **部署系統** - 生產就緒的部署配置
   - GitHub Pages 自動部署
   - Hash 路由，完全兼容靜態託管

### 技術架構完成度
- ✅ **前端框架**: Vue 3 + Vite
- ✅ **路由系統**: Vue Router 4 (Hash 模式)
- ✅ **數據管理**: DataFetcher + StateManager
- ✅ **性能優化**: FastTradingViewWidget + 緩存
- ✅ **響應式設計**: 完整的多設備支持
- ✅ **部署配置**: GitHub Pages + 自動化

### 線上訪問
- **主頁**: https://romarin-hsieh.github.io/investment-dashboard/#/market-dashboard
- **Market Dashboard**: https://romarin-hsieh.github.io/investment-dashboard/#/market-dashboard  
- **Stock Dashboard**: https://romarin-hsieh.github.io/investment-dashboard/#/stock-dashboard

---

## 🔄 未來可能的擴展 (優先級 P3)

### 可選功能增強
- [ ] **Settings 頁面**: 用戶偏好設定
- [ ] **更多 TradingView Widgets**: Economic Calendar, Financials 等
- [ ] **主題切換**: 深色/淺色主題
- [ ] **多語言支持**: 英文/中文切換
- [ ] **數據導出**: CSV/JSON 導出功能

### 技術優化
- [ ] **PWA 支持**: Service Worker, 離線功能
- [ ] **更多測試**: E2E 測試，視覺回歸測試
- [ ] **SEO 優化**: Meta 標籤，結構化數據
- [ ] **監控系統**: 錯誤追蹤，性能監控

---

## 📊 專案統計

### 開發時間統計
- **總開發時間**: ~120-150 小時
- **核心功能**: 80-100 小時
- **UI/UX 優化**: 25-30 小時  
- **部署和修復**: 15-20 小時

### 代碼統計
- **Vue 組件**: ~30 個
- **頁面**: 4 個主要頁面
- **工具函數**: ~10 個
- **測試文件**: ~8 個

### 功能完成度
- **Market Dashboard**: 100% ✅
- **Stock Dashboard**: 100% ✅  
- **Stock Detail**: 100% ✅
- **路由系統**: 100% ✅
- **部署系統**: 100% ✅
- **性能優化**: 100% ✅
- **響應式設計**: 100% ✅

---

## 🎉 專案完成

**Investment Dashboard POC 已達到生產就緒狀態！**

所有核心功能已完成並部署上線，用戶可以通過 GitHub Pages 訪問完整的投資儀表板功能。專案具備：

- ✅ 完整的市場和股票分析功能
- ✅ 高性能的 TradingView 整合
- ✅ 響應式設計和優秀的用戶體驗
- ✅ 穩定的部署和路由系統
- ✅ 良好的代碼架構和可維護性

**線上演示**: https://romarin-hsieh.github.io/investment-dashboard/

---

*最後更新: 2025-12-24*

---

## 🚧 待開發任務

### Phase 2: Settings 和工具 (優先級 P1)

#### 2.1 實現 Settings 頁面 ⚙️
**檔案**: `src/pages/Settings.vue`
**預估時間**: 4-6 小時

- [ ] 顯示 prompt_research.md (read-only)
- [ ] 顯示 commit hash from version.json
- [ ] 4 個 toggles UI (localStorage 持久化)
- [ ] Diagnostics 面板
- [ ] 測試

#### 2.2 實現 Import/Export UI 📁
**檔案**: `src/components/ImportExport.vue`
**預估時間**: 4-5 小時

- [ ] Export 功能 UI
- [ ] Import 功能 UI  
- [ ] Dry-run 預覽 UI
- [ ] 錯誤處理和訊息顯示
- [ ] 測試

### Phase 3: GitHub Actions 工作流程 (優先級 P1)

#### 3.1 Hourly Quotes Workflow ⏰
**檔案**: `.github/workflows/hourly_quotes.yml`
**預估時間**: 6-8 小時

- [ ] 建立 workflow 檔案
- [ ] 實現 quotes fetcher script
- [ ] Last-known-good 邏輯
- [ ] 更新 status.json
- [ ] 測試

#### 3.2 Daily Snapshot Workflow 📅
**檔案**: `.github/workflows/daily_snapshot.yml`  
**預估時間**: 10-12 小時

- [ ] RSS 新聞抓取
- [ ] LLM 簡報生成
- [ ] Macro 快照生成
- [ ] 寫入 daily snapshot
- [ ] 測試

#### 3.3 Metadata Refresh Workflow 🏷️
**檔案**: `.github/workflows/metadata_refresh.yml`
**預估時間**: 4-6 小時

- [ ] TTL 檢查邏輯 (7 天)
- [ ] Metadata sources 整合
- [ ] Confidence 計算
- [ ] 更新 symbols_metadata.json

---

## 📊 當前應用結構

### 核心頁面
- **Market Dashboard** (`/market-dashboard`) - 市場總覽
- **Stock Dashboard** (`/stock-dashboard`) - 股票總覽  
- **Settings** (`/settings`) - 設定頁面
- **Stock Detail** (`/stock/:symbol`) - 個股詳細頁面

### 開發工具
- **Cache Test** (`/cache-test`) - 緩存測試和管理
- **Yahoo Finance Test** (`/yahoo-finance-test`) - Yahoo Finance API 測試

### 核心組件
### 核心組件
- `FastTradingViewWidget.vue` - 高效能 TradingView widget
- `StockCard.vue` - 股票卡片 (使用 FastTradingViewWidget)
- `MarketsOverview.vue` - 市場指標總覽
- `StockOverview.vue` - 股票列表總覽

---

## 總時間預估

| Phase | 狀態 | 預估剩餘時間 |
|-------|------|-------------|
| Phase 1 | ✅ 完成 | 0 小時 |
| Phase 2 | ⏳ 待開始 | 8-11 小時 |  
| Phase 3 | ⏳ 待開始 | 20-26 小時 |

**剩餘總計**: 28-37 小時 (約 4-5 個工作天)

---

## 當前網址
開發伺服器運行在: `http://localhost:5173`

主要頁面:
- Market Dashboard: `http://localhost:5173/market-dashboard`
- Stock Dashboard: `http://localhost:5173/stock-dashboard`
- Settings: `http://localhost:5173/settings`

開發工具:
- Cache Test: `http://localhost:5173/cache-test`
- Yahoo Finance Test: `http://localhost:5173/yahoo-finance-test`
- Technical Validation: `http://localhost:5173/technical-validation`

---

## ✅ 已完成任務

### Phase 1: 核心 UI 功能 (已完成)

#### 1.1 實現 Fetch 層 📡 ✅
**檔案**: `src/lib/fetcher.ts`
- ✅ 實現 status-first fetch 策略
- ✅ 實現 fallback 機制 (網路快照 → localStorage cache → N/A)
- ✅ 實現 cache-busting
- ✅ 錯誤處理和重試邏輯
- ✅ 測試覆蓋

#### 1.2 實現 MarketsOverview 組件 📊 ✅
**檔案**: `src/components/MarketsOverview.vue`
- ✅ 顯示 10 個固定指標
- ✅ 每個 tile 顯示: value, as_of, source_name, quality_flag
- ✅ N/A 處理 (當 value 為 null)
- ✅ 響應式網格設計
- ✅ Quality flag 顏色編碼

#### 1.3 實現 StockOverview 組件 🏢 ✅
**檔案**: `src/components/StockOverview.vue` (原 StockGrid.vue)
- ✅ 建立 StockCard 組件
- ✅ 整合 TradingView widgets (Symbol Overview + Technical Analysis)
- ✅ 實現 sector 分組邏輯 (11種標準分類)
- ✅ confidence < 0.75 → "Unknown" 分組
- ✅ 組內按 symbol A-Z 排序
- ✅ 響應式設計 (桌機/平板: 2:1 比例, 手機: 單列)

#### 1.4 實現 StockDetail 頁面 🎯 ✅
**檔案**: `src/pages/StockDetail.vue`
- ✅ 麵包屑導航
- ✅ 整合多個 TradingView widgets
- ✅ 完整的股票詳細資訊頁面

#### 1.5 頁面重構 🔄 ✅
- ✅ 刪除 Holdings 頁面
- ✅ 拆分 Dashboard 為兩個分頁:
  - ✅ Market Dashboard (只有 Markets Overview)
  - ✅ Stock Dashboard (只有 Stock Overview)
- ✅ 更新路由和導航
- ✅ 清理舊檔案和引用

#### 1.6 效能優化 ⚡ ✅
**檔案**: `src/components/LazyTradingViewWidget.vue`, `src/utils/widgetCache.js`
- ✅ 實現 LazyTradingViewWidget 組件
- ✅ IntersectionObserver 延遲載入
- ✅ Widget 快取系統
- ✅ 載入節流控制
- ✅ 效能監控工具

---

## 🚧 待開發任務

### Phase 2: Settings 和工具 (優先級 P1)

#### 2.1 實現 Settings 頁面 ⚙️
**檔案**: `src/pages/Settings.vue`
**預估時間**: 4-6 小時

- [ ] 顯示 prompt_research.md (read-only)
- [ ] 顯示 commit hash from version.json
- [ ] 4 個 toggles UI (localStorage 持久化)
- [ ] Diagnostics 面板
- [ ] 測試

#### 2.2 實現 Import/Export UI 📁
**檔案**: `src/components/ImportExport.vue`
**預估時間**: 4-5 小時

- [ ] Export 功能 UI
- [ ] Import 功能 UI  
- [ ] Dry-run 預覽 UI
- [ ] 錯誤處理和訊息顯示
- [ ] 測試

### Phase 3: GitHub Actions 工作流程 (優先級 P1)

#### 3.1 Hourly Quotes Workflow ⏰
**檔案**: `.github/workflows/hourly_quotes.yml`
**預估時間**: 6-8 小時

- [ ] 建立 workflow 檔案
- [ ] 實現 quotes fetcher script
- [ ] Last-known-good 邏輯
- [ ] 更新 status.json
- [ ] 測試

#### 3.2 Daily Snapshot Workflow 📅
**檔案**: `.github/workflows/daily_snapshot.yml`  
**預估時間**: 10-12 小時

- [ ] RSS 新聞抓取
- [ ] LLM 簡報生成
- [ ] Macro 快照生成
- [ ] 寫入 daily snapshot
- [ ] 測試

#### 3.3 Metadata Refresh Workflow 🏷️
**檔案**: `.github/workflows/metadata_refresh.yml`
**預估時間**: 4-6 小時

- [ ] TTL 檢查邏輯 (7 天)
- [ ] Metadata sources 整合
- [ ] Confidence 計算
- [ ] 更新 symbols_metadata.json

---

## 總時間預估

| Phase | 狀態 | 預估剩餘時間 |
|-------|------|-------------|
| Phase 1 | ✅ 完成 | 0 小時 |
| Phase 2 | 🚧 進行中 | 8-11 小時 |  
| Phase 3 | ⏳ 待開始 | 20-26 小時 |
| Phase 4 | ⏳ 待開始 | 9-13 小時 |

**剩餘總計**: 37-50 小時 (約 5-7 個工作天)

---

## 當前網址
開發伺服器運行在: `http://localhost:5173`

主要頁面:
- Market Dashboard: `http://localhost:5173/market-dashboard`
- Stock Dashboard: `http://localhost:5173/stock-dashboard`
- Settings: `http://localhost:5173/settings`

---

## Phase 1: 核心 UI 功能 (優先級 P0)

### 1.1 實現 Fetch 層 📡
**檔案**: `src/lib/fetcher.ts`
**預估時間**: 4-6 小時

- [ ] 實現 status-first fetch 策略
  - [ ] 先取 `/data/status.json` 檢查時間戳
  - [ ] 根據時間戳決定是否需要更新
- [ ] 實現 fallback 機制
  - [ ] 網路快照 → localStorage cache → N/A
- [ ] 實現 cache-busting
  - [ ] 使用 status.json 時間戳作為 query parameter
- [ ] 錯誤處理和重試邏輯
- [ ] 測試覆蓋

**驗收標準**:
```typescript
const fetcher = new DataFetcher();
const quotes = await fetcher.fetchQuotes(); // 自動 fallback
expect(quotes.source).toBe('network' | 'cache' | 'fallback');
```

### 1.2 實現 Dashboard MacroWall 組件 📊
**檔案**: `src/components/MacroWall.vue`
**預估時間**: 6-8 小時

- [ ] 建立 MacroWall 組件
  - [ ] 顯示 10 個固定指標
  - [ ] 每個 tile 顯示: value, as_of, source_name, quality_flag
  - [ ] N/A 處理 (當 value 為 null)
- [ ] 整合 scraping toggle
  - [ ] 從 Settings 讀取 scraping_enabled
  - [ ] scraping=false 時顯示 DISABLED_SCRAPE
- [ ] 樣式實現
  - [ ] 響應式網格 (2x5 或 5x2)
  - [ ] Quality flag 顏色編碼
  - [ ] Stale indicator 樣式
- [ ] 測試

**驗收標準**:
```gherkin
Scenario: Macro wall always renders 10 tiles
  Given the macro snapshot contains 6 values and 4 null values
  When the user opens Dashboard  
  Then the system shall render 10 macro tiles
  And tiles with null values shall display "N/A"
```

### 1.3 實現 Dashboard StockCard 組件 🏢
**檔案**: `src/components/StockCard.vue`
**預估時間**: 8-10 小時

- [ ] 建立 StockCard 組件
  - [ ] 顯示 symbol, price, change%, brief
  - [ ] 整合 chart widget (TradingView)
  - [ ] 5 秒 timeout + fallback UI
- [ ] 實現 industry 分組邏輯
  - [ ] 從 metadata 讀取 industry
  - [ ] confidence < 0.75 → "Unknown" 分組
  - [ ] 組內按 symbol 排序
- [ ] 新聞顯示
  - [ ] 最多 10 則新聞
  - [ ] 安全 URL 驗證
  - [ ] textContent 渲染 (防 XSS)
- [ ] 測試

**驗收標準**:
```gherkin
Scenario: Group by industry with confidence threshold
  Given symbols_metadata contains AAPL (Consumer Tech, 0.90), AMZN (null, 0.50)
  When the user opens Dashboard
  Then the system shall show group "Consumer Tech" with "AAPL"
  And the system shall show group "Unknown" with "AMZN"
```

### 1.4 更新 Dashboard 頁面整合 🎯
**檔案**: `src/pages/Dashboard.vue`
**預估時間**: 2-3 小時

- [ ] 移除佔位符內容
- [ ] 整合 MacroWall 組件
- [ ] 整合 StockCard 組件
- [ ] 顯示 last_daily_update_at 和 last_hourly_quote_update_at
- [ ] 載入狀態和錯誤處理
- [ ] 測試

### 1.5 實現 Holdings 頁面 💰
**檔案**: `src/pages/Holdings.vue`
**預估時間**: 6-8 小時

- [ ] Watchlist 管理 UI
  - [ ] 顯示當前 watchlist
  - [ ] 新增 symbol 輸入框 + Universe 驗證
  - [ ] 移除 symbol 按鈕
  - [ ] 整合 Wish Flow (非 Universe symbol)
- [ ] Avg Cost 編輯器
  - [ ] 每個 symbol 的 avg_cost 輸入
  - [ ] 驗證 > 0
  - [ ] 儲存到 StateManager
- [ ] ROI & PnL 顯示
  - [ ] 即時計算: ROI% = (price - avg_cost) / avg_cost
  - [ ] PnL per share = price - avg_cost
  - [ ] 顯示 as_of 時間戳和 stale_level
- [ ] 測試

**驗收標準**:
```gherkin
Scenario: Save avg cost and compute ROI/PnL per share
  Given the watchlist contains "AAPL"
  And the latest quotes snapshot has AAPL price_usd=110
  When the user sets avg_cost_usd=100 for "AAPL"
  Then the system shall display ROI% = 10%
  And the system shall display pnl_per_share_usd = 10
```

### 1.6 實現 Wish Flow 🌟
**檔案**: `src/components/WishFlow.vue`
**預估時間**: 3-4 小時

- [ ] 非 Universe symbol 檢測
- [ ] 顯示 "Not supported in POC Universe" 訊息
- [ ] Wish 選項 UI
- [ ] 讀取 `/config/wish.json` 配置
- [ ] 開啟外部連結 (GitHub Issue/Google Form)
- [ ] URL 參數預填 symbol
- [ ] GA 事件追蹤 (wish_submit_click)
- [ ] 測試

**驗收標準**:
```gherkin
Scenario: Wish submission does not change watchlist
  Given /config/universe.json does not contain "NVDA"
  When the user submits a wish for "NVDA"
  Then the system shall not add "NVDA" into the watchlist
  And the system shall open the configured wish channel link
```

---

## Phase 2: Settings 和工具 (優先級 P1)

### 2.1 實現 Settings 頁面 ⚙️
**檔案**: `src/pages/Settings.vue`
**預估時間**: 4-6 小時

- [ ] 顯示 prompt_research.md (read-only)
- [ ] 顯示 commit hash from version.json
- [ ] 4 個 toggles UI (localStorage 持久化)
  - [ ] scraping_enabled (default: false)
  - [ ] degradation_enabled (default: true)  
  - [ ] ga_enabled (default: true)
  - [ ] clarity_enabled (default: true)
- [ ] Diagnostics 面板
  - [ ] 顯示 status.json 內容
  - [ ] 顯示 last_import_result
- [ ] 測試

### 2.2 實現 Import/Export UI 📁
**檔案**: `src/components/ImportExport.vue`
**預估時間**: 4-5 小時

- [ ] Export 功能 UI
  - [ ] Export 按鈕
  - [ ] JSON 下載
- [ ] Import 功能 UI  
  - [ ] 檔案選擇器
  - [ ] 256KB 大小驗證
  - [ ] Schema 驗證
- [ ] Dry-run 預覽 UI
  - [ ] 顯示 added/updated/removed 統計
  - [ ] Diff 顯示
  - [ ] 確認/取消按鈕
- [ ] 錯誤處理和訊息顯示
- [ ] 測試

**驗收標準**:
```gherkin
Scenario: Import shows dry-run preview before applying
  Given the user selects a valid JSON file with changes
  When the system parses and validates it
  Then the system shall display a dry-run summary
  And shall not modify localStorage until the user confirms apply
```

### 2.3 實現安全渲染工具 🔒
**檔案**: `src/lib/security.ts`
**預估時間**: 2-3 小時

- [ ] URL scheme allowlist
  - [ ] 只允許 http/https
  - [ ] 拒絕 javascript:, data:, file: 等
- [ ] 安全文字渲染
  - [ ] textContent only (永不使用 innerHTML)
  - [ ] 新聞標題安全顯示
- [ ] 輸入驗證工具
- [ ] 測試 (包含 XSS 防護測試)

---

## Phase 3: GitHub Actions 工作流程 (優先級 P1)

### 3.1 Hourly Quotes Workflow ⏰
**檔案**: `.github/workflows/hourly_quotes.yml`
**預估時間**: 6-8 小時

- [ ] 建立 workflow 檔案
- [ ] 設定 cron: `0 * * * *`
- [ ] 實現 quotes fetcher script
  - [ ] 讀取 universe.json
  - [ ] 呼叫免費 API (Alpha Vantage/Yahoo Finance)
  - [ ] 處理 rate limiting
- [ ] Last-known-good 邏輯
  - [ ] 成功 → 覆寫 latest.json
  - [ ] 失敗 → 保持原檔案
- [ ] 更新 status.json
- [ ] 權限設定 (contents: write)
- [ ] 測試

### 3.2 Daily Snapshot Workflow 📅
**檔案**: `.github/workflows/daily_snapshot.yml`  
**預估時間**: 10-12 小時

- [ ] 建立 workflow 檔案
- [ ] 設定 cron: `0 23 * * *` (07:00 Taipei)
- [ ] RSS 新聞抓取
  - [ ] 讀取 news_sources.json
  - [ ] 抓取多個 RSS feeds
  - [ ] 去重邏輯 (title + date + domain)
  - [ ] 排序 (newest first)
  - [ ] 每檔最多 10 則
- [ ] LLM 簡報生成
  - [ ] 整合 OpenAI API
  - [ ] 50-100 字中文簡報
  - [ ] Fallback template
  - [ ] brief_truncated 處理
- [ ] Macro 快照生成
  - [ ] 讀取 macro_indicators.json
  - [ ] 處理 scraping toggle
  - [ ] Quality flags 設定
- [ ] 寫入 daily snapshot
- [ ] 更新 status.json
- [ ] 測試

### 3.3 Metadata Refresh Workflow 🏷️
**檔案**: `.github/workflows/metadata_refresh.yml`
**預估時間**: 4-6 小時

- [ ] 建立 workflow 檔案
- [ ] TTL 檢查邏輯 (7 天)
- [ ] Metadata sources 整合
- [ ] Confidence 計算
  - [ ] 兩個來源一致 → 0.90
  - [ ] 一個來源完整 → 0.75  
  - [ ] 衝突或缺失 → 0.50
- [ ] 更新 symbols_metadata.json
- [ ] 測試

---

## Phase 4: 整合和安全 (優先級 P2)

### 4.1 GA4 & Clarity 整合 📈
**檔案**: `src/lib/tracking.ts`
**預估時間**: 3-4 小時

- [ ] GA4 script 載入 (toggle 控制)
- [ ] Clarity script 載入 (toggle 控制)
- [ ] 事件追蹤實現
  - [ ] page_view_* 事件
  - [ ] add_symbol_* 事件  
  - [ ] wish_submit_click 事件
  - [ ] toggle_setting 事件
- [ ] 驗證 toggle off = 無網路呼叫
- [ ] 測試

### 4.2 Security Hardening 🛡️
**預估時間**: 2-3 小時

- [ ] GitHub Actions 權限設定
  - [ ] Least privilege permissions
  - [ ] Fork PR 不執行 secrets
- [ ] Pin third-party actions by commit SHA
- [ ] CSP meta tag 設定
- [ ] 安全測試補充

### 4.3 QA 測試補充 🧪
**預估時間**: 4-6 小時

- [ ] UI 組件測試
- [ ] 整合測試
- [ ] Degradation 測試
- [ ] 安全測試 (XSS, URL validation)
- [ ] E2E 測試 (可選)

---

## 總時間預估

| Phase | 項目數 | 預估時間 | 累計時間 |
|-------|--------|----------|----------|
| Phase 1 | 6 項 | 29-39 小時 | 29-39 小時 |
| Phase 2 | 3 項 | 10-14 小時 | 39-53 小時 |  
| Phase 3 | 3 項 | 20-26 小時 | 59-79 小時 |
| Phase 4 | 3 項 | 9-13 小時 | 68-92 小時 |

**總計**: 68-92 小時 (約 9-12 個工作天)

---

## 風險項目 ⚠️

### 高風險
1. **LLM API 整合** - 需要 API key 和錯誤處理
2. **免費 Quote API 限制** - 可能有 rate limit
3. **RSS feeds 穩定性** - 需要多來源備援

### 中風險  
4. **Chart widget 載入** - 第三方服務依賴
5. **Timezone 計算** - 07:00 Taipei 轉換

### 緩解策略
- 所有外部 API 都有 fallback 機制
- 實現 last-known-good 快照
- 完整的錯誤處理和 degradation
- 充分的測試覆蓋

---

## 下一步行動

1. **立即開始**: Phase 1.1 實現 Fetch 層
2. **並行開發**: UI 組件可以並行開發
3. **分階段測試**: 每個 Phase 完成後進行整合測試
4. **持續部署**: 使用 GitHub Pages 進行持續部署

**建議開發順序**: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 2.1 → 2.2 → 3.1 → 3.2