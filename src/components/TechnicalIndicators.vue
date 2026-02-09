<template>
  <div class="technical-indicators">
    <!-- Build Stamp -->
    <div class="header-row" v-if="showTitle">
      <div style="display: flex; align-items: center;">
          <h4 class="section-title">Technical Indicators</h4>
          <button class="header-info-btn" @click="showInfo = true" title="Indicator Guide">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533l1.302-4.495z"/>
                <path d="M9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
          </button>
      </div>

      <span class="last-updated" v-if="lastUpdated">Updated: {{ lastUpdated }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="grouped-grid">
      <div v-for="i in 3" :key="i" class="indicator-group" style="border: none; box-shadow: none;">
         <WidgetSkeleton :showHeader="true" :itemCount="8" type="list" />
      </div>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button @click="loadData" class="retry-btn">Retry</button>
    </div>
    
    <!-- Grouped Indicators Grid -->
    <div v-else class="grouped-grid">
      <div v-for="(group, groupName) in groupedIndicators" :key="groupName" class="indicator-group" :class="groupName.toLowerCase()">
        <h5 class="group-title">{{ groupName }}</h5>
        <div class="group-table-container">
            <table class="compact-table">
                <tbody>
                    <tr v-for="(indicator, idx) in group" :key="idx">
                        <td class="col-label">{{ indicator.label }}</td>
                        <td class="col-value">{{ indicator.value }}</td>
                        <td class="col-meta">
                            <span v-if="indicator.change" class="change-tag" :class="indicator.changeClass">{{ indicator.change }}</span>
                            <span v-else-if="indicator.signal && indicator.signal !== 'N/A'" class="signal-tag" :class="indicator.signalClass || getSignalClass(indicator.signal)">{{ indicator.signal }}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>
    </div>

    <!-- Info Modal -->
    <div v-if="showInfo" class="modal-overlay" @click.self="showInfo = false">
        <div class="modal-content">
            <div class="modal-header">
                <h5>Indicator Guide</h5>
                <button class="close-btn" @click="showInfo = false">&times;</button>
            </div>
            <div class="modal-body">
                <h6>Trend Indicators</h6>
                <ul>
                    <li><strong>MA (Moving Average):</strong> Average price over specific days (5, 10, 30).</li>
                    <li><strong>SMA (Simple Moving Average):</strong> Good for identifying trend direction & support/resistance.</li>
                    <li><strong>SuperTrend:</strong> Trend following indicator using ATR. Dynamic Stop-Loss level.</li>
                    <li><strong>Parabolic SAR:</strong> Trend-following indicator. Dots below price = Uptrend, above element = Downtrend.</li>
                    <li><strong>VWMA (Volume Weighted MA):</strong> Weights price by volume. Rising VWMA > SMA implies strong uptrend.</li>
                </ul>
                <h6>Oscillators</h6>
                <ul>
                    <li><strong>RSI (Relative Strength Index):</strong> Momentum oscillator (0-100). >70 Overbought, <30 Oversold.</li>
                    <li><strong>Stochastic (%K/%D):</strong> Momentum indicator comparing closing price to a range. >80 Overbought, <20 Oversold.</li>
                    <li><strong>CCI (Commodity Channel Index):</strong> Measures deviation from statistical average. >100 / <-100 implies strong move.</li>
                    <li><strong>MACD:</strong> Trend-following momentum indicator. Signal line crossovers indicate Buy/Sell.</li>
                    <li><strong>ADX (Avg Directional Index):</strong> Measure of trend strength. >25 indicates strong trend.</li>
                    <li><strong>Ichimoku:</strong> Comprehensive trend system. Price above Cloud = Bullish.</li>
                </ul>
                <h6>Market & Volatility</h6>
                <ul>
                    <li><strong>ATR (Average True Range):</strong> Measures market volatility. Higher value = Higher volatility.</li>
                    <li><strong>MFI (Money Flow Index):</strong> Volume-weighted RSI. >80 Overbought, <20 Oversold.</li>
                    <li><strong>OBV (On-Balance Volume):</strong> Cumulative volume flow. Confirms trend direction.</li>
                    <li><strong>Beta:</strong> Stock's volatility in relation to the market. >1.0 means more volatile.</li>
                </ul>
            </div>
        </div>
    </div>
  </div>
</template>

<script>
import hybridTechnicalIndicatorsAPI from '@/api/hybridTechnicalIndicatorsApi.js'
import yahooFinanceAPI from '@/api/yahooFinanceApi.js'
import WidgetSkeleton from './WidgetSkeleton.vue'

export default {
  name: 'TechnicalIndicators',
  components: { WidgetSkeleton },
  props: {
    symbol: {
      type: String,
      required: true
    },
    exchange: {
      type: String,
      default: 'NASDAQ'
    },
    showTitle: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      loading: true,
      error: null,
      rawData: null,
      groupedIndicators: {},
      lastUpdated: null,
      showInfo: false
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
        console.log(`🔄 Loading technical indicators for ${this.symbol} via Hybrid API (Progressive)`)
        
        // Step 1: Load Technical Indicators (Fast - Precomputed)
        const data = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators(this.symbol);
        
        if (!data) {
          throw new Error(`No data available for ${this.symbol}`)
        }

        // Render immediately with available data (using precomputed YF data if available)
        this.rawData = data;
        this.processGroupedIndicators();
        
        if (data.lastUpdated) {
            this.lastUpdated = new Date(data.lastUpdated).toLocaleString();
        } else {
            this.lastUpdated = new Date().toLocaleString() + ' (Live)';
        }
        
        console.log(`✅ Technical indicators loaded for ${this.symbol} (Fast Render)`);
        this.loading = false; // Unblock UI
        
        // Step 2: Load Real-time Stock Info (Slow - Background)
        // Only if we want to enrich with latest Volume/MarketCap
        try {
            const stockInfo = await yahooFinanceAPI.getStockInfo(this.symbol);
            if (stockInfo) {
                const existingYf = this.rawData.yf || {};
                this.rawData = {
                    ...this.rawData,
                    yf: {
                        ...existingYf,
                        // Add extended market data from Real-time source
                        extVolume: stockInfo.volume?.raw || stockInfo.volume || existingYf.extVolume, 
                        extAvgVol: stockInfo.averageVolume?.raw || stockInfo.averageVolume,
                        extAvgVol10D: stockInfo.averageDailyVolume10Day || existingYf.extAvgVol10D, 
                        extAvgVol3M: stockInfo.averageDailyVolume3Month || existingYf.extAvgVol3M,   
                        extMarketCap: stockInfo.marketCap || stockInfo.marketCapFormatted, 
                        extBeta: stockInfo.beta || stockInfo.financials?.beta,
                        regularMarketChangePercent: stockInfo.financials?.regularMarketChangePercent
                    }
                };
                this.processGroupedIndicators();
                console.log(`✅ Stock Info enriched for ${this.symbol}`);
            }
        } catch (infoErr) {
            console.warn('⚠️ Failed to load background stock info:', infoErr);
            // Non-critical, ignore
        }
        
      } catch (err) {
        console.error('Error loading technical indicators:', err)
        this.error = `Failed to load indicators: ${err.message}`
        this.loading = false;
      }
    },
    
    processGroupedIndicators() {
      const data = this.rawData;
      const groups = {
          'Trend': [],
          'Oscillators': [],
          'Market': []
      };
      
      const series = data.fullSeries || {};
      
      // Helper function to get value and diff
      const getIndicator = (key, label, arrayKey, group = 'Trend', forcedValue = null) => {
        let value = 'N/A';
        let signal = 'N/A';
        let change = null;
        let changeClass = '';

        if (data[key]) {
          value = forcedValue !== null ? forcedValue : this.formatNumber(data[key].value);
          signal = data[key].signal;

          // Format numeric signals (like MACD Signal Line)
          if (typeof signal === 'number') {
              signal = this.formatNumber(signal, 2);
          }
          
          // Use pre-calculated change if available (Compact Mode)
          if (data[key].change !== undefined && data[key].change !== null) {
              const chgVal = parseFloat(data[key].change);
              change = (chgVal >= 0 ? '+' : '') + chgVal.toFixed(1) + '%';
              changeClass = chgVal >= 0 ? 'pos' : 'neg';
          }
        }  
        
        // Calculate Change from Series (Fallback / Full Mode)
        if (!change && series[arrayKey] && Array.isArray(series[arrayKey])) {
             const arr = series[arrayKey];
             const latest = this.getLatestValue(arr);
             const prev = this.getPreviousValue(arr);
             
             if (latest !== null && prev !== null && prev !== 0) {
                 const diff = latest - prev;
                 const pct = (diff / Math.abs(prev)) * 100; // Use Math.abs(prev) for correct sign on oscillators
                 const sign = diff >= 0 ? '+' : '';
                 change = `${sign}${pct.toFixed(1)}%`;
                 changeClass = diff >= 0 ? 'pos' : 'neg';
             }

             // Fallback: If value is 'N/A' but we have series data, use latest value
             if (value === 'N/A' && latest !== null) {
                 value = forcedValue !== null ? forcedValue : this.formatNumber(latest);
             }
        }

        return { label, value, signal, change, changeClass };
      };

      // Group 1: Trend (MA, SMA, Ichimoku, VWMA)
      groups['Trend'].push(getIndicator('ma5', 'EMA(5)', 'EMA_5'));
      groups['Trend'].push(getIndicator('ma10', 'EMA(10)', 'EMA_10'));
      // New: EMA (20) placed between 10 and 30 for correct sequence
      groups['Trend'].push(getIndicator('ema20', 'EMA(20)', 'EMA_20')); 
      groups['Trend'].push(getIndicator('ma30', 'EMA(30)', 'EMA_30')); 
      
      groups['Trend'].push(getIndicator('sma5', 'SMA(5)', 'SMA_5'));
      groups['Trend'].push(getIndicator('sma10', 'SMA(10)', 'SMA_10'));
      groups['Trend'].push(getIndicator('sma30', 'SMA(30)', 'SMA_30'));
      groups['Trend'].push(getIndicator('superTrend', 'SuperTrend', 'SUPERTREND'));
      groups['Trend'].push(getIndicator('parabolicSAR', 'SAR', 'SAR'));
      groups['Trend'].push(getIndicator('vwma20', 'VWMA(20)', 'VWMA_20'));
      
      // Group 2: Oscillators & Ichimoku Components
      groups['Oscillators'].push(getIndicator('rsi14', 'RSI (14)', 'RSI_14', 'Oscillators'));
      // New: Williams %R (14)
      groups['Oscillators'].push(getIndicator('willr14', 'Will %R (14)', 'WILLR_14', 'Oscillators'));
      
      groups['Oscillators'].push(getIndicator('stochK', 'Stoch %K', 'STOCH_K', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('stochD', 'Stoch %D', 'STOCH_D', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('cci20', 'CCI (20)', 'CCI_20', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('adx14', 'ADX (14)', 'ADX_14', 'Oscillators'));
      
      // MACD (Note: Reverted to default gray styling as per user request)
      groups['Oscillators'].push(getIndicator('macd', 'MACD', 'MACD_12_26_9', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('ichimokuConversionLine', 'Ichi Conv (9)', 'ICHIMOKU_CONVERSIONLINE_9', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('ichimokuBaseLine', 'Ichi Base (26)', 'ICHIMOKU_BASELINE_26', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('ichimokuLaggingSpan', 'Ichi Lag (26)', 'ICHIMOKU_LAGGINGSPAN_26', 'Oscillators'));

      // Group 3: Market & Volume (YFinance + Precomputed)
      const yf = data.yf || data.indicators?.yf || {};
      
      // Use precomputed market data if available (Fastest)
      // data.market comes from generate-daily-technical-indicators.js (latest_all.json)
      // data.beta comes from same source.
      const preMarket = data.market || {};
      const preBeta = data.beta || {};

      groups['Market'].push(getIndicator('atr14', 'ATR (14)', 'ATR_14', 'Market'));
      groups['Market'].push(getIndicator('mfi14', 'MFI (14)', 'MFI_14', 'Market'));
      
      // CMF (20)
      groups['Market'].push(getIndicator('cmf20', 'CMF (20)', 'CMF_20', 'Market', this.formatNumber(this.getLatestValue(series.CMF_20), 3))); 

      groups['Market'].push(getIndicator('obv', 'OBV', 'OBV', 'Market', this.formatVolume(data.obv?.value)));
      
      // Volume - Prefer real Volume from StockInfo, fallback to Precomputed, then Series
      let volChange = yf.volume_last_day_pct;
      if (volChange === undefined && series.volume) {
           const latest = this.getLatestValue(series.volume);
           const prev = this.getPreviousValue(series.volume);
           if (latest && prev) {
               volChange = ((latest - prev) / prev) * 100;
           }
      }

      // Priority: Realtime > Precomputed (Market Object) > Precomputed (YF Object) > Series
      const displayVolume = yf.extVolume || preMarket.volume || yf.volume_last_day || this.getLatestValue(series.volume);
      const displayAvgVol10D = yf.extAvgVol10D || preMarket.avgVol10D || yf.avg_volume_10d || yf.extAvgVol;
      const displayAvgVol3M = yf.extAvgVol3M || preMarket.avgVol3M || yf.avg_volume_3m || displayAvgVol10D;
      
      const displayMarketCap = yf.extMarketCap || preMarket.marketCap || yf.market_cap;

      groups['Market'].push({
          label: 'Volume',
          value: this.formatVolume(displayVolume),
          change: volChange !== undefined && volChange !== null ? (volChange >= 0 ? '+' : '') + Number(volChange).toFixed(1) + '%' : null,
          changeClass: this.getChangeClass(volChange),
          signal: this.getVolumeCategory(displayVolume, displayAvgVol10D || displayAvgVol3M),
          class: 'text-white'
      });

      // Average Volume
      let avgVolDiffPct = null;
      if (displayAvgVol10D && displayAvgVol3M) {
          avgVolDiffPct = ((displayAvgVol10D - displayAvgVol3M) / displayAvgVol3M) * 100;
      }
      
      groups['Market'].push({
          label: 'Avg Vol (10D)',
          value: this.formatVolume(displayAvgVol10D),
          change: avgVolDiffPct !== null ? (avgVolDiffPct >= 0 ? '+' : '') + avgVolDiffPct.toFixed(1) + '%' : null,
          changeClass: this.getChangeClass(avgVolDiffPct),
          signal: this.getVolumeCategory(displayAvgVol10D, displayAvgVol3M), 
          class: 'text-white'
      });
      
      groups['Market'].push({
          label: 'Market Cap',
          value: this.formatMarketCap(displayMarketCap),
          signal: this.getMarketCapCategory(displayMarketCap),
          change: yf.regularMarketChangePercent !== undefined ? (yf.regularMarketChangePercent * 100 >= 0 ? '+' : '') + (yf.regularMarketChangePercent * 100).toFixed(1) + '%' : null,
          changeClass: this.getChangeClass(yf.regularMarketChangePercent),
          class: 'text-white'
      });

      // Beta - Custom Periods
      
      // Beta (10D)
      groups['Market'].push({ 
          label: 'Beta (10D)', 
          value: this.formatBeta(yf.beta_10d || preBeta.beta_10d || data.beta_10d?.value), 
          signal: this.getBetaCategory(yf.beta_10d || preBeta.beta_10d || data.beta_10d?.value)
      });

      // Beta (3M)
      groups['Market'].push({ 
          label: 'Beta (3M)', 
          value: this.formatBeta(yf.beta_3mo || preBeta.beta_3mo || data.beta_3mo?.value), 
          signal: this.getBetaCategory(yf.beta_3mo || preBeta.beta_3mo || data.beta_3mo?.value)
      });

      // Beta (1Y)
      groups['Market'].push({ 
         label: 'Beta (1Y)', 
         value: this.formatBeta(yf.extBeta || preBeta.beta_1y || data.beta_1y?.value || yf.beta || yf.beta_1y), 
         signal: this.getBetaCategory(yf.extBeta || preBeta.beta_1y || data.beta_1y?.value || yf.beta || yf.beta_1y)
      });
      
      // Beta (5Y) - Keep if available
      if (yf.beta_5y) {
          groups['Market'].push({ 
              label: 'Beta (5Y)', 
              value: this.formatBeta(yf.beta_5y), 
              signal: this.getBetaCategory(yf.beta_5y) 
          });
      }

      this.groupedIndicators = groups;
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
    
    // Style Methods
    getSignalClass(signal) {
      switch (signal) {
        case 'BUY':
        case 'BULLISH':
        case 'STRONG_TREND':
        case 'MEGA CAP':
        case 'LARGE CAP':
          return 'tag-green'
        case 'SELL':
        case 'BEARISH':
        case 'WEAK_TREND':
          return 'tag-red'
        case 'OVERBOUGHT':
        case 'HIGH VOLATILITY':
          return 'tag-yellow'
        case 'OVERSOLD':
        case 'LOW VOLATILITY':
          return 'tag-blue'
        default:
          return 'tag-gray'
      }
    },


    getChangeClass(value) {
      if (value === null || value === undefined) return ''
      return value >= 0 ? 'pos' : 'neg'
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
      if (value > 1.5) return 'HIGH VOL'
      if (value > 1.0) return 'MED VOL'
      if (value > 0.5) return 'LOW VOL'
      return 'VERY LOW'
    },

    getVolumeCategory(volume, avgVolume) {
        if (!volume || !avgVolume) return null;
        const ratio = volume / avgVolume;
        if (ratio > 1.5) return 'HIGH VOL';
        if (ratio > 1.0) return 'ABOVE AVG';
        if (ratio < 0.5) return 'LOW VOL';
        return 'BELOW AVG';
    }
  }
}
</script>

<style scoped>
.technical-indicators {
  width: 100%;
  padding: 0;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
}

.last-updated {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.grouped-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.indicator-group {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-md);
    padding: 0;
    overflow: hidden;
}

.group-title {
    background: transparent;
    margin: 0;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-color);
}

.group-table-container {
    padding: 0;
}

.compact-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
}

.compact-table td {
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--border-color);
}

.compact-table tr:last-child td {
    border-bottom: none;
}

.col-label {
    color: var(--text-muted);
    font-weight: 500;
    width: 45%; 
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.col-value {
    color: var(--text-primary);
    font-weight: 700;
    text-align: right;
    width: 25%; 
    white-space: nowrap;
}

.col-meta {
    text-align: right;
    width: 30%; 
}

/* Tags */
.change-tag {
    font-size: 0.75rem;
    font-weight: 600;
}

.change-tag.pos { color: var(--success-color); }
.change-tag.neg { color: var(--error-color); }

.signal-tag {
    font-size: 0.6rem; 
    padding: 2px 4px;   
    border-radius: 4px;
    font-weight: 700;
    text-transform: lowercase; 
    white-space: nowrap; 
    display: inline-block;
}

.tag-green { color: var(--tag-text-green); background: var(--tag-bg-green); }
.tag-red { color: var(--tag-text-red); background: var(--tag-bg-red); }
.tag-yellow { color: var(--tag-text-yellow); background: var(--tag-bg-yellow); }
.tag-blue { color: var(--tag-text-blue); background: var(--tag-bg-blue); }
.tag-gray { color: var(--text-secondary); background: var(--bg-secondary); }

/* Loading / Error */
.loading-state, .error-state {
  text-align: center;
  padding: 2rem;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid var(--bg-secondary);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 0.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-btn {
  padding: 0.4rem 0.8rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Header Info Button */
.header-info-btn {
  background: none;
  border: none;
  padding: 4px;
  color: var(--text-muted);
  cursor: pointer;
  margin-left: 8px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.header-info-btn:hover {
  color: var(--text-secondary);
}

/* Modal Styles */
.modal-overlay {
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
}

.modal-content {
    background: var(--bg-card);
    color: var(--text-primary);
    box-shadow: var(--shadow-md);
}

.modal-header {
    border-bottom: 1px solid var(--border-color);
}

.modal-header h5 {
    color: var(--text-primary);
}

.close-btn {
    color: var(--text-muted);
}

.modal-body ul {
    color: var(--text-secondary);
}

.modal-body h6 {
    color: var(--primary-color);
}

/* Responsive */
@media (max-width: 1024px) {
  .grouped-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .grouped-grid {
    grid-template-columns: 1fr;
  }
  
  .compact-table td {
      padding: 0.5rem 0.75rem;
  }
}
</style>