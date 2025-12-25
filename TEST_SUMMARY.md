# 🧪 本地測試環境已準備就緒

## 🚀 快速開始

### 1. 啟動開發服務器
```bash
# 雙擊執行這個檔案
start-dev-server.bat
```

### 2. 開啟除錯工具
瀏覽器會自動開啟，然後訪問：
- **http://localhost:3000/quick-debug-test.html** (快速測試)
- **http://localhost:3000** (主應用程式)

### 3. 查看除錯輸出
1. 按 `F12` 開啟開發者工具
2. 切換到 `Console` 標籤
3. 導航到 Stock Overview 頁面
4. 查看 CRM/IONQ 的除錯訊息

## 🔍 預期看到的除錯訊息

### ✅ 正常情況
```
✅ Loaded 24 symbols from static: [...]
🔄 Loading metadata for 24 symbols using static data...
✅ Successfully loaded metadata for 24 symbols
CRM metadata: {symbol: "CRM", sector: "Technology", industry: "Software - Application", confidence: 1}
CRM final industry result: Software - Application
```

### ❌ 問題情況
```
❌ Failed to load symbols config: [error]
No metadata for symbol: CRM
Low confidence (0.x) for CRM
CRM final industry result: Unknown Industry
```

## 📊 測試工具

### 1. 快速除錯頁面
**http://localhost:3000/quick-debug-test.html**
- 一鍵測試元數據載入
- CRM 特定資料檢查
- 前端邏輯模擬
- 環境檢測

### 2. 主應用程式測試
**http://localhost:3000**
- 導航到 Stock Overview
- 查看實際顯示結果
- 檢查 Console 除錯訊息

## 🎯 關鍵檢查點

1. **元數據載入**: 是否成功載入 24 個股票的資料
2. **CRM 資料**: 是否找到 CRM 且信心度為 1.0
3. **顯示邏輯**: 是否正確顯示 "Software - Application"
4. **Console 錯誤**: 是否有任何紅色錯誤訊息

## 📝 回報格式

測試完成後，請提供：

```
環境: 本地開發 (localhost:3000)
瀏覽器: [Chrome/Firefox/Edge] 版本 [x.x.x]

元數據載入: [成功/失敗]
CRM 顯示結果: [實際顯示的內容]
IONQ 顯示結果: [實際顯示的內容]

Console 除錯訊息:
[複製相關的 console 輸出]

錯誤訊息 (如果有):
[複製任何紅色錯誤訊息]
```

這些資訊將幫助我們快速定位問題並提供解決方案。