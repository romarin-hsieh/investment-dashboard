# Stock Overview Sector 資料來源分析

## 📊 資料來源概述

Stock Overview 頁面中的 **sector** 資料來源是一個多層級的資料獲取和 fallback 機制：

### 🎯 主要資料來源
**`/data/symbols_metadata.json`** - 這是 sector 資料的主要來源

---

## 🔄 資料生成流程

### 1. 自動更新機制
```yaml
# .github/workflows/update-metadata.yml
觸發條件:
- 每週日凌晨 2 點 (UTC)
- 每次推送到 main 分支
- 手動觸發
```

### 2. 資料獲取腳本
**主要腳本**: `scripts/update-metadata-python.py`

```python
# 資料獲取順序
1. 從 Yahoo Finance API (yfinance 套件) 獲取即時資料
2. 如果 API 失敗，使用內建的 fallback 資料
3. 生成 symbols_metadata.json 文件
```

---

## 📁 資料來源詳細分析

### 🥇 第一優先級：Yahoo Finance API
```python
# 使用 yfinance Python 套件
ticker = yf.Ticker(symbol)
info = ticker.info

sector = info.get('sector', 'Unknown')
industry = info.get('industry', 'Unknown Industry')
```

**資料特點：**
- ✅ 即時更新
- ✅ 官方資料來源
- ✅ 包含完整的公司資訊
- ✅ 高信心度 (confidence: 1.0)
- ❌ 可能因網路問題失敗

### 🥈 第二優先級：Fallback 資料
```python
# 內建在 update-metadata-python.py 中的靜態資料
fallback_data = {
    'ASTS': {'sector': 'Technology', 'industry': 'Communication Equipment'},
    'RIVN': {'sector': 'Consumer Cyclical', 'industry': 'Auto Manufacturers'},
    'RR': {'sector': 'Technology', 'industry': 'Information Technology Services'},
    # ... 67 個股票的完整資料
}
```

**資料特點：**
- ✅ 100% 可靠，不會失敗
- ✅ 手動維護，確保準確性
- ✅ 包含所有 67 個股票
- ✅ 中等信心度 (confidence: 0.8)
- ❌ 需要手動更新

---

## 📋 symbols_metadata.json 結構

```json
{
  "ttl_days": 7,
  "as_of": "2025-12-27T18:16:56.263521+00:00",
  "items": [
    {
      "symbol": "ASTS",
      "sector": "Technology",                    // ← 這是 sector 資料來源
      "industry": "Communication Equipment",     // ← 這是 industry 資料來源
      "confidence": 1.0,                        // ← 資料信心度
      "sources": ["yfinance_python"],           // ← 資料來源標記
      "exchange": "NASDAQ",
      "market_cap": 26434523136,
      "api_source": "yfinance_python"
    }
  ]
}
```

---

## 🔍 前端使用邏輯

### StockOverview.vue 中的處理
```javascript
// 1. 載入 metadata
const metadataResponse = await fetch('/data/symbols_metadata.json?t=' + Date.now())
this.metadata = await metadataResponse.json()

// 2. 在 groupedStocks computed property 中使用
this.quotes.forEach(quote => {
  const symbolMetadata = this.metadata.items.find(m => m.symbol === quote.symbol)
  
  let sector = 'Unknown'
  if (symbolMetadata && symbolMetadata.confidence >= 0.7) {
    sector = symbolMetadata.sector || 'Unknown'  // ← 這裡使用 sector 資料
  }
})
```

### 信心度過濾機制
```javascript
// 只有 confidence >= 0.7 的資料才會被使用
// Yahoo Finance API 資料: confidence = 1.0 ✅
// Fallback 資料: confidence = 0.8 ✅
// 低品質資料: confidence < 0.7 ❌ 會被標記為 'Unknown'
```

---

## 🏢 當前 Sector 分佈

根據最新的 `symbols_metadata.json` 和 `config/stocks.json`：

| Sector | 股票數量 | 主要來源 |
|--------|----------|----------|
| Technology | 24 | Yahoo Finance API |
| Financial Services | 10 | Yahoo Finance API |
| Industrials | 8 | Yahoo Finance API |
| Consumer Cyclical | 6 | Yahoo Finance API |
| Energy | 6 | Yahoo Finance API |
| Healthcare | 5 | Yahoo Finance API |
| Communication Services | 4 | Yahoo Finance API |
| Utilities | 2 | Yahoo Finance API |
| Basic Materials | 2 | Yahoo Finance API |

---

## 🔄 資料更新頻率

### 自動更新
- **每週更新**: 每週日凌晨 2 點 (UTC)
- **部署更新**: 每次推送到 main 分支時
- **TTL**: 7 天 (如 symbols_metadata.json 中的 ttl_days)

### 手動更新
```bash
# 可以手動觸發 GitHub Actions
# 或本地執行
python scripts/update-metadata-python.py
```

---

## 🎯 資料品質保證

### 1. 多重 Fallback 機制
```
Yahoo Finance API → Fallback 資料 → 'Unknown'
```

### 2. 信心度評分
- `1.0`: Yahoo Finance API (最高品質)
- `0.8`: Fallback 資料 (手動維護)
- `< 0.7`: 低品質資料 (不使用)

### 3. 資料驗證
- 每個股票都有對應的 fallback 資料
- 包含所有 67 個股票的完整資訊
- 定期自動更新確保資料新鮮度

---

## 🔧 維護和更新

### 新增股票時需要更新的文件
1. `config/stocks.json` - 新增股票配置
2. `scripts/update-metadata-python.py` - 新增 fallback 資料
3. 執行 GitHub Actions 或手動更新腳本

### 修改 Sector 分類
1. 修改 `scripts/update-metadata-python.py` 中的 fallback_data
2. 重新執行更新腳本
3. 新的分類會在下次更新時生效

---

## 📝 總結

**Stock Overview 的 sector 資料來源**：
- **主要來源**: Yahoo Finance API (透過 yfinance Python 套件)
- **備用來源**: 手動維護的 fallback 資料
- **更新頻率**: 每週自動更新 + 每次部署更新
- **資料文件**: `/data/symbols_metadata.json`
- **信心度過濾**: >= 0.7 才使用，否則顯示 'Unknown'

這個機制確保了資料的準確性和可靠性，即使在 API 失敗的情況下也能正常顯示股票分類。