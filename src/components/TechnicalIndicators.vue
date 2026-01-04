<template>
  <div class="technical-indicators">
    <!-- Build Stamp -->
    <h4 class="build-stamp">Technical Indicators - BUILD-2026-01-03-HYBRID-V2</h4>
    
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading technical indicators...</p>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button @click="loadData" class="retry-btn">Retry</button>
    </div>
    
    <!-- Indicators Grid -->
    <div v-else class="indicators-grid">
      <!-- Combined Indicators List (18 items) -->
      <div 
        v-for="(indicator, index) in displayIndicators" 
        :key="index"
        class="indicator-card"
        :class="getCardClass(indicator)"
      >
        <div class="indicator-label">{{ indicator.label }}</div>
        
        <div class="indicator-content">
           <div class="indicator-value" :class="getSignalTextClass(indicator.signal)">
             {{ indicator.value }}
           </div>
           
           <!-- Change / Diff -->
           <div v-if="indicator.change" class="price-diff" :class="indicator.changeClass">
             {{ indicator.change }}
           </div>
           
           <!-- Signal / Info -->
           <div v-else-if="indicator.signal && indicator.signal !== 'N/A'" class="indicator-signal" :class="getSignalClass(indicator.signal)">
             {{ indicator.signal }}
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import hybridTechnicalIndicatorsAPI from '@/utils/hybridTechnicalIndicatorsApi.js'

