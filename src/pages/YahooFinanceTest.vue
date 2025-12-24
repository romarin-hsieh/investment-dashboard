<template>
  <div class="yahoo-finance-test">
    <div class="test-header">
      <h2>Yahoo Finance API 測試</h2>
      <p>測試 Yahoo Finance API 的技術指標數據獲取功能</p>
    </div>

    <div class="test-controls">
      <div class="symbol-input">
        <label for="symbol">股票代號:</label>
        <input 
          id="symbol"
          v-model="testSymbol" 
          type="text" 
          placeholder="例如: AAPL, TSLA, ONDS"
          @keyup.enter="testSymbol && loadTestData()"
        />
        <button 
          @click="loadTestData()" 
          :disabled="!testSymbol || loading"
          class="test-btn"
        >
          {{ loading ? '載入中...' : '測試' }}
        </button>
      </div>
      
      <div class="preset-symbols">
        <span>快速測試:</span>
        <button 
          v-for="symbol in presetSymbols" 
          :key="symbol"
          @click="testSymbol = symbol; loadTestData()"
          :disabled="loading"
          class="preset-btn"
        >
          {{ symbol }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-section">
      <div class="loading-spinner"></div>
      <p>正在從 Yahoo Finance 獲取 {{ testSymbol }} 的技術指標數據...</p>
    </div>

    <div v-if="error" class="error-section">
      <h3>❌ 錯誤</h3>
      <p>{{ error }}</p>
    </div>

    <div v-if="testData && !loading" class="results-section">
      <h3>✅ {{ testSymbol }} 技術指標結果</h3>
      
      <div class="indicators-grid">
        <!-- 移動平均線組 -->
        <div class="indicator-section">
          <h3>移動平均線 (Moving Averages)</h3>
          <div class="ma-grid">
            <!-- MA5/SMA5 -->
            <div class="indicator-card compact">
              <h4>MA5 / SMA5</h4>
              <div class="indicator-details">
                <div class="main-value" :class="getSignalClass(testData.ma5?.signal)">
                  {{ testData.ma5?.value || 'N/A' }}
                </div>
                <div class="signal-badge" :class="getSignalClass(testData.ma5?.signal)">
                  {{ testData.ma5?.signal || 'N/A' }}
                </div>
              </div>
            </div>

            <!-- MA10/SMA10 -->
            <div class="indicator-card compact">
              <h4>MA10 / SMA10</h4>
              <div class="indicator-details">
                <div class="main-value" :class="getSignalClass(testData.ma10?.signal)">
                  {{ testData.ma10?.value || 'N/A' }}
                </div>
                <div class="signal-badge" :class="getSignalClass(testData.ma10?.signal)">
                  {{ testData.ma10?.signal || 'N/A' }}
                </div>
              </div>
            </div>

            <!-- MA30/SMA30 -->
            <div class="indicator-card compact">
              <h4>MA30 / SMA30</h4>
              <div class="indicator-details">
                <div class="main-value" :class="getSignalClass(testData.ma30?.signal)">
                  {{ testData.ma30?.value || 'N/A' }}
                </div>
                <div class="signal-badge" :class="getSignalClass(testData.ma30?.signal)">
                  {{ testData.ma30?.signal || 'N/A' }}
                </div>
              </div>
            </div>

            <!-- SMA50 -->
            <div class="indicator-card compact">
              <h4>SMA50</h4>
              <div class="indicator-details">
                <div class="main-value" :class="getSignalClass(testData.sma50?.signal)">
                  {{ testData.sma50?.value || 'N/A' }}
                </div>
                <div class="signal-badge" :class="getSignalClass(testData.sma50?.signal)">
                  {{ testData.sma50?.signal || 'N/A' }}
                </div>
                <div class="additional-info">
                  <small>當前價格: ${{ testData.sma50?.currentPrice || 'N/A' }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 一目均衡表組 -->
        <div class="indicator-section">
          <h3>一目均衡表 (Ichimoku Cloud)</h3>
          <div class="ichimoku-grid">
            <!-- 轉換線 -->
            <div class="indicator-card compact">
              <h4>轉換線 (9)</h4>
              <div class="indicator-details">
                <div class="main-value" :class="getSignalClass(testData.ichimokuConversionLine?.signal)">
                  {{ testData.ichimokuConversionLine?.value || 'N/A' }}
                </div>
                <div class="signal-badge" :class="getSignalClass(testData.ichimokuConversionLine?.signal)">
                  {{ testData.ichimokuConversionLine?.signal || 'N/A' }}
                </div>
                <div class="additional-info">
                  <small>最高: {{ testData.ichimokuConversionLine?.highestHigh || 'N/A' }}</small>
                  <small>最低: {{ testData.ichimokuConversionLine?.lowestLow || 'N/A' }}</small>
                </div>
              </div>
            </div>

            <!-- 基準線 -->
            <div class="indicator-card compact">
              <h4>基準線 (26)</h4>
              <div class="indicator-details">
                <div class="main-value" :class="getSignalClass(testData.ichimokuBaseLine?.signal)">
                  {{ testData.ichimokuBaseLine?.value || 'N/A' }}
                </div>
                <div class="signal-badge" :class="getSignalClass(testData.ichimokuBaseLine?.signal)">
                  {{ testData.ichimokuBaseLine?.signal || 'N/A' }}
                </div>
                <div class="additional-info">
                  <small>最高: {{ testData.ichimokuBaseLine?.highestHigh || 'N/A' }}</small>
                  <small>最低: {{ testData.ichimokuBaseLine?.lowestLow || 'N/A' }}</small>
                </div>
              </div>
            </div>

            <!-- 遲行線 -->
            <div class="indicator-card compact">
              <h4>遲行線 (26)</h4>
              <div class="indicator-details">
                <div class="main-value" :class="getSignalClass(testData.ichimokuLaggingSpan?.signal)">
                  {{ testData.ichimokuLaggingSpan?.value || 'N/A' }}
                </div>
                <div class="signal-badge" :class="getSignalClass(testData.ichimokuLaggingSpan?.signal)">
                  {{ testData.ichimokuLaggingSpan?.signal || 'N/A' }}
                </div>
                <div class="additional-info">
                  <small>參考價: {{ testData.ichimokuLaggingSpan?.laggingReference || 'N/A' }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 成交量加權移動平均線 -->
        <div class="indicator-section">
          <h3>成交量加權移動平均線 (VWMA)</h3>
          <div class="vwma-grid">
            <div class="indicator-card">
              <h4>VWMA (20)</h4>
              <div class="indicator-details">
                <div class="main-value" :class="getSignalClass(testData.vwma20?.signal)">
                  {{ testData.vwma20?.value || 'N/A' }}
                </div>
                <div class="signal-badge" :class="getSignalClass(testData.vwma20?.signal)">
                  {{ testData.vwma20?.signal || 'N/A' }}
                </div>
                <div class="additional-info">
                  <small>當前價格: ${{ testData.vwma20?.currentPrice || 'N/A' }}</small>
                  <small>總成交量: {{ testData.vwma20?.totalVolume || 'N/A' }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 技術指標組 -->
        <div class="indicator-section">
          <h3>技術指標 (Technical Indicators)</h3>
          <div class="technical-grid">
            <!-- RSI(14) -->
            <div class="indicator-card">
              <h4>Relative Strength Index (14)</h4>
              <div class="indicator-details">
                <div class="main-value" :class="getSignalClass(testData.rsi14?.signal)">
                  {{ testData.rsi14?.value || 'N/A' }}
                </div>
                <div class="signal-badge" :class="getSignalClass(testData.rsi14?.signal)">
                  {{ testData.rsi14?.signal || 'N/A' }}
                </div>
                <div class="rsi-bar" v-if="testData.rsi14?.value">
                  <div class="rsi-fill" :style="{ width: testData.rsi14.value + '%' }"></div>
                </div>
              </div>
            </div>

            <!-- ADX(14) -->
            <div class="indicator-card">
              <h4>Average Directional Index (14)</h4>
              <div class="indicator-details">
                <div class="main-value" :class="getSignalClass(testData.adx14?.signal)">
                  {{ testData.adx14?.value || 'N/A' }}
                </div>
                <div class="signal-badge" :class="getSignalClass(testData.adx14?.signal)">
                  {{ testData.adx14?.signal || 'N/A' }}
                </div>
                <div class="additional-info">
                  <small>+DI: {{ testData.adx14?.plusDI || 'N/A' }}</small>
                  <small>-DI: {{ testData.adx14?.minusDI || 'N/A' }}</small>
                </div>
              </div>
            </div>

            <!-- MACD -->
            <div class="indicator-card">
              <h4>MACD Level (12, 26)</h4>
              <div class="indicator-details">
                <div class="main-value" :class="getSignalClass(testData.macd?.signal)">
                  {{ testData.macd?.value || 'N/A' }}
                </div>
                <div class="signal-badge" :class="getSignalClass(testData.macd?.signal)">
                  {{ testData.macd?.signal || 'N/A' }}
                </div>
                <div class="additional-info">
                  <small>信號線: {{ testData.macd?.signalLine || 'N/A' }}</small>
                  <small>柱狀圖: {{ testData.macd?.histogram || 'N/A' }}</small>
                  <small>EMA12: {{ testData.macd?.ema12 || 'N/A' }}</small>
                  <small>EMA26: {{ testData.macd?.ema26 || 'N/A' }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="metadata">
        <p><strong>最後更新:</strong> {{ formatDate(testData.lastUpdated) }}</p>
        <p><strong>數據來源:</strong> {{ testData.source || 'Yahoo Finance' }}</p>
        <p v-if="testData.proxy"><strong>代理服務:</strong> {{ testData.proxy }}</p>
        <p v-if="testData.dataPoints"><strong>數據點數量:</strong> {{ testData.dataPoints }}</p>
        <p v-if="testData.error" class="error-text"><strong>注意:</strong> {{ testData.error }}</p>
      </div>
    </div>

    <div class="cache-section">
      <h3>緩存狀態</h3>
      <button @click="loadCacheStatus()" class="cache-btn">檢查緩存</button>
      <button @click="clearCache()" class="cache-btn">清除所有緩存</button>
      
      <div v-if="cacheStatus" class="cache-info">
        <h4>API 請求緩存 (5分鐘)</h4>
        <pre>{{ JSON.stringify(cacheStatus.apiCache, null, 2) }}</pre>
        
        <h4>每日技術指標緩存 (24小時)</h4>
        <pre>{{ JSON.stringify(cacheStatus.dailyCache, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
import yahooFinanceAPI from '../utils/yahooFinanceApi.js'

export default {
  name: 'YahooFinanceTest',
  data() {
    return {
      testSymbol: 'AAPL',
      loading: false,
      error: null,
      testData: null,
      cacheStatus: null,
      presetSymbols: ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'ONDS', 'RDW']
    }
  },
  methods: {
    async loadTestData() {
      if (!this.testSymbol) return;
      
      this.loading = true;
      this.error = null;
      this.testData = null;
      
      try {
        console.log(`Testing Yahoo Finance API for ${this.testSymbol}...`);
        this.testData = await yahooFinanceAPI.getTechnicalIndicators(this.testSymbol);
        
        if (this.testData.error) {
          this.error = this.testData.error;
        }
        
      } catch (err) {
        this.error = err.message;
        console.error('Test failed:', err);
      } finally {
        this.loading = false;
      }
    },
    
    getSignalClass(signal) {
      if (!signal) return 'neutral';
      
      const bullishSignals = ['BUY', 'OVERSOLD', 'STRONG_TREND'];
      const bearishSignals = ['SELL', 'OVERBOUGHT'];
      const neutralSignals = ['WEAK_TREND'];
      
      if (bullishSignals.includes(signal)) return 'bullish';
      if (bearishSignals.includes(signal)) return 'bearish';
      return 'neutral';
    },
    
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString('zh-TW');
    },
    
    async loadCacheStatus() {
      this.cacheStatus = yahooFinanceAPI.getCacheStats();
    },
    
    clearCache() {
      yahooFinanceAPI.clearCache();
      yahooFinanceAPI.clearDailyCache();
      this.cacheStatus = null;
      alert('所有緩存已清除 (API 緩存 + 每日緩存)');
    }
  },
  
  mounted() {
    // 自動載入 AAPL 數據作為示例
    this.loadTestData();
  }
}
</script>

<style scoped>
.yahoo-finance-test {
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
  margin-bottom: 1rem;
}

.symbol-input label {
  font-weight: 600;
  min-width: 80px;
}

.symbol-input input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.test-btn, .preset-btn, .cache-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.test-btn {
  background: #007bff;
  color: white;
}

.test-btn:hover:not(:disabled) {
  background: #0056b3;
}

.test-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.preset-symbols {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preset-btn {
  background: #e9ecef;
  color: #495057;
  border: 1px solid #ced4da;
}

.preset-btn:hover:not(:disabled) {
  background: #dee2e6;
}

.loading-section {
  text-align: center;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.loading-spinner {
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

.error-section {
  background: #f8d7da;
  color: #721c24;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.results-section {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.indicators-grid {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin: 1.5rem 0;
}

.indicator-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
}

.indicator-section h3 {
  margin: 0 0 1rem 0;
  color: #495057;
  font-size: 1.1rem;
  border-bottom: 2px solid #dee2e6;
  padding-bottom: 0.5rem;
}

.ma-grid, .ichimoku-grid, .technical-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.vwma-grid {
  display: grid;
  grid-template-columns: 1fr;
  max-width: 400px;
}

.indicator-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
}

.indicator-card.compact {
  padding: 1rem;
}

.indicator-card h4 {
  margin: 0 0 1rem 0;
  color: #495057;
  font-size: 0.95rem;
}

.main-value {
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.signal-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.bullish {
  color: #155724;
  background: #d4edda;
}

.bearish {
  color: #721c24;
  background: #f8d7da;
}

.neutral {
  color: #495057;
  background: #e9ecef;
}

.additional-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.additional-info small {
  color: #6c757d;
  font-size: 0.8rem;
}

.rsi-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.rsi-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745 0%, #ffc107 50%, #dc3545 100%);
  transition: width 0.3s ease;
}

.metadata {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1.5rem;
}

.metadata p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: #6c757d;
}

.error-text {
  color: #dc3545 !important;
  font-weight: 600;
}

.cache-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

.cache-section h3 {
  margin: 0 0 1rem 0;
  color: #495057;
}

.cache-btn {
  background: #6c757d;
  color: white;
  margin-right: 0.5rem;
}

.cache-btn:hover {
  background: #545b62;
}

.cache-info {
  margin-top: 1rem;
  background: white;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.cache-info pre {
  margin: 0;
  font-size: 0.8rem;
  color: #495057;
  white-space: pre-wrap;
}

@media (max-width: 768px) {
  .yahoo-finance-test {
    padding: 1rem;
  }
  
  .symbol-input {
    flex-direction: column;
    align-items: stretch;
  }
  
  .preset-symbols {
    justify-content: center;
  }
  
  .ma-grid, .ichimoku-grid, .technical-grid {
    grid-template-columns: 1fr;
  }
}
</style>