# 🚀 手動部署步驟 - 自動更新系統版本

## 📋 當前狀態
- ✅ 自動更新系統已完全實施
- ✅ 監控面板已整合到導航
- ✅ 所有新功能已測試完成
- ✅ 代碼已格式化和修復

## 🔧 需要手動執行的命令

由於 PowerShell 執行策略限制，請在命令提示符 (cmd) 或 PowerShell 中手動執行以下命令：

### 步驟 1: 構建項目
```cmd
npm run build
```

### 步驟 2: 提交更改到 Git
```cmd
git add .
git commit -m "Deploy: Add Auto Update System with monitoring dashboard"
git push origin main
```

### 步驟 3: 部署到 GitHub Pages
```cmd
npm run deploy:github
```

或者使用 npx：
```cmd
npx gh-pages -d dist
```

## 📁 新增的重要文件

### 自動更新系統核心文件
- `src/utils/autoUpdateScheduler.js` - 自動更新調度器
- `scripts/auto-precompute-indicators.js` - 增強預計算腳本
- `src/pages/AutoUpdateMonitor.vue` - 監控面板

### 配置和文檔
- `logs/.gitkeep` - 日誌目錄
- `AUTO_UPDATE_IMPLEMENTATION_SUMMARY.md` - 實施總結
- `STARTUP_VERIFICATION.md` - 啟動驗證指南
- `DEPLOYMENT_GUIDE.md` - 部署指南

### 部署腳本
- `deploy.bat` - Windows 批處理部署腳本
- `deploy.ps1` - PowerShell 部署腳本
- `deploy.sh` - Bash 部署腳本 (已存在)

## 🌐 部署後驗證

部署完成後，請訪問以下 URL 驗證功能：

1. **主頁**: https://romarin-hsieh.github.io/investment-dashboard/
2. **自動更新監控**: https://romarin-hsieh.github.io/investment-dashboard/#/auto-update-monitor

### 驗證清單
- [ ] 導航欄顯示 "Auto Update" 鏈接
- [ ] 監控面板正常載入
- [ ] 調度器狀態顯示為「運行中」
- [ ] 可以手動觸發更新
- [ ] 日誌區域正常顯示記錄

## 🎯 新功能亮點

### 自動更新系統
- **智能調度**: 基於市場時間和數據年齡自動更新
- **完整監控**: 實時狀態監控和日誌記錄
- **手動控制**: 支援手動觸發和配置調整
- **錯誤處理**: 自動重試和降級策略

### 更新策略
- **技術指標**: 每 1 小時檢查，市場時間內更新
- **元數據**: 每 24 小時檢查，任何時間更新
- **緩存清理**: 每 6 小時執行一次

## 🚨 如果遇到問題

### PowerShell 執行策略問題
如果遇到執行策略錯誤，請使用以下命令：
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### 構建失敗
如果構建失敗，請嘗試：
```cmd
npm ci
npm run build
```

### Git 推送失敗
如果 Git 推送失敗，請檢查：
```cmd
git status
git remote -v
```

## 📞 支援

如果需要協助，請檢查：
1. `DEPLOYMENT_GUIDE.md` - 詳細部署指南
2. `AUTO_UPDATE_IMPLEMENTATION_SUMMARY.md` - 系統實施總結
3. `STARTUP_VERIFICATION.md` - 啟動驗證指南

---

**準備就緒！請按照上述步驟手動執行部署命令。** 🚀