# Coding Standards & Conventions

> **Version**: 1.0
> **Last Updated**: 2026-02-08

This document defines coding standards for the Investment Dashboard project, ensuring consistency across human developers and AI assistants.

---

## 1. Comment Language Convention (Bilingual)

All code comments **MUST** use bilingual format: **English first, then Traditional Chinese**.

### 1.1 Single-line Comments
```javascript
// Calculate RSI indicator with 14-period lookback
// 計算 14 週期 RSI 指標
const rsi = calculateRSI(prices, 14);
```

```python
# Fetch OHLCV data from Yahoo Finance API
# 從 Yahoo Finance API 取得 OHLCV 資料
df = yf.download(symbol, period="1y")
```

### 1.2 Block Comments (JSDoc / Docstrings)
```javascript
/**
 * Normalize exchange names for TradingView widget compatibility.
 * 標準化交易所名稱以相容 TradingView Widget。
 * 
 * @param {string} exchange - Raw exchange name from Yahoo Finance
 * @returns {string} Normalized exchange name (NASDAQ, NYSE, etc.)
 */
function normalizeExchange(exchange) {
  // ...
}
```

```python
def calculate_kinetic_state(ohlcv_df):
    """
    Calculate the 3D Kinetic State vector for a stock.
    計算股票的 3D 動能狀態向量。
    
    Args:
        ohlcv_df: DataFrame with OHLCV columns
        
    Returns:
        dict: {x: trend, y: momentum, z: structure}
    """
    pass
```

### 1.3 File Header Comments
```javascript
/**
 * Yahoo Finance API Integration
 * Yahoo Finance API 整合模組
 * 
 * Handles data fetching, caching, and transformation for market data.
 * 處理市場資料的擷取、快取與轉換。
 * 
 * @module api/yahooFinanceApi
 */
```

---

## 2. File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| JavaScript/TypeScript | `kebab-case` | `yahoo-finance-api.js` |
| Vue Components | `PascalCase` | `StockDetail.vue` |
| Python Scripts | `snake_case` | `daily_update.py` |
| Config Files | `kebab-case` | `stocks.json` |
| Markdown | `SCREAMING_SNAKE` | `CODING_STANDARDS.md` |

---

## 3. Variable & Function Naming

### 3.1 JavaScript/TypeScript
- **Variables**: `camelCase` - `stockPrice`, `ohlcvData`
- **Constants**: `SCREAMING_SNAKE` - `MAX_RETRY_COUNT`
- **Functions**: `camelCase` - `fetchQuotes()`, `calculateRSI()`
- **Classes**: `PascalCase` - `DataFetcher`, `CacheManager`

### 3.2 Python
- **Variables**: `snake_case` - `stock_price`, `ohlcv_data`
- **Constants**: `SCREAMING_SNAKE` - `MAX_RETRY_COUNT`
- **Functions**: `snake_case` - `fetch_quotes()`, `calculate_rsi()`
- **Classes**: `PascalCase` - `DataFetcher`, `CacheManager`

---

## 4. Git Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `chore`: Maintenance tasks
- `test`: Test additions/changes

**Examples**:
```
feat: Add RSI calculation to technical indicators
fix: Correct exchange name normalization for TradingView
refactor: Consolidate GitHub workflows into single file
docs: Update DATA_OPERATIONS.md with unified workflow
```

---

## 5. Documentation Standards

### 5.1 Required Sections
Every non-trivial function should document:
1. **Purpose** (English + Chinese)
2. **Parameters** (`@param` or `Args:`)
3. **Return value** (`@returns` or `Returns:`)
4. **Exceptions** (if applicable)

### 5.2 TODOs and FIXMEs
```javascript
// TODO: Implement retry logic for API failures
// TODO: 實作 API 失敗時的重試邏輯

// FIXME: This calculation is incorrect for negative values
// FIXME: 負值時計算結果不正確
```

---

## 6. TypeScript Requirements

> [!IMPORTANT]
> All **NEW** frontend code in `src/` **MUST** be written in TypeScript.  
> 所有 `src/` 目錄下的**新**前端程式碼**必須**使用 TypeScript。

### 6.1 Mandatory for New Files
- New files in `src/api/`, `src/utils/`, `src/services/`, `src/lib/` → `.ts`
- New Vue components → `<script setup lang="ts">`
- New composables → `.ts`

### 6.2 Type Definition Standards
```typescript
// Use explicit types for function parameters and returns
// 函式參數與回傳值必須明確定義型別
function calculateRSI(prices: number[], period: number = 14): number {
  // ...
}

// Use interfaces for complex objects
// 複雜物件使用 interface 定義
interface StockMetadata {
  symbol: string;
  exchange: 'NASDAQ' | 'NYSE';
  sector: string;
  industry: string;
}
```

### 6.3 Migration Roadmap (Existing JS Files)
Legacy JavaScript files will be migrated gradually:

| Priority | Files | Status |
|----------|-------|--------|
| 🔴 High | `yahooFinanceApi.js` (pending refactor) | Planned |
| 🟡 Medium | `metadataService.js`, `*Service.js` | Backlog |
| 🟢 Low | Utility files in `src/utils/` | Backlog |

---

## 7. AI Agent Guidance

For AI agents (Antigravity, Copilot, etc.), refer to:
- `.agent/workflows/code-review.md` - Code review checklist
- `.agent/skills/` - Specialized domain skills

When generating code, agents **MUST**:
1. Follow bilingual comment convention
2. Match existing file naming patterns
3. **Use TypeScript for ALL new frontend code** (no exceptions)
4. Use Python for data pipeline scripts

