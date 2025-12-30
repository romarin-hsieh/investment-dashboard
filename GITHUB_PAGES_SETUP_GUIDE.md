# GitHub Pages 設定指南

## 🚨 重要：需要手動啟用 GitHub Pages

根據檢查結果，你的 repository 已經成功推送到 GitHub，但 **GitHub Pages 需要手動啟用**。

## 📋 設定步驟

### 1. 前往 Repository 設定
1. 打開瀏覽器，前往：`https://github.com/romarin-hsieh/investment-dashboard`
2. 點擊 **Settings** 標籤頁
3. 在左側選單中找到 **Pages**

### 2. 啟用 GitHub Pages
1. 在 **Source** 部分，選擇 **Deploy from a branch**
2. 在 **Branch** 下拉選單中選擇 **main**
3. 在 **Folder** 選擇 **/ (root)**
4. 點擊 **Save** 按鈕

### 3. 等待部署完成
- GitHub 會開始建置你的網站
- 通常需要 1-5 分鐘完成
- 完成後會顯示綠色的 ✅ 標記

### 4. 驗證部署
部署完成後，你的網站將可在以下 URL 存取：
- **主頁**: https://romarin-hsieh.github.io/investment-dashboard/
- **測試頁面**: https://romarin-hsieh.github.io/investment-dashboard/test-data-update-robustness.html
- **驗證頁面**: https://romarin-hsieh.github.io/investment-dashboard/verify-data-update-robustness-deployment.html

## 🔧 替代方案：使用 GitHub Actions 自動部署

如果你想要更自動化的部署流程，可以設定 GitHub Actions：

### 1. 創建 GitHub Actions 工作流程
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 2. 在 GitHub Pages 設定中選擇 GitHub Actions
1. 前往 **Settings** > **Pages**
2. 在 **Source** 選擇 **GitHub Actions**
3. 保存設定

## ✅ 確認部署狀態

### 檢查清單
- [ ] Repository 已推送到 GitHub ✅ (已完成)
- [ ] GitHub Pages 已啟用 ❓ (需要手動設定)
- [ ] 網站可以正常存取 ❓ (等待 Pages 啟用)
- [ ] 所有功能正常運作 ❓ (等待測試)

## 🎯 下一步

1. **立即行動**: 前往 GitHub repository 設定頁面啟用 Pages
2. **等待部署**: 通常需要 1-5 分鐘
3. **測試功能**: 使用提供的測試頁面驗證所有功能
4. **監控狀態**: 檢查 GitHub Actions 是否正常運行

---

**重要提醒**: GitHub Pages 不會自動啟用，需要你手動在 repository 設定中啟用。一旦啟用，後續的推送會自動觸發重新部署。