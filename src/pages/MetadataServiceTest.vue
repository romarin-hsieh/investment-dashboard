<template>
  <div class="metadata-test-container">
    <div class="header">
      <h1>元數據服務測試</h1>
      <p>測試動態 Yahoo Finance API vs 靜態文件的 sector/industry 數據</p>
    </div>

    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="mode-selector">
        <label>
          <input 
            type="radio" 
            :value="true" 
            v-model="useDynamicAPI"
            @change="switchMode"
          />
          動態 API (Yahoo Finance)
        </label>
        <label>
          <input 
            type="radio" 
            :value="false" 
            v-model="useDynamicAPI"
            @change="switchMode"
          />
          靜態文件 (symbols_metadata.json)
        </label>
      </div>

      <div class="test-controls">
        <button @click="testSingleSymbol" :disabled="loading">
          測試單個股票
        </button>
        <button @click="testBatchSymbols" :disabled="loading">
          批量測試
        </button>
        <button @click="clearCache" :disabled="loading">
          清除緩存
        </button>
        <button @click="warmupCache" :disabled="loading">
          預熱緩存
        </button>
      </div>

      <div class="symbol-input">
        <input 
          v-model="testSymbol" 
          placeholder="輸入股票代碼 (例如: AAPL)"
          @keyup.enter="testSingleSymbol"
        />
      </div>
    </div>

    <!-- 狀態顯示 -->
    <div class="status-panel" v-if="loading || error || successMessage">
      <div v-if="loading" class="loading">
        <span class="spinner"></span>
        {{ loadingMessage }}
      </div>
      <div v-if="error" class="error">
        ❌ {{ error }}
      </div>
      <div v-if="successMessage" class="success">
        ✅ {{ successMessage }}
      </div>
    </div>

    <!-- 緩存統計 -->
    <div class="cache-stats" v-if="cacheStats">
      <h3>緩存統計</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <label>模式:</label>
          <span>{{ cacheStats.mode === 'dynamic' ? '動態 API' : '靜態文件' }}</span>
        </div>
        <div class="stat-item">
          <label>緩存條目:</label>
          <span>{{ cacheStats.totalCached || 0 }}</span>
        </div>
        <div class="stat-item" v-if="cacheStats.mode === 'static'">
          <label>元數據已載入:</label>
          <span>{{ cacheStats.metadataLoaded ? '是' : '否' }}</span>
        </div>
      </div>
    </div>

    <!-- 測試結果 -->
    <div class="results-section" v-if="testResults.length > 0">
      <h3>測試結果</h3>
      <div class="results-grid">
        <div 
          v-for="result in testResults" 
          :key="result.symbol"
          class="result-card"
          :class="getResultCardClass(result)"
        >
          <div class="result-header">
            <h4>{{ result.symbol }}</h4>
            <span class="confidence-badge" :class="getConfidenceBadgeClass(result.confidence)">
              {{ (result.confidence * 100).toFixed(0) }}%
            </span>
          </div>
          
          <div class="result-content">
            <div class="metadata-row">
              <label>Sector:</label>
              <span>{{ result.sector }}</span>
            </div>
            <div class="metadata-row">
              <label>Industry:</label>
              <span>{{ result.industry }}</span>
            </div>
            <div class="metadata-row">
              <label>Exchange:</label>
              <span>{{ result.exchange }}</span>
            </div>
            <div class="metadata-row" v-if="result.marketCapFormatted">
              <label>Market Cap:</label>
              <span>{{ result.marketCapFormatted }}</span>
            </div>
            <div class="metadata-row" v-if="result.country">
              <label>Country:</label>
              <span>{{ result.country }}</span>
            </div>
          </div>

          <div class="result-footer">
            <div class="source-info">
              <small>{{ result.source }}</small>
            </div>
            <div class="timestamp">
              <small>{{ formatTimestamp(result.lastUpdated) }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 比較結果 -->
    <div class="comparison-section" v-if="comparisonResults.length > 0">
      <h3>動態 vs 靜態比較</h3>
      <div class="comparison-table">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>動態 API - Sector</th>
              <th>靜態文件 - Sector</th>
              <th>動態 API - Industry</th>
              <th>靜態文件 - Industry</th>
              <th>匹配度</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="comp in comparisonResults" :key="comp.symbol">
              <td>{{ comp.symbol }}</td>
              <td>{{ comp.dynamic.sector }}</td>
              <td>{{ comp.static.sector }}</td>
              <td>{{ comp.dynamic.industry }}</td>
              <td>{{ comp.static.industry }}</td>
              <td>
                <span class="match-indicator" :class="comp.matchClass">
                  {{ comp.matchScore }}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { metadataService } from '@/utils/metadataService.js'

export default {
  name: 'MetadataServiceTest',
  data() {
    return {
      useDynamicAPI: true,
      loading: false,
      loadingMessage: '',
      error: null,
      successMessage: null,
      testSymbol: 'AAPL',
      testResults: [],
      comparisonResults: [],
      cacheStats: null,
      
      // 測試用的股票列表
      testSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'AMZN', 'NFLX', 'ASTS', 'RIVN']
    }
  },
  
  async mounted() {
    await this.updateCacheStats()
  },
  
  methods: {
    async switchMode() {
      try {
        metadataService.setUseDynamicAPI(this.useDynamicAPI)
        await this.updateCacheStats()
        this.successMessage = `已切換到${this.useDynamicAPI ? '動態 API' : '靜態文件'}模式`
        setTimeout(() => { this.successMessage = null }, 3000)
      } catch (error) {
        this.error = `切換模式失敗: ${error.message}`
        setTimeout(() => { this.error = null }, 5000)
      }
    },

    async testSingleSymbol() {
      if (!this.testSymbol.trim()) {
        this.error = '請輸入股票代碼'
        setTimeout(() => { this.error = null }, 3000)
        return
      }

      this.loading = true
      this.loadingMessage = `正在獲取 ${this.testSymbol} 的元數據...`
      this.error = null

      try {
        const startTime = Date.now()
        const metadata = await metadataService.getSymbolMetadata(this.testSymbol.toUpperCase())
        const duration = Date.now() - startTime

        // 添加到結果列表
        const result = {
          ...metadata,
          duration,
          timestamp: new Date().toISOString()
        }

        // 更新結果列表 (保持最新的在前面)
        this.testResults = [result, ...this.testResults.filter(r => r.symbol !== result.symbol)]

        this.successMessage = `成功獲取 ${result.symbol} 的元數據 (${duration}ms)`
        setTimeout(() => { this.successMessage = null }, 3000)

        await this.updateCacheStats()
      } catch (error) {
        this.error = `獲取元數據失敗: ${error.message}`
        setTimeout(() => { this.error = null }, 5000)
      } finally {
        this.loading = false
        this.loadingMessage = ''
      }
    },

    async testBatchSymbols() {
      this.loading = true
      this.loadingMessage = `正在批量獲取 ${this.testSymbols.length} 個股票的元數據...`
      this.error = null

      try {
        const startTime = Date.now()
        const metadataMap = await metadataService.getBatchMetadata(this.testSymbols)
        const duration = Date.now() - startTime

        // 轉換為結果數組
        const results = []
        for (const [symbol, metadata] of metadataMap) {
          results.push({
            ...metadata,
            duration: duration / metadataMap.size, // 平均時間
            timestamp: new Date().toISOString()
          })
        }

        this.testResults = results
        this.successMessage = `成功批量獲取 ${results.length} 個股票的元數據 (${duration}ms)`
        setTimeout(() => { this.successMessage = null }, 3000)

        await this.updateCacheStats()
      } catch (error) {
        this.error = `批量獲取失敗: ${error.message}`
        setTimeout(() => { this.error = null }, 5000)
      } finally {
        this.loading = false
        this.loadingMessage = ''
      }
    },

    async clearCache() {
      this.loading = true
      this.loadingMessage = '正在清除緩存...'

      try {
        metadataService.clearCache()
        await this.updateCacheStats()
        this.successMessage = '緩存已清除'
        setTimeout(() => { this.successMessage = null }, 3000)
      } catch (error) {
        this.error = `清除緩存失敗: ${error.message}`
        setTimeout(() => { this.error = null }, 5000)
      } finally {
        this.loading = false
        this.loadingMessage = ''
      }
    },

    async warmupCache() {
      this.loading = true
      this.loadingMessage = '正在預熱緩存...'

      try {
        const result = await metadataService.warmupCache(this.testSymbols)
        await this.updateCacheStats()
        
        this.successMessage = `緩存預熱完成: ${result.symbolsProcessed} 個股票, ${result.duration}ms`
        setTimeout(() => { this.successMessage = null }, 3000)
      } catch (error) {
        this.error = `預熱緩存失敗: ${error.message}`
        setTimeout(() => { this.error = null }, 5000)
      } finally {
        this.loading = false
        this.loadingMessage = ''
      }
    },

    async updateCacheStats() {
      try {
        this.cacheStats = metadataService.getCacheStats()
      } catch (error) {
        console.warn('Failed to get cache stats:', error)
      }
    },

    getResultCardClass(result) {
      if (result.confidence >= 0.9) return 'high-confidence'
      if (result.confidence >= 0.7) return 'medium-confidence'
      if (result.confidence >= 0.5) return 'low-confidence'
      return 'no-confidence'
    },

    getConfidenceBadgeClass(confidence) {
      if (confidence >= 0.9) return 'high'
      if (confidence >= 0.7) return 'medium'
      if (confidence >= 0.5) return 'low'
      return 'none'
    },

    formatTimestamp(timestamp) {
      if (!timestamp) return 'N/A'
      return new Date(timestamp).toLocaleString('zh-TW')
    }
  }
}
</script>

