# 🚨 GitHub Pages 部署故障排除指南

## 當前問題
- **錯誤**: 404 Not Found
- **URL**: https://romarin-hsieh.github.io/investment-dashboard/
- **狀態**: Site not found

## 🔧 解決步驟

### 1. 檢查 GitHub Repository 設置
1. 進入 GitHub repository: `https://github.com/romarin-hsieh/investment-dashboard`
2. 點擊 **Settings** 標籤
3. 滾動到 **Pages** 部分
4. 確認設置：
   - **Source**: Deploy from a branch 或 GitHub Actions
   - **Branch**: main (如果選擇 branch 模式)

### 2. 檢查 GitHub Actions 狀態
1. 點擊 repository 的 **Actions** 標籤
2. 查看最新的 "Deploy to GitHub Pages" workflow
3. 如果失敗，點擊查看錯誤日誌

### 3. 手動觸發部署
1. 在 **Actions** 標籤中
2. 點擊 "Deploy to GitHub Pages" workflow
3. 點擊 **Run workflow** 按鈕
4. 選擇 `main` 分支並運行

### 4. 檢查構建輸出
確認以下文件存在於 `dist` 文件夾：
- `index.html`
- `assets/` 文件夾
- 靜態資源文件

### 5. 驗證 Base URL 配置
在 `vite.config.js` 中確認：
```javascript
base: process.env.NODE_ENV === 'production' ? '/investment-dashboard/' : '/'
```

## 🛠️ 替代部署方法

### 方法 A: 使用 gh-pages 包
```bash
npm install --save-dev gh-pages
npm run build
npx gh-pages -d dist
```

### 方法 B: 手動上傳
1. 運行 `npm run build`
2. 將 `dist` 文件夾內容上傳到 `gh-pages` 分支

### 方法 C: 使用其他平台
- **Vercel**: 連接 GitHub repository，自動部署
- **Netlify**: 拖拽 `dist` 文件夾部署
- **Zeabur**: 連接 GitHub repository

## 📋 檢查清單

- [ ] GitHub repository 是 public
- [ ] GitHub Pages 已啟用
- [ ] Actions 有適當的權限
- [ ] 最新 commit 已推送到 main 分支
- [ ] GitHub Actions workflow 成功運行
- [ ] `dist` 文件夾包含正確的文件

## 🔍 常見問題

### Q: 為什麼顯示 404？
A: 可能原因：
1. GitHub Pages 未正確啟用
2. 構建失敗
3. 文件路徑不正確
4. 權限問題

### Q: Actions 失敗怎麼辦？
A: 檢查：
1. `package.json` 中的依賴
2. Node.js 版本兼容性
3. 構建命令是否正確

### Q: 如何確認部署成功？
A: 檢查：
1. Actions 標籤顯示綠色勾號
2. Pages 設置顯示部署 URL
3. 網站可以正常訪問

## 📞 需要幫助？
如果問題持續存在，請檢查：
1. GitHub Actions 日誌
2. Browser 開發者工具的 Network 標籤
3. GitHub Pages 狀態頁面