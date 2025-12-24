# CORS 代理服務選項大全

## 🌐 免費公共 CORS 代理服務

### 當前使用的代理 (狀態不穩定)
```javascript
const currentProxies = [
  'https://api.allorigins.win/raw?url=',           // ❌ CORS 限制
  'https://corsproxy.io/?',                       // ❌ 401 需要認證
  'https://cors-anywhere.herokuapp.com/'          // ❌ 403 已限制訪問
];
```

### 🆕 其他免費 CORS 代理選項

#### 1. **CORS.SH** (推薦)
```javascript
'https://cors.sh/'
// 使用方式: https://cors.sh/https://api.example.com
// 特點: 專業的 CORS 代理服務，相對穩定
```

#### 2. **Proxy CORS**
```javascript
'https://proxy-cors.isomorphic-git.org/'
// 使用方式: https://proxy-cors.isomorphic-git.org/https://api.example.com
// 特點: 由 isomorphic-git 團隊維護
```

#### 3. **CORS Proxy**
```javascript
'https://cors-proxy.htmldriven.com/?url='
// 使用方式: https://cors-proxy.htmldriven.com/?url=https://api.example.com
// 特點: 簡單易用的代理服務
```

#### 4. **ThingProxy**
```javascript
'https://thingproxy.freeboard.io/fetch/'
// 使用方式: https://thingproxy.freeboard.io/fetch/https://api.example.com
// 特點: 由 Freeboard.io 提供
```

#### 5. **JSONP Proxy**
```javascript
'https://jsonp.afeld.me/?url='
// 使用方式: https://jsonp.afeld.me/?url=https://api.example.com
// 特點: 支持 JSONP 回調
```

#### 6. **CrossOrigin.me**
```javascript
'https://crossorigin.me/'
// 使用方式: https://crossorigin.me/https://api.example.com
// 特點: 簡潔的 CORS 代理
```

## ☁️ 雲服務提供商解決方案

### 🔵 **AWS (Amazon Web Services)**

#### AWS API Gateway + Lambda
```javascript
// 自建 AWS 代理服務
const awsProxyEndpoint = 'https://your-api-id.execute-api.region.amazonaws.com/prod/proxy';

// Lambda 函數示例
exports.handler = async (event) => {
    const targetUrl = event.queryStringParameters.url;
    const response = await fetch(targetUrl);
    const data = await response.json();
    
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        body: JSON.stringify(data)
    };
};
```

#### AWS CloudFront
```javascript
// 使用 CloudFront 作為代理
'https://your-distribution.cloudfront.net/proxy/'
// 優點: 全球 CDN 加速，高可用性
// 缺點: 需要 AWS 帳戶和配置
```

### 🟢 **Google Cloud Platform**

#### Cloud Functions
```javascript
// Google Cloud Functions 代理
'https://region-project-id.cloudfunctions.net/cors-proxy'

// Cloud Function 示例 (Node.js)
exports.corsProxy = async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    
    const targetUrl = req.query.url;
    const response = await fetch(targetUrl);
    const data = await response.json();
    
    res.json(data);
};
```

#### Firebase Functions
```javascript
// Firebase Functions 代理
'https://region-project-id.cloudfunctions.net/yahooFinanceProxy'

// Firebase Function 示例
const functions = require('firebase-functions');
const cors = require('cors')({origin: true});

exports.yahooFinanceProxy = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        const targetUrl = req.query.url;
        const response = await fetch(targetUrl);
        const data = await response.json();
        res.json(data);
    });
});
```

### 🐙 **GitHub Pages + Actions**

#### GitHub Actions 定時更新
```yaml
# .github/workflows/update-stock-data.yml
name: Update Stock Data
on:
  schedule:
    - cron: '0 */6 * * *'  # 每6小時更新一次

jobs:
  update-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Fetch Yahoo Finance Data
        run: |
          curl "https://query1.finance.yahoo.com/v8/finance/chart/AAPL" > public/data/stocks/AAPL.json
      - name: Commit and Push
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git commit -m "Update stock data" || exit 0
          git push
```

