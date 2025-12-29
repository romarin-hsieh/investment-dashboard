# UUUU 和 UMAC 交易所顯示錯誤分析報告

## 🔍 問題描述

UUUU 和 UMAC 兩個股票在前端顯示的交易所為 "ASE"，但這是不正確的。

## 📊 資料來源分析

### 1. 配置文件 (config/stocks.json)
```json
{
  "symbol": "UUUU",
  "exchange": "AMEX",  // ✅ 正確配置
  "sector": "Basic Materials",
  "industry": "Other Industrial Metals & Mining"
}

{
  "symbol": "UMAC", 
  "exchange": "AMEX",  // ✅ 正確配置
  "sector": "Financial Services",
  "industry": "Shell Companies"
}
```

### 2. Metadata 文件 (public/data/symbols_metadata.json)
```json
{
  "symbol": "UUUU",
  "exchange": "ASE",  // ❌ 錯誤資料
  "sector": "Energy",
  "industry": "Uranium"
}

{
  "symbol": "UMAC",
  "exchange": "ASE",  // ❌ 錯誤資料  
  "sector": "Technology",
  "industry": "Computer Hardware"
}
```

## 🔧 問題根本原因

### 1. 資料來源衝突
- **配置文件** 正確設定為 `AMEX`
- **Metadata 文件** 錯誤設定為 `ASE`
- 前端優先使用 metadata 中的 exchange 資訊

### 2. 前端邏輯問題
在 `src/components/StockCard.vue` 的 `getExchange()` 方法中：

```javascript
getExchange() {
  if (this.metadata && this.metadata.exchange) {
    // 將 metadata 中的 exchange 代碼轉換為顯示名稱
    const exchangeMap = {
      'NYQ': 'NYSE',    // New York Stock Exchange
      'NMS': 'NASDAQ',  // NASDAQ Global Select Market
      'NCM': 'NASDAQ',  // NASDAQ Capital Market
      'NGM': 'NASDAQ'   // NASDAQ Global Market
      // ❌ 缺少 ASE -> AMEX 的映射
    }
    return exchangeMap[this.metadata.exchange] || this.metadata.exchange
    // ❌ 當找不到映射時，直接返回原始值 "ASE"
  }
  // ... 備用邏輯
}
```

### 3. 缺少交易所代碼映射
- `ASE` 應該映射到 `AMEX` (American Stock Exchange)
- 但 `exchangeMap` 中沒有包含這個映射

## ✅ 正確答案

### UUUU (Energy Fuels Inc.)
- **正確交易所**: NYSE American (原 AMEX)
- **股票代碼**: UUUU
- **公司**: Energy Fuels Inc.
- **行業**: 鈾礦開採

### UMAC (Unusual Machines Inc.)
- **正確交易所**: NYSE American (原 AMEX)  
- **股票代碼**: UMAC
- **公司**: Unusual Machines Inc.
- **行業**: 無人機/機器人技術

## 🛠️ 解決方案

### 方案 1: 修正前端映射邏輯 (推薦)
在 `StockCard.vue` 中添加 ASE 映射：

```javascript
const exchangeMap = {
  'NYQ': 'NYSE',
  'NMS': 'NASDAQ',
  'NCM': 'NASDAQ', 
  'NGM': 'NASDAQ',
  'ASE': 'AMEX'    // ✅ 添加 ASE -> AMEX 映射
}
```

### 方案 2: 修正 Metadata 資料來源
更新 `public/data/symbols_metadata.json` 中的 exchange 欄位：
- UUUU: `"exchange": "ASE"` → `"exchange": "AMEX"`
- UMAC: `"exchange": "ASE"` → `"exchange": "AMEX"`

### 方案 3: 修正資料生成邏輯
檢查並修正生成 metadata 的腳本，確保正確的交易所代碼映射。

## 📝 交易所代碼對照表

| 代碼 | 全名 | 顯示名稱 |
|------|------|----------|
| NYQ  | New York Stock Exchange | NYSE |
| NMS  | NASDAQ Global Select Market | NASDAQ |
| NCM  | NASDAQ Capital Market | NASDAQ |
| NGM  | NASDAQ Global Market | NASDAQ |
| ASE  | NYSE American (原 AMEX) | AMEX |

## 🎯 建議修正順序

1. **立即修正**: 更新前端 `exchangeMap` 添加 ASE 映射
2. **中期修正**: 檢查並修正 metadata 生成邏輯
3. **長期維護**: 建立交易所代碼標準化流程

## 📍 相關文件

- `src/components/StockCard.vue` - 前端顯示邏輯
- `public/data/symbols_metadata.json` - Metadata 資料
- `config/stocks.json` - 股票配置
- `scripts/update-yfinance-metadata.js` - Metadata 更新腳本

---

**結論**: ASE 是 NYSE American (原 American Stock Exchange) 的代碼，UUUU 和 UMAC 都正確地在 NYSE American 交易，但前端缺少 ASE → AMEX 的映射導致顯示錯誤。