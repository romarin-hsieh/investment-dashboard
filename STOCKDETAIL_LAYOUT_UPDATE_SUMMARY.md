# StockDetail 版面配置更新摘要

## 🎯 更新目標

根據使用者需求，對 `investment-dashboard/#/stock-overview/symbols/{股票代碼}` 頁面進行版面配置調整：

1. **Symbol Insight 區塊**：將 Daily Insight (MA5) 和 Weekly Insight (MA4) 包裝在統一區塊中
2. **區塊樣式**：仿照 stock-card 樣式，但移除不必要的按鈕元素
3. **位置調整**：Symbol Insight 區塊位於 `class="stock-header"` 下方
4. **間隔修復**：修復 Technical Indicators 和 Latest News 之間的 padding 間隔

## 🔧 實作內容

### 1. HTML 結構調整

#### 修改前：
```html
<!-- Daily and Weekly Insight Widgets -->
<div class="insight-widgets-container">
  <!-- Daily Insight (MA5) - Left -->
  <div class="insight-widget daily-insight">...</div>
  <!-- Weekly Insight (MA4) - Right -->
  <div class="insight-widget weekly-insight">...</div>
</div>
```

#### 修改後：
```html
<!-- Symbol Insight Block -->
<div class="symbol-insight-block">
  <div class="insight-header">
    <h3>Symbol Insight</h3>
  </div>
  
  <div class="insight-widgets-container">
    <!-- Daily Insight (MA5) - Left -->
    <div class="insight-widget daily-insight">...</div>
    <!-- Weekly Insight (MA4) - Right -->
    <div class="insight-widget weekly-insight">...</div>
  </div>
</div>
```

### 2. CSS 樣式新增

#### Symbol Insight 區塊樣式
```css
/* Symbol Insight Block - Match stock-card style */
.symbol-insight-block {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.insight-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 1.5rem;
}

.insight-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #495057;
  margin: 0;
}
```

#### 間隔修復
```css
/* Content Layout - Row-based Structure */
.content-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1.5rem; /* 確保與 Technical Indicators 有適當間隔 */
}
```

### 3. 響應式設計優化

#### 桌面版 (> 1200px)
- Symbol Insight 區塊：兩欄式佈局
- 完整的 padding 和間距

#### 平板版 (768px - 1200px)
- Symbol Insight 區塊：單欄式佈局
- 適中的 padding

#### 手機版 (< 768px)
- 緊湊式佈局
- 減少間距和 padding
- 單欄式顯示

#### 小螢幕 (< 480px)
- 最小化間距
- 調整字體大小
- 優化觸控體驗

## 📱 版面配置結構

### 新的頁面結構
```
1. Breadcrumb (導航麵包屑)
2. Stock Header (股票資訊標題)
   ├── Symbol Overview (2/3 寬度)
   └── Technical Analysis (1/3 寬度)
3. Symbol Insight 區塊 (新增)
   ├── Daily Insight (MA5) - 左側
   └── Weekly Insight (MA4) - 右側
4. Technical Indicators (技術指標)
5. Latest News (最新消息) - 修復間隔
6. Fundamental Data (基本面數據)
7. Company Profile (公司簡介)
```

## 🎨 設計特點

### Symbol Insight 區塊
- **背景色**：白色 (#ffffff)
- **邊框**：淺灰色 (#e0e0e0)
- **圓角**：12px
- **內距**：1.5rem
- **標題**：h3 標籤，與其他區塊一致
- **分隔線**：標題下方有淺灰色分隔線

### 樣式一致性
- 與 stock-card 組件保持一致的視覺風格
- 移除了不必要的按鈕和互動元素
- 保持清潔簡潔的設計

## 🧪 測試環境

### 本地測試
1. **測試頁面**：`test-stockdetail-layout-update.html`
2. **開發伺服器**：`http://localhost:5173`
3. **測試路徑**：`/#/stock-overview/symbols/{SYMBOL}`

### 測試股票清單
- NFLX (Netflix Inc.)
- CRM (Salesforce Inc.)
- TSLA (Tesla Inc.)
- NVDA (NVIDIA Corp.)
- ASTS (AST SpaceMobile)
- RKLB (Rocket Lab USA)

### 測試重點
1. **Symbol Insight 區塊顯示**：確認區塊正確顯示且樣式正確
2. **間隔檢查**：驗證 Technical Indicators 和 Latest News 之間的間隔
3. **響應式測試**：在不同螢幕尺寸下測試佈局
4. **樣式一致性**：確認與 stock-card 樣式一致

## 📊 修改檔案

### 主要修改
- **`src/pages/StockDetail.vue`**：HTML 結構和 CSS 樣式更新

### 測試檔案
- **`test-stockdetail-layout-update.html`**：本地測試頁面

## ✅ 完成狀態

- [x] 新增 Symbol Insight 區塊
- [x] 實作區塊樣式（仿照 stock-card）
- [x] 調整區塊位置（stock-header 下方）
- [x] 修復 Technical Indicators 和 Latest News 間隔
- [x] 響應式設計優化
- [x] 建立本地測試環境
- [x] 創建測試頁面

## 🚀 使用方式

### 啟動測試環境
1. 確保開發伺服器運行：`npm run dev`
2. 開啟測試頁面：`test-stockdetail-layout-update.html`
3. 點擊測試連結查看不同股票的 StockDetail 頁面
4. 調整瀏覽器視窗大小測試響應式設計

### 驗證要點
- Symbol Insight 區塊是否正確顯示
- 區塊樣式是否與 stock-card 一致
- Technical Indicators 和 Latest News 間隔是否適當
- 響應式設計是否在各種螢幕尺寸下正常工作

## 📈 效果預期

- **視覺一致性**：Symbol Insight 區塊與整體設計風格一致
- **資訊組織**：Daily 和 Weekly Insight 被邏輯性地組織在一起
- **間隔優化**：頁面元素之間有適當的視覺間隔
- **響應式體驗**：在各種設備上都有良好的使用體驗

---

**更新完成！** 🎉 StockDetail 頁面的版面配置已按需求更新，現在可以通過本地測試環境查看效果。