<template>
  <div class="validation-page">
    <div class="validation-header">
      <h2>技術指標驗證</h2>
      <p>對比我們的計算結果與 TradingView 的數據</p>
    </div>

    <div class="validation-controls">
      <div class="symbol-input">
        <label>股票代號:</label>
        <input 
          v-model="testSymbol" 
          type="text" 
          placeholder="例如: AAPL"
          @keyup.enter="loadData()"
        />
        <button @click="loadData()" :disabled="loading">
          {{ loading ? '載入中...' : '載入數據' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-section">
      <div class="loading-spinner"></div>
      <p>正在載入數據...</p>
    </div>

    <div v-if="ourData && !loading" class="comparison-section">
      <h3>{{ testSymbol }} 技術指標對比</h3>
      
      <div class="comparison-grid">
        <!-- 我們的計算結果 -->
        <div class="our-results">
          <h4>我們的計算結果</h4>
          <div class="indicator-list">
            <div class="indicator-item">
              <strong>SMA(50):</strong> {{ ourData.sma50?.value || 'N/A' }}
              <span class="signal" :class="getSignalClass(ourData.sma50?.signal)">
                {{ ourData.sma50?.signal }}
              </span>
            </div>
            <div class="indicator-item">
              <strong>RSI(14):</strong> {{ ourData.rsi14?.value || 'N/A' }}
              <span class="signal" :class="getSignalClass(ourData.rsi14?.signal)">
                {{ ourData.rsi14?.signal }}
              </span>
            </div>
            <div class="indicator-item">
              <strong>MACD:</strong> {{ ourData.macd?.value || 'N/A' }}
              <span class="signal" :class="getSignalClass(ourData.macd?.signal)">
                {{ ourData.macd?.signal }}
              </span>
            </div>
          </div>
          
          <div class="debug-info">
            <h5>調試信息</h5>
            <p><strong>數據點:</strong> {{ ourData.dataPoints }}</p>
            <p><strong>價格範圍:</strong> ${{ ourData.priceRange?.min }} - ${{ ourData.priceRange?.max }}</p>
            <p><strong>最新價格:</strong> ${{ ourData.priceRange?.latest }}</p>
            <p><strong>當前價格:</strong> ${{ ourData.sma50?.currentPrice }}</p>
          </div>
        </div>

        <!-- TradingView Widget -->
        <div class="tradingview-results">
          <h4>TradingView 技術分析</h4>
          <div class="tradingview-widget-container">
            <div class="tradingview-widget" :id="`tradingview-widget-${testSymbol}`"></div>
          </div>
        </div>
      </div>

      <!-- 詳細對比 -->
      <div class="detailed-comparison">
        <h4>詳細數據對比</h4>
        <div class="comparison-table">
          <table>
            <thead>
              <tr>
                <th>指標</th>
                <th>我們的結果</th>
                <th>TradingView</th>
                <th>差異</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>SMA(50)</td>
                <td>${{ ourData.sma50?.value || 'N/A' }}</td>
                <td>請查看右側 Widget</td>
                <td>-</td>
                <td>{{ ourData.sma50?.signal }}</td>
              </tr>
              <tr>
                <td>RSI(14)</td>
                <td>{{ ourData.rsi14?.value || 'N/A' }}</td>
                <td>請查看右側 Widget</td>
                <td>-</td>
                <td>{{ ourData.rsi14?.signal }}</td>
              </tr>
              <tr>
                <td>MACD</td>
                <td>{{ ourData.macd?.value || 'N/A' }}</td>
                <td>請查看右側 Widget</td>
                <td>-</td>
                <td>{{ ourData.macd?.signal }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import yahooFinanceAPI from '@/api/yahooFinanceApi.js'

export default {
  name: 'TechnicalIndicatorsValidation',
  data() {
    return {
      testSymbol: 'AAPL',
      loading: false,
      ourData: null,
      tradingViewWidget: null
    }
  },
  methods: {
    async loadData() {
      if (!this.testSymbol) return;
      
      this.loading = true;
      this.ourData = null;
      
      try {
        // 設置為 API 模式
        yahooFinanceAPI.setMockMode(false);
        
        // 獲取我們的計算結果
        this.ourData = await yahooFinanceAPI.getTechnicalIndicators(this.testSymbol);
        
        // 載入 TradingView Widget
        this.loadTradingViewWidget();
        
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        this.loading = false;
      }
    },
    
    loadTradingViewWidget() {
      // 清除現有的 widget
      if (this.tradingViewWidget) {
        const container = document.getElementById(`tradingview-widget-${this.testSymbol}`);
        if (container) {
          container.innerHTML = '';
        }
      }
      
      // 創建新的 TradingView widget
      setTimeout(() => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
          "interval": "1D",
          "width": "100%",
          "height": "400",
          "isTransparent": false,
          "symbol": `NASDAQ:${this.testSymbol}`,
          "showIntervalTabs": true,
          "locale": "en",
          "colorTheme": "light"
        });
        
        const container = document.getElementById(`tradingview-widget-${this.testSymbol}`);
        if (container) {
          container.appendChild(script);
        }
      }, 100);
    },
    
    getSignalClass(signal) {
      if (!signal) return 'neutral';
      
      const bullishSignals = ['BUY', 'OVERSOLD'];
      const bearishSignals = ['SELL', 'OVERBOUGHT'];
      
      if (bullishSignals.includes(signal)) return 'bullish';
      if (bearishSignals.includes(signal)) return 'bearish';
      return 'neutral';
    }
  },
  
  mounted() {
    this.loadData();
  }
}
</script>

<style scoped>
.validation-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.validation-header {
  text-align: center;
  margin-bottom: 2rem;
}

.validation-header h2 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.validation-controls {
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

.symbol-input label {
  font-weight: 600;
  min-width: 100px;
}

.symbol-input input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  max-width: 200px;
}

.symbol-input button {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.symbol-input button:hover:not(:disabled) {
  background: #0056b3;
}

.symbol-input button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.loading-section {
  text-align: center;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
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

.comparison-section {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 2rem;
}

.comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 2rem 0;
}

.our-results, .tradingview-results {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

.our-results h4, .tradingview-results h4 {
  margin: 0 0 1rem 0;
  color: #495057;
}

.indicator-list {
  margin-bottom: 1.5rem;
}

.indicator-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e9ecef;
}

.indicator-item:last-child {
  border-bottom: none;
}

.signal {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.signal.bullish {
  background: #d4edda;
  color: #155724;
}

.signal.bearish {
  background: #f8d7da;
  color: #721c24;
}

.signal.neutral {
  background: #e9ecef;
  color: #495057;
}

.debug-info {
  background: white;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.debug-info h5 {
  margin: 0 0 0.5rem 0;
  color: #495057;
  font-size: 0.9rem;
}

.debug-info p {
  margin: 0.25rem 0;
  font-size: 0.8rem;
  color: #6c757d;
}

.tradingview-widget-container {
  height: 400px;
  background: white;
  border-radius: 4px;
  overflow: hidden;
}

.detailed-comparison {
  margin-top: 2rem;
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
}

.detailed-comparison h4 {
  margin: 0 0 1rem 0;
  color: #495057;
}

.comparison-table {
  overflow-x: auto;
}

.comparison-table table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
}

.comparison-table th,
.comparison-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.comparison-table th {
  background: #e9ecef;
  font-weight: 600;
  color: #495057;
}

.comparison-table tr:last-child td {
  border-bottom: none;
}

@media (max-width: 768px) {
  .validation-page {
    padding: 1rem;
  }
  
  .comparison-grid {
    grid-template-columns: 1fr;
  }
  
  .symbol-input {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>