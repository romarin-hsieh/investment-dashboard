# 🧪 本地測試環境設置指南

## 🚀 快速啟動

### 方法 1: 使用批次檔 (推薦)
```bash
# 雙擊執行
start-dev-server.bat
```

### 方法 2: 手動命令
```bash
# 在命令提示字元中執行
npm run dev
```

## 🔍 測試步驟

### 1. 啟動開發服務器
- 執行 `start-dev-server.bat`
- 等待服務器啟動 (通常在 http://localhost:3000)
- 瀏覽器會自動開啟

### 2. 開啟除錯工具
1. **開啟瀏覽器開發者工具**: 按 `F12`
2. **切換到 Console 標籤**
3. **清除現有日誌**: 點擊清除按鈕

### 3. 導航到 Stock Overview 頁面
- 點擊導航欄中的 "Stock Overview"
- 或直接訪問: http://localhost:3000/stock-overview

### 4. 查看除錯輸出
在 Console 中尋找以下關鍵訊息：

#### ✅ 正常載入訊息
```
✅ Loaded 24 symbols from static: [...]
🔄 Loading metadata for 24 symbols using static data...
✅ Successfully loaded metadata for 24 symbols
```

#### 🔍 CRM/IONQ 特定除錯訊息
```
CRM metadata: {symbol: "CRM", sector: "Technology", industry: "Software - Application", confidence: 1}
CRM confidence: 1
CRM industry: Software - Application
CRM final industry result: Software - Application
```

#### ❌ 錯誤訊息 (如果有問題)
```
❌ Failed to load symbols config: [error details]
No metadata for symbol: CRM
Low confidence (0.x) for CRM
```

## 🛠️ 除錯工具

### 1. 內建除錯頁面
在瀏覽器中開啟以下頁面進行詳細測試：

- **http://localhost:3000/fix-metadata-cache.html**
  - 測試元數據載入
  - 分析 CRM/IONQ 資料
  - 清除瀏覽器快取

- **http://localhost:3000/test-metadata-loading.html**
  - 模擬前端邏輯
  - 測試信心度閾值
  - 顯示應該顯示的內容

### 2. 手動測試
在 Console 中執行以下命令：

```javascript
// 檢查元數據載入
fetch('/data/symbols_metadata.json')
  .then(r => r.json())
  .then(data => {
    const crm = data.items.find(item => item.symbol === 'CRM');
    console.log('CRM data:', crm);
  });

// 檢查 Vue 組件狀態 (如果可用)
if (window.Vue) {
  console.log('Vue app instance:', window.Vue);
}
```

## 📊 預期結果

### ✅ 成功情況
- CRM 顯示: "Software - Application"
- IONQ 顯示: "Computer Hardware"  
- 所有股票都有正確的產業標籤
- Console 沒有錯誤訊息

### ❌ 問題情況
- 顯示 "Unknown Industry"
- Console 有錯誤訊息
- 元數據載入失敗

## 🔧 常見問題解決

### 問題 1: 服務器無法啟動
```bash
# 檢查 Node.js 版本
node --version  # 應該 >= 18.0.0

# 重新安裝依賴
npm install

# 清除快取
npm cache clean --force
```

### 問題 2: 瀏覽器快取問題
1. 按 `Ctrl + F5` 強制重新載入
2. 或在開發者工具中右鍵重新載入按鈕 → "清空快取並強制重新載入"

### 問題 3: 元數據載入失敗
1. 檢查 `public/data/symbols_metadata.json` 檔案是否存在
2. 檢查檔案內容是否正確
3. 使用除錯工具頁面進行詳細分析

## 📝 測試報告

測試完成後，請提供以下資訊：

1. **Console 輸出**: 複製相關的除錯訊息
2. **顯示結果**: CRM 和 IONQ 實際顯示的內容
3. **錯誤訊息**: 任何紅色錯誤訊息
4. **除錯工具結果**: fix-metadata-cache.html 的測試結果

這些資訊將幫助我們快速定位並修復問題。