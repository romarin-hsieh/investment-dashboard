<template>
  <div class="mfi-volume-profile-widget">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading MFI Volume Profile...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <p class="error-message">{{ error }}</p>
      <button @click="loadData" class="retry-btn">Retry</button>
    </div>

    <!-- Main Content -->
    <div v-else-if="mfiVolumeProfile" class="widget-content">
      <!-- Header with Key Metrics -->
      <div class="metrics-header">
        <div class="metric-card">
          <div class="metric-label">MFI Signal</div>
          <div class="metric-value" :class="`signal-${mfiVolumeProfile.mfi.signal.toLowerCase()}`">
            {{ mfiVolumeProfile.mfi.signal }}
          </div>
          <div class="metric-detail">{{ mfiVolumeProfile.mfi.latest?.toFixed(2) || 'N/A' }}</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Market Sentiment</div>
          <div class="metric-value" :class="`sentiment-${mfiVolumeProfile.marketSentiment.toLowerCase()}`">
            {{ mfiVolumeProfile.marketSentiment }}
          </div>
          <div class="metric-detail">
            Buy: {{ (mfiVolumeProfile.statistics.buyingRatio * 100).toFixed(1) }}%
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Point of Control</div>
          <div class="metric-value">{{ mfiVolumeProfile.pointOfControl.priceLevel.toFixed(2) }}</div>
          <div class="metric-detail">{{ mfiVolumeProfile.pointOfControl.percentage.toFixed(1) }}% volume</div>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="chart-container">
        <div v-if="useCanvasVolumeProfile" class="chart-grid">
          <!-- Left side - Candlestick chart -->
          <div ref="chartContainer" class="chart-canvas"></div>
          
          <!-- Right side - Canvas Volume Profile -->
          <MFIVolumeProfileCanvas
            v-if="mfiVolumeProfile"
            :profile="mfiVolumeProfile.volumeProfile"
            :pointOfControl="mfiVolumeProfile.pointOfControl"
            :valueArea="mfiVolumeProfile.valueArea"
            :currentPrice="currentPrice"
            :height="600"
            :width="340"
            :showAllLabelsOnDesktop="true"
            :priceDecimals="2"
          />
        </div>
        
        <!-- Fallback - Original histogram chart -->
        <div v-else ref="chartContainer" class="chart-canvas"></div>
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
          
          <div class="support-resistance">
            <div v-if="tradingSignals.supportLevels.length > 0" class="levels-section">
              <h5>Support Levels</h5>
              <div class="level" v-for="(level, index) in tradingSignals.supportLevels" :key="index">
                <span class="level-price">${{ level.price.toFixed(2) }}</span>
                <span class="level-strength">{{ (level.strength * 100).toFixed(0) }}%</span>
                <span class="level-type">{{ level.type }}</span>
              </div>
            </div>
            
            <div v-if="tradingSignals.resistanceLevels.length > 0" class="levels-section">
              <h5>Resistance Levels</h5>
              <div class="level" v-for="(level, index) in tradingSignals.resistanceLevels" :key="index">
                <span class="level-price">${{ level.price.toFixed(2) }}</span>
                <span class="level-strength">{{ (level.strength * 100).toFixed(0) }}%</span>
                <span class="level-type">{{ level.type }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Data State -->
    <div v-else class="no-data-state">
      <div class="no-data-icon">📊</div>
      <p>No MFI Volume Profile data available</p>
    </div>
  </div>
</template>

<script>
import { createChart, ColorType } from 'lightweight-charts';
import { precomputedIndicatorsApi } from '@/api/precomputedIndicatorsApi.js';
import { yahooFinanceAPI } from '@/api/yahooFinanceApi.js';
import { calculateMFIVolumeProfile, getMFIVolumeProfileSignals } from '@/utils/mfiVolumeProfile.js';
import MFIVolumeProfileCanvas from './MFIVolumeProfileCanvas.vue';

export default {
  name: 'MFIVolumeProfileWidget',
  components: {
    MFIVolumeProfileCanvas
  },
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
    period: {
      type: String,
      default: '1d'
    },
    range: {
      type: String,
      default: '3mo'
    },
    bins: {
      type: Number,
      default: 20
    },
    mfiPeriod: {
      type: Number,
      default: 14
    },
    useCanvasVolumeProfile: {
      type: Boolean,
      default: true
    },
    mfiAvgMode: {
      type: String,
      default: 'weighted',
      validator: value => ['weighted', 'legacy'].includes(value)
    }
  },
  data() {
    return {
      loading: false,
      error: null,
      mfiVolumeProfile: null,
      tradingSignals: null,
      chart: null,
      candlestickSeries: null,
      volumeProfileSeries: null,
      currentPrice: null
    };
  },
  mounted() {
    this.loadData();
  },
  beforeUnmount() {
    // Clean up chart
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
    
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
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
      
      try {
        console.log(`📊 Loading MFI Volume Profile for ${this.symbol}...`);
        
        // Step 1: Try precomputed data first
        let ohlcvData = null;
        try {
          ohlcvData = await precomputedOhlcvApi.getOhlcv(this.symbol, this.period, 90);
          console.log(`📊 Using precomputed OHLCV data for ${this.symbol}`);
        } catch (precomputedError) {
          console.log(`📊 Precomputed data not available for ${this.symbol}, falling back to Yahoo Finance`);
          
          // Step 2: Fallback to Yahoo Finance API
          try {
            ohlcvData = await yahooFinanceAPI.getOhlcv(this.symbol, this.period, this.range);
            console.log(`📊 Using Yahoo Finance OHLCV data for ${this.symbol}`);
          } catch (yahooError) {
            throw new Error(`Failed to fetch OHLCV data: ${yahooError.message}`);
          }
        }
        
        if (!ohlcvData) {
          throw new Error('No OHLCV data available');
        }
        
        // Step 3: Calculate MFI Volume Profile with options
        this.mfiVolumeProfile = calculateMFIVolumeProfile(ohlcvData, this.bins, this.mfiPeriod, {
          mfiAvgMode: this.mfiAvgMode
        });
        
        // Step 4: Get current price for trading signals
        this.currentPrice = this.getCurrentPrice(ohlcvData);
        
        // Step 5: Generate trading signals
        if (this.currentPrice) {
          this.tradingSignals = getMFIVolumeProfileSignals(this.mfiVolumeProfile, this.currentPrice);
        }
        
        // Step 6: Create chart
        await this.$nextTick();
        this.createChart(ohlcvData);
        
        console.log(`📊 MFI Volume Profile loaded successfully for ${this.symbol}`);
        
      } catch (error) {
        console.error(`📊 MFI Volume Profile error for ${this.symbol}:`, error);
        this.error = error.message;
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
    
    createChart(ohlcvData) {
      if (!this.$refs.chartContainer || !this.mfiVolumeProfile) {
        return;
      }
      
      // Remove existing chart
      if (this.chart) {
        this.chart.remove();
      }
      
      try {
        // Create chart
        this.chart = createChart(this.$refs.chartContainer, {
          width: this.$refs.chartContainer.clientWidth,
          height: 600,
          layout: {
            background: { type: ColorType.Solid, color: '#ffffff' },
            textColor: '#333333',
          },
          grid: {
            vertLines: { color: '#f0f0f0' },
            horzLines: { color: '#f0f0f0' },
          },
          crosshair: {
            mode: 1,
          },
          rightPriceScale: {
            borderColor: '#cccccc',
          },
          timeScale: {
            borderColor: '#cccccc',
            timeVisible: true,
            secondsVisible: false,
          },
        });
        
        // Add candlestick series
        this.candlestickSeries = this.chart.addCandlestickSeries({
          upColor: '#22ab94',
          downColor: '#f7525f',
          borderDownColor: '#f7525f',
          borderUpColor: '#22ab94',
          wickDownColor: '#f7525f',
          wickUpColor: '#22ab94',
        });
        
        // Prepare candlestick data
        const candlestickData = [];
        for (let i = 0; i < ohlcvData.timestamps.length; i++) {
          if (ohlcvData.open[i] != null && ohlcvData.high[i] != null && 
              ohlcvData.low[i] != null && ohlcvData.close[i] != null) {
            candlestickData.push({
              time: ohlcvData.timestamps[i],
              open: ohlcvData.open[i],
              high: ohlcvData.high[i],
              low: ohlcvData.low[i],
              close: ohlcvData.close[i]
            });
          }
        }
        
        this.candlestickSeries.setData(candlestickData);
        
        // Add volume profile as histogram series (only if not using Canvas)
        if (!this.useCanvasVolumeProfile) {
          const volumeProfileSeries = this.chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
              type: 'volume',
            },
            priceScaleId: 'left',
            scaleMargins: {
              top: 0.8,
              bottom: 0,
            },
          });
          
          // Prepare volume profile data - use price levels as time
          const volumeProfileData = this.mfiVolumeProfile.volumeProfile.map((bin, index) => ({
            time: ohlcvData.timestamps[Math.floor(index * ohlcvData.timestamps.length / this.mfiVolumeProfile.volumeProfile.length)] || ohlcvData.timestamps[ohlcvData.timestamps.length - 1],
            value: bin.volume,
            color: this.getVolumeProfileColor(bin)
          }));
          
          volumeProfileSeries.setData(volumeProfileData);
        }
        
        // Add POC line
        if (this.candlestickSeries && this.mfiVolumeProfile.pointOfControl) {
          const pocLine = {
            price: this.mfiVolumeProfile.pointOfControl.priceLevel,
            color: '#2196F3',
            lineWidth: 2,
            lineStyle: 0, // Solid
            axisLabelVisible: true,
            title: 'POC',
          };
          
          this.candlestickSeries.createPriceLine(pocLine);
        }
        
        // Add Value Area lines
        if (this.candlestickSeries && this.mfiVolumeProfile.valueArea) {
          const valueAreaHigh = {
            price: this.mfiVolumeProfile.valueArea.high,
            color: '#FF9800',
            lineWidth: 1,
            lineStyle: 1, // Dashed
            axisLabelVisible: true,
            title: 'VA High',
          };
          
          const valueAreaLow = {
            price: this.mfiVolumeProfile.valueArea.low,
            color: '#FF9800',
            lineWidth: 1,
            lineStyle: 1, // Dashed
            axisLabelVisible: true,
            title: 'VA Low',
          };
          
          this.candlestickSeries.createPriceLine(valueAreaHigh);
          this.candlestickSeries.createPriceLine(valueAreaLow);
        }
        
        // Handle resize
        const resizeObserver = new ResizeObserver(entries => {
          if (this.chart && entries.length > 0) {
            const { width } = entries[0].contentRect;
            this.chart.applyOptions({ width });
          }
        });
        
        resizeObserver.observe(this.$refs.chartContainer);
        
        // Store resize observer for cleanup
        this.resizeObserver = resizeObserver;
        
      } catch (error) {
        console.error('📊 Chart creation failed:', error);
        this.error = 'Failed to create chart: ' + error.message;
      }
    },
    
    getVolumeProfileColor(bin) {
      // Color based on MFI sentiment
      if (bin.positiveVolume > bin.negativeVolume) {
        return '#4CAF50'; // Green for buying pressure
      } else if (bin.negativeVolume > bin.positiveVolume) {
        return '#F44336'; // Red for selling pressure
      } else {
        return '#9E9E9E'; // Gray for neutral
      }
    }
  }
};
</script>

