# 新增股票代號標準作業流程 (SOP)

本文件說明如何在 Investment Dashboard 中新增股票代號，並確保所有相關數據 (Metadata, OHLCV, 技術指標, Quant 狀態) 皆正確生成。

## 1. 更新設定檔

### 1.1 `public/config/stocks.json`
在大約第 47 行 (或適當位置) 的 `stocks` 陣列中新增股票設定物件：

```json
{
  "symbol": "FTNT",
  "exchange": "NASDAQ",  // 或 "NYSE", "AMEX"
  "sector": "Technology", // 暫時填寫，後續腳本會更新
  "industry": "Software - Infrastructure", // 暫時填寫
  "enabled": true,
  "priority": 2,
  "visible": true
}
```

### 1.2 `public/config/universe.json` (如適用)
確保該檔案包含新股票代號 (通常與 stocks.json 同步，但建議檢查)。

## 2. 執行數據初始化腳本

請依序執行以下指令 (需在專案根目錄)：

### 2.1 更新 Metadata (Sector/Industry)
此步驟會從本地 fundamentals 資料重建 `public/data/symbols_metadata.json`。

```powershell
node scripts/rebuild-metadata.js
```
> **注意**: 此腳本使用本地 `public/data/fundamentals/` 資料，無需 API 呼叫。

### 2.2 生成 OHLCV 歷史數據
此步驟會下載並生成該股票的歷史價格數據 (`public/data/ohlcv/SYMBOL.json`)。

```powershell
python scripts/generate-real-ohlcv-yfinance.py
# 會自動讀取 public/config/stocks.json 中所有 enabled 的股票
```

### 2.3 生成技術指標 (Technical Indicators)
**關鍵步驟**：此步驟會生成 Pivot Points, RSI, MACD, Bollinger Bands 等數據，修正 "Pivot Points" 和 "Risk & Volatility" 顯示 `--` 的問題。

```powershell
node scripts/generate-daily-technical-indicators.js
```

### 6. Generate Fundamentals Data
Generate static fundamental data (Market Cap, PE Ratio, etc.) to reduce runtime API calls.

```bash
# Run the fundamentals fetcher for new symbols
node scripts/fetch-fundamentals.js FTNT GLW WDC CSCO
```

### 7. Run Daily Update (Quant Kinetic State)
**關鍵步驟**：此步驟會執行 Python 策略矩陣運算，生成 "Quant Kinetic State" (Comet Chart) 所需的 `dashboard_status.json`。

```powershell
python scripts/production/daily_update.py
```

## 3. 驗證與部署

1.  **本地驗證**: 啟動本地伺服器 (`npm run dev`)，檢查該股票的 Detail 頁面：
    *   Sector/Industry 是否顯示正確？
    *   Pivot Points 是否有數值？
    *   Quant Kinetic State 是否有顯示圖表？
2.  **提交變更**:
    ```powershell
    git add public/config public/data
    git commit -m "Add new symbol: FTNT, GLW..."
    git push
    ```
3.  **線上驗證**: 等待 GitHub Actions 部署完成後，檢查線上環境。
