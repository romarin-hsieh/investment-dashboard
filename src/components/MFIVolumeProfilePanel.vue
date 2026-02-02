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
      <div class="mfi-header-row">
          <div class="title-section">
              <h4>MFI Volume Profile</h4>
              <button class="header-info-btn inline-info-btn" @click="openInfo('analysis')" title="Analysis Logic">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533l1.302-4.495z"/>
                    <path d="M9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                </svg>
              </button>
          </div>
          <div class="chart-controls">
            <select v-model="selectedRange" @change="onRangeChange" class="range-selector">
              <option value="3mo">3 Months</option>
              <option value="6mo">6 Months</option>
              <option value="1y">1 Year</option>
            </select>
          </div>
      </div>

      <!-- Metrics Status Bar -->
      <div class="metrics-status-bar">
        <div class="status-item">
          <span class="status-label">MFI Signal:</span>
          <span class="status-value" :class="`signal-${profileData.mfi.signal.toLowerCase()}`">{{ profileData.mfi.signal }}</span>
          <span class="status-detail">({{ profileData.mfi.latest?.toFixed(2) || 'N/A' }})</span>
        </div>
        <div class="status-divider">|</div>
        <div class="status-item">
          <span class="status-label">Sentiment:</span>
          <span class="status-value" :class="`sentiment-${profileData.marketSentiment.toLowerCase()}`">{{ profileData.marketSentiment }}</span>
          <span class="status-detail">(Buy: {{ (profileData.statistics.buyingRatio * 100).toFixed(0) }}%)</span>
        </div>
        <div class="status-divider">|</div>
        <div class="status-item">
          <span class="status-label">POC:</span>
          <span class="status-value">${{ profileData.pointOfControl.priceLevel.toFixed(2) }}</span>
          <span class="status-detail">({{ profileData.pointOfControl.percentage.toFixed(1) }}% vol)</span>
        </div>
      </div>

      <!-- Volume Profile Chart (DOM-based) -->
      <div class="volume-profile-chart">
        <div class="chart-header" style="display:none;"></div>
        
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
      <div class="trading-signals">
        <div class="signals-header">
          <div style="display: flex; align-items: center;">
             <h4>Trading Analysis</h4>
             <button class="inline-info-btn" @click="openInfo('analysis')" title="Analysis Logic">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533l1.302-4.495z"/>
                    <path d="M9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                </svg>
             </button>
          </div>
          <div v-if="tradingSignals" class="signal-badge" :class="`signal-${tradingSignals.signal.toLowerCase()}`">
            {{ tradingSignals.signal }}
          </div>
        </div>
        
        <div v-if="tradingSignals" class="signals-content">
          <div v-if="tradingSignals.recommendations.length > 0" class="recommendations">
            <div class="recommendation" v-for="(rec, index) in tradingSignals.recommendations" :key="index">
              {{ rec }}
            </div>
          </div>
        </div>
        <div v-else class="no-signals">
            <p>No clean trading signals detected at this moment. Market may be ranging or data insufficient.</p>
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

    <!-- Info Modal -->
    <div v-if="showInfo" class="modal-overlay" @click.self="showInfo = false">
        <div class="modal-content">
            <div class="modal-header">
                <h5>MFI & Volume Profile Guide</h5>
                <button class="close-btn" @click="showInfo = false">&times;</button>
            </div>
            <div class="modal-body">
                <h6>MFI (Money Flow Index)</h6>
                <p>Volume-weighted RSI. Measures buying/selling pressure.</p>
                <ul>
                    <li><strong>>80:</strong> Overbought (Potential Top)</li>
                    <li><strong><20:</strong> Oversold (Potential Bottom)</li>
                </ul>

                <h6>Volume Profile</h6>
                <p>Displays trading activity at specific price levels.</p>
                <ul>
                    <li><strong>POC (Point of Control):</strong> Price level with highest volume. Acts as strong support/resistance.</li>
                    <li><strong>Value Area (VA):</strong> Range where 70% of volume occurred.</li>
                </ul>

                <h6>Trading Analysis Logic</h6>
                <ul>
                    <li><strong>Bullish:</strong> Price above POC + Rising MFI (or Oversold MFI rebound).</li>
                    <li><strong>Bearish:</strong> Price below POC + Falling MFI (or Overbought MFI rejection).</li>
                    <li><strong>Buying/Selling Ratio:</strong> Derived from Up/Down volume in candles.</li>
                </ul>
            </div>
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
      showInfo: false,
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
    openInfo(section = null) {
        this.showInfo = true;
    },
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
      this.loading = true; // Force visual loading state
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
      
      // Define colors
      const safeColor = '#10b981'; // Green/Teal (Profit/Support)
      const trappedColor = '#ef4444'; // Red (Loss/Resistance)
      const neutralColor = '#6b7280'; // Gray
      
      let backgroundColor = neutralColor;
      let opacity = 0.7;

      // Use this.currentPrice (fetched from OHLCV)
      if (this.currentPrice) {
          if (bin.maxPrice < this.currentPrice) {
              // Bin is fully below current price -> Safe/Profit Zone (Support)
              backgroundColor = safeColor;
          } else if (bin.minPrice > this.currentPrice) {
              // Bin is fully above current price -> Trapped/Loss Zone (Resistance)
              backgroundColor = trappedColor;
          } else {
              // Bin represents current price level (At intersection)
              backgroundColor = '#f59e0b'; // Amber
              opacity = 0.9;
          }
      }
      
      // Highlight POC
      if (bin.priceLevel === this.profileData.pointOfControl.priceLevel) {
           opacity = 1;
           // Optional: POC color override if desired
      }
      
      return {
        width: `${Math.max(widthPercent, 1)}%`,
        height: '80%',
        backgroundColor: backgroundColor,
        opacity: opacity,
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
  background: var(--bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-secondary);
  border-top: 3px solid var(--primary-color);
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
  color: var(--text-secondary);
  padding: 2rem;
  text-align: center;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.error-message {
  margin-bottom: 1rem;
  color: var(--error-color);
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
  color: var(--text-secondary);
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

/* New Layout Styles */
.mfi-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.title-section {
  display: flex;
  align-items: center;
}

.title-section h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.metrics-status-bar {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow-x: auto; /* Handle overflow gracefully if screen is very narrow */
  scrollbar-width: none; /* Hide scrollbar */
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.status-value {
  font-weight: 700;
  color: var(--text-primary);
}

.status-detail {
  font-size: 0.8em;
  color: #9ca3af;
}

.status-divider {
  color: var(--border-color);
  font-size: 0.8rem;
}

/* Updated Colors for text */
.signal-overbought, .signal-sell { color: #d32f2f; }
.signal-oversold, .signal-buy { color: #10b981; }
.signal-neutral, .signal-hold { color: #f59e0b; }

.sentiment-bullish { color: #10b981; }
.sentiment-bearish { color: #d32f2f; }
.sentiment-neutral { color: #f59e0b; }

.metric-detail {
  font-size: 0.75rem;
  color: #6c757d;
}



/* Volume Profile Chart */
.volume-profile-chart {
  /* 移除 flex: 1，改用固定高度模式 */
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
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
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.chart-header h4 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.range-selector {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.8rem;
  background: var(--bg-card);
  color: var(--text-primary);
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
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  flex-shrink: 0;
}

.price-label {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.volume-bars {
  flex: 1;
  position: relative;
}

.volume-bar-row {
  position: relative;
  border-bottom: 1px solid var(--border-color);
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
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  flex-shrink: 0;
}

.volume-label {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 0.5rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

/* Trading Signals */
.trading-signals {
  background: transparent;
  border: none;
  padding: 1rem 0 0 0;
  margin-top: 1rem;
  border-top: 1px solid var(--border-color);
  border-radius: 0;
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
  color: var(--text-secondary);
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



/* Recommendations */
.recommendations {
  margin-bottom: 1rem;
}

.recommendation {
  font-size: 0.85rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-left: 3px solid #007bff;
  border-radius: 4px;
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

/* Info Button */
.inline-info-btn {
    background: none;
    border: none;
    padding: 2px 4px;
    color: #adb5bd;
    cursor: pointer;
    margin-left: 8px;
    display: flex;
    align-items: center;
    transition: color 0.2s;
}

.inline-info-btn:hover {
    color: #007bff;
}

.no-signals {
    font-size: 0.85rem;
    color: #6c757d;
    font-style: italic;
    padding: 0.5rem 0;
}

/* Modal */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.modal-content {
    background: white;
    width: 90%;
    max-width: 500px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
}

.modal-header h5 {
    margin: 0;
    font-size: 1rem;
    color: #495057;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    color: #6c757d;
}

.modal-body {
    padding: 1rem 1.5rem;
    font-size: 0.9rem;
    color: #212529;
}

.modal-body h6 {
    margin: 1rem 0 0.5rem 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #007bff;
}

.modal-body h6:first-child {
    margin-top: 0;
}

.modal-body ul {
    margin: 0 0 1rem 0;
    padding-left: 1.2rem;
}

.modal-body li {
    margin-bottom: 0.4rem;
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