<style scoped>
.mfi-volume-profile-widget {
  width: 100%;
  height: 100%;
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
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.error-message {
  margin-bottom: 1rem;
  text-align: center;
  color: #d32f2f;
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

/* No Data State */
.no-data-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
}

.no-data-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

/* Widget Content */
.widget-content {
  display: flex;
  flex-direction: column;
  height: 100%;
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

/* Chart Container */
.chart-container {
  flex: 1;
  min-height: 400px;
  margin-bottom: 1.5rem;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  overflow: hidden;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 12px;
  height: 100%;
  padding: 12px;
}

.chart-canvas {
  width: 100%;
  height: 100%;
  min-height: 600px;
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

/* Support/Resistance Levels */
.support-resistance {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.levels-section h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #495057;
}

.level {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: #ffffff;
  border-radius: 4px;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
}

.level-price {
  font-weight: 600;
  color: #495057;
}

.level-strength {
  color: #6c757d;
}

.level-type {
  font-size: 0.7rem;
  color: #6c757d;
}

/* Responsive Design */
@media (max-width: 1023px) {
  .chart-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

@media (max-width: 768px) {
  .metrics-header {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .support-resistance {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .widget-content {
    padding: 0.75rem;
  }
  
  .chart-container {
    min-height: 300px;
  }
  
  .chart-canvas {
    min-height: 300px;
  }
}

@media (max-width: 480px) {
  .signals-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .level {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>