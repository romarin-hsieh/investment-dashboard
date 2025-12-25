#!/usr/bin/env node

/**
 * 本地 CORS 代理伺服器
 * 解決 YFinance API 的 CORS 問題
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 8080;
const HOST = 'localhost';

// 創建代理伺服器
const server = http.createServer((req, res) => {
  // 設定 CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 解析目標 URL
  const targetUrl = req.url.substring(1); // 移除開頭的 '/'
  
  if (!targetUrl || !targetUrl.startsWith('http')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Invalid URL', 
      usage: `http://${HOST}:${PORT}/TARGET_URL`,
      example: `http://${HOST}:${PORT}/https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=summaryProfile`
    }));
    return;
  }

  console.log(`[${new Date().toISOString()}] Proxying: ${targetUrl}`);

  const parsedUrl = url.parse(targetUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  // 準備代理請求選項
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.path,
    method: req.method,
    headers: {
      ...req.headers,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  };

  // 移除可能導致問題的 headers
  delete options.headers.host;
  delete options.headers.origin;
  delete options.headers.referer;

  // 發送代理請求
  const proxyReq = httpModule.request(options, (proxyRes) => {
    // 複製回應 headers
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });

    // 確保 CORS headers 存在
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    res.writeHead(proxyRes.statusCode);
    proxyRes.pipe(res);
  });

  // 錯誤處理
  proxyReq.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Proxy error:`, err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Proxy request failed', 
      details: err.message 
    }));
  });

  // 轉發請求體 (如果有)
  req.pipe(proxyReq);
});

// 啟動伺服器
server.listen(PORT, HOST, () => {
  console.log('🚀 本地 CORS 代理伺服器已啟動');
  console.log(`📍 地址: http://${HOST}:${PORT}`);
  console.log(`📖 使用方式: http://${HOST}:${PORT}/TARGET_URL`);
  console.log(`📝 範例: http://${HOST}:${PORT}/https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=summaryProfile`);
  console.log('');
  console.log('💡 在測試頁面中點擊「檢查本地代理」來驗證服務狀態');
  console.log('⏹️  按 Ctrl+C 停止服務');
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n🛑 正在關閉 CORS 代理伺服器...');
  server.close(() => {
    console.log('✅ 伺服器已關閉');
    process.exit(0);
  });
});

// 錯誤處理
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${PORT} 已被使用，請先關閉其他服務或使用不同端口`);
  } else {
    console.error('❌ 伺服器錯誤:', err.message);
  }
  process.exit(1);
});