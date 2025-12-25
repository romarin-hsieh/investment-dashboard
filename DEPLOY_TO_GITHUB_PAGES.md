# 部署到 GitHub Pages 指南

## 當前版本更新內容
✅ **ADX (14) 計算問題已修正** - 現在顯示正確數值而非 "N/A"
✅ **Market Overview 布局已調整** - Top Stories 和 VIX Index 位置已更新
✅ **技術指標載入優化** - 改善載入速度和錯誤處理
✅ **用戶體驗提升** - 添加重試機制和更好的狀態顯示

## 手動部署步驟

### 方法 1: 使用現有的部署腳本 (推薦)
```bash
# 在專案根目錄執行
.\deploy.bat
```

### 方法 2: 使用 npm 腳本
```bash
# 1. 安裝依賴
npm ci

# 2. 建構專案
npm run build

# 3. 部署到 GitHub Pages
npm run deploy:github
```

### 方法 3: 手動步驟
```bash
# 1. 安裝依賴
npm ci

# 2. 建構專案
set NODE_ENV=production
npm run build

# 3. 提交更改
git add .
git commit -m "Deploy: ADX fix and layout updates - 2025-12-25"
git push origin main
```

## GitHub Actions 自動部署

你的專案已配置 GitHub Actions，當推送到 main 分支時會自動部署：

### 觸發自動部署
```bash
# 提交所有更改
git add .
git commit -m "Deploy: ADX fix and layout updates - 2025-12-25"
git push origin main
```

### 檢查部署狀態
1. 訪問：https://github.com/romarin-hsieh/investment-dashboard/actions
2. 查看最新的 "Deploy to GitHub Pages" workflow
3. 等待部署完成（通常 2-5 分鐘）

## 部署後驗證

### 1. 訪問網站
🌐 **網站地址**: https://romarin-hsieh.github.io/investment-dashboard/

### 2. 驗證修正內容
- ✅ **ADX (14)** 應顯示數值而非 "N/A"
- ✅ **Market Overview** 布局順序：
  1. Market Index
  2. Top Stories (新位置)
  3. Fear & Greed Index Gauge  
  4. VIX Index (新位置)
- ✅ **技術指標** 載入速度應有改善
- ✅ **錯誤處理** 應有重試按鈕

### 3. 測試功能
```javascript
// 在瀏覽器 Console 中測試
console.log('Testing ADX calculation...');
// 檢查 ADX 是否顯示正確數值
```

## 部署配置檔案

### GitHub Actions (.github/workflows/deploy.yml)
- ✅ 已配置自動部署
- ✅ 支援 Node.js 18
- ✅ 生產環境建構
- ✅ 自動上傳到 GitHub Pages

### Vite 配置 (vite.config.js)
- ✅ 正確的 base 路徑: `/investment-dashboard/`
- ✅ 生產環境優化
- ✅ 代碼分割配置

## 故障排除

### 如果部署失敗
1. **檢查 GitHub Actions 日誌**
   - 訪問 Actions 頁面查看錯誤信息

2. **本地建構測試**
   ```bash
   npm run build
   npm run preview
   ```

3. **清除快取重試**
   ```bash
   npm ci --force
   npm run build
   ```

### 如果網站無法訪問
1. **檢查 GitHub Pages 設定**
   - Repository Settings → Pages
   - Source: GitHub Actions

2. **等待 DNS 傳播**
   - 新部署可能需要幾分鐘生效

3. **清除瀏覽器快取**
   - 強制重新整理 (Ctrl+F5)

## 部署歷史

### 2025-12-25 - ADX 修正和布局更新
- 🔧 修正 ADX (14) 計算問題
- 🎨 調整 Market Overview 布局
- ⚡ 優化技術指標載入性能
- 🛠️ 改善錯誤處理和用戶體驗

---

**部署完成後，請訪問網站驗證所有功能正常運作！**