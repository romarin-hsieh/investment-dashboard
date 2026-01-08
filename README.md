# 投資儀表板 (Investment Dashboard)

一個現代化的投資信息儀表板，整合市場數據、股票分析和恐懼貪婪指數，提供投資者全面的市場洞察。

## 🌟 功能特色

### 📊 Market Dashboard (市場儀表板)
- **主要市場指數**: S&P 500, NASDAQ, Russell 2000, Dow Jones, Gold, Oil
- **VIX 恐慌指數**: 快速概覽 + 詳細趨勢圖
- **Fear & Greed Index**: Zeiierman 7 組件算法，CNN 風格儀表盤
- **Top Stories**: 市場相關新聞動態
- **Stock Market Insight**: NASDAQ 和 US30 的日線/週線分析
- **股票熱力圖**: S&P 500, NASDAQ 100 等熱力圖

### 🏢 Stock Dashboard (股票儀表板)
- **智能符號配置**: 環境變數 + Google Sheets + 靜態 fallback
- **行業分組**: Yahoo Finance 11 個標準行業分類
- **股票卡片**: Symbol Overview (2/3) + Technical Analysis (1/3)
- **Ticker Tape**: 實時滾動股價資訊
- **詳細分析**: 點擊 Detail 按鈕查看完整分析

### 📈 Stock Detail (個股詳細)
- **三層佈局**: Symbol Overview + Technical / Company Profile / Fundamental Data
- **完整整合**: 多個 TradingView widgets
- **導航友好**: 麵包屑 + 返回按鈕
- **響應式設計**: 適配各種設備

## 🚀 在線演示

