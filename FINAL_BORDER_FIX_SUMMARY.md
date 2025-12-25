# 最終 Border 修復總結

## 問題分析
根據用戶反饋和截圖，Stock Overview 的 TradingView widgets 沒有邊框，看起來不夠清晰。Technical Analysis 也受到影響。

## 解決方案
調整 `.fast-widget` 容器的樣式，添加適當的 border、padding 和背景色，而不是針對內部的 iframe 元素。

## 修改內容

### 1. src/components/FastTradingViewWidget.vue
```css
.fast-widget {
  width: 100%;
  height: 100%;
  min-height: 500px;
  position: relative;
  border: 1px solid #e9ecef; /* 添加邊框 */
  border-radius: 8px; /* 添加圓角 */
  padding: 8px; /* 添加內邊距 */
  background: #ffffff; /* 添加背景色 */
  box-sizing: border-box; /* 確保 padding 不會影響總寬度 */
}

.fast-loading {
  /* ... */
  margin: -8px; /* 抵消容器的 padding */
}

.fast-error {
  /* ... */
  margin: -8px; /* 抵消容器的 padding */
}
```

### 2. 移除不必要的 iframe 邊框樣式
- 從 `src/components/StockCard.vue` 移除 `:deep(iframe)` 邊框樣式
- 從 `src/pages/StockDetail.vue` 移除 `:deep(iframe)` 邊框樣式
- 從 `src/pages/StockDetail.vue` 移除 insight widget 的 iframe 邊框樣式

## 修復原理
1. **容器級別的邊框**: 在 `.fast-widget` 容器上添加邊框，而不是內部元素
2. **適當的內邊距**: 添加 8px 的 padding 讓 TradingView widget 與邊框有適當間距
3. **背景色**: 添加白色背景確保視覺一致性
4. **box-sizing**: 使用 `border-box` 確保 padding 不會影響總寬度
5. **loading/error 狀態**: 使用負 margin 抵消容器 padding，確保這些狀態填滿整個容器

## 預期結果
- Symbol Overview widgets 現在有清晰的邊框
- Technical Analysis widgets 也有一致的邊框
- 所有 TradingView widgets 在容器內有適當的間距
- loading 和 error 狀態仍然正常顯示

## 狀態: ✅ 完成
通過調整容器樣式而不是內部元素，提供了更清晰和一致的 widget 邊框效果。