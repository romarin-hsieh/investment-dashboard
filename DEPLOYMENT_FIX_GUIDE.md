# 🚨 部署失敗修復指南

## 📊 錯誤分析

從 GitHub Actions 日誌可以看到：
- **錯誤**: "Missing environment" 和 "github-pages"
- **原因**: GitHub Pages 環境配置問題
- **狀態**: build-and-deploy 任務失敗

## 🔧 解決方案

### 方法 1: 手動 gh-pages 部署 (立即執行)

在你的命令提示符中執行：

```cmd
REM 1. 確保在正確目錄
cd C:\Users\Romarin\Documents\Kiro\investment-dashboard

REM 2. 清理並重新構建
rmdir /s /q dist\assets
del dist\index.html
set NODE_ENV=production
npm run build

REM 3. 手動部署到 gh-pages
npx gh-pages -d dist --dotfiles

REM 如果上面失敗，嘗試：
npx gh-pages -d dist --add --dotfiles
```

### 方法 2: 修復 GitHub Pages 設置

1. **訪問 GitHub Pages 設置**:
   https://github.com/romarin-hsieh/investment-dashboard/settings/pages

2. **更改設置**:
   - Source: **Deploy from a branch**
   - Branch: **gh-pages**
   - Folder: **/ (root)**

3. **保存設置**

### 方法 3: 修復 GitHub Actions 環境

1. **訪問 Actions 設置**:
   https://github.com/romarin-hsieh/investment-dashboard/settings/environments

2. **創建 github-pages 環境**:
   - 點擊 "New environment"
   - 名稱: `github-pages`
   - 添加部署保護規則 (可選)

3. **設置權限**:
   - 訪問: https://github.com/romarin-hsieh/investment-dashboard/settings/actions
   - 確認 "Workflow permissions" 設置為 "Read and write permissions"

## 🚀 推薦執行順序

### 立即執行 (方法 1)
```cmd
npx gh-pages -d dist --dotfiles
```

這會直接將 `dist` 目錄部署到 `gh-pages` 分支，繞過 GitHub Actions。

### 驗證部署
部署完成後，等待 2-3 分鐘，然後訪問：
- https://romarin-hsieh.github.io/investment-dashboard/

### 如果方法 1 成功
1. 網站應該正常載入
2. 檢查 "Auto Update" 鏈接是否顯示
3. 測試監控面板功能

### 如果方法 1 失敗
執行方法 2 和 3，修復 GitHub 設置後重新推送：

```cmd
git add .
git commit -m "Fix: Update GitHub Pages configuration"
git push origin main
```

## 🔍 常見問題

### 問題 1: gh-pages 命令失敗
```cmd
REM 清除 gh-pages 緩存
npx gh-pages-clean

REM 重新嘗試
npx gh-pages -d dist --dotfiles
```

### 問題 2: 權限錯誤
```cmd
REM 檢查 Git 配置
git config --list | findstr user

REM 如果需要，重新配置
git config user.name "romarin-hsieh"
git config user.email "romarinhsieh@gmail.com"
```

### 問題 3: 分支不存在
```cmd
REM 檢查遠程分支
git ls-remote origin

REM 如果沒有 gh-pages 分支，會自動創建
```

## 📊 預期結果

### 成功的 gh-pages 部署應該顯示：
```
Published
```

### 成功後的驗證：
1. ✅ 網站正常載入
2. ✅ "Auto Update" 鏈接顯示
3. ✅ 監控面板功能正常
4. ✅ 自動更新系統啟動

## 🚨 緊急備用方案

如果所有方法都失敗，我們可以：

1. **使用其他部署平台**:
   - Vercel: `npm run deploy:vercel`
   - Netlify: `npm run deploy:netlify`

2. **手動上傳文件**:
   - 將 `dist` 目錄內容手動上傳到 GitHub Pages

3. **重新配置倉庫**:
   - 檢查倉庫權限和設置

---

## 🎯 立即行動

**請先執行方法 1 的手動部署命令：**

```cmd
npx gh-pages -d dist --dotfiles
```

然後告訴我結果，我們可以根據輸出進一步調整！🚀