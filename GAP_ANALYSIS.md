# 規格與實現落差分析報告 (更新版)
Generated: 2025-12-23
Based on: 完整 PRD 人類閱讀版本

## 執行摘要

目前專案已完成 **約 35-40%** 的開發工作。核心基礎設施（數據層、驗證、狀態管理）已完成，但所有 UI 功能組件和 GitHub Actions 工作流程尚未實現。

**重要發現**: 經過完整 PRD 對比，發現專案架構與 PRD 要求高度一致，但實現細節有一些調整需求。

---

## 一、已完成項目 ✅

### M1: Repo skeleton + contracts + Universe allowlist (90% 完成)

#### ✅ 已實現
- [x] `/config/universe.json` - 包含 10 個股票代號
- [x] `/config/macro_indicators.json` - 定義 10 個宏觀指標
- [x] `/config/version.json` - 版本資訊結構
- [x] `/config/news_sources.json` - RSS 來源配置（需驗證）
- [x] `/config/wish.json` - Wish 頻道配置（需驗證）
- [x] `/data/status.json` - 系統狀態範例
- [x] `/data/symbols_metadata.json` - 元數據結構（需驗證）
- [x] 完整的 TypeScript 類型定義 (`src/types/index.ts`)
- [x] Zod 驗證架構 (`src/utils/validation.ts`)
- [x] StateManager 類別 (`src/utils/state-manager.ts`)

#### ⚠️ 待確認
- [ ] `/config/prompt_research.md` - 未找到
- [ ] `/config/prompt_params.json` - 未找到
- [ ] `/data/quotes/latest.json` - 目錄結構存在但內容未驗證
- [ ] `/data/daily/YYYY-MM-DD.json` - 目錄結構存在但內容未驗證

### M3: Frontend Infrastructure (60% 完成)

#### ✅ 已實現
- [x] Vue 3 + TypeScript + Vite 專案結構
- [x] 路由系統 (Dashboard/Holdings/Settings)
- [x] Layout 組件和基礎樣式
- [x] localStorage 狀態管理 (StateManager)
- [x] 完整的驗證邏輯
- [x] 匯入/匯出核心邏輯
- [x] 測試框架 (Vitest + fast-check)
- [x] 85/86 測試通過

#### ❌ 未實現
- [ ] Fetch 層（status-first + fallback to cache）
- [ ] 安全渲染工具（URL allowlist, textContent only）
- [ ] Cache-busting 機制

---

## 二、待實現項目 ❌

### M2: GitHub Actions Pipelines (0% 完成)

#### M2.1 Hourly Quotes Workflow
- [ ] `.github/workflows/hourly_quotes.yml`
- [ ] Provider client 實現
- [ ] Last-known-good 行為
- [ ] 更新 `/data/quotes/latest.json`
- [ ] 更新 `/data/status.json`
- [ ] API key 存儲在 GitHub Secrets

#### M2.2 Daily Snapshot Workflow
- [ ] `.github/workflows/daily_snapshot.yml`
- [ ] 07:00 Asia/Taipei 排程 (UTC 23:00)
- [ ] RSS 抓取 + 去重 + top10
- [ ] LLM 簡報生成 + fallback
- [ ] Macro 快照生成
- [ ] 寫入 `/data/daily/YYYY-MM-DD.json`

#### M2.3 Metadata Refresh Workflow
- [ ] `.github/workflows/metadata_refresh.yml`
- [ ] TTL-based 跳過邏輯
- [ ] Confidence 計算
- [ ] 更新 `/data/symbols_metadata.json`

### M3: Frontend Pages (10% 完成)

#### M3.2 Dashboard Page
**目前狀態**: 只有佔位符 HTML

**待實現組件**:
- [ ] MacroWall 組件
  - [ ] 顯示 10 個宏觀指標
  - [ ] value, as_of, source_name, quality_flag
  - [ ] N/A 處理
  - [ ] Scraping toggle 整合
  
- [ ] StockCard 組件
  - [ ] 按 industry 分組
  - [ ] confidence < 0.75 歸類為 "Unknown"
  - [ ] 組內按 symbol 排序
  - [ ] 顯示 quote + brief + news
  - [ ] Chart widget 嵌入（5s timeout）
  
- [ ] 數據載入邏輯
  - [ ] Fetch daily snapshot
  - [ ] Fetch quotes snapshot
  - [ ] Fetch metadata
  - [ ] Degradation 處理
  - [ ] 顯示 last_daily_update_at 和 last_hourly_quote_update_at

