# YFinance Metadata 測試頁面使用指南

## 📋 測試頁面概述

`test-yfinance-metadata.html` 是一個獨立的測試頁面，用於驗證新的 YFinance API metadata 服務。這個頁面可以幫助你：

- 測試 YFinance API 連接
- 驗證 metadata 資料格式
- 檢查快取機制
- 監控更新狀態
- 調試 API 問題

## 🚀 如何使用測試頁面

### 1. 開啟測試頁面

有兩種方式開啟測試頁面：

#### 方式 A: 直接在瀏覽器開啟
```bash
# 在專案根目錄，直接用瀏覽器開啟
open test-yfinance-metadata.html
# 或者
start test-yfinance-metadata.html  # Windows
```

#### 方式 B: 透過開發伺服器 (推薦)
```bash
# 啟動開發伺服器
npm run dev

# 然後在瀏覽器訪問
http://localhost:5173/test-yfinance-metadata.html
```

### 2. 測試頁面功能說明

#### 🎛️ 控制面板
測試頁面提供 5 個主要按鈕：

1. **檢查狀態** - 檢查服務和快取狀態
2. **測試單個股票** - 測試單一股票的 API 呼叫 (預設 CRM)
3. **測試批量股票** - 測試多個股票的批量處理 (預設 5 支股票)
4. **強制更新** - 強制更新快取資料
5. **清除快取** - 清除所有快取資料

#### 🎯 自訂測試區塊 (新增)
1. **測試股票代號** - 輸入單一股票代號進行測試
   - 支援任何有效的股票代號 (如 AAPL, MSFT, GOOGL)
   - 按 Enter 鍵或點擊按鈕執行測試
   
2. **批量測試股票代號** - 輸入多個股票代號進行批量測試
   - 用逗號分隔多個股票代號 (如 AAPL,MSFT,GOOGL)
   - 按 Enter 鍵或點擊按鈕執行測試
   
3. **快速選擇** - 預設的股票組合
   - **科技股**: AAPL,MSFT,GOOGL,AMZN,META,NVDA,TSLA
   - **金融股**: JPM,BAC,WFC,GS,MS,C,USB
   - **能源股**: XOM,CVX,COP,EOG,SLB,MPC,VLO
   - **全部24支股票**: 專案中配置的所有股票

#### 📊 資訊區塊
頁面分為幾個主要區塊：

1. **服務狀態** - 顯示快取狀態、股票數量、更新需求
2. **更新狀態** - 顯示詳細的快取資訊和年齡
3. **Metadata 測試結果** - 顯示 API 回傳的資料
4. **統計資訊** - 顯示 Sector 分佈和資料來源統計
5. **操作日誌** - 即時顯示操作過程和結果

## 📝 詳細使用步驟

### 步驟 1: 初始狀態檢查

1. 開啟測試頁面
2. 點擊 **「檢查狀態」** 按鈕
3. 觀察以下資訊：
   - 快取狀態：✅ 有資料 或 ❌ 無資料
   - 快取股票數：顯示已快取的股票數量
   - 更新狀態：顯示是否需要更新

**預期結果**：
- 首次使用：快取狀態為 ❌，需要更新
- 已有快取：顯示快取年齡和股票數量

### 步驟 2: 測試 API 連接

#### 方法 A: 使用預設股票
1. 點擊 **「測試單個股票」** 按鈕
2. 系統會測試 CRM 股票的 API 呼叫
3. 觀察操作日誌中的過程：
   ```
   [時間] 測試單個股票: CRM
   [時間] 正在透過 https://api.allorigins.win/raw?url= 獲取 CRM 資料...
   [時間] ✅ CRM: Technology - Enterprise Software
   [時間] 單個股票測試完成: CRM
   ```

#### 方法 B: 測試自訂股票 (推薦)
1. 在「測試股票代號」欄位輸入股票代號 (如 AAPL)
2. 按 Enter 鍵或點擊 **「測試自訂股票」**
3. 觀察結果和日誌

#### 方法 C: 使用快速選擇
1. 點擊 **「科技股」** 按鈕 (會自動填入科技股代號)
2. 點擊 **「批量測試自訂股票」**
3. 觀察批量處理結果

**預期結果**：
- 成功：顯示股票的完整 metadata 資訊
- 失敗：顯示錯誤訊息和回退資料

### 步驟 3: 測試批量股票

1. 點擊 **「測試批量股票」** 按鈕
2. 系統會依序測試 5 個股票：CRM, NVDA, TSLA, AAPL, MSFT
3. 觀察每個股票的處理過程
4. 查看統計資訊區塊的更新

**預期結果**：
- 顯示所有股票的 metadata 卡片
- 統計資訊顯示 Sector 分佈
- 顯示 API 成功率

### 步驟 4: 強制更新測試

1. 點擊 **「強制更新」** 按鈕
2. 系統會更新快取並保存到 localStorage
3. 觀察更新過程和耗時
4. 重新檢查狀態確認更新成功

**預期結果**：
- 日誌顯示更新過程
- 快取狀態更新
- 股票數量和時間戳更新

### 步驟 5: 快取管理測試

