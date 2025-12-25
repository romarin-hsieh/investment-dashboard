# 簡單的 Border 修復總結

## 問題
Stock Overview 的 widget 沒有 border，看起來有點奇怪，特別是 `class="tv-widget-chart tv-widget-chart--no-border"` 的問題。

## 解決方案
採用最簡單的方法，只針對 iframe 元素添加 border，避免複雜的樣式和不必要的圓角。

## 修改的文件

### 1. src/components/StockCard.vue
```css
/* 簡單的 TradingView widget border 修復 */
.widget-overview :deep(iframe),
.widget-technical :deep(iframe) {
  border: 1px solid #e9ecef;
}
```

### 2. src/pages/StockDetail.vue
```css
/* 簡單的 TradingView widget border 修復 */
.widget-overview :deep(iframe),
.widget-technical :deep(iframe) {
  border: 1px solid #e9ecef;
}

/* 簡單的 insight widget TradingView border 修復 */
.insight-widget :deep(iframe) {
  border: 1px solid #e9ecef;
}
```

### 3. src/components/FastTradingViewWidget.vue
```css
/* 簡單的 TradingView widget border 修復 */
.fast-widget :deep(iframe) {
  border: 1px solid #e9ecef;
}
```

## 修復方法
- 使用 Vue 3 的 `:deep()` 選擇器直接針對 iframe 元素
- 只添加簡單的 1px 實線邊框
- 使用一致的邊框顏色 `#e9ecef`
- 避免添加不必要的圓角或複雜樣式

## 預期結果
- Stock Overview 頁面的 widgets 現在應該有可見的邊框
- stock-overview/symbols/ 頁面的 widgets 也會有邊框
- StockDetail 頁面的所有 widgets 都會有一致的邊框
- 解決 `tv-widget-chart--no-border` 類別造成的無邊框問題

## 狀態: ✅ 完成
採用最簡單直接的方法修復 TradingView widgets 的邊框問題。