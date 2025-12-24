# 🚀 快速部署指南

## 立即解決 404 問題

### 步驟 1: 檢查 GitHub Pages 設置
1. 前往: https://github.com/romarin-hsieh/investment-dashboard/settings/pages
2. 確認設置：
   - **Source**: `Deploy from a branch` 或 `GitHub Actions`
   - 如果選擇 branch: **Branch** 設為 `gh-pages` 或 `main`

### 步驟 2: 手動觸發部署
1. 前往: https://github.com/romarin-hsieh/investment-dashboard/actions
2. 點擊 "Deploy to GitHub Pages"
3. 點擊 "Run workflow" → 選擇 `main` → "Run workflow"

### 步驟 3: 等待部署完成 (2-5 分鐘)
- 綠色勾號 = 成功
- 紅色 X = 失敗 (點擊查看錯誤)

## 🔧 如果 GitHub Actions 失敗

### 選項 A: 使用 gh-pages 包
```bash
# 安裝 gh-pages
npm install --save-dev gh-pages

# 構建並部署
npm run build
npx gh-pages -d dist
```

### 選項 B: 手動部署
```bash
# 1. 構建項目
npm run build

# 2. 進入 dist 文件夾
cd dist

# 3. 初始化 git
git init
git add .
git commit -m "Deploy"

# 4. 推送到 gh-pages 分支
git remote add origin https://github.com/romarin-hsieh/investment-dashboard.git
git push -f origin main:gh-pages
```

## 🌐 替代部署平台 (如果 GitHub Pages 持續問題)

### Vercel (推薦)
1. 前往: https://vercel.com
2. 連接 GitHub repository
3. 自動部署 ✅

### Netlify
1. 前往: https://netlify.com
2. 拖拽 `dist` 文件夾
3. 立即上線 ✅

## 📋 檢查清單

- [ ] Repository 是 public
- [ ] 代碼已推送到 main 分支
- [ ] GitHub Pages 已啟用
- [ ] Actions 有 Pages 權限
- [ ] 構建成功 (檢查 Actions 日誌)

## 🎯 預期結果

部署成功後，以下 URL 應該可以訪問：
- **主頁**: https://romarin-hsieh.github.io/investment-dashboard/
- **Market Dashboard**: https://romarin-hsieh.github.io/investment-dashboard/market-dashboard
- **Stock Dashboard**: https://romarin-hsieh.github.io/investment-dashboard/stock-dashboard

## 🆘 緊急聯絡

如果所有方法都失敗，請檢查：
1. GitHub 狀態頁面: https://www.githubstatus.com/
2. Repository 權限設置
3. 網絡連接問題