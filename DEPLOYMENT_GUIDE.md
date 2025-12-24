# 🚀 GitHub Pages 部署指南

## 📋 部署前檢查清單

### ✅ 已完成的準備工作
- [x] 自動更新系統已實施
- [x] 所有新功能已測試
- [x] 代碼已格式化和修復
- [x] 部署腳本已準備

### 🔧 部署配置
- **倉庫**: `https://github.com/romarin-hsieh/investment-dashboard.git`
- **分支**: `main`
- **部署目標**: GitHub Pages
- **網站 URL**: `https://romarin-hsieh.github.io/investment-dashboard/`

## 🚀 部署步驟

### 方法 1: 使用 npm 腳本 (推薦)

```bash
# 1. 構建項目
npm run build

# 2. 部署到 GitHub Pages
npm run deploy:github
```

### 方法 2: 手動部署

```bash
# 1. 安裝依賴
npm ci

# 2. 構建項目
NODE_ENV=production npm run build

# 3. 提交更改
git add .
git commit -m "Deploy: Update Investment Dashboard with Auto Update System"

# 4. 推送到 GitHub
git push origin main

# 5. 使用 gh-pages 部署
npx gh-pages -d dist
```

### 方法 3: 使用部署腳本

#### Windows (PowerShell)
```powershell
# 設置執行策略並運行腳本
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\deploy.ps1
```

#### Windows (批處理)
```cmd
deploy.bat
```

#### Linux/macOS (Bash)
```bash
chmod +x deploy.sh
./deploy.sh
```

## 📁 部署文件結構

部署後的文件結構應該包含：

```
dist/
├── index.html                 # 主頁面
├── assets/                    # 靜態資源
│   ├── index-[hash].js       # 主 JavaScript 文件
│   ├── index-[hash].css      # 主 CSS 文件
│   └── ...                   # 其他資源文件
├── config/                    # 配置文件
│   └── markets_indicators.json
├── data/                      # 數據文件
│   ├── quotes/
│   ├── symbols_metadata.json
│   └── technical-indicators/  # 技術指標數據
└── 404.html                   # 404 錯誤頁面
```

## 🔍 部署驗證

### 1. 構建驗證
```bash
# 檢查 dist 目錄是否存在
ls -la dist/

# 檢查主要文件
ls -la dist/index.html
ls -la dist/assets/
```

### 2. 本地預覽
```bash
# 本地預覽構建結果
npm run preview
```

### 3. 線上驗證
部署完成後，訪問以下 URL 進行驗證：

- **主頁**: https://romarin-hsieh.github.io/investment-dashboard/
- **市場總覽**: https://romarin-hsieh.github.io/investment-dashboard/#/market-overview
- **股票總覽**: https://romarin-hsieh.github.io/investment-dashboard/#/stock-overview
- **自動更新監控**: https://romarin-hsieh.github.io/investment-dashboard/#/auto-update-monitor

### 4. 功能測試
- [ ] 頁面正常載入
- [ ] 導航功能正常
- [ ] TradingView 小工具正常顯示
- [ ] 自動更新系統正常運行
- [ ] 骨架屏載入效果正常
- [ ] 響應式設計在移動設備上正常

## 🚨 故障排除

### 問題 1: 構建失敗
**症狀**: `npm run build` 失敗

**解決方案**:
```bash
# 清除 node_modules 並重新安裝
rm -rf node_modules package-lock.json
npm install

# 檢查 Node.js 版本 (需要 >= 18.0.0)
node --version

# 檢查語法錯誤
npm run lint
```

### 問題 2: 部署失敗
**症狀**: `gh-pages` 部署失敗

**解決方案**:
```bash
# 檢查 git 狀態
git status

# 確保所有更改已提交
git add .
git commit -m "Fix deployment issues"

# 清除 gh-pages 緩存
npx gh-pages-clean

# 重新部署
npx gh-pages -d dist
```

### 問題 3: 頁面無法訪問
**症狀**: 404 錯誤或頁面空白

**解決方案**:
1. 檢查 GitHub Pages 設置
2. 確認 `vite.config.js` 中的 `base` 路徑正確
3. 檢查 `dist/index.html` 是否存在
4. 等待 GitHub Pages 緩存更新 (可能需要 5-10 分鐘)

### 問題 4: 自動更新系統無法運行
**症狀**: 監控面板顯示錯誤

**解決方案**:
1. 檢查瀏覽器控制台錯誤
2. 確認所有依賴文件已正確部署
3. 檢查 CORS 代理設置
4. 驗證 Yahoo Finance API 連接

## 📊 部署狀態監控

### GitHub Actions
- **狀態頁面**: https://github.com/romarin-hsieh/investment-dashboard/actions
- **Pages 部署**: https://github.com/romarin-hsieh/investment-dashboard/deployments

### 部署日誌
```bash
# 查看最近的提交
git log --oneline -10

# 查看部署分支狀態
git ls-remote origin gh-pages
```

## 🎯 部署後任務

### 立即任務
1. [ ] 驗證所有頁面正常載入
2. [ ] 測試自動更新系統
3. [ ] 檢查移動設備兼容性
4. [ ] 驗證 TradingView 小工具

### 後續優化
1. [ ] 設置 CDN 加速
2. [ ] 配置自定義域名 (如需要)
3. [ ] 實施性能監控
4. [ ] 設置錯誤追蹤

## 📈 性能優化

### 已實施的優化
- ✅ 代碼分割和懶載入
- ✅ 靜態資源壓縮
- ✅ 骨架屏載入優化
- ✅ 緩存策略優化
- ✅ 自動更新系統

### 建議的進一步優化
- 🔄 Service Worker 離線支援
- 🔄 圖片懶載入和優化
- 🔄 預載入關鍵資源
- 🔄 實施 PWA 功能

---

## 🎉 部署完成確認

當所有步驟完成後，你應該能夠：

1. ✅ 訪問 https://romarin-hsieh.github.io/investment-dashboard/
2. ✅ 看到完整的投資儀表板界面
3. ✅ 使用自動更新監控功能
4. ✅ 在移動設備上正常瀏覽
5. ✅ 所有 TradingView 小工具正常顯示

**恭喜！你的投資儀表板已成功部署到 GitHub Pages！** 🎊