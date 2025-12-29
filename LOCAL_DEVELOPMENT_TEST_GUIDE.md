# 🚀 本地開發環境測試指南

## ✅ 開發伺服器狀態

**狀態**: ✅ 已啟動  
**啟動時間**: 249ms  
**本地 URL**: http://localhost:3000/  
**網路 URL**: http://192.168.1.112:3000/  

## 🧪 測試項目清單

### 1. 🙈 Brief Section 隱藏測試
**測試 URL**: http://localhost:3000/#/stock-overview

**測試步驟**:
1. 開啟 Stock Overview 頁面
2. 檢查任何一個 StockCard
3. 確認沒有顯示 "Daily Brief" 區塊
4. 使用 F12 開發者工具檢查元素
5. 確認 `brief-section` 元素存在但有 `display: none` 樣式

**預期結果**:
- ✅ Daily Brief 區塊完全不可見
- ✅ StockCard 佈局正常，沒有空白區域
- ✅ 其他內容正常顯示

### 2. 🧭 TOC Navigation 測試
**測試 URL**: http://localhost:3000/#/stock-overview

**測試步驟**:
1. 檢查左側導航面板是否顯示
2. 測試搜尋功能
3. 點擊不同的 symbol 進行跳轉
4. 測試短距離和長距離跳轉
5. 觀察 ScrollSpy 自動高亮功能

**預期結果**:
- ✅ TOC 導航面板正常顯示
- ✅ 搜尋功能運作正常
- ✅ 點擊跳轉功能正常
- ✅ 長距離跳轉使用瞬移
- ✅ ScrollSpy 自動高亮當前區塊

### 3. 🔧 Widget Timeout 修正測試
**測試 URL**: http://localhost:3000/#/stock-overview

**測試步驟**:
1. 點擊 TOC 最底部的 symbol
2. 觀察 Widget 載入行為
3. 檢查瀏覽器 Console 是否有 timeout 錯誤
4. 測試多次跳轉

**預期結果**:
- ✅ 最多 3 個 Widget 同時載入
- ✅ 長距離跳轉使用 instant scroll
- ✅ Widget timeout 錯誤大幅減少
- ✅ 載入失敗自動重試

### 4. 🏢 Exchange Mapping 測試
**測試 URL**: 
- http://localhost:3000/#/stock-overview
- http://localhost:3000/#/stock-detail/UUUU
- http://localhost:3000/#/stock-detail/UMAC

**測試步驟**:
1. 在 Stock Overview 中找到 UUUU 和 UMAC
2. 檢查交易所標籤顯示
3. 檢查 TOC 導航中的交易所 badge
4. 點擊進入 Stock Detail 頁面
5. 檢查詳情頁標頭的交易所標籤

**預期結果**:
- ✅ 所有地方都顯示 "AMEX" 而不是 "ASE"
- ✅ 資料一致性完美

### 5. 📊 Symbol 修正測試
**測試 URL**: http://localhost:3000/#/stock-detail/PANW

**測試步驟**:
1. 確認 PANW 股票存在
2. 檢查公司名稱為 Palo Alto Networks
3. 檢查 sector 為 Technology
4. 檢查 industry 為 Software - Infrastructure

**預期結果**:
- ✅ PANW 股票正確顯示
- ✅ 公司資訊準確
- ✅ 分類正確

### 6. 📐 Container Width 測試
**測試 URL**: http://localhost:3000/#/stock-overview

**測試步驟**:
1. 檢查頁面整體寬度
2. 測試響應式設計
3. 調整瀏覽器視窗大小
4. 檢查 NavigationPanel 寬度

**預期結果**:
- ✅ 容器寬度為 1600px
- ✅ NavigationPanel 寬度為 350px
- ✅ 響應式設計正常

## 🔧 開發工具使用

### 瀏覽器開發者工具
1. **F12** 開啟開發者工具
2. **Elements 面板**: 檢查 DOM 結構
3. **Console 面板**: 查看錯誤和日誌
4. **Network 面板**: 監控 API 請求
5. **Performance 面板**: 分析效能

### Vue DevTools
如果安裝了 Vue DevTools 擴充功能：
1. 檢查元件狀態
2. 監控 props 和 data
3. 追蹤事件觸發

### Widget Load Manager 調試
在 Console 中執行：
```javascript
// 檢查 Widget 載入狀態
window.widgetLoadManager.getStatus()

// 調整併發限制
window.widgetLoadManager.setMaxConcurrent(5)

// 重置統計
window.widgetLoadManager.resetStats()
```

## 🐛 常見問題排除

### 1. 頁面載入緩慢
- 檢查網路連線
- 清除瀏覽器快取 (Ctrl+Shift+R)
- 檢查 Console 是否有錯誤

### 2. Widget 載入失敗
- 檢查 TradingView 外部資源是否被封鎖
- 確認網路連線穩定
- 查看 Network 面板的請求狀態

### 3. TOC 導航不工作
- 檢查 JavaScript 錯誤
- 確認 ScrollSpy 服務正常運作
- 檢查 DOM 元素是否正確生成

### 4. 響應式設計問題
- 測試不同螢幕尺寸
- 檢查 CSS media queries
- 確認 viewport meta tag 正確

## 📱 測試建議流程

### 快速測試 (5 分鐘)
1. 開啟 Stock Overview
2. 檢查 brief-section 是否隱藏
3. 測試一次 TOC 跳轉
4. 檢查 UUUU/UMAC 交易所顯示

### 完整測試 (15 分鐘)
1. 執行所有 6 個測試項目
2. 測試響應式設計
3. 檢查 Console 錯誤
4. 測試效能表現

### 深度測試 (30 分鐘)
1. 完整功能測試
2. 壓力測試 (多次跳轉)
3. 不同瀏覽器測試
4. 效能分析和優化

## 🔄 熱重載功能

開發伺服器支援熱重載：
- 修改 `.vue` 文件會自動重新載入
- 修改 `.js` 文件會自動重新載入
- 修改 `.css` 文件會自動更新樣式
- 無需手動重新整理頁面

## 📊 效能監控

### 關鍵指標
- **頁面載入時間**: < 2 秒
- **Widget 成功率**: > 90%
- **導航響應時間**: < 100ms
- **搜尋響應時間**: < 50ms

### 監控方法
1. 使用 Performance 面板
2. 觀察 Console 日誌
3. 檢查 Network 請求時間
4. 使用 Lighthouse 分析

## 🚀 測試完成後

### 如果測試通過
- 記錄測試結果
- 準備部署到生產環境
- 更新文檔

### 如果發現問題
- 記錄問題詳情
- 檢查相關程式碼
- 修正問題後重新測試

---

## 🎯 快速開始

1. **開啟瀏覽器**: http://localhost:3000/
2. **導航到 Stock Overview**: http://localhost:3000/#/stock-overview
3. **開始測試**: 按照上述測試項目進行
4. **檢查結果**: 確認所有功能正常運作

**開發伺服器已準備就緒，開始測試吧！** 🎊