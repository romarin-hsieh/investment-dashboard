# 🎨 前端渲染元件先後順序文件

## 📋 **渲染順序概覽**

本系統採用分階段載入策略，根據內容重要性和用戶體驗需求，按優先級順序渲染各個組件。

## 🏠 **MarketDashboard.vue 渲染順序**

### **階段 1: 立即顯示 (0ms)**
```
1. 骨架屏載入 (MarketOverviewSkeleton)
   - 立即顯示，提供視覺反饋
   - 模擬真實內容結構
   - 包含 shimmer 動畫效果
```

### **階段 2: 高優先級內容 (Priority 1)**
```
2. Market Index (LazyTradingViewWidget)
   - 主要市場指數 (S&P 500, NASDAQ, Dow Jones, Russell 2000, BTC, Gold)
   - 高度: 100px
   - 腳本: embed-widget-tickers.js
   - 載入時間: ~1-2 秒

3. Fear & Greed Gauge (ZeiiermanFearGreedGauge)
   - 市場情緒指標
   - 非 TradingView widget，載入較快
   - 提供重要的市場情緒信息
```

### **階段 3: 中優先級內容 (Priority 2)**
```
4. Top Stories (LazyTradingViewWidget)
   - 市場新聞和重要事件
   - 高度: 650px
   - 腳本: embed-widget-timeline.js
   - 載入時間: ~2-3 秒

5. Market Daily Insight
   - 日線市場分析 (MA5)
   - 高度: 600px
   - 腳本: embed-widget-symbol-overview.js
   - 顯示 6 個月日線數據
```

### **階段 4: 低優先級內容 (Priority 3)**
```
6. Market Weekly Insight
   - 週線市場分析 (MA4)
   - 高度: 600px
   - 腳本: embed-widget-symbol-overview.js
   - 顯示 6 個月週線數據

7. Stock Heatmap
   - 股票熱力圖
   - 高度: 500px
   - 腳本: embed-widget-stock-heatmap.js
   - 顯示 S&P 500 股票表現
```

### **階段 5: 系統監控 (最後載入)**
```
8. Performance Monitor
   - 系統效能監控
   - 不影響用戶體驗的系統信息
   - 載入時間: ~500ms
```

---

## 📊 **StockOverview.vue 渲染順序**

### **階段 1: 立即顯示 (0ms)**
```
1. 骨架屏載入 (SkeletonLoader)
   - 完整的股票概覽骨架
   - 包含 Market Index 和 Sector Groups 骨架
   - 模擬真實的股票卡片結構
```

### **階段 2: 關鍵基礎設施 (Priority 1)**
```
2. Market Index Widget
   - 與 MarketDashboard 相同的市場指數
   - 提供一致的市場背景信息
   - 高度: 100px
   - 載入時間: ~1-2 秒
```

### **階段 3: 數據載入階段**
```
3. 配置載入 (symbols config)
   - 載入股票符號列表
   - 決定顯示哪些股票
   - 來源優先級: 環境變數 → 快取 → universe.json → Google Sheets → 靜態

4. 股價數據載入 (並行)
   - quotes 快照數據
   - daily 快照數據
   - 使用 Promise.all 並行載入

5. 元數據載入
   - 股票基本信息 (sector, industry, exchange)
   - 使用靜態數據以提升效能
   - 批次載入所有股票的元數據
```

### **階段 4: 內容渲染 (按 Sector 分組)**
```
6. Sector Groups 渲染順序:
   - Technology (8 stocks)
   - Communication Services (4 stocks)
   - Consumer Cyclical (3 stocks)
   - Industrials (4 stocks)
   - Healthcare (2 stocks)
   - Energy (3 stocks)
   - Unknown (confidence < 0.7 的股票)
```

### **階段 5: 股票卡片內部渲染順序**
```
每個 StockCard 內部順序:
7. 股票基本信息
   - Symbol, Price, Change
   - Company Name, Market Cap
   - Exchange 和 Industry 標籤

8. TradingView Widgets (並行載入)
   - Symbol Overview (2/3 寬度)
   - Technical Analysis (1/3 寬度)

9. 技術指標數據
   - 從快取或 API 載入
   - SMA, EMA, RSI, MACD 等指標
```

---

## 📱 **StockDetail.vue 渲染順序**

### **階段 1: 立即顯示 (0ms)**
```
1. 頁面滾動到頂部
   - 確保用戶從頁面頂部開始瀏覽
   - 使用 smooth scroll 行為

2. 骨架屏載入 (StockDetailSkeleton)
   - 詳細頁面的骨架結構
   - 包含所有主要組件的預覽
```

