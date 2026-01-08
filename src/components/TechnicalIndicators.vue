<template>
  <div class="technical-indicators">
    <!-- Build Stamp -->
    <div class="header-row">
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
      <div style="font-size: 10px; color: #856404; background: #fff3cd; padding: 2px 5px; margin-left: 10px;">
          DEBUG: 10D={{ rawData && rawData.yf ? rawData.yf.extAvgVol10D : '?' }} 3M={{ rawData && rawData.yf ? rawData.yf.extAvgVol3M : '?' }}
      </div>
      <span class="last-updated" v-if="lastUpdated">Updated: {{ lastUpdated }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading...</p>
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
                        <td class="col-value" :class="getSignalTextClass(indicator.signal)">{{ indicator.value }}</td>
                        <td class="col-meta">
                            <span v-if="indicator.change" class="change-tag" :class="indicator.changeClass">{{ indicator.change }}</span>
                            <span v-else-if="indicator.signal && indicator.signal !== 'N/A'" class="signal-tag" :class="getSignalClass(indicator.signal)">{{ indicator.signal }}</span>
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
        console.log(`🔄 Loading technical indicators for ${this.symbol} via Hybrid API`)
        
        // 使用 Hybrid API 獲取數據 (自動回退到實時計算)
        // 同時獲取 Stock Info 以補充 Market 數據 (Volume, Cap, Beta)
        const [data, stockInfo] = await Promise.all([
            hybridTechnicalIndicatorsAPI.getTechnicalIndicators(this.symbol),
            yahooFinanceAPI.getStockInfo(this.symbol)
        ]);
        
        if (!data) {
          throw new Error(`No data available for ${this.symbol}`)
        }
        
        // Merge stockInfo into data as 'yf' for display, preserving existing yf data
        const existingYf = data.yf || {};
        this.rawData = {
            ...data,
            yf: {
                ...existingYf,
                // Add extended market data
                extVolume: stockInfo.volume?.raw || stockInfo.volume || existingYf.extVolume, // Fallback if added later
                extAvgVol: stockInfo.averageVolume?.raw || stockInfo.averageVolume,
                extAvgVol10D: stockInfo.averageDailyVolume10Day || existingYf.extAvgVol10D, // Fallback to pre-computed
                extAvgVol3M: stockInfo.averageDailyVolume3Month || existingYf.extAvgVol3M,   // Fallback to pre-computed
                extMarketCap: stockInfo.marketCap || stockInfo.marketCapFormatted, // Use raw for formatter
                extBeta: stockInfo.beta || stockInfo.financials?.beta,
                regularMarketChangePercent: stockInfo.financials?.regularMarketChangePercent
            }
        }
        
        this.processGroupedIndicators()
        
        // Extract Last Updated
        if (data.lastUpdated) {
            this.lastUpdated = new Date(data.lastUpdated).toLocaleString();
        } else {
            this.lastUpdated = new Date().toLocaleString() + ' (Live)';
        }
        
        console.log(`✅ Technical indicators loaded for ${this.symbol}`)
        
      } catch (err) {
        console.error('Error loading technical indicators:', err)
        this.error = `Failed to load indicators: ${err.message}`
      } finally {
        this.loading = false
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
      const getIndicator = (key, label, arrayKey, group = 'Trend') => {
        let value = 'N/A';
        let signal = 'N/A';
        let change = null;
        // let changeClass = ''; // Unused

        if (data[key]) {
          value = this.formatNumber(data[key].value);
          signal = data[key].signal;
        } 
        
        // Calculate Change
        if (series[arrayKey] && Array.isArray(series[arrayKey])) {
             const arr = series[arrayKey];
             const latest = this.getLatestValue(arr);
             const prev = this.getPreviousValue(arr);
             
             if (latest !== null && prev !== null && prev !== 0) {
                 const diff = latest - prev;
                 const pct = (diff / prev) * 100;
                 // Simplify change text for compact view
                 const sign = diff >= 0 ? '+' : '';
                 change = `${sign}${pct.toFixed(1)}%`;
                 changeClass = diff >= 0 ? 'pos' : 'neg';
             }
        }

        return { label, value, signal, change, changeClass };
      };

      // Group 1: Trend (MA, SMA, Ichimoku, VWMA)
      groups['Trend'].push(getIndicator('ma5', 'MA(5)', 'MA_5'));
      groups['Trend'].push(getIndicator('ma10', 'MA(10)', 'MA_10'));
      groups['Trend'].push(getIndicator('ma30', 'MA(30)', 'MA_30'));
      groups['Trend'].push(getIndicator('sma5', 'SMA(5)', 'SMA_5'));
      groups['Trend'].push(getIndicator('sma10', 'SMA(10)', 'SMA_10'));
      groups['Trend'].push(getIndicator('sma30', 'SMA(30)', 'SMA_30'));
      groups['Trend'].push(getIndicator('superTrend', 'SuperTrend', 'SUPERTREND_10_3'));
      groups['Trend'].push(getIndicator('parabolicSAR', 'SAR', 'SAR'));
      groups['Trend'].push(getIndicator('vwma20', 'VWMA(20)', 'VWMA_20'));
      
      // Group 2: Oscillators & Ichimoku Components
      groups['Oscillators'].push(getIndicator('rsi14', 'RSI (14)', 'RSI_14', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('stochK', 'Stoch %K', 'STOCH_K', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('stochD', 'Stoch %D', 'STOCH_D', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('cci20', 'CCI (20)', 'CCI_20', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('adx14', 'ADX (14)', 'ADX_14', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('macd', 'MACD', 'MACD_12_26_9', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('ichimokuConversionLine', 'Ichi Conv (9)', 'ICHIMOKU_CONVERSIONLINE_9', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('ichimokuBaseLine', 'Ichi Base (26)', 'ICHIMOKU_BASELINE_26', 'Oscillators'));
      groups['Oscillators'].push(getIndicator('ichimokuLaggingSpan', 'Ichi Lag (26)', 'ICHIMOKU_LAGGINGSPAN_26', 'Oscillators'));

      // Group 3: Market & Volume (YFinance)
      const yf = data.yf || data.indicators?.yf || {};

      groups['Market'].push(getIndicator('atr14', 'ATR (14)', 'ATR_14', 'Market'));
      groups['Market'].push(getIndicator('mfi14', 'MFI (14)', 'MFI_14', 'Market'));
      groups['Market'].push(getIndicator('obv', 'OBV', 'OBV', 'Market'));
      
      // Volume - Prefer real Volume from StockInfo, fallback to YF
      // Volume - Prefer real Volume from StockInfo, fallback to YF
      let volChange = yf.volume_last_day_pct;
      if (volChange === undefined && series.volume) {
           const latest = this.getLatestValue(series.volume);
           const prev = this.getPreviousValue(series.volume);
           if (latest && prev) {
               volChange = ((latest - prev) / prev) * 100;
           }
      }

      groups['Market'].push({
          label: 'Volume',
          value: this.formatVolume(yf.extVolume || yf.volume_last_day),
          change: volChange !== undefined && volChange !== null ? (volChange >= 0 ? '+' : '') + Number(volChange).toFixed(1) + '%' : null,
          changeClass: this.getChangeClass(volChange),
          signal: this.getVolumeCategory(yf.extVolume || yf.volume_last_day, yf.extAvgVol || yf.avg_volume_5d),
          class: 'text-white'
      });

      // Average Volume - Compare 10D vs 3M for signal and change %
      const avgVol10D = yf.extAvgVol10D || yf.avg_volume_10d || yf.extAvgVol; // Fallback
      const avgVol3M = yf.extAvgVol3M || yf.avg_volume_3m || avgVol10D; // Fallback to 10D to avoid NaN if 3M missing
      
      let avgVolDiffPct = null;
      if (avgVol10D && avgVol3M) {
          avgVolDiffPct = ((avgVol10D - avgVol3M) / avgVol3M) * 100;
      }
      
      groups['Market'].push({
          label: 'Avg Vol (10D)',
          value: this.formatVolume(avgVol10D),
          change: avgVolDiffPct !== null ? (avgVolDiffPct >= 0 ? '+' : '') + avgVolDiffPct.toFixed(1) + '%' : null,
          changeClass: this.getChangeClass(avgVolDiffPct),
          signal: this.getVolumeCategory(avgVol10D, avgVol3M), // Compare short-term avg with medium-term avg
          class: 'text-white'
      });
      
      groups['Market'].push({
          label: 'Market Cap',
          value: this.formatMarketCap(yf.extMarketCap || yf.market_cap),
          signal: this.getMarketCapCategory(yf.extMarketCap || yf.market_cap),
          change: yf.regularMarketChangePercent !== undefined ? (yf.regularMarketChangePercent * 100 >= 0 ? '+' : '') + (yf.regularMarketChangePercent * 100).toFixed(1) + '%' : null,
          changeClass: this.getChangeClass(yf.regularMarketChangePercent),
          class: 'text-white'
      });

      // Beta - Custom Periods
      // Note: Standard API usually provides 5Y Beta.
      
      // Beta (10D)
      groups['Market'].push({ 
          label: 'Beta (10D)', 
          value: yf.beta_10d || 'N/A', 
          signal: this.getBetaCategory(yf.beta_10d)
      });

      // Beta (3M)
      groups['Market'].push({ 
          label: 'Beta (3M)', 
          value: this.formatBeta(yf.beta_3mo), 
          signal: this.getBetaCategory(yf.beta_3mo)
      });

      // Beta (1Y) - Map default Beta here as per request
      groups['Market'].push({ 
         label: 'Beta (1Y)', 
         value: this.formatBeta(yf.extBeta || yf.beta || yf.beta_1y), 
         signal: this.getBetaCategory(yf.extBeta || yf.beta || yf.beta_1y)
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
    
    getSignalTextClass(signal) {
       // Optional color for values
       return ''; 
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
/* ... existing styles ... */
.header-info-btn {
  background: none;
  border: none;
  padding: 4px;
  color: #adb5bd;
  cursor: pointer;
  margin-left: 8px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.header-info-btn:hover {
  color: #495057;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
}

.modal-header h5 {
    margin: 0;
    font-size: 1.1rem;
    color: #333;
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
    padding: 0;
    line-height: 1;
}

.modal-body ul {
    padding-left: 20px;
    margin-bottom: 15px;
    font-size: 0.9rem;
    color: #555;
    text-align: left;
}

.modal-body li {
    margin-bottom: 6px;
}

.modal-body h6 {
    font-size: 0.95rem;
    color: #007bff;
    margin: 10px 0 5px 0;
    font-weight: 600;
    text-align: left;
}



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
  color: #495057;
  margin: 0;
}

.last-updated {
  font-size: 0.75rem;
  color: #adb5bd;
}

.grouped-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.indicator-group {
    background: white;
    border-radius: 8px;
    border: 1px solid #e9ecef;
    padding: 0;
    overflow: hidden;
}

.group-title {
    background: #f8f9fa;
    margin: 0;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #495057;
    border-bottom: 1px solid #e9ecef;
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
    border-bottom: 1px solid #f1f3f5;
}

.compact-table tr:last-child td {
    border-bottom: none;
}

.col-label {
    color: #6c757d;
    font-weight: 500;
    width: 45%; /* Widened from 35% */
}

.col-value {
    color: #212529;
    font-weight: 700;
    text-align: right;
    width: 25%; /* Reduced from 30%*/
}

.col-meta {
    text-align: right;
    width: 30%; /* Reduced from 35% */
}

/* Tags */
.change-tag {
    font-size: 0.75rem;
    font-weight: 600;
}

.change-tag.pos { color: #28a745; }
.change-tag.neg { color: #dc3545; }

.signal-tag {
    font-size: 0.6rem; /* Smaller font */
    padding: 2px 4px;   
    border-radius: 4px;
    font-weight: 700;
    text-transform: lowercase; /* Changed to lowercase */
    white-space: nowrap; 
    display: inline-block;
}

.tag-green { color: #155724; background: #d4edda; }
.tag-red { color: #721c24; background: #f8d7da; }
.tag-yellow { color: #856404; background: #fff3cd; }
.tag-blue { color: #004085; background: #cce5ff; }
.tag-gray { color: #383d41; background: #e2e3e5; }

/* Loading / Error */
.loading-state, .error-state {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 8px;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
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
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
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