#### M3.3 Holdings Page
**目前狀態**: 只有佔位符 HTML

**待實現功能**:
- [ ] Watchlist 管理 UI
  - [ ] 新增 symbol（Universe 驗證）
  - [ ] 移除 symbol
  - [ ] 顯示當前 watchlist
  
- [ ] Avg Cost 編輯器
  - [ ] 輸入驗證（> 0）
  - [ ] 儲存到 localStorage
  
- [ ] ROI & PnL 計算顯示
  - [ ] ROI% = (price - avg_cost) / avg_cost
  - [ ] PnL per share = price - avg_cost
  - [ ] 顯示 as_of 和 stale_level
  
- [ ] Shares 功能（可選，預設關閉）

#### M3.4 Settings Page
**目前狀態**: 只有佔位符 HTML

**待實現功能**:
- [ ] 顯示 `/config/prompt_research.md` (read-only)
- [ ] 顯示 commit hash from `/config/version.json`
- [ ] Toggles (localStorage 持久化)
  - [ ] scraping_enabled (default: false)
  - [ ] degradation_enabled (default: true)
  - [ ] ga_enabled (default: true)
  - [ ] clarity_enabled (default: true)
- [ ] Diagnostics Panel
  - [ ] 顯示 `/data/status.json` 內容
  - [ ] 顯示 last_import_result from localStorage

#### M3.5 Wish Flow
**目前狀態**: 未實現

**待實現功能**:
- [ ] 非 Universe symbol 輸入處理
- [ ] 顯示 "Not supported in POC Universe" 訊息
- [ ] 顯示 Wish 選項
- [ ] 開啟 wish channel link（從 `/config/wish.json` 讀取）
- [ ] 確保不加入 watchlist

### M4: Tracking + Import/Export + Security (20% 完成)

#### M4.1 Tracking
- [ ] GA 整合 + toggle
- [ ] Clarity 整合 + toggle
- [ ] 驗證 toggle off = 無網路呼叫

#### M4.2 Import/Export UI
**核心邏輯已完成**，待實現 UI:
- [ ] Export 按鈕和下載功能
- [ ] Import 檔案選擇器
- [ ] Dry-run 預覽 UI
- [ ] Diff 顯示
- [ ] Apply 確認流程
- [ ] 錯誤訊息顯示

#### M4.3 Security Hardening
- [ ] GitHub Actions 權限設定（least privilege）
- [ ] Fork PR 不執行 secrets
- [ ] Pin third-party actions by commit SHA
- [ ] CSP meta tag
- [ ] URL scheme allowlist 實現
- [ ] Safe rendering utilities (textContent only)

#### M4.4 QA Checklist
- [ ] Snapshot absence fallback 測試
- [ ] RSS unsafe URL rejection 測試
- [ ] XSS checks (import/news)
- [ ] Cache-busting 正確性測試

---

## 三、關鍵落差分析

### 3.1 架構層面

| 項目 | PRD 要求 | 目前實現 | 落差 |
|------|----------|----------|------|
| 數據契約 | 完整定義 | ✅ 完整 TypeScript 類型 | 無 |
| 驗證層 | Zod schema | ✅ 完整實現 | 無 |
| 狀態管理 | localStorage | ✅ StateManager 類別 | 無 |
| GitHub Actions | 3 個 workflows | ❌ 完全未實現 | **重大** |
| Fetch 層 | status-first + cache fallback | ❌ 未實現 | **重大** |
| 安全工具 | URL allowlist, safe render | ❌ 未實現 | 中等 |

### 3.2 功能層面

| 功能 | PRD 要求 | 目前實現 | 落差 |
|------|----------|----------|------|
| Universe 驗證 | 完整邏輯 | ✅ 驗證函數已實現 | UI 未串接 |
| Wish Flow | 完整流程 | ❌ 完全未實現 | **重大** |
| MacroWall | 10 個指標顯示 | ❌ 只有佔位符 | **重大** |
| StockCard | 分組顯示 | ❌ 只有佔位符 | **重大** |
| Holdings ROI/PnL | 計算邏輯 | ✅ 邏輯已實現 | UI 未實現 |
| Import/Export | 完整功能 | ✅ 核心邏輯完成 | UI 未實現 |
| Tracking | GA + Clarity | ❌ 未實現 | 中等 |

### 3.3 配置檔案