#### GitHub Pages 靜態代理
```javascript
// 使用 GitHub Pages 託管預取的數據
'https://username.github.io/stock-data-proxy/api/'
// 優點: 免費，可靠
// 缺點: 數據不是即時的
```

### 🔷 **Azure**

#### Azure Functions
```javascript
// Azure Functions 代理
'https://your-function-app.azurewebsites.net/api/cors-proxy'

// Azure Function 示例 (JavaScript)
module.exports = async function (context, req) {
    const targetUrl = req.query.url;
    const response = await fetch(targetUrl);
    const data = await response.json();
    
    context.res = {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        body: data
    };
};
```

## 🚀 專業付費解決方案

### 1. **RapidAPI**
```javascript
'https://yahoo-finance15.p.rapidapi.com/'
// 特點: 專業的 Yahoo Finance API 包裝
// 價格: 免費額度 + 付費方案
```

### 2. **Alpha Vantage**
```javascript
'https://www.alphavantage.co/query'
// 特點: 專業金融數據 API
// 價格: 免費 5 calls/min，付費無限制
```

### 3. **IEX Cloud**
```javascript
'https://cloud.iexapis.com/stable/'
// 特點: 專業股票數據 API
// 價格: 免費額度 + 付費方案
```

### 4. **Finnhub**
```javascript
'https://finnhub.io/api/v1/'
// 特點: 專業金融數據 API
// 價格: 免費 60 calls/min，付費更多
```

## 🛠️ 自建代理服務選項

### 1. **Vercel Edge Functions**
```javascript
// api/cors-proxy.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { url } = req.query;
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
}
```

### 2. **Netlify Functions**
```javascript
// netlify/functions/cors-proxy.js
exports.handler = async (event, context) => {
    const { url } = event.queryStringParameters;
    const response = await fetch(url);
    const data = await response.json();
    
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(data)
    };
};
```

### 3. **Railway**
```javascript
// 使用 Railway 部署 Express.js 代理
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/proxy', async (req, res) => {
    const response = await fetch(req.query.url);
    const data = await response.json();
    res.json(data);
});

app.listen(process.env.PORT || 3000);
```

### 4. **Heroku**
```javascript
// 在 Heroku 上部署自己的 CORS 代理
// 比使用公共的 cors-anywhere 更可靠
```

## 📊 推薦的實施策略

### 階段 1: 立即改進 (免費方案)
```javascript
const improvedProxies = [
    'https://cors.sh/',                                    // 新增
    'https://proxy-cors.isomorphic-git.org/',             // 新增
    'https://thingproxy.freeboard.io/fetch/',             // 新增
    'https://api.allorigins.win/raw?url=',                // 保留
    'https://corsproxy.io/?',                             // 保留
];
```

### 階段 2: 中期解決方案 (混合方案)
1. **GitHub Actions** 定時更新靜態數據
2. **Vercel/Netlify Functions** 作為主要代理
3. **免費 API 服務** 作為備用

### 階段 3: 長期解決方案 (專業方案)
1. **付費 API 服務** (Alpha Vantage, IEX Cloud)
2. **自建雲端代理** (AWS/GCP/Azure)
3. **混合架構** (即時 + 緩存 + 靜態)

## 🎯 建議的下一步行動

### 立即可行的改進
1. **添加更多免費代理** - 提高成功率
2. **實施代理輪換** - 分散負載
3. **增加重試邏輯** - 提高穩定性

### 中期規劃
1. **設置 GitHub Actions** - 定時更新數據
2. **部署 Vercel Function** - 自建代理
3. **申請免費 API** - 專業數據源

### 長期目標
1. **評估付費方案** - 專業可靠性
2. **建立監控系統** - 服務可用性
3. **優化用戶體驗** - 更快更準確

## 💡 結論

雖然當前的代理服務不穩定，但有很多替代方案可以選擇。建議採用**多層次策略**：

1. **短期**: 添加更多免費代理提高成功率
2. **中期**: 使用 GitHub Actions + Vercel Functions
3. **長期**: 考慮專業付費 API 服務

**最重要的是**：當前的靜態回退機制已經確保了系統的穩定運行，這些改進都是為了提供更好的用戶體驗和數據即時性。