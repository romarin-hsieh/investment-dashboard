<template>
  <div class="proxy-diagnostic">
    <div class="test-header">
      <h2>🔍 Yahoo Finance API Proxy 診斷工具</h2>
      <p>測試各個 CORS 代理服務的可用性和 Yahoo Finance API 的狀態</p>
    </div>

    <div class="test-controls">
      <div class="symbol-input">
        <label>測試股票:</label>
        <input v-model="testSymbol" placeholder="AAPL" />
        <button @click="runFullDiagnostic" :disabled="testing">
          {{ testing ? '測試中...' : '開始完整診斷' }}
        </button>
      </div>
    </div>

    <div v-if="testing" class="loading">
      <div class="spinner"></div>
      <p>正在測試 {{ currentTest }}...</p>
    </div>

    <!-- Proxy 服務測試結果 -->
    <div class="proxy-results">
      <h3>📡 CORS Proxy 服務狀態</h3>
      <div class="proxy-grid">
        <div 
          v-for="(result, index) in proxyResults" 
          :key="index"
          class="proxy-card"
          :class="getStatusClass(result.status)"
        >
          <div class="proxy-header">
            <h4>Proxy {{ index + 1 }}: {{ result.name }}</h4>
            <span class="status-badge" :class="getStatusClass(result.status)">
              {{ result.status }}
            </span>
          </div>
          
          <div class="proxy-details">
            <p><strong>URL:</strong> {{ result.url }}</p>
            <p><strong>響應時間:</strong> {{ result.responseTime }}ms</p>
            <p><strong>HTTP 狀態:</strong> {{ result.httpStatus }}</p>
            
            <div v-if="result.error" class="error-details">
              <p><strong>錯誤類型:</strong> {{ result.errorType }}</p>
              <p><strong>錯誤訊息:</strong> {{ result.error }}</p>
            </div>
            
            <div v-if="result.data" class="success-details">
              <p><strong>數據點:</strong> {{ result.dataPoints }}</p>
              <p><strong>價格範圍:</strong> ${{ result.priceRange?.min }} - ${{ result.priceRange?.max }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Yahoo Finance API 直接測試 -->
    <div class="direct-api-test">
      <h3>🎯 Yahoo Finance API 直接測試</h3>
      <div class="api-test-grid">
        <div class="api-test-card">
          <h4>Chart API (技術指標數據)</h4>
          <div class="test-result" :class="getStatusClass(directApiResults.chart?.status)">
            <p><strong>狀態:</strong> {{ directApiResults.chart?.status || '未測試' }}</p>
            <p v-if="directApiResults.chart?.error"><strong>錯誤:</strong> {{ directApiResults.chart.error }}</p>
            <p v-if="directApiResults.chart?.dataPoints"><strong>數據點:</strong> {{ directApiResults.chart.dataPoints }}</p>
          </div>
        </div>
        
        <div class="api-test-card">
          <h4>Quote Summary API (股票資訊)</h4>
          <div class="test-result" :class="getStatusClass(directApiResults.quoteSummary?.status)">
            <p><strong>狀態:</strong> {{ directApiResults.quoteSummary?.status || '未測試' }}</p>
            <p v-if="directApiResults.quoteSummary?.error"><strong>錯誤:</strong> {{ directApiResults.quoteSummary.error }}</p>
            <p v-if="directApiResults.quoteSummary?.sector"><strong>Sector:</strong> {{ directApiResults.quoteSummary.sector }}</p>
            <p v-if="directApiResults.quoteSummary?.industry"><strong>Industry:</strong> {{ directApiResults.quoteSummary.industry }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 網路環境檢測 -->
    <div class="network-info">
      <h3>🌐 網路環境資訊</h3>
      <div class="network-details">
        <p><strong>用戶代理:</strong> {{ networkInfo.userAgent }}</p>
        <p><strong>語言:</strong> {{ networkInfo.language }}</p>
        <p><strong>時區:</strong> {{ networkInfo.timezone }}</p>
        <p><strong>連線類型:</strong> {{ networkInfo.connection }}</p>
        <p><strong>是否在線:</strong> {{ networkInfo.online ? '是' : '否' }}</p>
      </div>
    </div>

    <!-- 建議和解決方案 -->
    <div v-if="diagnosticComplete" class="recommendations">
      <h3>💡 診斷結果和建議</h3>
      <div class="recommendation-content">
        <div v-if="workingProxies.length > 0" class="success-recommendation">
          <h4>✅ 可用的代理服務 ({{ workingProxies.length }}/{{ proxyResults.length }})</h4>
          <ul>
            <li v-for="proxy in workingProxies" :key="proxy.index">
              {{ proxy.name }} - 響應時間: {{ proxy.responseTime }}ms
            </li>
          </ul>
        </div>
        
        <div v-if="failedProxies.length > 0" class="warning-recommendation">
          <h4>❌ 失敗的代理服務 ({{ failedProxies.length }}/{{ proxyResults.length }})</h4>
          <ul>
            <li v-for="proxy in failedProxies" :key="proxy.index">
              {{ proxy.name }} - {{ proxy.errorType }}: {{ proxy.error }}
            </li>
          </ul>
        </div>

        <div class="solution-suggestions">
          <h4>🔧 建議解決方案</h4>
          <div v-if="workingProxies.length === 0" class="critical-suggestions">
            <p><strong>所有代理都失敗了，可能的原因和解決方案:</strong></p>
            <ul>
              <li><strong>CORS 政策:</strong> 瀏覽器阻止跨域請求，考慮使用服務端代理</li>
              <li><strong>代理服務限制:</strong> 免費代理服務可能有使用限制或需要認證</li>
              <li><strong>Yahoo Finance API 變更:</strong> API 端點或格式可能已變更</li>
              <li><strong>網路防火牆:</strong> 公司或學校網路可能阻止某些請求</li>
            </ul>
          </div>
          
          <div v-else class="optimization-suggestions">
            <p><strong>優化建議:</strong></p>
            <ul>
              <li>優先使用響應時間最快的代理: {{ fastestProxy?.name }}</li>
              <li>實施代理輪換機制以分散負載</li>
              <li>增加錯誤重試邏輯</li>
              <li>考慮緩存機制減少 API 調用</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProxyDiagnosticTest',
  data() {
    return {
      testSymbol: 'AAPL',
      testing: false,
      currentTest: '',
      diagnosticComplete: false,
      
      // Proxy 測試結果
      proxyResults: [],
      
      // 直接 API 測試結果
      directApiResults: {
        chart: null,
        quoteSummary: null
      },
      
      // 網路環境資訊
      networkInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        connection: navigator.connection?.effectiveType || 'unknown',
        online: navigator.onLine
      },
      
      // CORS 代理列表 - 2024年12月更新
      corsProxies: [
        {
          name: 'CORS.SH',
          url: 'https://cors.sh/',
          description: '專業的 CORS 代理服務，相對穩定',
          type: 'direct'
        },
        {
          name: 'Proxy CORS (isomorphic-git)',
          url: 'https://proxy-cors.isomorphic-git.org/',
          description: '由 isomorphic-git 團隊維護',
          type: 'direct'
        },
        {
          name: 'ThingProxy',
          url: 'https://thingproxy.freeboard.io/fetch/',
          description: '由 Freeboard.io 提供的代理服務',
          type: 'direct'
        },
        {
          name: 'CORS Proxy (HTMLDriven)',
          url: 'https://cors-proxy.htmldriven.com/?url=',
          description: '簡單易用的代理服務',
          type: 'query'
        },
        {
          name: 'AllOrigins',
          url: 'https://api.allorigins.win/raw?url=',
          description: '免費 CORS 代理服務 (可能有 CORS 限制)',
          type: 'query'
        },
        {
          name: 'CorsProxy.io',
          url: 'https://corsproxy.io/?',
          description: '開源 CORS 代理 (可能需要認證)',
          type: 'query'
        },
        {
          name: 'CORS Anywhere',
          url: 'https://cors-anywhere.herokuapp.com/',
          description: 'Heroku 託管的 CORS 代理 (已限制訪問)',
          type: 'direct'
        }
      ]
    }
  },
  
  computed: {
    workingProxies() {
      return this.proxyResults.filter(p => p.status === 'SUCCESS')
    },
    
    failedProxies() {
      return this.proxyResults.filter(p => p.status === 'FAILED')
    },
    
    fastestProxy() {
      const working = this.workingProxies
      if (working.length === 0) return null
      return working.reduce((fastest, current) => 
        current.responseTime < fastest.responseTime ? current : fastest
      )
    }
  },
  
  methods: {
    async runFullDiagnostic() {
      this.testing = true
      this.diagnosticComplete = false
      this.proxyResults = []
      this.directApiResults = { chart: null, quoteSummary: null }
      
      try {
        // 測試所有 CORS 代理
        await this.testAllProxies()
        
        // 測試直接 API 訪問
        await this.testDirectAPI()
        
        this.diagnosticComplete = true
      } catch (error) {
        console.error('診斷過程出錯:', error)
      } finally {
        this.testing = false
        this.currentTest = ''
      }
    },
    
    async testAllProxies() {
      for (let i = 0; i < this.corsProxies.length; i++) {
        const proxy = this.corsProxies[i]
        this.currentTest = `${proxy.name} 代理服務`
        
        const result = await this.testSingleProxy(proxy, i)
        this.proxyResults.push(result)
        
        // 添加延遲避免過於頻繁的請求
        if (i < this.corsProxies.length - 1) {
          await this.delay(1000)
        }
      }
    },
    
    async testSingleProxy(proxy, index) {
      const startTime = Date.now()
      const result = {
        index,
        name: proxy.name,
        url: proxy.url,
        type: proxy.type,
        status: 'TESTING',
        responseTime: 0,
        httpStatus: null,
        error: null,
        errorType: null,
        data: null,
        dataPoints: 0,
        priceRange: null
      }
      
      try {
        // 構建測試 URL - 根據代理類型
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${this.testSymbol}?interval=1d&range=1mo`
        let testUrl
        
        if (proxy.type === 'query') {
          // 查詢參數類型: ?url=
          testUrl = `${proxy.url}${encodeURIComponent(targetUrl)}`
        } else {
          // 直接拼接類型
          testUrl = `${proxy.url}${targetUrl}`
        }
        
        console.log(`Testing ${proxy.name}:`, testUrl.substring(0, 120) + '...')
        
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        
        result.responseTime = Date.now() - startTime
        result.httpStatus = response.status
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        // 驗證數據結構
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
          throw new Error('Invalid data structure - no chart results')
        }
        
        const chartResult = data.chart.result[0]
        const quotes = chartResult.indicators?.quote?.[0]
        
        if (!quotes || !quotes.close) {
          throw new Error('Invalid data structure - no price data')
        }
        
        const closes = quotes.close.filter(price => price !== null)
        
        result.status = 'SUCCESS'
        result.data = data
        result.dataPoints = closes.length
        result.priceRange = {
          min: Math.min(...closes).toFixed(2),
          max: Math.max(...closes).toFixed(2)
        }
        
        console.log(`✅ ${proxy.name} 成功:`, {
          responseTime: result.responseTime,
          dataPoints: result.dataPoints,
          priceRange: result.priceRange
        })
        
      } catch (error) {
        result.status = 'FAILED'
        result.responseTime = Date.now() - startTime
        result.error = error.message
        
        // 分類錯誤類型
        if (error.message.includes('CORS') || error.message.includes('cors')) {
          result.errorType = 'CORS_ERROR'
        } else if (error.message.includes('401')) {
          result.errorType = 'UNAUTHORIZED'
        } else if (error.message.includes('403')) {
          result.errorType = 'FORBIDDEN'
        } else if (error.message.includes('404')) {
          result.errorType = 'NOT_FOUND'
        } else if (error.message.includes('429')) {
          result.errorType = 'RATE_LIMITED'
        } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
          result.errorType = 'NETWORK_ERROR'
        } else if (error.message.includes('Invalid data structure')) {
          result.errorType = 'DATA_FORMAT_ERROR'
        } else if (error.message.includes('timeout')) {
          result.errorType = 'TIMEOUT_ERROR'
        } else {
          result.errorType = 'UNKNOWN_ERROR'
        }
        
        console.log(`❌ ${proxy.name} 失敗:`, {
          errorType: result.errorType,
          error: result.error,
          responseTime: result.responseTime
        })
      }
      
      return result
    },
    
    async testDirectAPI() {
      this.currentTest = 'Yahoo Finance API 直接訪問'
      
      // 測試 Chart API
      try {
        const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${this.testSymbol}?interval=1d&range=1mo`
        const chartResponse = await fetch(chartUrl)
        
        if (chartResponse.ok) {
          const chartData = await chartResponse.json()
          const dataPoints = chartData.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(p => p !== null)?.length || 0
          
          this.directApiResults.chart = {
            status: 'SUCCESS',
            dataPoints
          }
        } else {
          throw new Error(`HTTP ${chartResponse.status}`)
        }
      } catch (error) {
        this.directApiResults.chart = {
          status: 'FAILED',
          error: error.message
        }
      }
      
      // 測試 Quote Summary API
      try {
        const quoteUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${this.testSymbol}?modules=summaryProfile`
        const quoteResponse = await fetch(quoteUrl)
        
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json()
          const profile = quoteData.quoteSummary?.result?.[0]?.summaryProfile
          
          this.directApiResults.quoteSummary = {
            status: 'SUCCESS',
            sector: profile?.sector,
            industry: profile?.industry
          }
        } else {
          throw new Error(`HTTP ${quoteResponse.status}`)
        }
      } catch (error) {
        this.directApiResults.quoteSummary = {
          status: 'FAILED',
          error: error.message
        }
      }
    },
    
    getStatusClass(status) {
      switch (status) {
        case 'SUCCESS': return 'success'
        case 'FAILED': return 'failed'
        case 'TESTING': return 'testing'
        default: return 'unknown'
      }
    },
    
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }
  }
}
</script>

<style scoped>
.proxy-diagnostic {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.test-header {
  text-align: center;
  margin-bottom: 2rem;
}

.test-header h2 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.test-controls {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.symbol-input {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.symbol-input input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100px;
}

.symbol-input button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.symbol-input button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e9ecef;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.proxy-results, .direct-api-test, .network-info, .recommendations {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.proxy-results h3, .direct-api-test h3, .network-info h3, .recommendations h3 {
  margin: 0 0 1.5rem 0;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
  padding-bottom: 0.5rem;
}

.proxy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.proxy-card {
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.3s;
}

.proxy-card.success {
  border-color: #28a745;
  background: #f8fff9;
}

.proxy-card.failed {
  border-color: #dc3545;
  background: #fff8f8;
}

.proxy-card.testing {
  border-color: #ffc107;
  background: #fffdf5;
}

.proxy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.proxy-header h4 {
  margin: 0;
  color: #495057;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.success {
  background: #d4edda;
  color: #155724;
}

.status-badge.failed {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.testing {
  background: #fff3cd;
  color: #856404;
}

.proxy-details p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.error-details {
  background: #f8d7da;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.success-details {
  background: #d4edda;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.api-test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.api-test-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
}

.api-test-card h4 {
  margin: 0 0 1rem 0;
  color: #495057;
}

.test-result {
  padding: 1rem;
  border-radius: 4px;
}

.test-result.success {
  background: #d4edda;
  color: #155724;
}

.test-result.failed {
  background: #f8d7da;
  color: #721c24;
}

.network-details p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #6c757d;
}

.recommendation-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.success-recommendation {
  background: #d4edda;
  padding: 1.5rem;
  border-radius: 8px;
  color: #155724;
}

.warning-recommendation {
  background: #f8d7da;
  padding: 1.5rem;
  border-radius: 8px;
  color: #721c24;
}

.solution-suggestions {
  background: #e2f3ff;
  padding: 1.5rem;
  border-radius: 8px;
  color: #004085;
}

.critical-suggestions {
  background: #fff3cd;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  color: #856404;
}

.optimization-suggestions {
  background: #d1ecf1;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  color: #0c5460;
}

ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

li {
  margin: 0.25rem 0;
}

@media (max-width: 768px) {
  .proxy-diagnostic {
    padding: 1rem;
  }
  
  .proxy-grid, .api-test-grid {
    grid-template-columns: 1fr;
  }
  
  .symbol-input {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>