export default {
  name: 'TechnicalIndicators',
  props: {
    symbol: {
      type: String,
      required: true
    },
    exchange: {
      type: String,
      default: 'NASDAQ'
    }
  },
  data() {
    return {
      loading: true,
      error: null,
      rawData: null,
      displayIndicators: []
    }
  },
  watch: {
    symbol() {
      this.loadData()
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      this.error = null
      
      try {
        console.log(`🔄 Loading technical indicators for ${this.symbol} via Hybrid API`)
        
        // 使用 Hybrid API 獲取數據 (自動回退到實時計算)
        const data = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators(this.symbol)
        
        if (!data) {
          throw new Error(`No data available for ${this.symbol}`)
        }
        
        this.rawData = data
        this.processCombinedIndicators()
        
        console.log(`✅ Technical indicators loaded for ${this.symbol}`)
        
      } catch (err) {
        console.error('Error loading technical indicators:', err)
        this.error = `Failed to load indicators: ${err.message}`
      } finally {
        this.loading = false
      }
    },
    
    processCombinedIndicators() {
      const data = this.rawData;
      const list = [];
      const series = data.fullSeries || {}; // 實時計算時會提供完整序列
      
      // Helper function to get value and diff
      const getIndicator = (key, label, arrayKey) => {
        let value = 'N/A';
        let signal = 'N/A';
        let change = null;
        let changeClass = '';

        // Check if data is Flat (Realtime) or Nested (Precomputed)
        // Flat: data[key] = { value, signal }
        // Nested: data.indicators.sma... (Standardize to Flat first?)
        
        // 嘗試讀取 Flat 格式 (Realtime)
        if (data[key]) {
          value = this.formatNumber(data[key].value);
          signal = data[key].signal;
        } 
        // 嘗試讀取 Nested 格式 (Precomputed fallback)
        else if (data.indicators?.sma && key.startsWith('sma')) {
             // Handle nested logic if strictly needed, but Hybrid likely forces Realtime if keys missing
             // For simplicity, we assume Flat format from Hybrid normalization
        }
        
        // 計算變化 (如果 fullSeries 存在)
        if (series[arrayKey] && Array.isArray(series[arrayKey])) {
             const arr = series[arrayKey];
             const latest = this.getLatestValue(arr);
             const prev = this.getPreviousValue(arr);
             
             if (latest !== null && prev !== null && prev !== 0) {
                 const diff = latest - prev;
                 const pct = (diff / prev) * 100;
                 const sign = diff >= 0 ? '+' : '';
                 change = `${sign}${diff.toFixed(2)} (${sign}${pct.toFixed(1)}%)`;
                 changeClass = diff >= 0 ? 'positive' : 'negative';
             }
        }

        return { label, value, signal, change, changeClass, type: 'technical' };
      };

      // 1-3. MA (Hybrid 可能返回 ma5)
      list.push(getIndicator('ma5', 'MA5', 'MA_5'));
      list.push(getIndicator('ma10', 'MA10', 'MA_10'));
      list.push(getIndicator('ma30', 'MA30', 'MA_30'));

      // 4-6. SMA
      list.push(getIndicator('sma5', 'SMA5', 'SMA_5'));
      list.push(getIndicator('sma10', 'SMA10', 'SMA_10'));
      list.push(getIndicator('sma30', 'SMA30', 'SMA_30'));

      // 7-9. Ichimoku
      list.push(getIndicator('ichimokuConversionLine', 'Ichimoku Conversion (9)', 'ICHIMOKU_CONVERSIONLINE_9'));
      list.push(getIndicator('ichimokuBaseLine', 'Ichimoku Base (26)', 'ICHIMOKU_BASELINE_26'));
      list.push(getIndicator('ichimokuLaggingSpan', 'Ichimoku Lagging (26)', 'ICHIMOKU_LAGGINGSPAN_26'));

      // 10. ADX
      list.push(getIndicator('adx14', 'ADX (14)', 'ADX_14'));

      // 11. MACD
      list.push(getIndicator('macd', 'MACD (12,26)', 'MACD_12_26_9'));

      // 12. VWMA
      list.push(getIndicator('vwma20', 'VWMA (20)', 'VWMA_20'));

      // YFinance Data extraction
      // 嘗試從 data.yf 或 data.indicators.yf 讀取
      const yf = data.yf || data.indicators?.yf || {};
      
      // 13. Volume
      list.push({
          label: 'Volume',
          value: this.formatVolume(yf.volume_last_day),
          change: yf.volume_last_day_pct !== undefined ? this.formatPercentage(yf.volume_last_day_pct) : null,
          changeClass: this.getChangeClass(yf.volume_last_day_pct),
          type: 'yfinance'
      });

      // 14. 5D Avg Volume
      list.push({
          label: '5D Avg Volume',
          value: this.formatVolume(yf.avg_volume_5d),
          change: yf.avg_volume_5d_pct !== undefined ? this.formatPercentage(yf.avg_volume_5d_pct) : null,
          changeClass: this.getChangeClass(yf.avg_volume_5d_pct),
          type: 'yfinance'
      });

      // 15. Market Cap
      list.push({
          label: 'Market Cap',
          value: this.formatMarketCap(yf.market_cap),
          signal: this.getMarketCapCategory(yf.market_cap),
          type: 'yfinance'
      });

      // 16-18. Beta
      list.push({ label: 'Beta (3mo)', value: this.formatBeta(yf.beta_3mo), signal: this.getBetaCategory(yf.beta_3mo), type: 'yfinance' });
      list.push({ label: 'Beta (1y)', value: this.formatBeta(yf.beta_1y), signal: this.getBetaCategory(yf.beta_1y), type: 'yfinance' });
      list.push({ label: 'Beta (5y)', value: this.formatBeta(yf.beta_5y), signal: this.getBetaCategory(yf.beta_5y), type: 'yfinance' });

      this.displayIndicators = list;
    },
    
    // Utility Methods
    getLatestValue(array) {
      if (!array || !Array.isArray(array)) return null;
      for (let i = array.length - 1; i >= 0; i--) {
        if (array[i] !== null && array[i] !== undefined && !isNaN(array[i])) return array[i];
      }
      return null;
    },

    getPreviousValue(array) {
       if (!array || !Array.isArray(array)) return null;
       let count = 0;
       for (let i = array.length - 1; i >= 0; i--) {
         if (array[i] !== null && array[i] !== undefined && !isNaN(array[i])) {
             count++;
             if (count === 2) return array[i]; // Return the 2nd valid value from end
         }
       }
       return null;
    },
    
    // Formatting Methods
    formatNumber(value, decimals = 2) {
      if (value === null || value === undefined || value === 'N/A' || isNaN(value)) return 'N/A'
      return Number(value).toFixed(decimals)
    },
    
    formatVolume(value) {
      if (!value && value !== 0) return 'N/A'
      if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B'
      if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M'
      if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K'
      return value.toLocaleString()
    },
    
    formatMarketCap(value) {
      if (!value && value !== 0) return 'N/A'
      if (value >= 1e12) return '$' + (value / 1e12).toFixed(2) + 'T'
      if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B'
      if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M'
      return '$' + value.toLocaleString()
    },
    
    formatBeta(value) {
      if (value === null || value === undefined) return 'N/A'
      return Number(value).toFixed(2)
    },
    
    formatPercentage(value) {
      if (value === null || value === undefined) return null
      const sign = value >= 0 ? '+' : ''
      return sign + Number(value).toFixed(1) + '%'
    },
    
    // Style Methods
    getCardClass(indicator) {
        return indicator.type === 'yfinance' ? 'yfinance-indicator' : 'technical-indicator';
    },

    getSignalClass(signal) {
      switch (signal) {
        case 'BUY':
        case 'BULLISH':
        case 'STRONG_TREND':
          return 'signal-buy'
        case 'SELL':
        case 'BEARISH':
        case 'WEAK_TREND':
          return 'signal-sell'
        case 'OVERBOUGHT':
        case 'HIGH VOLATILITY':
          return 'signal-warning'
        case 'OVERSOLD':
        case 'LOW VOLATILITY':
          return 'signal-opportunity'
        case 'MEGA CAP':
        case 'LARGE CAP':
            return 'signal-buy'
        default:
          return 'signal-neutral'
      }
    },
    
    getSignalTextClass(signal) {
       // Optional: color the main value based on signal?
       // Matches screenshot "green numbers"
       // We can use the logic from getSignalClass mapping
       return ''; // Kept simple as per screenshot which has Green/Red numbers separately
    },

    getChangeClass(value) {
      if (value === null || value === undefined) return ''
      return value >= 0 ? 'change-positive' : 'change-negative'
    },
    
    // Category Methods
    getMarketCapCategory(value) {
      if (!value) return null
      if (value >= 200e9) return 'MEGA CAP'
      if (value >= 10e9) return 'LARGE CAP'
      if (value >= 2e9) return 'MID CAP'
      if (value >= 300e6) return 'SMALL CAP'
      return 'MICRO CAP'
    },
    
    getBetaCategory(value) {
      if (value === null || value === undefined) return null
      if (value > 1.5) return 'HIGH VOLATILITY'
      if (value > 1.0) return 'MODERATE VOLATILITY'
      if (value > 0.5) return 'LOW VOLATILITY'
      return 'VERY LOW VOLATILITY'
    }
  }
}
</script>

