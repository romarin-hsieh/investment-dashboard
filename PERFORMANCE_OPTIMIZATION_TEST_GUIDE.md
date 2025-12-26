# 🧪 Performance Optimization Test Guide

## ✅ **部署狀態: 已完成**

性能優化已成功部署到 GitHub，GitHub Actions 正在自動部署到正式環境。

---

## 🎯 **測試重點**

### **1. Industry 標籤顏色統一**
- **測試頁面**: StockDetail 頁面
- **預期結果**: Industry 標籤使用灰色，與 StockOverview 一致

### **2. 技術指標載入優化**
- **測試重點**: `latest_index.json` 只載入一次
- **預期結果**: 大幅減少網路請求

---

## 🔧 **本地測試**

### **啟動測試環境**
```bash
# 啟動本地伺服器
npm run dev
# 或
python test-server.py
```

### **測試連結**
1. **性能測試頁面**: http://localhost:3000/test-performance-optimization.html
2. **StockDetail 測試**: http://localhost:3000/#/stock-overview/symbols/CRM
3. **StockOverview 測試**: http://localhost:3000/#/stock-overview

---

## 📊 **測試步驟**

### **Step 1: Industry 標籤顏色測試**

1. 開啟 StockDetail 頁面: http://localhost:3000/#/stock-overview/symbols/CRM
2. 檢查 Industry 標籤顏色
3. 對比 StockOverview 頁面的標籤顏色

**預期結果**:
- ✅ CRM Industry 標籤: 灰色背景 (#f5f5f5)
- ✅ 與 StockOverview 頁面顏色一致
- ✅ 不再使用綠色或其他彩色

### **Step 2: 技術指標載入優化測試**

1. 開啟瀏覽器開發者工具 (F12)
2. 切換到 Network 面板
3. 清除網路記錄
4. 開啟 StockOverview 頁面: http://localhost:3000/#/stock-overview
5. 觀察 `latest_index.json` 的請求次數

**預期結果**:
- ✅ `latest_index.json` 只出現 1 次請求
- ✅ 不會有 24 次重複請求
- ✅ Console 顯示 "📦 Using cached index data"

### **Step 3: 性能測試頁面驗證**

1. 開啟: http://localhost:3000/test-performance-optimization.html
2. 點擊 "測試技術指標載入" 按鈕
3. 觀察網路請求監控結果

**預期結果**:
- ✅ 測試狀態顯示 "✅ 測試通過"
- ✅ `latest_index.json` 請求次數 ≤ 1
- ✅ 顯示 "優化成功！索引文件只載入了 X 次"

---

## 🌐 **正式環境測試**

### **等待部署完成**
- **GitHub Actions**: https://github.com/romarin-hsieh/investment-dashboard/actions
- **預計時間**: 2-3 分鐘

### **正式環境連結**
1. **主頁**: https://romarin-hsieh.github.io/investment-dashboard/
2. **StockDetail**: https://romarin-hsieh.github.io/investment-dashboard/#/stock-overview/symbols/CRM
3. **測試頁面**: https://romarin-hsieh.github.io/investment-dashboard/test-performance-optimization.html

### **正式環境驗證清單**

#### **Industry 標籤測試**
- [ ] CRM 頁面 Industry 標籤為灰色
- [ ] IONQ 頁面 Industry 標籤為灰色  
- [ ] PL 頁面 Industry 標籤為灰色
- [ ] 與 StockOverview 頁面顏色一致

#### **性能優化測試**
- [ ] 開啟 Network 面板，清除記錄
- [ ] 載入 StockOverview 頁面
- [ ] 檢查 `latest_index.json` 只出現 1 次
- [ ] Console 顯示緩存相關日誌

#### **功能完整性測試**
- [ ] 技術指標正常顯示
- [ ] TradingView widgets 正常載入
- [ ] 頁面載入速度明顯提升
- [ ] 無 JavaScript 錯誤

---

## 📈 **性能對比**

### **修復前 (預期)**
```
StockOverview 頁面載入:
- latest_index.json: 24 次請求 ❌
- 載入時間: 較慢
- 網路流量: 較高
```

### **修復後 (預期)**
```
StockOverview 頁面載入:
- latest_index.json: 1 次請求 ✅
- 載入時間: 更快
- 網路流量: 大幅降低
```

---

## 🐛 **問題排查**

### **如果 Industry 標籤仍是彩色**
1. 清除瀏覽器快取 (`Ctrl + Shift + Delete`)
2. 強制重新載入 (`Ctrl + F5`)
3. 檢查 GitHub Actions 是否完成部署

### **如果仍有多次 latest_index.json 請求**
1. 檢查 Console 是否有緩存相關日誌
2. 確認 PrecomputedIndicatorsAPI 是否正確載入
3. 檢查是否有 JavaScript 錯誤

### **如果測試頁面無法開啟**
1. 確認本地伺服器正在運行
2. 檢查檔案路徑是否正確
3. 查看 Console 是否有錯誤訊息

---

## 📝 **測試報告格式**

請按以下格式回報測試結果：

```
🧪 Performance Optimization Test Results

✅ 本地測試
- [ ] Industry 標籤顏色統一: ✅/❌
- [ ] 技術指標載入優化: ✅/❌
- [ ] 性能測試頁面: ✅/❌

✅ 正式環境測試
- [ ] Industry 標籤顏色統一: ✅/❌
- [ ] 技術指標載入優化: ✅/❌
- [ ] 整體性能提升: ✅/❌

📊 性能數據
- latest_index.json 請求次數: X 次
- 頁面載入時間改善: X%
- 用戶體驗: 更好/相同/更差

🔍 發現的問題:
- (請列出任何發現的問題)

💡 建議:
- (請提供任何改進建議)
```

---

**測試指南建立時間**: 2025-12-26  
**部署狀態**: ✅ 已完成  
**GitHub Actions**: 🔄 自動部署中  
**預計完成時間**: 2-3 分鐘