# Stock Overview 完整排序邏輯說明

## 📋 概述
Stock Overview 頁面採用 4 層級排序邏輯：
1. **SECTOR 排序** - 使用自訂優先順序排列
2. **INDUSTRY 排序** - 每個 sector 內按 industry 優先順序排列
3. **MARKET CAP 排序** - 每個 industry 內按市值從大到小排列
4. **SYMBOL 排序** - 市值相同時按股票代碼字母順序排列

---

## 🏢 SECTOR 排序邏輯

### 當前實作方式
```javascript
// 自訂 Sector 排序順序
const sectorPriority = [
  'Technology',
  'Financial Services',
  'Consumer Cyclical',
  'Communication Services',
  'Healthcare',
  'Industrials',
  'Consumer Defensive',
  'Energy',
  'Basic Materials',
  'Real Estate',
  'Utilities'
]
```

### 排序規則
- **排序方式**: 自訂優先順序 (Business Priority Order)
- **顯示條件**: 只顯示有追蹤股票的 sector
- **隱藏邏輯**: 空的 sector 不會顯示

---

## 🏭 INDUSTRY 排序邏輯

### 當前實作方式
```javascript
// 每個 sector 都有自訂的 industry 優先順序
const industryPriority = {
  'Technology': [
    'Semiconductors',
    'Software - Infrastructure',
    'Consumer Electronics',
    'Software - Application',
    'Information Technology Services',
    // ... 更多 industries
  ],
  'Financial Services': [
    'Banks - Diversified',
    'Credit Services',
    'Asset Management',
    'Capital Markets',
    // ... 更多 industries
  ]
  // ... 其他 sectors
}
```

### 排序規則
- **排序方式**: 每個 sector 內的自訂 industry 優先順序
- **覆蓋範圍**: 涵蓋所有主要 industries
- **未知處理**: 不在列表中的 industry 排在最後

---

## 💰 MARKET CAP 排序邏輯

### 當前實作方式
```javascript
// 在每個 industry 內按 market cap 從大到小排序
const sortedIndustryStocks = industryGroups[industry].sort((a, b) => {
  const marketCapA = a.metadata?.market_cap || 0
  const marketCapB = b.metadata?.market_cap || 0
  
  // 如果 market cap 相同或都為 0，則按 symbol 字母順序排序
  if (marketCapA === marketCapB) {
    return a.quote.symbol.localeCompare(b.quote.symbol)
  }
  
  // Market cap 從大到小排序
  return marketCapB - marketCapA
})
```

### 排序規則
- **排序方式**: 市值從大到小 (Descending Order)
- **資料來源**: `symbols_metadata.json` 中的 `market_cap` 欄位
- **單位**: 美元 (USD)
- **更新頻率**: 每週透過 GitHub Actions 自動更新
- **Fallback**: 市值相同或缺失時按 symbol 字母順序排序

### 市值範例
- **NVDA**: ~$3.5T (Semiconductors 第一名)
- **MSFT**: ~$3.1T (Software - Infrastructure 第一名)
- **AMZN**: ~$1.8T (Internet Retail 第一名)
- **TSLA**: ~$1.3T (Auto Manufacturers 第一名)

---

## 📊 SYMBOL 排序邏輯 (Fallback)

### 當前實作方式
```javascript
// 當 market cap 相同或缺失時的 fallback 排序
if (marketCapA === marketCapB) {
  return a.quote.symbol.localeCompare(b.quote.symbol)
}
```

### 排序規則
- **觸發條件**: 市值相同或都為 0/null
- **排序方式**: 股票代碼字母順序 (A-Z)
- **排序函數**: `localeCompare()` 方法
- **本地化**: 支援本地化字符排序

---

## 🎯 完整排序範例

### Technology Sector - Semiconductors Industry
```
1. NVDA (~$3.5T) - 市值最大
2. AVGO (~$800B) - 市值第二
3. TSM (~$500B) - 市值第三
4. LRCX (~$100B) - 市值最小
```

### Technology Sector - Software - Infrastructure Industry
```
1. MSFT (~$3.1T) - 市值最大
2. ORCL (~$500B) - 市值第二
3. ADBE (~$200B) - 市值第三
4. CRWD (~$80B) - 市值第四
5. DDOG (~$40B) - 市值第五
6. 其他按市值排序...
```

### Consumer Cyclical Sector - Internet Retail Industry
```
1. AMZN (~$1.8T) - 市值最大
2. SE (~$100B) - 市值第二
3. MELI (~$80B) - 市值最小
```

---

## 🔄 排序邏輯的特點

### 優點
1. **業務導向** - 重要 sector 和 industry 優先顯示
2. **市值導向** - 大型公司在同 industry 內優先顯示
3. **層次清晰** - 4 層級排序邏輯明確
4. **數據驅動** - 基於真實市值數據排序
5. **容錯機制** - 缺失數據時有 fallback 排序
6. **動態更新** - 市值數據每週自動更新

### 改進點
1. **投資價值導向** - 大市值公司通常更穩定
2. **用戶體驗優化** - 重要公司優先顯示
3. **數據完整性** - 涵蓋所有股票的市值數據
4. **自動化維護** - 無需手動維護排序順序

---

## 📝 資料來源

### Market Cap 資料來源
- **主要來源**: Yahoo Finance API (透過 yfinance Python 套件)
- **資料文件**: `/data/symbols_metadata.json`
- **欄位名稱**: `market_cap`
- **更新頻率**: 每週日凌晨 2 點 (UTC) + 每次部署
- **資料格式**: 數字 (美元)

### 範例資料結構
```json
{
  "symbol": "NVDA",
  "market_cap": 3500000000000,
  "sector": "Technology",
  "industry": "Semiconductors"
}
```

---

## 🎯 與舊版本的差異

### 舊版本 (字母順序)
```
Technology Sector - Semiconductors:
AVGO → LRCX → NVDA → TSM (字母順序)
```

### 新版本 (市值排序)
```
Technology Sector - Semiconductors:
NVDA (~$3.5T) → AVGO (~$800B) → TSM (~$500B) → LRCX (~$100B)
```

### 主要變化
- **排序依據**: 字母順序 → 市值大小
- **商業邏輯**: 更符合投資者關注重點
- **用戶體驗**: 重要公司優先顯示
- **數據驅動**: 基於真實市場數據

---

## 📝 總結

**當前完整排序邏輯**：
1. **Sector**: 自訂優先順序 (Technology 優先)
2. **Industry**: 每個 sector 內的自訂優先順序
3. **Market Cap**: 市值從大到小排序
4. **Symbol**: 字母順序 (fallback)

**特色**：4 層級排序、市值導向、業務邏輯清晰、數據驅動、自動更新。

**用戶體驗**：最重要的 sector、industry 和公司優先顯示，符合投資者關注重點。