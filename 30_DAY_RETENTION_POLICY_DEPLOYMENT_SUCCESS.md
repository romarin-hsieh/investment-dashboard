# 🧹 30天數據保留政策部署成功

## 📅 部署時間
- **部署日期**: 2025-12-30
- **部署狀態**: ✅ 成功
- **GitHub Commit**: 47912fa

## 🎯 實施內容

### 1. 清理腳本 (`scripts/cleanup-old-technical-indicators.js`)
- ✅ 創建完整的清理腳本
- ✅ 支援 `--dry-run` 模式測試
- ✅ 支援 `--retention-days` 自定義保留天數
- ✅ 支援 `--as-of` 指定基準日期
- ✅ 支援 `--verbose` 詳細日誌

### 2. GitHub Actions 整合
- ✅ 更新 `.github/workflows/daily-data-update.yml`
- ✅ 在生成技術指標後自動執行清理
- ✅ 每日 UTC 02:00 自動運行
- ✅ 保留天數設定為 30 天

### 3. 安全機制
- ✅ 防止刪除超過 500 個文件的保護機制
- ✅ 防止 asOfDate 與最新文件日期差距過大
- ✅ 只刪除 `YYYY-MM-DD_SYMBOL.json` 格式文件
- ✅ 永遠保留 `latest_index.json`

### 4. 時區一致性
- ✅ 更新 `scripts/generate-daily-snapshot.js`
- ✅ 使用台北時區進行日期計算
- ✅ 從 `latest_index.json` 讀取基準日期

### 5. 測試套件
- ✅ 創建 `test-cleanup-old-technical-indicators.html`
- ✅ 提供互動式測試界面
- ✅ 包含模擬清理功能

## 🔧 使用方法

### 本地測試
```bash
# Dry run 測試 (不會實際刪除)
node scripts/cleanup-old-technical-indicators.js --dry-run --verbose

# 指定日期測試
node scripts/cleanup-old-technical-indicators.js --dry-run --as-of=2025-12-30 --retention-days=30

# 實際執行
node scripts/cleanup-old-technical-indicators.js --retention-days=30 --verbose
```

### GitHub Actions 自動執行
- 每日 UTC 02:00 (台北時間 10:00) 自動執行
- 在生成新的技術指標後立即清理舊文件
- 詳細日誌記錄在 Actions 頁面

## 📊 預期效果

### 清理範圍
- ✅ 清理: `public/data/technical-indicators/YYYY-MM-DD_SYMBOL.json`
- ❌ 保留: `public/data/technical-indicators/latest_index.json`
- ❌ 不動: `public/data/ohlcv/*` 文件
- ❌ 不動: 其他非日檔格式的 JSON

### Repository 大小控制
- **之前**: 每日新增 ~135 個技術指標文件，無限增長
- **之後**: 只保留最近 30 天，穩定在 ~4,050 個文件 (135 × 30)
- **節省**: 防止 repository 大小線性增長

## 🧪 測試驗證

### 1. 本地測試
```bash
# 開啟測試頁面
start test-cleanup-old-technical-indicators.html

# 或直接執行 dry-run
node scripts/cleanup-old-technical-indicators.js --dry-run --verbose
```

### 2. 生產環境驗證
- 監控 GitHub Actions 執行日誌
- 檢查 `public/data/technical-indicators/` 目錄文件數量
- 確認 repository 大小不再無限增長

## 📈 監控指標

### 成功指標
- ✅ 技術指標文件數量穩定在 ~4,050 個
- ✅ 每日清理日誌顯示正確的刪除數量
- ✅ `latest_index.json` 始終存在
- ✅ Repository 大小增長趨緩

### 警告指標
- ⚠️ 如果清理失敗，文件數量會持續增長
- ⚠️ 如果 `latest_index.json` 缺失，會使用台北時間作為 fallback
- ⚠️ 如果要刪除的文件 > 500 個，腳本會拒絕執行

## 🔗 相關文件
- `scripts/cleanup-old-technical-indicators.js` - 主要清理腳本
- `.github/workflows/daily-data-update.yml` - GitHub Actions 工作流程
- `test-cleanup-old-technical-indicators.html` - 測試套件
- `scripts/generate-daily-snapshot.js` - 日快照生成 (時區修正)

## 🎉 部署完成

30天數據保留政策已成功部署到生產環境！

- **GitHub Repository**: https://github.com/romarin-hsieh/investment-dashboard
- **GitHub Pages**: https://romarin-hsieh.github.io/investment-dashboard/
- **下次自動清理**: 明日 UTC 02:00 (台北時間 10:00)

Repository 大小將不再無限增長，只保留最近 30 天的技術指標數據。