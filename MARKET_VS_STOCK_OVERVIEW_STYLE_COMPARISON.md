# Market Overview vs Stock Overview 樣式比較

## 🎯 問題回答

**Market Overview** 和 **Stock Overview** 這兩個頁面的元素樣式 **不完全相同**，但有一些共同的基礎樣式。

## 📊 詳細比較

### 🟢 相同的樣式元素

#### 1. 基礎容器樣式
```css
/* 兩個頁面都有相同的 widget-container-ticker 樣式 */
.widget-container-ticker {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  overflow: hidden;
  position: relative;
}
```

#### 2. Widget Header 樣式
```css
/* 兩個頁面都有相同的 widget-header 樣式 */
.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.widget-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}
```

#### 3. 共同的 TradingView Widget
```vue
<!-- 兩個頁面都有相同的 Market Index Widget -->
<LazyTradingViewWidget
  widget-type="Market Index"
  :config="tickersConfig"
  script-url="https://s3.tradingview.com/external-embedding/embed-widget-tickers.js"
  height="100px"
  :priority="1"
/>
```

### 🔴 不同的樣式元素

#### 1. 主容器類名和樣式

**Market Overview:**
```css
.market-dashboard {
  padding: 0;
  overflow-x: hidden;
  max-width: 100%;
}
```

**Stock Overview:**
```css
.stock-overview {
  margin-bottom: 1rem;
}
```

#### 2. 頁面標題結構

**Market Overview:**
```vue
<div class="market-dashboard">
  <h2>Market Overview</h2>
  <p class="text-muted mb-3">Global markets overview and macro indicators</p>
```

**Stock Overview:**
```vue
<div class="stock-header">
  <h2>Stock Overview</h2>
  <div class="header-right">
    <div class="update-info">
      <span class="text-muted">Last updated: {{ formatTime(lastUpdate) }}</span>
    </div>
  </div>
</div>
<p class="text-muted mb-3">Stock universe overview and analysis</p>
```

#### 3. 特有的樣式類

**Market Overview 特有:**
```css
/* VIX 專用容器 */
.vix-container {
  min-height: 600px;
  overflow: hidden;
}

/* Insight Grid 佈局 */
.insight-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  align-items: start;
}

.insight-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
```

**Stock Overview 特有:**
```css
/* 股票分組樣式 */
.sector-groups {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.sector-group {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
}

.sector-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
}

.stocks-in-group {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
```

#### 4. 響應式設計差異

**Market Overview:**
```css
@media (max-width: 768px) {
  .widget-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
```

**Stock Overview:**
```css
@media (max-width: 767px) {
  .stock-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .sector-group {
    padding: 1rem;
    margin: 0 -0.5rem;
  }
}
```

## 🎨 視覺佈局差異

### Market Overview 佈局：
```
Market Overview
├── Market Index (Ticker)
├── VIX Index (600px 高度)
├── Fear & Greed Gauge
├── Top Stories
├── Market Insight
│   ├── Daily Insight (600px)
│   └── Weekly Insight (600px)
└── Stock Heatmap
```

### Stock Overview 佈局：
```
Stock Overview
├── Market Index (Ticker)
└── Sector Groups
    ├── Technology Sector
    │   ├── Stock Card 1
    │   └── Stock Card 2
    ├── Healthcare Sector
    │   └── Stock Card 3
    └── ...
```

## 🔧 樣式統一建議

如果要讓兩個頁面的樣式更一致，可以考慮：

### 1. 創建共用樣式文件
```css
/* styles/common-widgets.css */
.widget-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  overflow: hidden;
  position: relative;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}
```

### 2. 統一主容器樣式
```css
.page-container {
  padding: 0;
  overflow-x: hidden;
  max-width: 100%;
}
```

### 3. 統一頁面標題結構
```vue
<div class="page-header">
  <h2>{{ pageTitle }}</h2>
  <p class="text-muted mb-3">{{ pageDescription }}</p>
</div>
```

## 📋 總結

| 項目 | Market Overview | Stock Overview | 是否相同 |
|------|----------------|----------------|----------|
| 基礎 Widget 容器 | ✅ | ✅ | 🟢 相同 |
| Widget Header | ✅ | ✅ | 🟢 相同 |
| Market Index Widget | ✅ | ✅ | 🟢 相同 |
| 主容器樣式 | `.market-dashboard` | `.stock-overview` | 🔴 不同 |
| 頁面標題結構 | 簡單結構 | 複雜結構 | 🔴 不同 |
| 特殊佈局 | VIX + Insights | Sector Groups | 🔴 不同 |
| 響應式設計 | 基礎響應式 | 詳細響應式 | 🔴 不同 |

**結論**：兩個頁面有共同的基礎 Widget 樣式，但整體佈局和特殊元素的樣式是不同的。