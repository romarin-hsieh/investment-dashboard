# 本地 OHLCV 資料刷新測試指南

## 🎯 測試目標

驗證真實 OHLCV 資料刷新功能，確保：
- Python 腳本能成功獲取真實市場資料
- 生成的資料格式正確且與前端相容
- MFI/VP 計算能與 TradingView 對齊
- 完整的資料更新流程運作正常

## 📋 前置準備

### 1. 確認 Python 環境
```bash
python --version  # 應該是 Python 3.8+
```

### 2. 安裝 Python 依賴
```bash
pip install yfinance pandas numpy
```

### 3. 確認 Node.js 環境
```bash
node --version     # 應該是 Node.js 18+
npm --version
```

## 🧪 測試步驟

### 階段 1: 單獨測試 Python OHLCV 腳本

#### 1.1 小規模測試（3個符號）
```bash
python scripts/generate-real-ohlcv-yfinance.py --days 90 --interval 1d --symbols "NVDA,ONDS,TSM" --min-rows 24
```

**預期結果：**
- ✅ 成功獲取 3 個符號的資料
- ✅ 生成 6 個 JSON 檔案（每個符號 2 個格式）
- ✅ 生成 `public/data/ohlcv/index.json`
- ✅ 時間戳為當前日期（不是未來時間）

#### 1.2 驗證生成的資料
```bash
# 檢查 index.json 結構
python -c "import json; idx=json.load(open('public/data/ohlcv/index.json')); print(f'Symbols: {len(idx[\"symbols\"])}, Files: {idx[\"totalFiles\"]}, Success Rate: {idx[\"report\"][\"successRate\"]}')"

# 檢查單個檔案的時間戳
python -c "import json, datetime; data=json.load(open('public/data/ohlcv/onds_1d_90d.json')); print(f'Latest timestamp: {datetime.datetime.fromtimestamp(data[\"timestamps\"][-1]/1000)}')"
```

### 階段 2: 完整資料更新流程測試

#### 2.1 執行完整流程
```bash
deploy-real-ohlcv-data.bat
```

**流程包含：**
1. 生成真實 OHLCV 資料
2. 驗證 index.json 結構
3. 生成技術指標
4. 生成每日快照
5. 更新 status.json

#### 2.2 驗證各階段結果
```bash
# 檢查 OHLCV 檔案數量
dir public\data\ohlcv\*.json | find /c ".json"

# 檢查技術指標檔案
dir public\data\technical-indicators\*.json | find /c ".json"

# 檢查 status.json 更新時間
python -c "import json; status=json.load(open('public/data/status.json')); print(f'Status updated: {status[\"generated\"]}')"
```

### 階段 3: 前端相容性測試

#### 3.1 啟動本地開發伺服器
```bash
npm run dev
```

#### 3.2 測試 MFI Volume Profile
1. 開啟瀏覽器到 `http://localhost:5173`
2. 導航到任一股票詳情頁（例如 ONDS）
3. 檢查 MFI Volume Profile 是否正常載入
4. 驗證價格範圍是否合理（不是模擬資料的隨機值）

#### 3.3 檢查瀏覽器控制台
- 確認沒有 OHLCV 資料載入錯誤
- 確認 precomputedOhlcvApi 能正常讀取資料
- 確認 MFI 計算沒有 NaN 或錯誤值

## 📊 驗收標準

### ✅ 資料品質檢查
- [ ] 時間戳為真實日期（2025年12月左右）
- [ ] 價格範圍合理（NVDA: $160-220, ONDS: $4-12, TSM: $250-320）
- [ ] 成交量為正數且合理
- [ ] 無 NaN 或 null 值

### ✅ 檔案結構檢查
- [ ] `{SYMBOL}.json` 格式正確
- [ ] `{symbol_lower}_1d_90d.json` 格式正確
- [ ] `index.json` 包含 `symbols` 陣列
- [ ] 所有檔案的 metadata 正確

### ✅ 前端整合檢查
- [ ] MFI Volume Profile 正常顯示
- [ ] 價格區間與 TradingView 相近
- [ ] 無控制台錯誤
- [ ] 載入速度正常

### ✅ 快取機制檢查
- [ ] `status.json` 時間戳已更新
- [ ] 清除瀏覽器快取後能載入新資料
- [ ] 無痕視窗能正常載入

## 🚨 常見問題排除

### 問題 1: Python 依賴安裝失敗
```bash
# 升級 pip
python -m pip install --upgrade pip

# 重新安裝依賴
pip install --force-reinstall yfinance pandas numpy
```

### 問題 2: yfinance 獲取資料失敗
- 檢查網路連線
- 嘗試不同的符號
- 檢查 Yahoo Finance 是否正常運作

### 問題 3: 前端載入舊資料
```bash
# 清除瀏覽器快取
# 或使用無痕視窗測試
```

### 問題 4: 技術指標生成失敗
```bash
# 檢查 OHLCV 資料是否正確生成
# 確認 Node.js 腳本能讀取新的 JSON 檔案
```

## 📝 測試報告模板

測試完成後，請記錄以下資訊：

```
測試日期: ___________
測試環境: Windows/macOS/Linux
Python 版本: ___________
Node.js 版本: ___________

階段 1 結果:
- 符號測試: ___/3 成功
- 檔案生成: ___/6 檔案
- 資料品質: 通過/失敗

階段 2 結果:
- OHLCV 生成: 通過/失敗
- 技術指標: 通過/失敗
- 每日快照: 通過/失敗
- Status 更新: 通過/失敗

階段 3 結果:
- 前端載入: 通過/失敗
- MFI/VP 顯示: 通過/失敗
- 價格對齊: 通過/失敗
- 效能表現: 通過/失敗

整體評估: 通過/需要修正
```

## 🚀 測試通過後的下一步

1. **提交變更**
   ```bash
   git add -A
   git commit -m "🚀 Implement real OHLCV data refresh with yfinance"
   git push
   ```

2. **觸發 GitHub Actions**
   - 手動觸發 daily-data-update workflow
   - 驗證 Actions 環境中的執行結果

3. **生產環境驗證**
   - 檢查 GitHub Pages 上的資料更新
   - 驗證 MFI/VP 與 TradingView 的對齊情況