1. 點擊 **「清除快取」** 按鈕
2. 重新點擊 **「檢查狀態」**
3. 確認快取已清除

**預期結果**：
- 快取狀態變為 ❌
- 股票數量變為 0
- 需要更新狀態變為「需要」

## 🔍 測試結果解讀

### 成功的測試結果

#### 服務狀態 (正常)
```
快取狀態: ✅
快取股票數: 5
更新狀態: 不需要
```

#### Metadata 資料 (正常)
```
CRM
Sector: Technology
Industry: Enterprise Software
Exchange: NYSE
Country: US
Confidence: 1
Source: yfinance
Market Cap: $250.1B
```

#### 統計資訊 (正常)
```
總股票數: 5
Sector 數量: 2
YFinance API: 4
回退資料: 1

Sector 分佈:
Technology: 3 個股票
Consumer Cyclical: 2 個股票
```

### 異常情況處理

#### API 連接失敗
**症狀**：
```
[時間] ❌ CRM via https://api.allorigins.win/raw?url=: HTTP 429
[時間] ❌ CRM via https://corsproxy.io/?: Network error
[時間] 所有代理失敗，使用 CRM 回退資料
```

**解決方案**：
1. 檢查網路連接
2. 等待一段時間後重試 (可能是 API 限制)
3. 確認代理服務狀態

#### CORS 錯誤
**症狀**：
```
[時間] ❌ CRM via proxy: CORS policy blocked
```

**解決方案**：
1. 使用開發伺服器而非直接開啟 HTML 文件
2. 檢查代理服務是否正常運作
3. 嘗試不同的代理服務

## 🛠️ 進階使用技巧

### 1. 自訂測試股票

修改測試頁面中的股票列表：
```javascript
// 在瀏覽器開發者工具中執行
yfinanceService.testSymbols = ['AAPL', 'GOOGL', 'AMZN'];
```

### 2. 檢查快取詳情

在瀏覽器開發者工具中執行：
```javascript
// 查看快取內容
const cache = localStorage.getItem('yfinance_metadata_cache');
console.log(JSON.parse(cache));

// 查看快取統計
const stats = yfinanceService.getCacheStats();
console.log(stats);
```

### 3. 手動清除特定快取

```javascript
// 只清除 metadata 快取，保留其他快取
localStorage.removeItem('yfinance_metadata_cache');
localStorage.removeItem('yfinance_last_update');
```

### 4. 模擬不同的快取狀態

```javascript
// 模擬過期快取
const oldDate = new Date();
oldDate.setDate(oldDate.getDate() - 8); // 8天前
localStorage.setItem('yfinance_last_update', oldDate.toISOString());
```

## 📋 測試檢查清單

使用測試頁面時，請確認以下項目：

### 基本功能測試
- [ ] 頁面正常載入
- [ ] 所有按鈕可以點擊
- [ ] 日誌正常顯示
- [ ] 狀態檢查功能正常

### API 連接測試
- [ ] 至少一個代理服務可以連接
- [ ] API 回傳正確的 JSON 格式
- [ ] Sector 和 Industry 資料不為空
- [ ] Exchange 映射正確

### 快取機制測試
- [ ] 快取可以正常保存
- [ ] 快取可以正常讀取
- [ ] 快取過期檢測正常
- [ ] 強制更新功能正常

### 錯誤處理測試
- [ ] API 失敗時使用回退資料
- [ ] 網路錯誤時顯示適當訊息
- [ ] 無效資料時的處理正確

## 🚨 常見問題排除

### Q1: 頁面顯示空白或載入失敗
**解決方案**：
1. 確認瀏覽器支援 ES6 模組
2. 使用現代瀏覽器 (Chrome, Firefox, Safari)
3. 透過開發伺服器訪問而非直接開啟文件

### Q2: 所有 API 請求都失敗
**解決方案**：
1. 檢查網路連接
2. 確認防火牆設定
3. 嘗試使用 VPN
4. 檢查代理服務狀態

### Q3: 快取無法保存
**解決方案**：
1. 檢查瀏覽器 localStorage 是否啟用
2. 確認沒有隱私模式限制
3. 清除瀏覽器資料後重試

### Q4: 資料格式異常
**解決方案**：
1. 檢查 API 回傳的原始資料
2. 確認代理服務沒有修改資料格式
3. 更新測試頁面到最新版本

## 📈 測試報告範例

完成測試後，你應該能看到類似以下的結果：

```
=== YFinance Metadata 測試報告 ===

測試時間: 2025-01-25 14:30:00
測試股票: CRM, NVDA, TSLA, AAPL, MSFT

API 連接狀態:
✅ api.allorigins.win - 成功率 80%
⚠️ corsproxy.io - 成功率 60%

資料品質:
✅ 所有股票都有 Sector 資料
✅ 所有股票都有 Industry 資料
✅ Exchange 映射正確
✅ Market Cap 資料完整

快取機制:
✅ 快取保存正常
✅ 快取讀取正常
✅ 過期檢測正常

總結: 系統運作正常，可以部署使用
```

這個測試頁面是驗證 YFinance metadata 服務的重要工具，建議在每次更新後都進行完整測試。