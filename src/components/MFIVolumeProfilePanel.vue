<template>
  <div class="mfi-volume-profile-panel">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading MFI Volume Profile...</p>
    </div>

    <!-- Error State with Graceful Fallback -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <p class="error-message">{{ error }}</p>
      <div class="error-actions">
        <button @click="loadData" class="retry-btn">Retry</button>
        <div v-if="isDev" class="dev-info">
          <small>DEV mode: Trying Yahoo Finance fallback</small>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="profileData" class="panel-content">
      <!-- Header with Key Metrics -->
      <div class="metrics-header">
        <div class="metric-card">
          <div class="metric-label">MFI Signal</div>
          <div class="metric-value" :class="`signal-${profileData.mfi.signal.toLowerCase()}`">
            {{ profileData.mfi.signal }}
          </div>
          <div class="metric-detail">{{ profileData.mfi.latest?.toFixed(2) || 'N/A' }}</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Market Sentiment</div>
          <div class="metric-value" :class="`sentiment-${profileData.marketSentiment.toLowerCase()}`">
            {{ profileData.marketSentiment }}
          </div>
          <div class="metric-detail">
            Buy: {{ (profileData.statistics.buyingRatio * 100).toFixed(1) }}%
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Point of Control</div>
          <div class="metric-value">${{ profileData.pointOfControl.priceLevel.toFixed(2) }}</div>
          <div class="metric-detail">{{ profileData.pointOfControl.percentage.toFixed(1) }}% volume</div>
        </div>
      </div>

      <!-- Volume Profile Chart (DOM-based) -->
      <div class="volume-profile-chart">
        <div class="chart-header">
          <h4>Volume Profile ({{ bins }} bins, MFI {{ mfiPeriod }})</h4>
          <div class="chart-controls">
            <select v-model="selectedRange" @change="onRangeChange" class="range-selector">
              <option value="3mo">3 Months</option>
              <option value="6mo">6 Months</option>
              <option value="1y">1 Year</option>
            </select>
          </div>
        </div>
        
        <div class="chart-container" :style="{ height: totalChartHeight + 'px' }">
          <!-- Price Scale (Left) -->
          <div class="price-scale">
            <div 
              v-for="(bin, index) in displayBins" 
              :key="index"
              class="price-label"
              :style="{ height: binHeight + 'px' }"
            >
              ${{ bin.priceLevel.toFixed(2) }}
            </div>
          </div>
          
          <!-- Volume Bars (Center) -->
          <div class="volume-bars">
            <div 
              v-for="(bin, index) in displayBins" 
              :key="index"
              class="volume-bar-row"
              :style="{ height: binHeight + 'px' }"
            >
              <div 
                class="volume-bar"
                :class="getBarClass(bin)"
                :style="getBarStyle(bin)"
                @mouseover="showTooltip($event, bin)"
                @mouseleave="hideTooltip"
              >
                <div class="bar-fill" :style="getBarFillStyle(bin)"></div>
              </div>
              
              <!-- POC Marker -->
              <div v-if="bin.priceLevel === profileData.pointOfControl.priceLevel" class="poc-marker">
                POC
              </div>
              
              <!-- Value Area Markers -->
              <div v-if="bin.priceLevel === profileData.valueArea.high" class="va-marker va-high">
                VAH
              </div>
              <div v-if="bin.priceLevel === profileData.valueArea.low" class="va-marker va-low">
                VAL
              </div>
            </div>
          </div>
          
          <!-- Volume Scale (Right) -->
          <div class="volume-scale">
            <div 
              v-for="(bin, index) in displayBins" 
              :key="index"
              class="volume-label"
              :style="{ height: binHeight + 'px' }"
            >
              {{ formatVolume(bin.volume) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Trading Signals -->
      <div v-if="tradingSignals" class="trading-signals">
        <div class="signals-header">
          <h4>Trading Analysis</h4>
          <div class="signal-badge" :class="`signal-${tradingSignals.signal.toLowerCase()}`">
            {{ tradingSignals.signal }}
          </div>
        </div>
        
        <div class="signals-content">
          <div class="confidence-bar">
            <div class="confidence-label">Confidence: {{ (tradingSignals.confidence * 100).toFixed(0) }}%</div>
            <div class="confidence-progress">
              <div 
                class="confidence-fill" 
                :style="{ width: (tradingSignals.confidence * 100) + '%' }"
              ></div>
            </div>
          </div>
          
          <div v-if="tradingSignals.recommendations.length > 0" class="recommendations">
            <div class="recommendation" v-for="(rec, index) in tradingSignals.recommendations" :key="index">
              {{ rec }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else class="no-data-state">
      <div class="no-data-icon">📊</div>
      <p>No MFI Volume Profile data available for {{ symbol }}</p>
      <div v-if="isDev" class="dev-fallback">
        <button @click="loadData" class="retry-btn">Try Yahoo Finance (DEV)</button>
      </div>
    </div>

    <!-- Tooltip -->
    <div v-if="tooltip.visible" class="tooltip" :style="tooltip.style">
      <div class="tooltip-content">
        <div><strong>Price Range:</strong> ${{ tooltip.data.minPrice.toFixed(2) }} - ${{ tooltip.data.maxPrice.toFixed(2) }}</div>
        <div><strong>Volume:</strong> {{ formatVolume(tooltip.data.volume) }}</div>
        <div><strong>Avg MFI:</strong> {{ tooltip.data.mfiAverage.toFixed(1) }}</div>
        <div><strong>Buying:</strong> {{ formatVolume(tooltip.data.positiveVolume) }}</div>
        <div><strong>Selling:</strong> {{ formatVolume(tooltip.data.negativeVolume) }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ohlcvApi } from '@/services/ohlcvApi.js';
import { calculateMFIVolumeProfile, getMFIVolumeProfileSignals } from '@/utils/mfiVolumeProfile.js';

export default {
  name: 'MFIVolumeProfilePanel',
  props: {
    symbol: {
      type: String,
      required: true
    },
    exchange: {
      type: String,
      default: 'NASDAQ'
    },
    priority: {
      type: Number,
      default: 4
    },
    bins: {
      type: Number,
      default: 50
    },
    mfiPeriod: {
      type: Number,
      default: 14
    },
    lookback: {
      type: Number,
      default: 200
    }
  },
  data() {
    return {
      loading: false,
      error: null,
      profileData: null,
      tradingSignals: null,
      currentPrice: null,
      selectedRange: '3mo',
      binHeight: 12, // Height per bin in pixels
      tooltip: {
        visible: false,
        data: null,
        style: {}
      }
    };
  },
  computed: {
    isDev() {
      return import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');
    },
    displayBins() {
      if (!this.profileData || !this.profileData.volumeProfile) {
        return [];
      }
      // Sort bins by price (high to low) for display
      return [...this.profileData.volumeProfile].sort((a, b) => b.priceLevel - a.priceLevel);
    },
    totalChartHeight() {
      // 計算總高度：bin數量 * 每個bin的高度
      const binCount = this.displayBins.length;
      return Math.max(binCount * this.binHeight, 300); // 最小高度300px
    }
  },
  mounted() {
    this.loadData();
  },
  watch: {
    symbol() {
      this.loadData();
    }
  },
  methods: {
    async loadData() {
      if (this.loading) return;
      
      this.loading = true;
      this.error = null;
      this.profileData = null;
      this.tradingSignals = null;
      
      try {
        console.log(`📊 Loading MFI Volume Profile for ${this.symbol}...`);
        
        // Step 1: Get OHLCV data using the new API service
        const ohlcvData = await ohlcvApi.getOhlcv(this.symbol, '1d', this.selectedRange);
        
        if (!ohlcvData) {
          throw new Error(`No OHLCV data available for ${this.symbol}`);
        }
        
        console.log(`📊 OHLCV data loaded: ${ohlcvData.timestamps?.length || 0} points`);
        
        // Step 2: Calculate MFI Volume Profile
        this.profileData = calculateMFIVolumeProfile(ohlcvData, this.bins, this.mfiPeriod);
        
        // Step 3: Get current price for trading signals
        this.currentPrice = this.getCurrentPrice(ohlcvData);
        
        // Step 4: Generate trading signals
        if (this.currentPrice) {
          this.tradingSignals = getMFIVolumeProfileSignals(this.profileData, this.currentPrice);
        }
        
        console.log(`📊 MFI Volume Profile loaded successfully for ${this.symbol}`);
        
      } catch (error) {
        console.error(`📊 MFI Volume Profile error for ${this.symbol}:`, error);
        this.error = this.getErrorMessage(error);
      } finally {
        this.loading = false;
      }
    },
    
    getCurrentPrice(ohlcvData) {
      // Get the latest valid close price
      for (let i = ohlcvData.close.length - 1; i >= 0; i--) {
        if (ohlcvData.close[i] != null && !isNaN(ohlcvData.close[i])) {
          return ohlcvData.close[i];
        }
      }
      return null;
    },
    
    getErrorMessage(error) {
      if (error.message.includes('CORS')) {
        return 'Data source blocked by browser security. Try disabling ad blockers or privacy extensions.';
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        return `No OHLCV data available for ${this.symbol}. This symbol may not be supported yet.`;
      } else if (error.message.includes('Insufficient')) {
        return 'Insufficient historical data for MFI Volume Profile calculation.';
      } else {
        return `Failed to load data: ${error.message}`;
      }
    },
    
    onRangeChange() {
      console.log(`📊 Range changed to ${this.selectedRange} for ${this.symbol}`);
      this.loadData();
    },
    
    getBarClass(bin) {
      const classes = ['volume-bar'];
      
      // Add sentiment class based on MFI
      if (bin.positiveVolume > bin.negativeVolume) {
        classes.push('bullish');
      } else if (bin.negativeVolume > bin.positiveVolume) {
        classes.push('bearish');
      } else {
        classes.push('neutral');
      }
      
      // Add POC class
      if (this.profileData && bin.priceLevel === this.profileData.pointOfControl.priceLevel) {
        classes.push('poc');
      }
      
      return classes.join(' ');
    },
    
    getBarStyle(bin) {
      return {
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center'
      };
    },
    
    getBarFillStyle(bin) {
      if (!this.profileData) return { width: '0%' };
      
      const maxVolume = this.profileData.statistics.maxVolumeInBin;
      const widthPercent = maxVolume > 0 ? (bin.volume / maxVolume) * 100 : 0;
      
      // Color based on MFI sentiment
      let backgroundColor = '#9E9E9E'; // Neutral gray
      if (bin.positiveVolume > bin.negativeVolume) {
        backgroundColor = '#4CAF50'; // Green for buying pressure
      } else if (bin.negativeVolume > bin.positiveVolume) {
        backgroundColor = '#F44336'; // Red for selling pressure
      }
      
      return {
        width: `${Math.max(widthPercent, 1)}%`, // Minimum 1% for visibility
        height: '80%',
        backgroundColor: backgroundColor,
        borderRadius: '2px',
        transition: 'all 0.2s ease'
      };
    },
    
    formatVolume(volume) {
      if (volume >= 1000000000) {
        return (volume / 1000000000).toFixed(1) + 'B';
      } else if (volume >= 1000000) {
        return (volume / 1000000).toFixed(1) + 'M';
      } else if (volume >= 1000) {
        return (volume / 1000).toFixed(1) + 'K';
      } else {
        return volume.toFixed(0);
      }
    },
    
    showTooltip(event, bin) {
      this.tooltip = {
        visible: true,
        data: bin,
        style: {
          position: 'fixed',
          left: event.clientX + 10 + 'px',
          top: event.clientY - 10 + 'px',
          zIndex: 1000
        }
      };
    },
    
    hideTooltip() {
      this.tooltip.visible = false;
    }
  }
};
</script>

<style scoped>
.mfi-volume-profile-panel {
  width: 100%;
  /* 移除 height: 100% 限制，讓內容自然展開 */
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
  padding: 2rem;
  text-align: center;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.error-message {
  margin-bottom: 1rem;
  color: #d32f2f;
  max-width: 400px;
}

.error-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.retry-btn:hover {
  background: #0056b3;
}

.dev-info {
  color: #6c757d;
  font-style: italic;
}

/* No Data State */
.no-data-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
  text-align: center;
}

.no-data-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.dev-fallback {
  margin-top: 1rem;
}

/* Panel Content */
.panel-content {
  display: flex;
  flex-direction: column;
  /* 移除 height: 100% 限制，讓內容自然展開 */
  padding: 1rem;
}

/* Metrics Header */
.metrics-header {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.metric-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 0.75rem;
  text-align: center;
}

.metric-label {
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.metric-value {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.metric-detail {
  font-size: 0.75rem;
  color: #6c757d;
}

/* Signal Colors */
.signal-overbought, .signal-sell {
  color: #d32f2f;
}

.signal-oversold, .signal-buy {
  color: #388e3c;
}

.signal-neutral, .signal-hold {
  color: #f57c00;
}

.sentiment-bullish {
  color: #388e3c;
}

.sentiment-bearish {
  color: #d32f2f;
}

.sentiment-neutral {
  color: #f57c00;
}

/* Volume Profile Chart */
.volume-profile-chart {
  /* 移除 flex: 1，改用固定高度模式 */
  display: flex;
  flex-direction: column;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 1rem;
  /* 確保圖表容器不被其他元素壓縮 */
  flex-shrink: 0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.chart-header h4 {
  margin: 0;
  font-size: 0.9rem;
  color: #495057;
}

.range-selector {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.8rem;
  background: white;
}

.chart-container {
  /* 移除 flex: 1，使用固定高度 */
  display: flex;
  min-height: 300px;
  /* 移除 max-height 和 overflow-y，讓容器完全展開 */
  /* 確保容器使用設定的高度 */
  flex-shrink: 0;
}

.price-scale {
  width: 80px;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  flex-shrink: 0;
}

.price-label {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  font-size: 0.7rem;
  color: #6c757d;
  border-bottom: 1px solid #f0f0f0;
}

.volume-bars {
  flex: 1;
  position: relative;
}

.volume-bar-row {
  position: relative;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
}

.volume-bar {
  width: 100%;
  height: 100%;
  cursor: pointer;
  position: relative;
}

.volume-bar:hover .bar-fill {
  opacity: 0.8;
  transform: scaleY(1.1);
}

.bar-fill {
  transition: all 0.2s ease;
}

/* POC and Value Area Markers */
.poc-marker {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  background: #2196F3;
  color: white;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 0.6rem;
  font-weight: bold;
  z-index: 10;
}

.va-marker {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  background: #FF9800;
  color: white;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 0.6rem;
  font-weight: bold;
  z-index: 10;
}

.volume-scale {
  width: 80px;
  background: #f8f9fa;
  border-left: 1px solid #e9ecef;
  flex-shrink: 0;
}

.volume-label {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 0.5rem;
  font-size: 0.7rem;
  color: #6c757d;
  border-bottom: 1px solid #f0f0f0;
}

/* Trading Signals */
.trading-signals {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 1rem;
}

.signals-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.signals-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #495057;
}

.signal-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.signal-badge.signal-buy {
  background: #d4edda;
  color: #155724;
}

.signal-badge.signal-sell {
  background: #f8d7da;
  color: #721c24;
}

.signal-badge.signal-hold, .signal-badge.signal-neutral {
  background: #fff3cd;
  color: #856404;
}

/* Confidence Bar */
.confidence-bar {
  margin-bottom: 1rem;
}

.confidence-label {
  font-size: 0.85rem;
  color: #495057;
  margin-bottom: 0.5rem;
}

.confidence-progress {
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #dc3545, #ffc107, #28a745);
  transition: width 0.3s ease;
}

/* Recommendations */
.recommendations {
  margin-bottom: 1rem;
}

.recommendation {
  font-size: 0.85rem;
  color: #495057;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: #ffffff;
  border-left: 3px solid #007bff;
  border-radius: 0 4px 4px 0;
}

/* Tooltip */
.tooltip {
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  pointer-events: none;
  max-width: 200px;
}

.tooltip-content div {
  margin-bottom: 0.25rem;
}

.tooltip-content div:last-child {
  margin-bottom: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .metrics-header {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .panel-content {
    padding: 0.75rem;
  }
  
  .chart-container {
    min-height: 250px;
    /* 移除 max-height，讓手機版也能完全展開 */
  }
  
  .price-scale, .volume-scale {
    width: 60px;
  }
  
  .price-label, .volume-label {
    font-size: 0.65rem;
  }
}

@media (max-width: 480px) {
  .signals-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .chart-container {
    min-height: 200px;
    /* 移除 max-height，讓小螢幕也能完全展開 */
  }
  
  .price-scale, .volume-scale {
    width: 50px;
  }
  
  .poc-marker, .va-marker {
    font-size: 0.5rem;
    padding: 1px 2px;
  }
}
</style>