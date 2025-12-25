# VIX Widget 400px 高度修復總結

## 修復內容

### 1. 符號修正 ✅
- **VixWidget.vue**: 確認使用 `FRED:VIXCLS` 符號
- **VixWidgetMini.vue**: 從 `CBOE:VIX` 修正為 `FRED:VIXCLS`

### 2. 高度統一設定 ✅
所有相關元素都設定為 **400px** 高度：

#### MarketDashboard.vue
```css
/* VIX 專用容器樣式 */
.vix-container {
  min-height: 420px; /* 外層容器比內容高 20px */
  overflow: visible !important;
}

.vix-container :global(.tradingview-widget-container) {
  height: 400px !important;
  min-height: 400px !important;
  overflow: visible !important;
}

/* 所有 TradingView 內部元素 */
.vix-container :global(.tv-mini-symbol-overview__link),
.vix-container :global(.tv-mini-symbol-overview__chart),
.vix-container :global(.js-link),
.vix-container :global(iframe),
.vix-container :global(canvas) {
  height: 400px !important;
  min-height: 400px !important;
  overflow: visible !important;
}
```

#### VixWidget.vue
```vue
<template>
  <div class="vix-widget-container" :style="{ height: '400px' }">
</template>

<script>
const vixConfig = {
  "symbol": "FRED:VIXCLS",
  "height": "400",
  // ... 其他配置
}
</script>
```

#### VixWidgetMini.vue
```vue
<template>
  <div class="vix-mini-widget" :style="{ height: '400px' }">
</template>

<script>
const vixMiniConfig = {
  "symbol": "FRED:VIXCLS",
  "height": "400",
  // ... 其他配置
}
</script>
```

### 3. 深層 CSS 修復 ✅
針對 TradingView 內部元素添加深層選擇器：

```css
/* 確保所有內部元素都有正確的高度和可見性 */
:global(.tv-mini-symbol-overview) {
  height: 400px !important;
  overflow: visible !important;
}

:global(.tv-mini-symbol-overview__body) {
  height: 400px !important;
  overflow: visible !important;
}

:global(.tv-mini-symbol-overview__content) {
  height: 400px !important;
  overflow: visible !important;
}
```

## 高度層級結構

```
外層容器層級：
.widget-container.vix-container (min-height: 420px)
└── .vix-widget-container (height: 400px)
    └── .tradingview-widget-container (height: 400px)
        └── .tradingview-widget-container__widget (height: 400px)

TradingView 內部層級：
└── .tv-mini-symbol-overview (height: 400px)
    └── .tv-mini-symbol-overview__body (height: 400px)
        └── .tv-mini-symbol-overview__content (height: 400px)
            └── .tv-mini-symbol-overview__chart (height: 400px)
                └── iframe/canvas (height: 400px)
```

## 關鍵修復點

### 1. overflow 屬性
```css
overflow: visible !important;
```
- 防止 TradingView 默認的 `overflow: hidden` 裁切內容
- 應用到所有相關元素

### 2. 高度一致性
- 外層容器：420px（提供 20px 緩衝空間）
- 所有內容元素：400px
- 配置中的高度：400

### 3. 符號正確性
- 使用 `FRED:VIXCLS` 而非 `CBOE:VIX`
- 顯示 "VIXCLS value" 連結到 FRED-VIXCLS 數據

## 測試步驟

### 1. 啟動開發服務器
```bash
npm run dev
```

### 2. 檢查 VIX Widget
- 訪問 Market Dashboard 頁面
- 確認 VIX Index 區塊顯示正確
- 點擊 "🔄 Refresh VIX" 按鈕測試重新載入

### 3. 驗證高度設定
在瀏覽器開發者工具中執行：

```javascript
// 檢查外層容器
const vixContainer = document.querySelector('.vix-container');
console.log('VIX Container height:', getComputedStyle(vixContainer).height);

// 檢查 TradingView 容器
const tvContainer = document.querySelector('.tradingview-widget-container');
console.log('TradingView Container height:', getComputedStyle(tvContainer).height);

// 檢查圖表元素
const chartElement = document.querySelector('.tv-mini-symbol-overview__chart');
console.log('Chart Element height:', chartElement ? getComputedStyle(chartElement).height : 'Not found');
```

### 4. 驗證符號正確性
- 確認顯示的是 FRED:VIXCLS 數據
- 檢查圖表下方的連結是否指向 "VIXCLS value"
- 確認數據來源是 FRED 而非 CBOE

## 預期結果

修復後應該看到：

1. **正確符號**：顯示 FRED:VIXCLS 數據
2. **統一高度**：所有元素都是 400px 高度
3. **完整內容**：圖表、時間軸、控制項都完全可見
4. **無裁切**：沒有內容被 overflow: hidden 隱藏
5. **一致性**：在不同瀏覽器中表現一致

## 故障排除

如果內容仍然被裁切：

1. **檢查 CSS 優先級**：確保 `!important` 規則生效
2. **清除瀏覽器快取**：強制重新載入 CSS
3. **檢查 TradingView 腳本載入**：確認沒有 JavaScript 錯誤
4. **驗證符號有效性**：確認 FRED:VIXCLS 符號可用

VIX Widget 400px 高度修復完成！所有相關元素現在都使用統一的 400px 高度設置，並使用正確的 FRED:VIXCLS 符號。