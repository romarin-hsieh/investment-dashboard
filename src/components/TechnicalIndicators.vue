<template>
  <div class="technical-indicators">
    <div class="indicators-header">
      <h4>Technical Indicators</h4>
      <div v-if="cacheInfo" class="cache-info">
        <small>{{ cacheInfo }}</small>
      </div>
    </div>
    
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading technical data...</span>
    </div>
    
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
      <button @click="retryLoad" class="retry-button" :disabled="loading">
        {{ loading ? 'Loading...' : 'Retry' }}
      </button>
    </div>
    
    <div v-else class="indicators-grid">
      <!-- Row 1: MA5, MA10, MA30 -->
      <div class="indicator-item">
        <span class="indicator-label">MA5</span>
        <div class="indicator-value-row">
          <span class="indicator-value" :class="getSignalClass(technicalData?.ma5?.signal)">
            {{ formatValue(technicalData?.ma5?.value) }}
          </span>
          <span class="price-diff" :class="getPriceDiffClass(technicalData?.ma5?.value)">
            {{ formatPriceDiff(technicalData?.ma5?.value) }}
          </span>
        </div>
      </div>
      
      <div class="indicator-item">
        <span class="indicator-label">MA10</span>
        <div class="indicator-value-row">
          <span class="indicator-value" :class="getSignalClass(technicalData?.ma10?.signal)">
            {{ formatValue(technicalData?.ma10?.value) }}
          </span>
          <span class="price-diff" :class="getPriceDiffClass(technicalData?.ma10?.value)">
            {{ formatPriceDiff(technicalData?.ma10?.value) }}
          </span>
        </div>
      </div>
      
      <div class="indicator-item">
        <span class="indicator-label">MA30</span>
        <div class="indicator-value-row">
          <span class="indicator-value" :class="getSignalClass(technicalData?.ma30?.signal)">
            {{ formatValue(technicalData?.ma30?.value) }}
          </span>
          <span class="price-diff" :class="getPriceDiffClass(technicalData?.ma30?.value)">
            {{ formatPriceDiff(technicalData?.ma30?.value) }}
          </span>
        </div>
      </div>

      <!-- Row 2: SMA5, SMA10, SMA30 -->
      <div class="indicator-item">
        <span class="indicator-label">SMA5</span>
        <div class="indicator-value-row">
          <span class="indicator-value" :class="getSignalClass(technicalData?.sma5?.signal)">
            {{ formatValue(technicalData?.sma5?.value) }}
          </span>
          <span class="price-diff" :class="getPriceDiffClass(technicalData?.sma5?.value)">
            {{ formatPriceDiff(technicalData?.sma5?.value) }}
          </span>
        </div>
      </div>
      
      <div class="indicator-item">
        <span class="indicator-label">SMA10</span>
        <div class="indicator-value-row">
          <span class="indicator-value" :class="getSignalClass(technicalData?.sma10?.signal)">
            {{ formatValue(technicalData?.sma10?.value) }}
          </span>
          <span class="price-diff" :class="getPriceDiffClass(technicalData?.sma10?.value)">
            {{ formatPriceDiff(technicalData?.sma10?.value) }}
          </span>
        </div>
      </div>
      
      <div class="indicator-item">
        <span class="indicator-label">SMA30</span>
        <div class="indicator-value-row">
          <span class="indicator-value" :class="getSignalClass(technicalData?.sma30?.signal)">
            {{ formatValue(technicalData?.sma30?.value) }}
          </span>
          <span class="price-diff" :class="getPriceDiffClass(technicalData?.sma30?.value)">
            {{ formatPriceDiff(technicalData?.sma30?.value) }}
          </span>
        </div>
      </div>

      <!-- Row 3: Ichimoku Components -->
      <div class="indicator-item">
        <span class="indicator-label">Ichimoku Conversion (9)</span>
        <div class="indicator-value-row">
          <span class="indicator-value" :class="getSignalClass(technicalData?.ichimokuConversionLine?.signal)">
            {{ formatValue(technicalData?.ichimokuConversionLine?.value) }}
          </span>
          <span class="price-diff" :class="getPriceDiffClass(technicalData?.ichimokuConversionLine?.value)">
            {{ formatPriceDiff(technicalData?.ichimokuConversionLine?.value) }}
          </span>
        </div>
      </div>
      
      <div class="indicator-item">
        <span class="indicator-label">Ichimoku Base (26)</span>
        <div class="indicator-value-row">
          <span class="indicator-value" :class="getSignalClass(technicalData?.ichimokuBaseLine?.signal)">
            {{ formatValue(technicalData?.ichimokuBaseLine?.value) }}
          </span>
          <span class="price-diff" :class="getPriceDiffClass(technicalData?.ichimokuBaseLine?.value)">
            {{ formatPriceDiff(technicalData?.ichimokuBaseLine?.value) }}
          </span>
        </div>
      </div>
      
      <div class="indicator-item">
        <span class="indicator-label">Ichimoku Lagging (26)</span>
        <div class="indicator-value-row">
          <span class="indicator-value" :class="getSignalClass(technicalData?.ichimokuLaggingSpan?.signal)">
            {{ formatValue(technicalData?.ichimokuLaggingSpan?.value) }}
          </span>
          <span class="price-diff" :class="getPriceDiffClass(technicalData?.ichimokuLaggingSpan?.value)">
            {{ formatPriceDiff(technicalData?.ichimokuLaggingSpan?.value) }}
          </span>
        </div>
      </div>

      <!-- Row 4: Technical Indicators -->
      <div class="indicator-item">
        <span class="indicator-label">ADX (14)</span>
        <span class="indicator-value" :class="getSignalClass(technicalData?.adx14?.signal)">
          {{ formatValue(technicalData?.adx14?.value) }}
        </span>
      </div>
      
      <div class="indicator-item">
        <span class="indicator-label">MACD (12,26)</span>
        <span class="indicator-value" :class="getSignalClass(technicalData?.macd?.signal)">
          {{ formatValue(technicalData?.macd?.value) }}
        </span>
      </div>
      
      <div class="indicator-item">
        <span class="indicator-label">VWMA (20)</span>
        <span class="indicator-value" :class="getSignalClass(technicalData?.vwma20?.signal)">
          {{ formatValue(technicalData?.vwma20?.value) }}
        </span>
      </div>

      <!-- Row 5: yfinance Volume Indicators -->
      <div class="indicator-item" v-if="hasYFinanceData">
        <span class="indicator-label">Volume</span>
        <div class="indicator-value-row">
          <span class="indicator-value">
            {{ formatVolume(technicalData?.yf?.volume_last_day) }}
          </span>
          <span class="price-diff" :class="getPercentChangeClass(technicalData?.yf?.volume_last_day_pct)">
            {{ formatPercentChange(technicalData?.yf?.volume_last_day_pct) }}
          </span>
        </div>
      </div>
      
      <div class="indicator-item" v-if="hasYFinanceData">
        <span class="indicator-label">5D Avg Volume</span>
        <div class="indicator-value-row">
          <span class="indicator-value">
            {{ formatVolume(technicalData?.yf?.avg_volume_5d) }}
          </span>
          <span class="price-diff" :class="getPercentChangeClass(technicalData?.yf?.avg_volume_5d_pct)">
            {{ formatPercentChange(technicalData?.yf?.avg_volume_5d_pct) }}
          </span>
        </div>
      </div>
      
      <div class="indicator-item" v-if="hasYFinanceData">
        <span class="indicator-label">Market Cap</span>
        <span class="indicator-value">
          {{ formatMarketCap(technicalData?.yf?.market_cap) }}
        </span>
      </div>

      <!-- Row 6: yfinance Beta Indicators -->
      <div class="indicator-item" v-if="hasYFinanceData">
        <span class="indicator-label">Beta (3mo)</span>
        <span class="indicator-value">
          {{ formatBeta(technicalData?.yf?.beta_3mo) }}
        </span>
      </div>
      
      <div class="indicator-item" v-if="hasYFinanceData">
        <span class="indicator-label">Beta (1y)</span>
        <span class="indicator-value">
          {{ formatBeta(technicalData?.yf?.beta_1y) }}
        </span>
      </div>
      
      <div class="indicator-item" v-if="hasYFinanceData">
        <span class="indicator-label">Beta (5y)</span>
        <span class="indicator-value">
          {{ formatBeta(technicalData?.yf?.beta_5y) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import hybridTechnicalIndicatorsAPI from '../utils/hybridTechnicalIndicatorsApi.js'

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
      technicalData: null,
      cacheInfo: null
    }
  },
  computed: {
    // 檢查是否有 yfinance 資料
    hasYFinanceData() {
      return this.technicalData && this.technicalData.yf;
    }
  },
  mounted() {
    this.loadTechnicalData()
  },
  watch: {
    symbol() {
      this.loadTechnicalData()
    }
  },
  methods: {
    async loadTechnicalData() {
      this.loading = true;
      this.error = null;
      this.cacheInfo = null;
      
      try {
        console.log(`🔍 Loading technical data for ${this.symbol}...`);
        
        const startTime = Date.now();
        
        // 🚀 性能優化：只載入當前股票的技術指標數據
        // 避免載入所有股票的數據
        this.technicalData = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators(this.symbol);
        
        const loadTime = Date.now() - startTime;
        
        if (this.technicalData.error) {
          throw new Error(this.technicalData.error);
        }
        
        // 設置緩存信息
        if (this.technicalData.source) {
          if (this.technicalData.source.includes('Cache')) {
            this.cacheInfo = `${this.technicalData.source} (${loadTime}ms)`;
          } else if (this.technicalData.source.includes('Precomputed')) {
            this.cacheInfo = `${this.technicalData.source} (${loadTime}ms)`;
          } else {
            this.cacheInfo = `Fresh data (${loadTime}ms)`;
          }
        } else {
          this.cacheInfo = `Loaded in ${loadTime}ms`;
        }
        
        console.log(`✅ Technical data loaded for ${this.symbol}:`, {
          source: this.technicalData.source,
          loadTime: `${loadTime}ms`,
          hasADX: !!this.technicalData.adx14?.value
        });
        
        // 驗證 ADX 數據
        if (this.technicalData.adx14 && this.technicalData.adx14.value !== null && this.technicalData.adx14.value !== 'N/A') {
          console.log(`✅ ADX data is valid for ${this.symbol}: ${this.technicalData.adx14.value}`);
        } else {
          console.warn(`⚠️ ADX data may be invalid for ${this.symbol}:`, this.technicalData.adx14);
        }
        
        // 發送自定義事件給 PerformanceMonitor（如果存在）
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('widget-loaded', {
            detail: {
              name: `TechnicalIndicators-${this.symbol}`,
              time: loadTime,
              priority: 2
            }
          }))
        }
        
      } catch (error) {
        console.error(`❌ Failed to load technical data for ${this.symbol}:`, error);
        this.error = error.message;
        
        // 如果是網路錯誤，提供重試選項
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('proxy')) {
          this.error = `Network error loading data for ${this.symbol}. Click to retry.`;
        }
      } finally {
        this.loading = false;
      }
    },
    
    // 手動重試載入
    async retryLoad() {
      await this.loadTechnicalData();
    },
    
    getSignalClass(signal) {
      if (!signal) return 'neutral';
      
      const bullishSignals = ['BUY', 'OVERSOLD', 'STRONG_TREND'];
      const bearishSignals = ['SELL', 'OVERBOUGHT'];
      
      if (bullishSignals.includes(signal)) return 'bullish';
      if (bearishSignals.includes(signal)) return 'bearish';
      return 'neutral';
    },
    
    formatValue(value) {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toFixed(2);
      return 'N/A';
    },
    
    // 計算與最後收盤價的差異 (反向計算：以收盤價為基準)
    formatPriceDiff(indicatorValue) {
      if (!indicatorValue || !this.technicalData) return '';
      
      // 從技術數據中獲取當前價格
      const currentPrice = this.getCurrentPrice();
      if (!currentPrice) return '';
      
      const diff = currentPrice - parseFloat(indicatorValue);
      const diffPercent = (diff / parseFloat(indicatorValue)) * 100;
      
      if (Math.abs(diff) < 0.01) return '±0.00';
      
      const sign = diff > 0 ? '+' : '';
      return `${sign}${diff.toFixed(2)} (${sign}${diffPercent.toFixed(1)}%)`;
    },
    
    // 獲取當前股價
    getCurrentPrice() {
      if (!this.technicalData) return null;
      
      // 嘗試從不同的指標中獲取當前價格
      if (this.technicalData.sma5?.currentPrice) {
        return parseFloat(this.technicalData.sma5.currentPrice);
      }
      if (this.technicalData.ma5?.currentPrice) {
        return parseFloat(this.technicalData.ma5.currentPrice);
      }
      if (this.technicalData.sma50?.currentPrice) {
        return parseFloat(this.technicalData.sma50.currentPrice);
      }
      
      return null;
    },
    
    // 價格差異的顏色類別 (反向邏輯)
    getPriceDiffClass(indicatorValue) {
      if (!indicatorValue) return 'neutral';
      
      const currentPrice = this.getCurrentPrice();
      if (!currentPrice) return 'neutral';
      
      const diff = currentPrice - parseFloat(indicatorValue);
      
      if (Math.abs(diff) < 0.01) return 'neutral';
      return diff > 0 ? 'positive' : 'negative';
    },

    // yfinance 指標格式化函數
    formatVolume(volume) {
      if (volume === null || volume === undefined) return '--';
      
      // 格式化成易讀的數字格式
      if (volume >= 1000000000) {
        return `${(volume / 1000000000).toFixed(1)}B`;
      } else if (volume >= 1000000) {
        return `${(volume / 1000000).toFixed(1)}M`;
      } else if (volume >= 1000) {
        return `${(volume / 1000).toFixed(1)}K`;
      } else {
        return volume.toLocaleString();
      }
    },

    formatMarketCap(marketCap) {
      if (marketCap === null || marketCap === undefined) return '--';
      
      // 格式化市值
      if (marketCap >= 1000000000000) {
        return `$${(marketCap / 1000000000000).toFixed(1)}T`;
      } else if (marketCap >= 1000000000) {
        return `$${(marketCap / 1000000000).toFixed(1)}B`;
      } else if (marketCap >= 1000000) {
        return `$${(marketCap / 1000000).toFixed(1)}M`;
      } else {
        return `$${marketCap.toLocaleString()}`;
      }
    },

    formatBeta(beta) {
      if (beta === null || beta === undefined) return '--';
      return beta.toFixed(2);
    },

    formatPercentChange(pct) {
      if (pct === null || pct === undefined) return '';
      const sign = pct > 0 ? '+' : '';
      return `(${sign}${pct.toFixed(1)}%)`;
    },

    getPercentChangeClass(pct) {
      if (pct === null || pct === undefined) return 'neutral';
      if (Math.abs(pct) < 0.1) return 'neutral';
      return pct > 0 ? 'positive' : 'negative';
    }
  }
}
</script>

