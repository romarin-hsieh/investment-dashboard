# VIX Widget 高度一致性檢查與修復

## 問題發現

檢查發現 `.widget-container.vix-container` 和內部畫布的高度設置不一致，導致內容無法完全顯示。

## 高度不一致的問題

### 修復前的問題：
```
MarketDashboard.vue:
- .vix-container: min-height: 420px
- .tradingview-widget-container: height: 400px  ❌ 不一致
- .tv-mini-symbol-overview__chart: height: 400px  ❌ 不一致

VixWidget.vue:
- .vix-widget-container: height: 400px  ❌ 不一致
- 配置中的 height: "430"  ❌ 不一致
```

### 修復後的一致性：
```
MarketDashboard.vue:
- .vix-container: min-height: 450px  ✅ 統一
- .tradingview-widget-container: height: 430px  ✅ 統一
- .tv-mini-symbol-overview__chart: height: 430px  ✅ 統一

VixWidget.vue:
- .vix-widget-container: height: 430px  ✅ 統一
- 配置中的 height: "430"  ✅ 統一
```

## 完整的高度層級結構

```
外層容器層級：
.widget-container.vix-container (min-height: 450px)
└── .vix-widget-container (height: 430px)
    └── .tradingview-widget-container (height: 430px)
        └── .tradingview-widget-container__widget (height: 430px)

TradingView 內部層級：
└── .tv-mini-symbol-overview (height: 430px)
    └── .tv-mini-symbol-overview__body (height: 430px)
        └── .tv-mini-symbol-overview__content (height: 430px)
            └── .tv-mini-symbol-overview__chart (height: 430px)
                └── iframe/canvas (height: 430px)
```

## 修復的關鍵點

### 1. 外層容器高度 ✅
```css
.vix-container {
  min-height: 450px; /* 比內容高 20px，提供緩衝空間 */
  overflow: visible !important;
}
```

### 2. 內容區域高度 ✅
```css
.vix-container :global(.tradingview-widget-container) {
  min-height: 430px !important;
  height: 430px !important;
  overflow: visible !important;
}
```

### 3. 組件容器高度 ✅
```vue
<!-- VixWidget.vue -->
<div class="vix-widget-container" :style="{ height: '430px' }">
```

### 4. 配置中的高度 ✅
```javascript
const vixConfig = {
  "height": "430",  // 與 CSS 設置一致
  "autosize": false, // 防止自動調整覆蓋
}
```

## 深層元素修復

### iframe 和 canvas 元素 ✅
```css
.vix-container :global(iframe) {
  height: 430px !important;
  min-height: 430px !important;
}

.vix-container :global(canvas) {
  height: 430px !important;
  min-height: 430px !important;
}
```

### TradingView 內部結構 ✅
```css
.vix-container :global(.tv-mini-symbol-overview) {
  height: 430px !important;
  overflow: visible !important;
}

.vix-container :global(.tv-mini-symbol-overview__body) {
  height: 430px !important;
  overflow: visible !important;
}

.vix-container :global(.tv-mini-symbol-overview__content) {
  height: 430px !important;
  overflow: visible !important;
}
```

## overflow 屬性的重要性

### 問題：
TradingView 默認可能設置 `overflow: hidden`，導致內容被裁切。

### 解決方案：
```css
overflow: visible !important;
```
應用到所有相關元素，確保內容完全可見。

## 驗證步驟

### 1. 檢查外層容器
```javascript
// 在瀏覽器 Console 中執行
const vixContainer = document.querySelector('.vix-container');
console.log('VIX Container height:', getComputedStyle(vixContainer).height);
```

### 2. 檢查 TradingView 容器
```javascript
const tvContainer = document.querySelector('.tradingview-widget-container');
console.log('TradingView Container height:', getComputedStyle(tvContainer).height);
```

### 3. 檢查圖表元素
```javascript
const chartElement = document.querySelector('.tv-mini-symbol-overview__chart');
console.log('Chart Element height:', getComputedStyle(chartElement).height);
```

### 4. 檢查 iframe/canvas
```javascript
const iframe = document.querySelector('.vix-container iframe');
const canvas = document.querySelector('.vix-container canvas');
console.log('iframe height:', iframe ? getComputedStyle(iframe).height : 'Not found');
console.log('canvas height:', canvas ? getComputedStyle(canvas).height : 'Not found');
```

## 預期結果

修復後應該看到：

1. **統一高度**：所有元素都是 430px 高度
2. **完整內容**：圖表、時間軸、控制項都完全可見
3. **無裁切**：沒有內容被 overflow: hidden 隱藏
4. **一致性**：在不同瀏覽器中表現一致

高度一致性修復完成！現在所有相關元素都使用統一的 430px 高度設置。