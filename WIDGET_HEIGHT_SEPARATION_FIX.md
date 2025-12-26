# Widget Height Separation Fix - 完成

## 🎯 問題描述

在增加 Fundamental Data 區塊高度到 950px 後，Company Profile 區塊的高度也被意外加高了。這是因為使用了全域 CSS 樣式 `:global(.tradingview-widget-container iframe)` 影響了所有使用相同 class 的 TradingView widgets。

## 🔍 問題根因

### 原本的全域樣式問題
```css
/* 問題：全域樣式影響所有 TradingView widgets */
:global(.tradingview-widget-container iframe) {
  height: 950px !important;  /* 影響 Company Profile 和 Fundamental Data */
}
```

這導致：
- Company Profile 被意外加高到 950px
- Fundamental Data 正確顯示 950px
- 兩個 widgets 無法有不同的高度設定

## ✅ 解決方案

使用特定的 CSS 選擇器來分別控制每個 widget 的高度：

### 1. Company Profile - 恢復原本高度
```css
/* 僅針對 Company Profile */
:global(.company-profile-widget .tradingview-widget-container iframe) {
  width: 100% !important;
  height: 400px !important;        /* 恢復原本高度 */
  min-height: 400px !important;
  max-height: 600px !important;
}
```

### 2. Fundamental Data - 保持增加的高度
```css
/* 僅針對 Fundamental Data */
:global(.fundamental-data-widget .tradingview-widget-container iframe) {
  width: 100% !important;
  height: 950px !important;        /* 保持增加的高度 */
  min-height: 600px !important;
  max-height: none !important;
}
```

## 📁 修改的檔案

### 1. src/components/TradingViewCompanyProfile.vue
- ✅ 添加特定選擇器 `.company-profile-widget`
- ✅ 設定 iframe 高度為 400px
- ✅ 設定容器高度限制 (min: 400px, max: 600px)
- ✅ 確保不受其他 widget 樣式影響

### 2. src/components/TradingViewFundamentalData.vue  
- ✅ 修改為特定選擇器 `.fundamental-data-widget`
- ✅ 保持 iframe 高度為 950px
- ✅ 移除全域樣式，避免影響其他 widgets
- ✅ 所有相關容器高度同步調整

## 🔧 技術細節

### CSS 選擇器策略
```css
/* 修復前 - 全域樣式 */
:global(.tradingview-widget-container iframe) {
  /* 影響所有 TradingView widgets */
}

/* 修復後 - 特定選擇器 */
:global(.company-profile-widget .tradingview-widget-container iframe) {
  /* 只影響 Company Profile */
}

:global(.fundamental-data-widget .tradingview-widget-container iframe) {
  /* 只影響 Fundamental Data */
}
```

### 容器 Class 結構
```html
<!-- Company Profile -->
<div class="company-profile-widget">
  <div class="tradingview-widget-container">
    <iframe><!-- 400px 高度 --></iframe>
  </div>
</div>

<!-- Fundamental Data -->
<div class="fundamental-data-widget">
  <div class="tradingview-widget-container">
    <iframe><!-- 950px 高度 --></iframe>
  </div>
</div>
```

## 📊 修復效果

| Widget | 修復前 | 修復後 | 狀態 |
|--------|--------|--------|------|
| Company Profile | 950px (錯誤) | 400px (正確) | ✅ 恢復正常 |
| Fundamental Data | 950px (正確) | 950px (正確) | ✅ 保持設定 |

## 🧪 測試

使用 `test-widget-height-separation-fix.html` 測試頁面來驗證修復：

### 測試步驟
1. **導航到任何股票詳情頁面**
2. **檢查 Company Profile 區塊**：
   - 高度應該是正常的 (~400px)
   - 不應該過高
   - 公司資訊正常顯示
3. **檢查 Fundamental Data 區塊**：
   - 高度應該是增加的 (~950px)
   - 更多財務資料可見
   - 減少內部滾動需求
4. **使用 DevTools 驗證**：
   - Company Profile iframe: height = 400px
   - Fundamental Data iframe: height = 950px

### 測試股票
- NFLX (Netflix)
- AAPL (Apple)
- NVDA (NVIDIA)
- TSLA (Tesla)
- RDW (Redwire)

## ✅ 預期結果

修復後應該觀察到：

### Company Profile
- ✅ 恢復正常高度 (400px)
- ✅ 公司資訊正常顯示
- ✅ 適當的比例和間距
- ✅ 沒有過多的空白區域

### Fundamental Data
- ✅ 保持增加的高度 (950px)
- ✅ 更多財務資料可見
- ✅ 減少內部滾動需求
- ✅ 改善的資料呈現

## 📱 響應式考量

- **Desktop (>1200px)**: Company Profile 400px, Fundamental Data 950px
- **Tablet (768px-1200px)**: 適度調整但保持比例差異
- **Mobile (<768px)**: 進一步縮小但維持相對高度差異

## 🚀 部署

修復已完成，可以立即部署：

```bash
git add src/components/TradingViewCompanyProfile.vue src/components/TradingViewFundamentalData.vue
git commit -m "fix: separate Company Profile and Fundamental Data widget heights using specific CSS selectors"
git push origin main
```

## 🔍 Debug 驗證

部署後可以使用瀏覽器 DevTools 驗證：

1. **Company Profile**：
   - 找到 `.company-profile-widget .tradingview-widget-container iframe`
   - 確認計算後的高度為 400px

2. **Fundamental Data**：
   - 找到 `.fundamental-data-widget .tradingview-widget-container iframe`
   - 確認計算後的高度為 950px

## 📝 學習重點

這次修復的關鍵學習：
- **避免使用過於廣泛的全域樣式**
- **使用特定的 CSS 選擇器來精確控制樣式**
- **考慮樣式變更對其他組件的潛在影響**
- **測試所有相關組件以確保沒有意外的副作用**

## 🔄 相關修復

這個修復是以下問題的解決方案：
1. **原始需求**: 增加 Fundamental Data 高度到 950px
2. **意外問題**: Company Profile 也被加高到 950px
3. **解決方案**: 使用特定選擇器分離兩個 widget 的樣式控制

## ⚠️ 注意事項

- 修復後每個 widget 都有獨立的高度控制
- 不會互相影響其他 TradingView widgets
- 保持了原有的功能完整性
- 響應式設計依然正常運作

## 🎯 總結

通過使用特定的 CSS 選擇器而不是全域樣式，成功解決了 widget 高度衝突的問題。現在：

- **Company Profile**: 恢復到適當的 400px 高度
- **Fundamental Data**: 保持所需的 950px 高度
- **其他 widgets**: 不受影響，正常運作
- **用戶體驗**: 每個 widget 都有最適合的顯示高度

這個修復確保了每個組件都能獨立控制其樣式，避免了全域樣式可能造成的意外影響，是一個更加健壯和可維護的解決方案。