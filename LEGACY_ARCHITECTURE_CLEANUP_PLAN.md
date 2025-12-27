# 🧹 舊架構清理計劃

## 🚨 發現的問題

經過全面檢查，發現以下組件仍在使用舊架構，需要更新：

### 1. 仍使用 `symbolsConfig` 的文件
- ✅ `src/components/StockOverview.vue` - **已更新**
- ❌ `src/utils/enhancedMetadataService.js` - **需要更新**
- ❌ `src/utils/stockOverviewOptimizer.js` - **需要更新**
- ❌ `scripts/validate-symbol-consistency.cjs` - **需要更新**

### 2. 仍使用 `universe.json` 的文件
- ✅ `scripts/update-quotes.cjs` - **已更新 (有 fallback)**
- ✅ `scripts/generate-daily-snapshot.js` - **已更新 (有 fallback)**
- ❌ `src/utils/symbolsConfig.js` - **需要更新或移除**
- ❌ `scripts/generate-quotes-snapshot.js` - **需要更新**
- ❌ `run-metadata-update.cjs` - **需要更新**
- ❌ `scripts/validate-symbol-consistency.cjs` - **需要更新**

### 3. 測試文件需要更新
- ❌ `tests/universe-validation.test.js` - **需要更新**
- ❌ `tests/config.test.js` - **需要更新**
- ❌ `tests/validation.test.ts` - **需要更新**

## 🎯 修復優先級

### 高優先級 (影響核心功能)
1. **`src/utils/stockOverviewOptimizer.js`** - 影響 StockOverview 效能
2. **`src/utils/enhancedMetadataService.js`** - 影響 metadata 載入
3. **`run-metadata-update.cjs`** - 影響數據更新

### 中優先級 (影響輔助功能)
4. **`scripts/generate-quotes-snapshot.js`** - 影響數據生成
5. **`scripts/validate-symbol-consistency.cjs`** - 影響驗證工具

### 低優先級 (可選清理)
6. **`src/utils/symbolsConfig.js`** - 可能完全移除
7. **測試文件** - 更新測試邏輯

## 🔧 修復計劃

### 階段 1: 核心服務更新

#### 1.1 更新 stockOverviewOptimizer.js
```javascript
// 替換
import { symbolsConfig } from './symbolsConfig'

// 為
import { stocksConfig } from './stocksConfigService'

// 更新方法調用
const symbols = await stocksConfig.getEnabledSymbols()
```

#### 1.2 更新 enhancedMetadataService.js
```javascript
// 替換
import { symbolsConfig } from './symbolsConfig.js';

// 為
import { stocksConfig } from './stocksConfigService.js';

// 更新方法調用
const symbols = await stocksConfig.getEnabledSymbols();
```

### 階段 2: 腳本更新

#### 2.1 更新 run-metadata-update.cjs
```javascript
// 替換 universe.json 讀取
const configPath = path.join(__dirname, 'config/stocks.json');
const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const symbols = configData.stocks.filter(s => s.enabled).map(s => s.symbol);
```

#### 2.2 更新 generate-quotes-snapshot.js
```javascript
// 添加統一配置讀取方法
function getStocksFromConfig() {
  const configPath = path.join(this.projectRoot, 'config', 'stocks.json')
  const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  return configData.stocks.filter(stock => stock.enabled).map(stock => stock.symbol)
}
```

### 階段 3: 驗證工具更新

#### 3.1 更新 validate-symbol-consistency.cjs
```javascript
// 添加統一配置檢查
stocksConfig: path.join(this.projectRoot, 'config/stocks.json'),

// 更新驗證邏輯
const configData = JSON.parse(fs.readFileSync(this.dataSources.stocksConfig, 'utf8'));
symbols.stocksConfig = configData.stocks.filter(s => s.enabled).map(s => s.symbol);
```

### 階段 4: 清理舊文件

#### 4.1 評估 symbolsConfig.js 是否可移除
- 檢查是否還有其他依賴
- 如果沒有，可以完全移除
- 如果有，添加 deprecated 警告

#### 4.2 更新測試文件
- 將 universe.json 測試改為 stocks.json 測試
- 更新驗證邏輯

## 🚀 執行步驟

### 立即執行 (高優先級)
1. 更新 `stockOverviewOptimizer.js`
2. 更新 `enhancedMetadataService.js`
3. 更新 `run-metadata-update.cjs`
4. 測試 StockOverview 頁面效能

### 後續執行 (中優先級)
5. 更新其他腳本文件
6. 更新驗證工具
7. 測試所有功能

### 最終清理 (低優先級)
8. 移除或標記舊文件為 deprecated
9. 更新測試文件
10. 更新文檔

## ⚠️ 風險評估

### 高風險
- **效能影響**: `stockOverviewOptimizer.js` 如果更新錯誤可能影響頁面載入效能
- **數據一致性**: metadata 服務更新錯誤可能導致數據不一致

### 中風險
- **腳本失效**: 數據生成腳本更新錯誤可能導致數據更新失敗
- **驗證失效**: 驗證工具更新錯誤可能無法檢測問題

### 低風險
- **測試失效**: 測試文件更新錯誤不影響生產功能
- **舊文件殘留**: 不會影響新架構運作

## 🧪 測試策略

### 功能測試
1. StockOverview 頁面載入測試
2. 效能測試 (載入時間)
3. 數據一致性測試
4. 快取功能測試

### 回歸測試
1. 所有現有功能正常運作
2. RR 符號正確顯示
3. 67 個股票全部顯示
4. 效能沒有退化

### 整合測試
1. 新舊架構兼容性
2. 數據生成腳本正常運作
3. 驗證工具正常運作

## 📊 成功指標

- ✅ 所有組件使用統一配置 `config/stocks.json`
- ✅ 沒有組件使用舊的 `symbolsConfig` 或 `universe.json`
- ✅ StockOverview 頁面效能保持或提升
- ✅ 所有數據生成腳本正常運作
- ✅ 驗證工具正確檢查新架構
- ✅ 測試全部通過

---

**下一步**: 立即開始階段 1 的核心服務更新，確保 StockOverview 頁面的效能和功能不受影響。