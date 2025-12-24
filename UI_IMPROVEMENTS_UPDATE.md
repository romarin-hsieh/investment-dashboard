# UI 改進更新

## 更新內容

### 1. ✅ Performance Monitor 預設展開
- **修改文件**: `src/components/PerformanceMonitor.vue`
- **變更**: 將 `expanded` 的預設值從 `false` 改為 `true`
- **效果**: 所有頁面的 Performance Monitor 現在預設為展開狀態

### 2. ✅ Top Stories 高度統一
- **目標**: 確保所有 Top Stories 區塊都使用 650px 高度
- **修改文件**: `src/pages/TopStoriesTest.vue`
- **變更**: 將測試頁面的高度從 600px 改為 650px

## 具體修改

### Performance Monitor 展開狀態
```javascript
// 修改前
data() {
  return {
    expanded: false, // 預設收合
    // ...
  }
}

// 修改後
data() {
  return {
    expanded: true, // 預設展開
    // ...
  }
}
```

**影響範圍**:
- `src/pages/MarketDashboard.vue` - Market Overview 頁面
- `src/components/StockOverview.vue` - Stock Overview 頁面
- 所有包含 `<PerformanceMonitor />` 的頁面

### Top Stories 高度設定
```vue
<!-- TopStoriesTest.vue 修改前 -->
<TradingViewTopStories 
  height="600px"
/>

<!-- TopStoriesTest.vue 修改後 -->
<TradingViewTopStories 
  height="650px"
/>
```

**高度設定確認**:
- ✅ `src/pages/MarketDashboard.vue`: 650px (已設定)
- ✅ `src/components/TradingViewTopStories.vue`: 650px (CSS 中已設定)
- ✅ `src/pages/TopStoriesTest.vue`: 650px (已修改)

## 預期效果

### Performance Monitor
- **用戶體驗**: 用戶進入頁面時可以立即看到性能監控信息
- **開發體驗**: 開發者可以更容易地監控頁面性能
- **可見性**: 提高性能數據的可見性，有助於性能優化

### Top Stories
- **內容完整性**: 用戶可以看到更多新聞內容，無需滾動
- **一致性**: 所有頁面的 Top Stories 區塊高度統一
- **用戶體驗**: 減少用戶需要滾動查看完整內容的操作

## 技術細節

### Performance Monitor 功能
- **展開狀態**: 顯示詳細的性能指標
- **指標包含**:
  - Page Load Time (頁面載入時間)
  - Widgets Loaded (已載入的 widgets 數量)
  - Total Size (總大小)
  - Memory Usage (記憶體使用量)
  - Widget Load Times (各 widget 載入時間)

### Top Stories 高度優化
- **標準高度**: 650px
- **響應式設計**:
  - 平板 (≤768px): 550px
  - 手機 (≤480px): 500px
- **內容顯示**: 可以顯示更多新聞條目，提升用戶體驗

## 測試檢查點

### Performance Monitor
- [ ] Market Overview 頁面的 Performance Monitor 預設展開
- [ ] Stock Overview 頁面的 Performance Monitor 預設展開
- [ ] 展開狀態下所有指標正常顯示
- [ ] 收合/展開功能正常工作

### Top Stories
- [ ] Market Overview 的 Top Stories 高度為 650px
- [ ] TopStoriesTest 頁面的 Top Stories 高度為 650px
- [ ] 響應式設計在不同螢幕尺寸下正常工作
- [ ] 新聞內容完整顯示，無需額外滾動

## 相關文件

### 修改的文件
- `src/components/PerformanceMonitor.vue` - Performance Monitor 預設展開
- `src/pages/TopStoriesTest.vue` - Top Stories 高度調整

### 相關文件 (無需修改)
- `src/pages/MarketDashboard.vue` - Top Stories 高度已正確
- `src/components/TradingViewTopStories.vue` - CSS 高度已正確

## 狀態
- ✅ Performance Monitor 預設展開已完成
- ✅ Top Stories 高度統一已完成
- ✅ 所有文件通過語法檢查
- ✅ 準備進行測試驗證

## 後續建議

### Performance Monitor
- 考慮添加更多性能指標 (如 FCP, LCP 等)
- 可以添加性能建議和優化提示
- 考慮添加歷史性能數據比較

### Top Stories
- 可以考慮添加新聞分類篩選功能
- 可以添加新聞更新時間顯示
- 考慮添加新聞來源標識