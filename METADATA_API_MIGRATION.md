# 元數據服務 API 遷移指南

## 概述

本項目已從靜態元數據文件 (`symbols_metadata.json`) 遷移到動態 Yahoo Finance API，以獲取更準確和即時的股票 sector 和 industry 信息。

## 新功能

### 1. 動態元數據服務 (`dynamicMetadataService.js`)

- **即時數據**: 直接從 Yahoo Finance API 獲取最新的 sector/industry 信息
- **高信心度**: API 數據信心度達 95%
- **自動緩存**: 24小時緩存，減少 API 請求
- **批量處理**: 支援批量獲取多個股票的元數據
- **錯誤處理**: 多代理服務容錯機制

### 2. 混合元數據服務 (`metadataService.js`)

- **雙模式支援**: 可選擇使用動態 API 或靜態文件
- **向後兼容**: 保持原有 API 接口不變
- **無縫切換**: 運行時可切換模式

### 3. 元數據更新腳本 (`scripts/update-metadata.js`)

- **自動更新**: 使用 Yahoo Finance API 更新靜態文件
- **智能跳過**: 避免重複更新高信心度數據
- **批量處理**: 支援批量更新多個股票
- **統計報告**: 詳細的更新統計和錯誤報告

## 使用方式

### 前端使用

```javascript
import { metadataService } from '@/utils/metadataService.js'

// 設定使用動態 API (預設)
metadataService.setUseDynamicAPI(true)

// 獲取單個股票元數據
const metadata = await metadataService.getSymbolMetadata('AAPL')
console.log(metadata.sector, metadata.industry)

// 批量獲取
const symbols = ['AAPL', 'MSFT', 'GOOGL']
const metadataMap = await metadataService.getBatchMetadata(symbols)

// 預熱緩存
await metadataService.warmupCache(symbols)
```

### 腳本更新

```bash
# 更新所有股票的元數據
npm run update-metadata

# 強制更新 (包括高信心度數據)
npm run update-metadata:force

# 更新特定股票
node scripts/update-metadata.js --symbols=AAPL,MSFT,GOOGL

# 強制更新特定股票
node scripts/update-metadata.js --force --symbols=AAPL,MSFT
```

## API 比較

### Yahoo Finance API 優勢

✅ **即時數據**: 直接從 Yahoo Finance 獲取最新信息  
✅ **高準確性**: 官方數據源，信心度 95%  
✅ **自動更新**: 無需手動維護  
✅ **豐富信息**: 包含市值、國家、網站等額外信息  
✅ **標準化**: 使用 Yahoo Finance 的標準分類  

### 靜態文件方式

✅ **快速載入**: 本地文件，無網路延遲  
✅ **離線支援**: 不依賴外部 API  
✅ **可控性**: 可手動調整分類  
❌ **需要維護**: 需要定期手動更新  
❌ **可能過時**: 數據可能不是最新的  

## 測試頁面

訪問 `/metadata-test` 頁面來測試和比較兩種模式：

- 單個股票測試
- 批量測試
- 緩存管理
- 性能比較
- 動態 vs 靜態數據對比

## 配置選項

### 動態 API 配置

```javascript
// 在 dynamicMetadataService.js 中
const service = new DynamicMetadataService()
service.cacheExpiry = 24 * 60 * 60 * 1000 // 24小時緩存
service.batchSize = 5 // 批量處理大小
service.requestDelay = 1000 // 請求間隔 (毫秒)
```

### 更新腳本配置

```javascript
// 在 scripts/update-metadata.js 中
const updater = new MetadataUpdater()
updater.requestDelay = 2000 // API 請求間隔
```

## 遷移步驟

### 1. 立即使用動態 API

```javascript
// 在應用啟動時設定
metadataService.setUseDynamicAPI(true)
```

### 2. 更新靜態文件 (可選)

```bash
# 使用最新 API 數據更新靜態文件
npm run update-metadata
```

### 3. 測試驗證

```bash
# 啟動開發服務器
npm run dev

# 訪問測試頁面
# http://localhost:5173/#/metadata-test
```

## 錯誤處理

### API 失敗回退

當 Yahoo Finance API 失敗時，系統會：

1. 嘗試多個代理服務
2. 回退到緩存數據
3. 最終使用默認值

### 網路問題

- 自動重試機制
- 多代理服務容錯
- 優雅降級到靜態模式

## 性能考量

### 緩存策略

- **動態 API**: 24小時緩存
- **批量請求**: 減少 API 調用次數
- **智能跳過**: 避免重複更新

### API 限制

- 請求間隔: 1-2秒
- 批量大小: 5個股票/批次
- 代理輪換: 避免單一代理限制

## 監控和調試

### 緩存統計

```javascript
const stats = metadataService.getCacheStats()
console.log('緩存統計:', stats)
```

### 日誌輸出

- 詳細的 API 請求日誌
- 緩存命中/未命中統計
- 錯誤和重試信息

## 未來改進

1. **更多數據源**: 整合其他金融 API
2. **智能緩存**: 基於數據變化頻率的動態緩存
3. **離線模式**: 自動回退到靜態文件
4. **實時更新**: WebSocket 或 SSE 推送更新

## 故障排除

### 常見問題

**Q: API 請求失敗怎麼辦？**  
A: 系統會自動嘗試多個代理服務，最終回退到默認值。

**Q: 如何提高 API 成功率？**  
A: 增加請求間隔時間，使用更穩定的代理服務。

**Q: 如何回到靜態文件模式？**  
A: 調用 `metadataService.setUseDynamicAPI(false)`

**Q: 緩存何時過期？**  
A: 動態 API 緩存 24小時後自動過期。

### 調試技巧

1. 檢查瀏覽器控制台的詳細日誌
2. 使用測試頁面驗證 API 響應
3. 檢查緩存統計了解性能
4. 比較動態和靜態數據的差異

## 結論

新的動態元數據服務提供了更準確、即時的股票分類信息，同時保持了向後兼容性。建議在生產環境中使用動態 API 模式，並定期更新靜態文件作為備份。