<style scoped>
.technical-indicators {
  width: 100%;
  padding: 0;
}

.build-stamp {
  font-size: 0.9rem;
  color: #28a745;
  margin: 0 0 1rem 0;
  font-weight: 600;
  text-align: center;
  padding: 0.5rem;
  background: #d4edda;
  border-radius: 4px;
  border: 1px solid #c3e6cb;
}

.loading-state, .error-state {
  text-align: center;
  padding: 2rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #dc3545;
  margin-bottom: 1rem;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.indicators-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin: 0;
}

.indicator-card {
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  background: white;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.indicator-label {
  font-size: 0.85rem;
  color: #6c757d;
  margin-bottom: 5px;
  font-weight: 500;
}

.indicator-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #343a40;
  margin-bottom: 3px;
}

.price-diff {
  font-size: 0.8rem;
  font-weight: 600;
}

.price-diff.positive {
  color: #28a745;
}

.price-diff.negative {
  color: #dc3545;
}

.indicator-signal {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
  margin-top: 4px;
}

.signal-buy {
  color: #28a745;
  background: #e6f4ea;
}

.signal-sell {
  color: #dc3545;
  background: #fce8e6;
}

.signal-warning {
  color: #856404;
  background: #fff3cd;
}

.signal-opportunity {
  color: #0c5460;
  background: #d1ecf1;
}

.signal-neutral {
  color: #6c757d;
  background: #e9ecef;
}

/* 響應式設計 */
@media (max-width: 900px) {
  .indicators-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .indicators-grid {
    grid-template-columns: 1fr;
  }
}
</style>