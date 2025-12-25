# 本地 CORS 代理解決方案

## 🚨 問題現狀

目前大部分免費的 CORS 代理服務都不穩定或已停止服務：
- `api.allorigins.win` - 間歇性失敗
- `corsproxy.io` - HTTP 401 錯誤
- `cors-anywhere.herokuapp.com` - HTTP 403 錯誤
- 其他服務 - 大多已停止或限制嚴格

## 💡 解決方案

### 方案 1: 本地 CORS 代理伺服器 (推薦)

#### 1.1 使用 cors-anywhere (Node.js)

**安裝和設定**:
```bash
# 1. 安裝 cors-anywhere
npm install cors-anywhere

# 2. 創建本地代理伺服器
# 創建文件: local-cors-proxy.js
```

**local-cors-proxy.js**:
```javascript
const cors_proxy = require('cors-anywhere');
const host = 'localhost';
const port = 8080;

cors_proxy.createServer({
    originWhitelist: [], // 允許所有來源
    requireHeader: ['origin', 'x-requested-with'],
    removeHeaders: ['cookie', 'cookie2']
}).listen(port, host, function() {
    console.log('CORS Anywhere proxy running on ' + host + ':' + port);
    console.log('Usage: http://' + host + ':' + port + '/TARGET_URL');
    console.log('Example: http://' + host + ':' + port + '/https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=summaryProfile');
});
```

**啟動代理**:
```bash
node local-cors-proxy.js
```

**在測試頁面中使用**:
```javascript
// 在 test-yfinance-metadata.html 中添加本地代理
this.corsProxies.unshift({
    url: 'http://localhost:8080/',
    type: 'raw',
    name: 'Local CORS Proxy'
});
```

#### 1.2 使用 Python 簡單代理

**創建文件: cors_proxy.py**:
```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route('/proxy')
def proxy():
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'Missing url parameter'}), 400
    
    try:
        response = requests.get(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        return response.text, response.status_code, {'Content-Type': 'application/json'}
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='localhost', port=8080, debug=True)
```

**安裝依賴並啟動**:
```bash
pip install flask flask-cors requests
python cors_proxy.py
```

### 方案 2: 使用 Vite 開發伺服器代理

**修改 vite.config.js**:
```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
          });
        }
      }
    }
  }
})
```

**在應用中使用**:
```javascript
// 使用 Vite 代理
const url = '/api/yahoo/v10/finance/quoteSummary/AAPL?modules=summaryProfile';
const response = await fetch(url);
```

### 方案 3: 使用 Cloudflare Workers

**創建 Cloudflare Worker**:
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get('url')
  
  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 })
  }

  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })

  const newResponse = new Response(response.body, response)
  
  // 添加 CORS headers
  newResponse.headers.set('Access-Control-Allow-Origin', '*')
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  newResponse.headers.set('Access-Control-Allow-Headers', '*')
  
  return newResponse
}
```

### 方案 4: 改用靜態 Metadata 模式

**完全依賴靜態資料**:
```javascript
// 在 enhancedMetadataService.js 中
setUseYFinanceAPI(false); // 禁用 YFinance API
setFallbackToStatic(true); // 啟用靜態回退

// 手動維護高品質的靜態 metadata
const highQualityStaticData = {
    'HIMS': {
        sector: 'Healthcare',
        industry: 'Health Information Services',
        confidence: 0.95, // 手動驗證的高信心度
        exchange: 'NASDAQ',
        market_cap_category: 'small_cap'
    }
    // ... 其他股票
};
```

## 🛠️ 實施步驟

### 立即解決方案 (5分鐘)

1. **啟動本地代理**:
   ```bash
   # 快速方案：使用 npx
   npx cors-anywhere-proxy
   ```

2. **更新測試頁面**:
   ```javascript
   // 在瀏覽器控制台中執行
   yfinanceService.corsProxies.unshift({
       url: 'http://localhost:8080/',
       type: 'raw',
       name: 'Local Proxy'
   });
   ```

3. **重新測試**:
   - 點擊「檢查代理服務」
   - 確認本地代理顯示 ✅ 正常
   - 測試股票資料獲取

### 長期解決方案

1. **整合到專案**:
   - 將本地代理腳本加入專案
   - 更新 package.json 腳本
   - 修改開發工作流程

2. **生產環境**:
   - 部署 Cloudflare Worker
   - 或使用 Vercel/Netlify Functions
   - 設定環境變數切換

## 📊 各方案比較

| 方案 | 設定難度 | 穩定性 | 成本 | 適用場景 |
|------|----------|--------|------|----------|
| 本地 CORS 代理 | 簡單 | 高 | 免費 | 開發環境 |
| Vite 代理 | 中等 | 高 | 免費 | 開發環境 |
| Cloudflare Workers | 中等 | 很高 | 免費額度 | 生產環境 |
| 靜態模式 | 簡單 | 很高 | 免費 | 所有環境 |

## 🚀 推薦實施順序

1. **立即**: 啟動本地 CORS 代理解決當前問題
2. **短期**: 整合 Vite 代理到開發環境
3. **中期**: 部署 Cloudflare Worker 到生產環境
4. **長期**: 建立高品質靜態 metadata 作為最終回退

## 📝 更新測試頁面

讓我為測試頁面加入本地代理支援：

```javascript
// 檢測本地代理是否可用
async function checkLocalProxy() {
    try {
        const response = await fetch('http://localhost:8080/https://httpbin.org/get');
        return response.ok;
    } catch {
        return false;
    }
}

// 自動添加本地代理（如果可用）
if (await checkLocalProxy()) {
    yfinanceService.corsProxies.unshift({
        url: 'http://localhost:8080/',
        type: 'raw',
        name: 'Local CORS Proxy (Recommended)'
    });
}
```

這個解決方案應該能徹底解決 CORS 代理問題，讓你的 YFinance API 整合正常運作。