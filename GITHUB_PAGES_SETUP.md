# 🚀 GitHub Pages 部署指南

## 快速部署步驟

### 1. 創建 GitHub Repository

1. 登錄 [GitHub](https://github.com)
2. 點擊右上角 "+" → "New repository"
3. Repository 名稱: `investment-dashboard`
4. 設為 Public (GitHub Pages 免費版需要)
5. 點擊 "Create repository"

### 2. 上傳代碼

**方法 A: 使用 Git 命令行**
```bash
# 在項目根目錄執行
git init
git add .
git commit -m "Initial commit: Investment Dashboard"
git branch -M main
git remote add origin https://github.com/yourusername/investment-dashboard.git
git push -u origin main
```

**方法 B: 使用 GitHub Desktop**
1. 下載 [GitHub Desktop](https://desktop.github.com/)
2. 選擇 "Add an Existing Repository from your Hard Drive"
3. 選擇項目文件夾
4. 點擊 "Publish repository"

**方法 C: 直接上傳文件**
1. 在 GitHub repository 頁面點擊 "uploading an existing file"
2. 拖拽整個項目文件夾 (除了 node_modules)
3. 填寫 commit 信息並提交

### 3. 啟用 GitHub Pages

1. 在 repository 頁面點擊 "Settings" 標籤
2. 滾動到 "Pages" 部分
3. 在 "Source" 下選擇 "GitHub Actions"
4. 完成！

### 4. 自動部署

- 代碼推送到 `main` 分支時會自動觸發部署
- 部署過程約 2-5 分鐘
- 完成後可在 `https://yourusername.github.io/investment-dashboard/` 訪問

## 🔧 故障排除

### 部署失敗？
1. 檢查 Actions 標籤頁的構建日誌
2. 確保 `package.json` 中的依賴版本正確
3. 檢查是否有語法錯誤

### 頁面空白？
1. 檢查瀏覽器控制台是否有錯誤
2. 確認 `vite.config.js` 中的 `base` 路徑設置正確
3. 檢查路由配置

### 更新網站
只需推送新代碼到 main 分支，GitHub Actions 會自動重新部署。

## 📊 部署狀態

部署完成後，你可以在以下位置查看狀態：
- **Actions 標籤**: 查看構建和部署日誌
- **Environments**: 查看部署歷史
- **Settings > Pages**: 查看當前部署狀態

## 🌐 自定義域名 (可選)

如果你有自己的域名：
1. 在 DNS 設置中添加 CNAME 記錄指向 `yourusername.github.io`
2. 在 repository Settings > Pages 中添加自定義域名
3. 啟用 "Enforce HTTPS"

## 🎉 完成！

你的投資儀表板現在已經在線上運行了！

**訪問地址**: `https://yourusername.github.io/investment-dashboard/`

記得將 `yourusername` 替換為你的實際 GitHub 用戶名。