<style scoped>
.metadata-test-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.header p {
  color: #7f8c8d;
  font-size: 16px;
}

.control-panel {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.mode-selector {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.mode-selector label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
}

.test-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.test-controls button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #3498db;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.test-controls button:hover:not(:disabled) {
  background: #2980b9;
}

.test-controls button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.symbol-input input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 200px;
}

.status-panel {
  margin-bottom: 20px;
}

.loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #3498db;
  font-weight: 500;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e3f2fd;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  color: #e74c3c;
  font-weight: 500;
}

.success {
  color: #27ae60;
  font-weight: 500;
}

.cache-stats {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.cache-stats h3 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
}

.stat-item label {
  font-weight: 500;
  color: #7f8c8d;
}

.results-section {
  margin-bottom: 30px;
}

.results-section h3 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.result-card {
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 15px;
  background: white;
}

.result-card.high-confidence {
  border-left: 4px solid #27ae60;
}

.result-card.medium-confidence {
  border-left: 4px solid #f39c12;
}

.result-card.low-confidence {
  border-left: 4px solid #e67e22;
}

.result-card.no-confidence {
  border-left: 4px solid #e74c3c;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.result-header h4 {
  margin: 0;
  color: #2c3e50;
}

.confidence-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.confidence-badge.high {
  background: #d5f4e6;
  color: #27ae60;
}

.confidence-badge.medium {
  background: #fef9e7;
  color: #f39c12;
}

.confidence-badge.low {
  background: #fdf2e9;
  color: #e67e22;
}

.confidence-badge.none {
  background: #fdedec;
  color: #e74c3c;
}

.result-content {
  margin-bottom: 10px;
}

.metadata-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.metadata-row label {
  font-weight: 500;
  color: #7f8c8d;
}

.result-footer {
  border-top: 1px solid #ecf0f1;
  padding-top: 8px;
  display: flex;
  justify-content: space-between;
}

.result-footer small {
  color: #95a5a6;
  font-size: 11px;
}

.comparison-section {
  margin-top: 30px;
}

.comparison-section h3 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.comparison-table {
  overflow-x: auto;
}

.comparison-table table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.comparison-table th,
.comparison-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ecf0f1;
}

.comparison-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.match-indicator {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.match-indicator.high {
  background: #d5f4e6;
  color: #27ae60;
}

.match-indicator.medium {
  background: #fef9e7;
  color: #f39c12;
}

.match-indicator.low {
  background: #fdedec;
  color: #e74c3c;
}
</style>