| 檔案 | PRD 要求 | 目前狀態 | 落差 |
|------|----------|----------|------|
| universe.json | ✅ | ✅ 存在且正確 | 無 |
| macro_indicators.json | ✅ | ✅ 存在且正確 | 無 |
| version.json | ✅ | ✅ 存在 | 需驗證 build 流程 |
| news_sources.json | ✅ | ⚠️ 需驗證 | 待確認 |
| wish.json | ✅ | ⚠️ 需驗證 | 待確認 |
| prompt_research.md | ✅ | ❌ 不存在 | 需建立 |
| prompt_params.json | ✅ | ❌ 不存在 | 需建立 |

---

## 四、優先級建議

### P0 - 阻塞性問題（必須立即處理）
1. **實現 Fetch 層** - 所有頁面都需要
2. **實現 Dashboard MacroWall** - 核心功能
3. **實現 Dashboard StockCard** - 核心功能
4. **實現 Holdings UI** - 核心功能
5. **實現 Wish Flow** - FR-2 要求

### P1 - 高優先級（本週完成）
6. **實現 Settings 頁面** - 完整功能
7. **實現 Import/Export UI** - 核心邏輯已完成
8. **建立 Hourly Quotes Workflow** - 數據來源
9. **建立 Daily Snapshot Workflow** - 數據來源

### P2 - 中優先級（下週完成）
10. **實現安全工具** - URL allowlist, safe render
11. **實現 Metadata Refresh Workflow**
12. **整合 GA + Clarity**
13. **Security Hardening**

### P3 - 低優先級（後續迭代）
14. **QA Checklist 完整測試**
15. **效能優化**
16. **補充缺失的配置檔案**

---

## 五、測試狀態

### 已有測試
- ✅ 配置檔案驗證測試 (9 tests)
- ✅ 數據結構驗證測試 (9 tests)
- ✅ StateManager 測試 (30 tests)
- ✅ Validation 測試 (17 tests)
- ✅ Universe 驗證測試 (11 tests)
- ✅ Holdings cost 驗證測試 (7/8 tests, 1 個小錯誤)

### 缺失測試
- ❌ UI 組件測試
- ❌ 整合測試
- ❌ E2E 測試
- ❌ 安全測試（XSS, URL validation）
- ❌ Degradation 測試

---

## 六、建議的開發順序

### Phase 1: 核心 UI 功能（預估 3-4 天）
1. 實現 Fetch 層（status-first + cache fallback）
2. 實現 Dashboard MacroWall 組件
3. 實現 Dashboard StockCard 組件
4. 實現 Holdings 頁面完整 UI
5. 實現 Wish Flow

### Phase 2: Settings 和工具（預估 1-2 天）
6. 實現 Settings 頁面完整功能
7. 實現 Import/Export UI
8. 實現安全渲染工具

### Phase 3: GitHub Actions（預估 2-3 天）
9. 實現 Hourly Quotes Workflow
10. 實現 Daily Snapshot Workflow
11. 實現 Metadata Refresh Workflow

### Phase 4: 整合和安全（預估 1-2 天）
12. 整合 GA + Clarity
13. Security Hardening
14. QA 測試

**總預估時間**: 7-11 天（全職開發）

---

## 七、風險評估

### 高風險
1. **GitHub Actions 工作流程** - 完全未實現，需要 API key 和外部服務整合
2. **LLM 簡報生成** - 需要 LLM provider 整合，可能有 rate limit
3. **RSS 抓取** - 需要處理各種 RSS feed 格式和錯誤

### 中風險
4. **Chart widget 整合** - 第三方服務，需要 timeout 處理
5. **Timezone 處理** - 07:00 Taipei 轉換為 UTC cron

### 低風險
6. **UI 實現** - 架構已完整，主要是組件開發
7. **測試補充** - 框架已設置

---

## 八、結論

專案的**基礎設施非常紮實**，數據層、驗證層、狀態管理都已完整實現且有良好的測試覆蓋。主要的工作集中在：

1. **UI 組件開發**（約 40% 工作量）
2. **GitHub Actions 工作流程**（約 30% 工作量）
3. **整合和安全加固**（約 20% 工作量）
4. **測試和 QA**（約 10% 工作量）

建議按照上述 Phase 1-4 的順序進行開發，優先完成核心 UI 功能，讓應用可以先用靜態數據運行，再逐步加入 GitHub Actions 自動化。