### **階段 2: 頁面標題和導航 (Priority 1)**
```
3. Breadcrumb 導航
   - Stock Overview → Symbol Analysis
   - 提供清楚的導航路徑

4. 股票標題信息
   - Symbol, Exchange, Industry 標籤
   - Back to Stock Overview 按鈕
```

### **階段 3: 主要 Widgets (Priority 2)**
```
5. 主要 TradingView Widgets (並行載入)
   - Symbol Overview (2/3 寬度, 440px 高度)
   - Technical Analysis (1/3 寬度, 440px 高度)
   - 使用 FastTradingViewWidget 快速載入
```

### **階段 4: 深度分析 Widgets (Priority 3)**
```
6. Daily Insight (MA5)
   - 日線深度分析
   - 高度: 550px
   - 使用 LazyTradingViewWidget

7. Weekly Insight (MA4)
   - 週線深度分析
   - 高度: 550px
   - 與 Daily Insight 並行載入
```

### **階段 5: 技術指標 (Priority 3)**
```
8. Technical Indicators 組件
   - 詳細的技術指標計算和顯示
   - 包含 SMA, EMA, RSI, MACD 等
   - 使用動態 API 獲取最新數據
```

### **階段 6: 補充信息 (Priority 4)**
```
9. Stock News (全寬度)
   - 相關新聞和公告
   - 自適應高度 (最小 400px)

10. Fundamental Data (全寬度)
    - 基本面數據分析
    - 高度: 600px

11. Company Profile (全寬度)
    - 公司簡介和基本信息
    - 高度: 400px

12. Performance Monitor
    - 頁面效能監控
    - 最後載入，不影響用戶體驗
```

---

## ⚙️ **Settings.vue 渲染順序**

### **階段 1: 立即顯示**
```
1. 設定頁面骨架
2. 導航標題
```

### **階段 2: 設定選項**
```
3. 系統設定選項
4. 快取管理選項
5. 效能設定選項
```

---

## 🧪 **測試頁面渲染順序**

### **開發/測試頁面**
```
- TopStoriesTest
- StockMarketInsightTest
- YahooFinanceTest
- TechnicalIndicatorsValidation
- MetadataServiceTest
- ProxyDiagnosticTest
- TechnicalIndicatorsManager
- AutoUpdateMonitor
- SystemManager
```

這些頁面通常用於開發和測試，渲染順序相對簡單，主要關注功能驗證而非用戶體驗優化。

---

## 🎯 **渲染優化策略**

### **優先級分配原則**
1. **Priority 1**: 關鍵信息，用戶最需要的內容
2. **Priority 2**: 重要信息，提供價值但非必需
3. **Priority 3**: 補充信息，增強體驗但可延遲載入
4. **Priority 4**: 系統信息，不影響主要功能

### **載入策略**
- **並行載入**: 相同優先級的組件並行載入
- **漸進式顯示**: 按優先級順序顯示內容
- **骨架屏**: 立即提供視覺反饋
- **錯誤處理**: 載入失敗時提供重試選項

### **效能考量**
- **TradingView Widget**: 使用 LazyTradingViewWidget 延遲載入
- **快取優先**: 優先使用快取數據
- **批次載入**: 相關數據一次性載入
- **資源管理**: 避免同時載入過多資源

---

## 📱 **響應式渲染調整**

### **桌面版 (>1200px)**
- 完整的並行載入
- 所有組件同時顯示
- 最佳的視覺效果

### **平板版 (768px-1200px)**
- 部分組件改為垂直排列
- 保持主要功能完整
- 適度調整組件大小

### **手機版 (<768px)**
- 所有組件垂直排列
- 簡化部分功能
- 優化觸控體驗
- 減少同時載入的組件數量

---

## 🔧 **開發者指南**

### **添加新組件時的考量**
1. **確定優先級**: 根據用戶需求分配優先級
2. **實施骨架屏**: 為新組件創建對應的骨架
3. **錯誤處理**: 實施適當的錯誤處理和重試機制
4. **效能監控**: 添加效能監控點
5. **響應式設計**: 確保在所有設備上正常顯示

### **最佳實踐**
- 使用 `performanceMonitor` 追蹤載入時間
- 實施適當的快取策略
- 提供清楚的載入狀態指示
- 確保組件間的協調載入

---

**文件版本**: 1.0  
**最後更新**: 2024-12-25  
**維護者**: 前端開發團隊  