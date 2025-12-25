# GitHub Pages 部署指南

## 🚀 部署當前版本到 GitHub Pages

### 方法 1：使用現有的部署腳本（推薦）

在項目根目錄執行：

```bash
# Windows
deploy.bat

# 或者使用 npm 腳本
npm run deploy:github
```

### 方法 2：手動部署步驟

#### 1. 構建項目
```bash
npm run build
```

#### 2. 檢查構建結果
確認 `dist` 文件夾已生成，包含：
- `index.html`
- `assets/` 文件夾
- 其他靜態資源

#### 3. 提交並推送到 GitHub
```bash
git add .
git commit -m "Deploy: VIX Widget 600px fix and improvements"
git push origin main
```

### 方法 3：使用 GitHub Actions（自動部署）

由於已經配置了 GitHub Actions，推送到 `main` 分支會自動觸發部署：

1. **提交當前更改**：
   ```bash
   git add .
   git commit -m "Fix: VIX Widget display issues and height adjustments"
   git push origin main
   ```

2. **檢查部署狀態**：
   - 訪問：https://github.com/romarin-hsieh/investment-dashboard/actions
   - 查看最新的 "Deploy to GitHub Pages" workflow

3. **訪問部署的網站**：
   - URL：https://romarin-hsieh.github.io/investment-dashboard/

## 📋 本次部署包含的修復

### ✅ VIX Widget 修復
- 修復 Canvas 高度顯示問題（581px → 600px 容器）
- 參考 LazyTradingViewWidget 的成功實作
- 使用正確的 FRED:VIXCLS 符號
- 統一容器高度為 600px

### ✅ 樣式優化
- Market Overview 和 Stock Overview 樣式分析
- 響應式設計改進
- Widget 容器統一化

### ✅ 技術改進
- 正確的 TradingView script 處理
- 優化的 DOM 結構
- 更好的錯誤處理

## 🔍 部署後驗證

部署完成後，請檢查：

1. **VIX Widget 顯示**：
   - ✅ 完整顯示 581px Canvas 內容
   - ✅ 時間軸和控制項可見
   - ✅ 正確顯示 FRED:VIXCLS 數據

2. **頁面功能**：
   - ✅ Market Overview 頁面正常載入
   - ✅ Stock Overview 頁面正常載入
   - ✅ 所有 TradingView Widgets 正常顯示

3. **響應式設計**：
   - ✅ 桌面版顯示正常
   - ✅ 平板版顯示正常
   - ✅ 手機版顯示正常

## 🛠️ 故障排除

### 如果部署失敗：

1. **檢查 GitHub Actions 日誌**：
   - 訪問 Actions 頁面查看錯誤信息

2. **本地構建測試**：
   ```bash
   npm run build
   npm run preview
   ```

3. **清除快取重新構建**：
   ```bash
   rm -rf node_modules dist
   npm install
   npm run build
   ```

### 如果 VIX Widget 仍有問題：

1. **檢查瀏覽器控制台**：
   - 查看是否有 JavaScript 錯誤
   - 檢查 TradingView script 載入狀態

2. **強制刷新頁面**：
   - Ctrl+F5 (Windows) 或 Cmd+Shift+R (Mac)

3. **檢查網路連接**：
   - 確認可以訪問 TradingView CDN

## 📊 部署配置說明

### Vite 配置
```javascript
// vite.config.js
export default defineConfig({
  base: '/investment-dashboard/', // GitHub Pages 路徑
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

### GitHub Actions 配置
- 自動觸發：推送到 `main` 分支
- Node.js 18
- 自動構建和部署到 GitHub Pages

## 🎯 下一步

部署完成後，你可以：

1. **測試所有功能**
2. **收集用戶反饋**
3. **監控性能表現**
4. **規劃下一次更新**

---

**部署 URL**: https://romarin-hsieh.github.io/investment-dashboard/
**GitHub Repository**: https://github.com/romarin-hsieh/investment-dashboard
**Actions 狀態**: https://github.com/romarin-hsieh/investment-dashboard/actions