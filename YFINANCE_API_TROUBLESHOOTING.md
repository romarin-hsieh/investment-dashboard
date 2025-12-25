# YFinance API 故障排除指南

## 🚨 常見錯誤和解決方案

### 1. HTTP 401 Unauthorized 錯誤

**症狀**:
```
❌ ONDS via https://corsproxy.io/?: HTTP 401
```

**原因**:
- Yahoo Finance API 檢測到自動化請求
- 代理服務被 Yahoo Finance 封鎖
- 請求頻率過高觸發限制

**解決方案**:
1. **使用不同的代理服務**
   - 測試頁面現在包含 6 個代理服務
   - 點擊「檢查代理服務」按鈕測試可用性

2. **降低請求頻率**
   - 增加請求間隔到 2-3 秒
   - 避免同時發送多個請求

3. **更換 User-Agent**
   - 使用更真實的瀏覽器 User-Agent
   - 隨機化 User-Agent 字串

### 2. Invalid Response Structure 錯誤

**症狀**:
```
❌ ONDS via https://api.allorigins.win/raw?url=: Invalid response structure
```

**原因**:
- 代理服務返回 HTML 錯誤頁面而非 JSON
- Yahoo Finance API 回傳空資料
- 股票代號不存在或已下市

**解決方案**:
1. **檢查股票代號**
   - 確認股票代號正確且仍在交易
   - 嘗試知名股票如 AAPL, MSFT

2. **檢查回應內容**
   - 在瀏覽器開發者工具中查看實際回應
   - 確認不是 HTML 錯誤頁面

### 3. CORS 錯誤

**症狀**:
```
Access to fetch at 'https://query1.finance.yahoo.com/...' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**原因**:
- 直接訪問 Yahoo Finance API 被 CORS 政策阻止
- 代理服務失效

**解決方案**:
1. **使用代理服務**
   - 確保使用 CORS 代理而非直接 API 呼叫
   - 測試多個代理服務

2. **本地開發環境**
   - 使用 `npm run dev` 而非直接開啟 HTML 文件
   - 確認開發伺服器正常運行

## 🔧 改進的錯誤處理機制

### 新增的代理服務

測試頁面現在包含 6 個代理服務：

1. **api.allorigins.win** - 通常最穩定
2. **corsproxy.io** - 速度較快但可能有限制
3. **cors-anywhere.herokuapp.com** - 需要啟用
4. **thingproxy.freeboard.io** - 備用選項
5. **api.codetabs.com** - 新增的代理
6. **yacdn.org** - 新增的代理

### 智能重試機制

```javascript
// 改進的錯誤處理
for (let proxyIndex = 0; proxyIndex < this.corsProxies.length; proxyIndex++) {
    try {
        // 嘗試請求
        const response = await fetch(requestUrl, options);
        
        // 檢查回應狀態
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // 驗證 JSON 格式
        const responseText = await response.text();
        if (responseText.includes('<html>')) {
            throw new Error('Received HTML instead of JSON');
        }
        
        const data = JSON.parse(responseText);
        
        // 驗證資料結構
        if (!data.quoteSummary?.result?.[0]) {
            throw new Error('Invalid response structure');
        }
        
        return processData(data);
        
    } catch (error) {
        // 記錄錯誤並嘗試下一個代理
        console.warn(`Proxy ${proxyIndex + 1} failed: ${error.message}`);
        continue;
    }
}
```

## 🧪 測試和診斷工具

### 1. 代理服務狀態檢查

在測試頁面中：
1. 點擊「檢查代理服務」按鈕
2. 查看每個代理的狀態和回應時間
3. 選擇可用的代理進行測試

### 2. 手動 API 測試

在瀏覽器中直接測試：
```javascript
// 測試代理服務
const testUrl = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=summaryProfile';
const proxy = 'https://api.allorigins.win/raw?url=';

fetch(proxy + encodeURIComponent(testUrl))
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error(error));
```

### 3. 網路診斷

檢查以下項目：
- [ ] 網路連接正常
- [ ] 防火牆沒有阻擋請求
- [ ] VPN 或代理設定
- [ ] DNS 解析正常

## 📊 成功率優化策略

### 1. 代理輪換

```javascript
// 隨機選擇代理順序
const shuffledProxies = [...this.corsProxies].sort(() => Math.random() - 0.5);
```

### 2. 請求間隔

```javascript
// 動態調整延遲
const delay = Math.random() * 2000 + 1000; // 1-3秒隨機延遲
await new Promise(resolve => setTimeout(resolve, delay));
```

### 3. User-Agent 輪換

```javascript
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
];

const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
```

## 🔄 回退策略

### 1. 靜態資料回退

當所有 API 都失敗時：
```javascript
getFallbackMetadata(symbol) {
    const fallbackData = {
        'ONDS': { 
            sector: 'Technology', 
            industry: 'Industrial IoT Solutions',
            confidence: 0.8,
            api_source: 'fallback'
        }
        // ... 更多回退資料
    };
    
    return fallbackData[symbol] || {
        sector: 'Unknown',
        industry: 'Unknown Industry',
        confidence: 0.5,
        api_source: 'fallback'
    };
}
```

### 2. 快取優先策略

```javascript
// 優先使用快取，即使過期
const cachedData = this.getCachedMetadata();
if (cachedData && apiCallsFailed) {
    console.log('Using expired cache due to API failures');
    return cachedData;
}
```

## 📈 監控和警報

### 成功率監控

```javascript
const stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    proxyStats: {}
};

// 計算成功率
const successRate = (stats.successfulRequests / stats.totalRequests * 100).toFixed(1);
console.log(`API Success Rate: ${successRate}%`);
```

### 自動降級

```javascript
// 當成功率低於 50% 時自動切換到靜態模式
if (successRate < 50) {
    console.warn('Low API success rate, switching to static mode');
    this.useStaticMode = true;
}
```

## 🚀 最佳實踐

1. **測試環境**
   - 使用開發伺服器而非直接開啟 HTML
   - 定期檢查代理服務狀態

2. **生產環境**
   - 設定合理的超時時間 (10-15秒)
   - 實施指數退避重試策略
   - 監控 API 成功率

3. **資料品質**
   - 驗證回傳資料的完整性
   - 對異常資料進行標記
   - 定期更新回退資料

4. **用戶體驗**
   - 顯示載入狀態和進度
   - 提供清晰的錯誤訊息
   - 允許手動重試

通過這些改進，YFinance API 的穩定性和成功率應該會顯著提升。