**GitHub Pages**: [https://romarin-hsieh.github.io/investment-dashboard/](https://romarin-hsieh.github.io/investment-dashboard/)

### 主要頁面
- **Market Dashboard**: [/#/market-dashboard](https://romarin-hsieh.github.io/investment-dashboard/#/market-dashboard)
- **Stock Dashboard**: [/#/stock-dashboard](https://romarin-hsieh.github.io/investment-dashboard/#/stock-dashboard)
- **個股分析**: [/#/stock/AAPL](https://romarin-hsieh.github.io/investment-dashboard/#/stock/AAPL)

## 🛠️ 技術棧

### 前端技術
- **框架**: Vue 3 + Composition API
- **構建工具**: Vite 5.x
- **路由**: Vue Router 4 (Hash 模式)
- **樣式**: 原生 CSS3 + 響應式設計
- **TypeScript**: 部分組件使用 TS

### 數據整合
- **TradingView Widgets**: 實時市場數據
- **DataFetcher**: 統一數據獲取層
- **StateManager**: 本地狀態管理
- **符號配置**: 多層 fallback 策略

### 性能優化
- **FastTradingViewWidget**: 高性能 Widget 組件
- **智能緩存**: 10 分鐘緩存 + localStorage
- **延遲載入**: IntersectionObserver
- **節流控制**: 防止過度請求

## 📊 項目結構

```
investment-dashboard/
├── src/
│   ├── components/          # Vue 組件
│   │   ├── FastTradingViewWidget.vue    # 高性能 Widget
│   │   ├── StockCard.vue               # 股票卡片
│   │   ├── ZeiiermanFearGreedGauge.vue # Fear & Greed Index
│   │   └── TradingView*.vue            # TradingView 組件
│   ├── pages/              # 頁面組件
│   │   ├── MarketDashboard.vue         # 市場儀表板
│   │   ├── StockDashboard.vue          # 股票儀表板
│   │   └── StockDetail.vue             # 個股詳細
│   ├── utils/              # 工具函數
│   │   ├── symbolsConfig.js            # 符號配置管理
│   │   ├── widgetCache.js              # Widget 緩存
│   │   └── state-manager.ts            # 狀態管理
│   └── lib/                # 核心庫
│       └── fetcher.ts                  # 數據獲取
├── public/
│   └── data/               # 靜態數據
│       ├── quotes/         # 股價數據
│       ├── daily/          # 每日快照
│       └── symbols_metadata.json      # 符號元數據
└── tests/                  # 測試文件
```

## 🔧 本地開發

### 環境要求
- Node.js 16+ 
- npm 或 yarn

### 安裝和運行
```bash
# 克隆專案
git clone https://github.com/romarin-hsieh/investment-dashboard.git
cd investment-dashboard

# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 構建生產版本
npm run build

# 預覽生產版本
npm run preview
```

### 環境變數配置
創建 `.env` 文件：
```env
# 股票符號配置 (可選)
VITE_STOCK_SYMBOLS="AAPL,MSFT,GOOGL,AMZN,TSLA"

# Google Sheets 整合 (可選)
VITE_GOOGLE_SHEETS_URL="https://sheets.googleapis.com/..."

# 緩存配置
VITE_CACHE_SYMBOLS_MINUTES=10
VITE_SHEETS_TIMEOUT_MS=3000
```

## 📈 核心特色

### 🎯 智能符號配置
- **4 層 Fallback**: 環境變數 → 緩存 → Google Sheets → 靜態
- **10 分鐘緩存**: 避免過度請求
- **動態更新**: 支持 Google Sheets 即時更新

### ⚡ 高性能優化
- **FastTradingViewWidget**: 優化的 Widget 載入
- **智能緩存**: Widget 緩存 + 節流控制
- **延遲載入**: 視窗內才載入 Widget
- **預載入**: 智能預載入機制

### 🎨 響應式設計
- **桌面**: 完整佈局，2:1 比例
- **平板**: 適應性佈局
- **手機**: 單列佈局，垂直排列
- **一致性**: 所有設備統一體驗

### 🔒 穩定可靠
- **Hash 路由**: 完全兼容靜態託管
- **錯誤處理**: 優雅的 fallback 機制
- **數據驗證**: 完整的數據驗證
- **緩存策略**: 智能緩存和過期處理

## 🌐 部署

### 🚀 正式環境部署 (GitHub Pages)

#### 自動化部署流程
本專案使用 GitHub Actions 實現完全自動化的部署流程：

```bash
# 一鍵部署到正式環境
./deploy-production.bat
```

#### 部署檢查清單
在執行部署前，請確認：

- [ ] **代碼品質**: 所有測試通過，無 ESLint 錯誤
- [ ] **功能測試**: 本地測試所有核心功能正常
- [ ] **資料完整性**: 24 組股票資料已更新
- [ ] **Git 狀態**: 所有變更已提交到 main 分支
- [ ] **環境變數**: 生產環境配置正確

#### 部署步驟詳解

1. **準備階段**
   ```bash
   # 檢查 Git 狀態
   git status
   
   # 確保在 main 分支
   git checkout main
   git pull origin main
   ```

2. **建置階段**
   ```bash
   # 安裝依賴
   npm install
   
   # 執行測試
   npm run test
   
   # 建置生產版本
   npm run build
   ```

3. **部署階段**
   ```bash
   # 推送到 main 分支 (觸發 GitHub Actions)
   git push origin main
   ```

4. **驗證階段**
   - 檢查 [GitHub Actions](https://github.com/your-username/investment-dashboard/actions) 執行狀態
   - 確認 [部署狀態](https://github.com/your-username/investment-dashboard/deployments)
   - 測試線上網站功能

#### 🤖 GitHub Actions 自動化

本專案配置了多個 GitHub Actions 工作流程：

##### 1. 主要部署工作流程 (`.github/workflows/deploy.yml`)
- **觸發條件**: 推送到 main 分支
- **執行內容**: 建置 → 測試 → 部署到 gh-pages
- **部署時間**: ~3-5 分鐘

##### 2. 股票資料更新工作流程 (`.github/workflows/update-sector-industry.yml`)
- **觸發條件**: 每日 0:20 UTC (台灣時間 8:20)
- **執行內容**: 使用 Python yfinance 更新 24 組股票資料
- **資料來源**: Yahoo Finance API (無 CORS 問題)
- **更新內容**:
  - `public/data/sector_industry.json` - 主要資料檔案
  - `public/data/symbols_metadata.json` - 相容性資料檔案

##### 3. 元數據更新工作流程 (`.github/workflows/update-metadata.yml`)
- **觸發條件**: 每週日 1:00 UTC
- **執行內容**: 更新股票交易所和基本資訊

#### 📊 靜態資料服務

##### 資料架構
```
public/data/
├── sector_industry.json      # 24 組股票完整資料 (主要)
├── symbols_metadata.json     # 相容性資料 (回退)
├── daily/                    # 每日快照資料
│   └── 2025-01-26.json
└── quotes/                   # 即時報價快取
    └── batch_quotes.json
```

##### 資料品質保證
- **24 組股票**: 涵蓋 6 個主要 Sector
- **高信心度**: 100% 來自 Yahoo Finance API
- **自動更新**: 每日自動更新，確保資料新鮮度
- **回退機制**: 多層資料來源保證可用性
- **快取策略**: 24 小時本地快取 + CDN 快取

##### 支援的股票列表
```
Technology (11): PL, ONDS, MDB, ORCL, TSM, CRM, NVDA, AVGO, CRWV, IONQ, PLTR
Communication Services (4): ASTS, GOOG, META, NFLX  
Consumer Cyclical (3): RIVN, AMZN, TSLA
Industrials (3): RDW, AVAV, RKLB
Energy (2): LEU, SMR
Healthcare (1): HIMS
```

#### 🔧 部署配置

##### Vite 配置 (`vite.config.js`)
```javascript
export default defineConfig({
  base: '/investment-dashboard/',  // GitHub Pages 路徑
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,              // 生產環境不生成 sourcemap
    minify: 'terser',             // 使用 Terser 壓縮
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          tradingview: ['lightweight-charts']
        }
      }
    }
  }
})
```

##### 路由配置 (Hash 模式)
```javascript
const router = createRouter({
  history: createWebHashHistory('/investment-dashboard/'),
  routes: [...]
})
```

#### 🌍 CDN 和快取策略

##### GitHub Pages CDN
- **全球 CDN**: 自動分發到全球節點
- **HTTPS**: 強制 HTTPS 連接
- **快取控制**: 靜態資源 24 小時快取

##### 瀏覽器快取
```javascript
// 資料檔案快取策略
Cache-Control: no-cache, no-store, must-revalidate  // JSON 資料
Cache-Control: max-age=3600                         // 靜態資源
Cache-Control: max-age=86400                        // 圖片資源
```

#### 🚨 部署注意事項

##### 必須檢查項目
1. **資料完整性**: 確認 24 組股票資料完整
2. **API 限制**: 避免超過 Yahoo Finance API 限制
3. **快取清理**: 部署後清理 CDN 快取
4. **功能測試**: 測試所有核心功能
5. **效能監控**: 檢查載入時間和響應速度

##### 常見問題排除
- **404 錯誤**: 檢查 `base` 路徑配置
- **資料載入失敗**: 檢查 JSON 檔案格式和路徑
- **Widget 載入慢**: 檢查 TradingView CDN 狀態
- **快取問題**: 使用硬重新整理 (Ctrl+F5)

##### 回滾策略
如果部署出現問題：
```bash
# 回滾到上一個版本
git revert HEAD
git push origin main

# 或者回滾到特定 commit
git reset --hard <commit-hash>
git push --force origin main
```

#### 📈 部署後驗證

##### 功能測試清單
- [ ] **首頁載入**: 確認首頁正常載入
- [ ] **路由導航**: 測試所有頁面路由
- [ ] **資料載入**: 確認股票資料正常顯示
- [ ] **Widget 功能**: 測試 TradingView widgets
- [ ] **響應式設計**: 測試不同設備尺寸
- [ ] **效能指標**: 檢查載入時間 < 3 秒

##### 監控和維護
- **GitHub Actions**: 監控自動化工作流程
- **資料更新**: 確認每日資料更新正常
- **錯誤日誌**: 檢查瀏覽器控制台錯誤
- **使用者回饋**: 收集使用者體驗回饋

### 其他部署平台

#### Vercel 部署
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

#### Netlify 部署
```bash
# 建置
npm run build

# 拖拽 dist 資料夾到 Netlify
```

#### 自託管部署
```bash
# 使用 nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

詳見 [DEPLOYMENT.md](./DEPLOYMENT.md) 和 [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)

## 📊 性能指標

### 載入性能
- **首屏載入**: < 3 秒
- **資源大小**: ~220KB (gzipped)
- **Widget 載入**: 優化的延遲載入

### 用戶體驗
- **交互響應**: < 100ms
- **動畫流暢**: 60fps
- **錯誤恢復**: 優雅的錯誤處理

## 🧪 測試

```bash
# 運行單元測試
npm run test

# 運行測試覆蓋率
npm run test:coverage

# 運行 E2E 測試 (如果有)
npm run test:e2e
```

## 📚 文檔

- [需求規格書](./REQUIREMENTS.md) - 完整的功能需求
- [開發任務](./TASKS.md) - 開發進度和任務清單
- [部署指南](./DEPLOYMENT.md) - 詳細的部署說明
- [快速部署](./QUICK_DEPLOY.md) - 快速部署指南

## 🔄 版本歷史

### v2.0 (2025-12-24) - 當前版本 🎉
- ✅ 完整的 Market Dashboard 和 Stock Dashboard
- ✅ Fear & Greed Index (Zeiierman 算法)
- ✅ 高性能 TradingView 整合
- ✅ Hash 路由和 GitHub Pages 部署
- ✅ 響應式設計和 UI 優化
- ✅ 智能符號配置管理

### v1.0 (2025-12-22) - 初始版本
- ✅ 基礎架構和核心組件
- ✅ DataFetcher 和 StateManager
- ✅ 基本的股票和市場數據顯示

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

### 開發指南
1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 許可證

MIT License - 詳見 [LICENSE](./LICENSE) 文件

## 📞 聯絡

**專案負責人**: Romarin Hsieh  
**GitHub**: [@romarin-hsieh](https://github.com/romarin-hsieh)  
**專案連結**: [https://github.com/romarin-hsieh/investment-dashboard](https://github.com/romarin-hsieh/investment-dashboard)

---

⭐ 如果這個專案對你有幫助，請給個 Star！

**線上演示**: [https://romarin-hsieh.github.io/investment-dashboard/](https://romarin-hsieh.github.io/investment-dashboard/)

---

# Investment Dashboard - Deployment Guide

This project is a modern investment information dashboard integrating market data, stock analysis, and technical indicators. It is built with Vue 3 and designed to be deployed on GitHub Pages.

## 🚀 Deployment

### Automated Deployment (GitHub Pages)

This project uses **GitHub Actions** for a fully automated deployment pipeline.

```bash
# One-click deployment to Production
./deploy-production.bat
```

### Manual Deployment Steps

If you prefer to trigger the deployment manually or understand the process:

1.  **Ensure Code Quality**:
    - Run tests: `npm run test`
    - Check linting: `npm run lint`

2.  **Verify Data**:
    - Ensure `public/data/symbols_metadata.json` lists all **67** supported stocks.
    - Run pre-computation if needed: `node scripts/precompute-with-browser.js`

3.  **Push to Main**:
    - Any push to the `main` branch will automatically trigger the `.github/workflows/deploy.yml` workflow.
    - The workflow will:
        - Install dependencies
        - Build the project (`npm run build`)
        - Deploy the `dist` folder to the `gh-pages` branch.

### Configuration

-   **Environment Variables**:
    -   `VITE_CACHE_SYMBOLS_MINUTES`: Cache duration for stock data (default: 10).
    -   `VITE_SHEETS_TIMEOUT_MS`: Timeout for Google Sheets integration.

-   **Vite Config**:
    -   The `base` URL is set to `/investment-dashboard/` in `vite.config.js` to support GitHub Pages.

### Troubleshooting

-   **404 on Assets**: Verify proper `base` path in `vite.config.js`.
-   **Data Not Loading**: Check the Network information in DevTools. Ensure `public/data/` JSON files are correctly generated and deployed.
-   **TradingView Widget Issues**: Ensure the specific widget configuration (e.g., `autosize`) is compatible with the container dimensions.

---
