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

### GitHub Pages (推薦)
```bash
# 構建並部署
npm run build
npx gh-pages -d dist
```

### 其他平台
- **Vercel**: 連接 GitHub 自動部署
- **Netlify**: 拖拽 `dist` 文件夾部署
- **Zeabur**: 支持 Node.js 項目部署

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