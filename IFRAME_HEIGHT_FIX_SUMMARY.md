# TradingView iframe Height Fix - 修復完成 (Version 2)

## 🎯 問題描述

Market Regime 和 Trading Strategy 組件中的 TradingView iframe 被限制在 600px 高度，無法填滿 850px 的容器，導致底部出現空白區域。

## ❌ 第一次嘗試的問題

最初使用 scoped CSS 樣式來覆蓋 iframe 高度，但由於 Vue 的 scoped 樣式無法影響動態創建的 DOM 元素（TradingView iframe），修復沒有生效。

```css
<style scoped>
.tradingview-widget-container iframe {
  height: 100% !important; /* 無法作用於動態創建的 iframe */
}
</style>
```

## ✅ 正確的解決方案

使用全域樣式搭配特定的選擇器來確保 CSS 規則能夠正確應用到動態創建的 TradingView iframe：

```css
<style>
/* 全域樣式 - 可以影響動態創建的 iframe */
.advanced-chart-widget .tradingview-widget-container iframe {
  height: 100% !important;
}
</style>
```

## 📁 修改的檔案

- ✅ **src/components/MarketRegimeWidget.vue** - 新增全域 iframe 高度覆蓋規則
- ✅ **src/components/TradingStrategyWidget.vue** - 新增全域 iframe 高度覆蓋規則

## 🔧 技術細節

### 問題根因
Vue 的 scoped CSS 會為每個樣式規則添加唯一的屬性選擇器，但動態創建的 iframe 元素沒有這些屬性，因此 scoped 樣式無法應用。

### 解決方案
1. 保持其他樣式為 scoped（避免全域污染）
2. 僅針對 iframe 高度問題使用全域樣式
3. 使用特定的選擇器 `.advanced-chart-widget` 來限制作用範圍

## 📊 預期效果

- **Market Regime Widget**: iframe 現在會填滿整個 850px 容器
- **Trading Strategy Widget**: iframe 現在會填滿整個 850px 容器
- **響應式設計**: 在不同螢幕尺寸下，iframe 會自動調整填滿對應的容器高度
  - Desktop: 850px
  - Tablet: 750px  
  - Mobile: 650px
  - Small Mobile: 550px

## 🧪 測試

使用 `test-iframe-height-fix.html` 測試頁面來驗證修復效果：

1. 導航到任何股票詳情頁面
2. 滾動到 Symbol Insight 區段
3. 檢查 Market Regime 和 Trading Strategy widgets
4. 確認 iframe 完全填滿容器，沒有底部空白
5. 使用 DevTools 檢查 iframe 的計算高度為 100%

## 🚀 部署狀態

修復已完成，可以立即部署到正式環境。

```bash
git add src/components/MarketRegimeWidget.vue src/components/TradingStrategyWidget.vue
git commit -m "fix: use global CSS to override TradingView iframe height in Market Regime and Trading Strategy widgets"
git push origin main
```