<style scoped>
.technical-indicators {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.indicators-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.indicators-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #495057;
  margin: 0;
}

.cache-info {
  color: #6c757d;
  font-size: 0.7rem;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #6c757d;
  font-size: 0.9rem;
  padding: 2rem;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #dc3545;
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem;
  flex-direction: column;
}

.error-icon {
  font-size: 1.1rem;
}

.retry-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.retry-button:hover:not(:disabled) {
  background: #0056b3;
}

.retry-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.indicators-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.indicator-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  min-height: 60px;
  justify-content: center;
}

.indicator-label {
  font-size: 0.75rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
  font-weight: 500;
  line-height: 1.2;
}

.indicator-value-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.indicator-value {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.2;
}

.indicator-value.bullish {
  color: #28a745;
}

.indicator-value.bearish {
  color: #dc3545;
}

.indicator-value.neutral {
  color: #6c757d;
}

.price-diff {
  font-size: 0.65rem;
  font-weight: 500;
  white-space: nowrap;
}

.price-diff.positive {
  color: #28a745;
}

.price-diff.negative {
  color: #dc3545;
}

.price-diff.neutral {
  color: #6c757d;
}

.cache-info {
  margin-top: 0.5rem;
  text-align: center;
  color: #6c757d;
  font-size: 0.7rem;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .indicators-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .indicator-item {
    padding: 0.5rem;
    min-height: 50px;
  }
  
  .indicator-label {
    font-size: 0.7rem;
  }
  
  .indicator-value {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .indicators-grid {
    grid-template-columns: 1fr;
  }
}
</style>