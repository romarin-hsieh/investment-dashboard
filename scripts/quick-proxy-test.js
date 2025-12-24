/**
 * 快速 CORS 代理測試腳本
 * 測試新增的代理服務是否可用
 */

// 新增的代理服務列表
const newProxies = [
  {
    name: 'CORS.SH',
    url: 'https://cors.sh/',
    type: 'direct'
  },
  {
    name: 'Proxy CORS (isomorphic-git)',
    url: 'https://proxy-cors.isomorphic-git.org/',
    type: 'direct'
  },
  {
    name: 'ThingProxy',
    url: 'https://thingproxy.freeboard.io/fetch/',
    type: 'direct'
  },
  {
    name: 'CORS Proxy (HTMLDriven)',
    url: 'https://cors-proxy.htmldriven.com/?url=',
    type: 'query'
  }
];

const testSymbol = 'AAPL';
const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${testSymbol}?interval=1d&range=5d`;

console.log('🚀 快速 CORS 代理測試');
console.log('===================');
console.log(`測試目標: ${targetUrl}`);
console.log(`測試時間: ${new Date().toLocaleString()}\n`);

// 測試函數
async function testProxy(proxy) {
  const startTime = Date.now();
  
  try {
    let testUrl;
    if (proxy.type === 'query') {
      testUrl = `${proxy.url}${encodeURIComponent(targetUrl)}`;
    } else {
      testUrl = `${proxy.url}${targetUrl}`;
    }
    
    console.log(`🔍 測試 ${proxy.name}...`);
    console.log(`   URL: ${testUrl.substring(0, 80)}...`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; ProxyTest/1.0)'
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 簡單驗證數據結構
    const dataPoints = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(p => p !== null)?.length || 0;
    
    if (dataPoints > 0) {
      console.log(`   ✅ 成功! 響應時間: ${responseTime}ms, 數據點: ${dataPoints}`);
      return { success: true, responseTime, dataPoints };
    } else {
      throw new Error('無效的數據結構');
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`   ❌ 失敗! 響應時間: ${responseTime}ms`);
    console.log(`   💥 錯誤: ${error.message}`);
    return { success: false, responseTime, error: error.message };
  }
}

// 執行所有測試
async function runAllTests() {
  const results = [];
  
  for (let i = 0; i < newProxies.length; i++) {
    const result = await testProxy(newProxies[i]);
    results.push({ ...newProxies[i], ...result });
    
    // 添加延遲避免過於頻繁的請求
    if (i < newProxies.length - 1) {
      console.log('   ⏳ 等待 1 秒...\n');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 總結
  console.log('\n📊 測試結果總結');
  console.log('================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ 成功: ${successful.length}/${results.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.name}: ${r.responseTime}ms`);
  });
  
  console.log(`❌ 失敗: ${failed.length}/${results.length}`);
  failed.forEach(r => {
    console.log(`   - ${r.name}: ${r.error}`);
  });
  
  if (successful.length > 0) {
    const fastest = successful.reduce((prev, current) => 
      prev.responseTime < current.responseTime ? prev : current
    );
    console.log(`\n🏆 最快的代理: ${fastest.name} (${fastest.responseTime}ms)`);
    
    console.log('\n💡 建議更新 yahooFinanceApi.js 中的代理順序:');
    console.log('將成功的代理放在前面，提高成功率');
  } else {
    console.log('\n🚨 所有新代理都失敗了');
    console.log('建議繼續使用現有的靜態回退機制');
  }
}

// 如果在瀏覽器環境中運行
if (typeof window !== 'undefined') {
  window.testNewProxies = runAllTests;
  console.log('在瀏覽器控制台中運行: testNewProxies()');
} else {
  // Node.js 環境
  runAllTests().catch(console.error);
}

export { runAllTests, newProxies };