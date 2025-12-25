# 🚀 正式部署執行指南

## 📋 執行方式

### 方法 1: 一鍵執行 (推薦)

**步驟 1: 執行部署**
```cmd
# 雙擊執行或在命令提示字元中執行
deploy-now.bat
```

**步驟 2: 驗證部署**
```cmd
# 雙擊執行或在命令提示字元中執行
verify-now.bat
```

### 方法 2: PowerShell 直接執行

如果你的 PowerShell 執行策略允許，可以直接執行：

```powershell
# 1. 開啟 PowerShell (以系統管理員身分執行)
# 2. 導航到專案目錄
cd "C:\Users\Romarin\Documents\Kiro\investment-dashboard"

# 3. 執行部署
.\deploy-production.ps1

# 4. 驗證部署
.\verify-deployment.ps1
```

### 方法 3: 手動執行步驟

如果自動化腳本無法執行，可以手動執行以下步驟：

#### 步驟 1: 檢查 Git 狀態
```cmd
git status
```

#### 步驟 2: 提交變更 (如果有)
```cmd
git add .
git commit -m "🚀 Production deployment: Update sector industry data with 24 stocks"
```

#### 步驟 3: 切換到 main 分支
```cmd
git checkout main
git pull origin main
```

#### 步驟 4: 安裝依賴和建置
```cmd
npm install
npm run build
```

#### 步驟 5: 推送觸發部署
```cmd
git push origin main
```

## 🔍 部署驗證

### 自動驗證
執行 `verify-now.bat` 或手動檢查以下連結：

### 手動驗證
在瀏覽器中訪問以下連結，確認正常載入：

1. **主網站**: https://romarin-hsieh.github.io/investment-dashboard/
2. **Market Dashboard**: https://romarin-hsieh.github.io/investment-dashboard/#/market-dashboard
3. **Stock Dashboard**: https://romarin-hsieh.github.io/investment-dashboard/#/stock-dashboard
4. **資料 API**: https://romarin-hsieh.github.io/investment-dashboard/data/sector_industry.json

### 驗證檢查清單
- [ ] 主網站可正常載入
- [ ] 所有頁面路由正常
- [ ] 24 組股票資料正確顯示
- [ ] TradingView widgets 正常載入
- [ ] 無 JavaScript 錯誤

## 📊 監控連結

部署後請檢查以下狀態：

- **GitHub Actions**: https://github.com/romarin-hsieh/investment-dashboard/actions
- **部署狀態**: https://github.com/romarin-hsieh/investment-dashboard/deployments
- **gh-pages 分支**: https://github.com/romarin-hsieh/investment-dashboard/tree/gh-pages

## 🚨 常見問題

### 問題 1: PowerShell 執行策略限制
**解決方案**:
```powershell
# 以系統管理員身分開啟 PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 問題 2: Git 推送失敗
**解決方案**:
```cmd
# 檢查遠端倉庫連接
git remote -v

# 重新設定遠端倉庫 (如果需要)
git remote set-url origin https://github.com/romarin-hsieh/investment-dashboard.git
```

### 問題 3: npm 建置失敗
**解決方案**:
```cmd
# 清除 node_modules 重新安裝
rmdir /s /q node_modules
del package-lock.json
npm install
npm run build
```

### 問題 4: GitHub Actions 未觸發
**解決方案**:
1. 檢查 `.github/workflows/` 目錄中的工作流程檔案
2. 確認推送到 main 分支
3. 檢查 GitHub 倉庫的 Actions 頁面

## ⏱️ 預期時間

- **部署執行**: 2-3 分鐘
- **GitHub Actions**: 3-5 分鐘
- **DNS 傳播**: 5-10 分鐘
- **總計**: 約 10-15 分鐘

## ✅ 成功指標

部署成功後，你應該看到：

1. **GitHub Actions** 顯示綠色勾號 ✅
2. **gh-pages 分支** 有新的提交
3. **網站** 可正常訪問並顯示最新內容
4. **資料 API** 返回 24 組股票的完整資料

---

**準備好了嗎？執行 `deploy-now.bat` 開始部署！** 🚀