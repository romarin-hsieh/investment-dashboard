# 🚀 立即執行部署 - 詳細步驟

## 📋 當前狀況

由於 PowerShell 執行策略限制，我們需要手動執行部署步驟。以下是完整的執行指南：

## 🎯 立即執行步驟

### 步驟 1: 開啟命令提示字元
1. 按 `Win + R`
2. 輸入 `cmd`
3. 按 Enter

### 步驟 2: 導航到專案目錄
```cmd
cd "C:\Users\Romarin\Documents\Kiro\investment-dashboard"
```

### 步驟 3: 檢查 Git 狀態
```cmd
git status
```

### 步驟 4: 提交所有變更
```cmd
git add .
git commit -m "🚀 Production deployment: 24 stocks data and deployment automation"
```

### 步驟 5: 確保在 main 分支
```cmd
git branch
git checkout main
```

### 步驟 6: 拉取最新變更
```cmd
git pull origin main
```

### 步驟 7: 安裝依賴
```cmd
npm install
```

### 步驟 8: 建置專案
```cmd
npm run build
```

### 步驟 9: 推送觸發部署
```cmd
git push origin main
```

## 🔍 驗證部署

### 步驟 10: 檢查 GitHub Actions
1. 開啟瀏覽器
2. 訪問: https://github.com/romarin-hsieh/investment-dashboard/actions
3. 確認最新的工作流程正在執行或已完成

### 步驟 11: 等待部署完成 (約 5-10 分鐘)

### 步驟 12: 測試網站
訪問以下連結確認部署成功：

1. **主網站**: https://romarin-hsieh.github.io/investment-dashboard/
2. **資料 API**: https://romarin-hsieh.github.io/investment-dashboard/data/sector_industry.json

## 📊 預期結果

### 成功指標
- ✅ GitHub Actions 顯示綠色勾號
- ✅ 網站可正常載入
- ✅ 資料 API 返回 24 組股票資料
- ✅ 所有頁面功能正常

### 24 組股票資料驗證
資料 API 應該返回包含以下股票的 JSON：
```
Technology (11): PL, ONDS, MDB, ORCL, TSM, CRM, NVDA, AVGO, CRWV, IONQ, PLTR
Communication Services (4): ASTS, GOOG, META, NFLX  
Consumer Cyclical (3): RIVN, AMZN, TSLA
Industrials (3): RDW, AVAV, RKLB
Energy (2): LEU, SMR
Healthcare (1): HIMS
```

## 🚨 如果遇到問題

### 問題 1: Git 推送被拒絕
```cmd
git pull origin main --rebase
git push origin main
```

### 問題 2: npm 建置失敗
```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
npm run build
```

### 問題 3: GitHub Actions 未觸發
1. 檢查是否推送到正確的分支 (main)
2. 確認 `.github/workflows/` 目錄存在
3. 檢查 GitHub 倉庫設定

## ⚡ 快速執行版本

如果你想一次執行所有命令，可以複製以下內容到命令提示字元：

```cmd
cd "C:\Users\Romarin\Documents\Kiro\investment-dashboard" && git add . && git commit -m "🚀 Production deployment: 24 stocks data ready" && git checkout main && git pull origin main && npm install && npm run build && git push origin main
```

## 📞 執行後確認

執行完成後，請告訴我：
1. 每個步驟的執行結果
2. 是否有任何錯誤訊息
3. GitHub Actions 的執行狀態
4. 網站是否可正常訪問

這樣我就能協助你確認部署是否成功，並進行後續的驗證和優化。

---

**現在就開始執行吧！** 🚀