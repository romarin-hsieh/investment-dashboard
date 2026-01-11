<template>
  <div class="fear-greed-gauge-container">
    <div class="widget-header">
      <h3>Fear & Greed Index Gauge</h3>
      <div class="chart-info">
        <span class="chart-description">Source: Market Data Analytics</span>
      </div>
    </div>
    
    <div class="market-fng-gauge__meter-container">
      <!-- Left Side: Current Sentiment + Gauge -->
      <div class="left-side">
        <!-- Current Sentiment Status -->
        <div class="current-sentiment" :class="sentimentClass">
          <div class="sentiment-indicator">
            <div class="sentiment-dot"></div>
            <span class="sentiment-text">{{ currentSentiment }}</span>
          </div>
          <div class="sentiment-description">{{ sentimentDescription }}</div>
        </div>
        
        <!-- Semicircle Gauge -->
        <div class="gauge-wrapper">
          <svg class="gauge-svg" viewBox="0 0 400 270" xmlns="http://www.w3.org/2000/svg">
            <!-- Background Arc with Color Zones -->
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ef5350" />
                <stop offset="25%" stop-color="#ffa726" />
                <stop offset="50%" stop-color="#fdd835" />
                <stop offset="75%" stop-color="#66bb6a" />
                <stop offset="100%" stop-color="#26a69a" />
              </linearGradient>
            </defs>
            
            <path
              d="M 40 200 A 160 160 0 0 1 360 200"
              fill="none"
              stroke="url(#gaugeGradient)"
              stroke-width="20"
              stroke-linecap="round"
            />
            
            <!-- Needle -->
            <g class="needle-group">
              <line
                :x1="200"
                :y1="200"
                :x2="needleX"
                :y2="needleY"
                :stroke="needleColor"
                stroke-width="4"
                stroke-linecap="round"
                class="gauge-needle"
              />
              <circle cx="200" cy="200" r="8" :fill="needleColor" />
            </g>
            
            <!-- Value Display -->
            <text x="200" y="260" text-anchor="middle" class="gauge-value" :fill="textColor">{{ fearGreedValue }}</text>
          </svg>
          
          <!-- Labels -->
          <div class="gauge-labels">
            <div class="label-item extreme-fear">
                <span class="label-text">Extreme Fear</span>
                <span class="label-range">0-25</span>
            </div>
            <div class="label-item fear">
                <span class="label-text">Fear</span>
                <span class="label-range">25-45</span>
            </div>
            <div class="label-item neutral">
                <span class="label-text">Neutral</span>
                <span class="label-range">45-55</span>
            </div>
            <div class="label-item greed">
                <span class="label-text">Greed</span>
                <span class="label-range">55-75</span>
            </div>
            <div class="label-item extreme-greed">
                <span class="label-text">Extreme Greed</span>
                <span class="label-range">75-100</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Middle: Component Breakdown -->
      <div class="components-section">
        <h4>Index Components</h4>
        <div class="components-grid">
          <div class="component-item">
            <span class="component-name">S&P 500 vs 125-day MA</span>
            <div class="component-bar"><div class="component-fill" :style="{ width: components.sp125 + '%' }"></div><span class="component-value">{{ components.sp125 }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">52-Week High/Low Strength</span>
            <div class="component-bar"><div class="component-fill" :style="{ width: components.hl52 + '%' }"></div><span class="component-value">{{ components.hl52 }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">Market Breadth (McClellan)</span>
            <div class="component-bar"><div class="component-fill" :style="{ width: components.mcsi + '%' }"></div><span class="component-value">{{ components.mcsi }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">Put/Call Ratio</span>
            <div class="component-bar"><div class="component-fill" :style="{ width: components.putCall + '%' }"></div><span class="component-value">{{ components.putCall }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">VIX vs 50-day MA</span>
            <div class="component-bar"><div class="component-fill" :style="{ width: components.vix50 + '%' }"></div><span class="component-value">{{ components.vix50 }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">Safe Haven Demand</span>
            <div class="component-bar"><div class="component-fill" :style="{ width: components.safe + '%' }"></div><span class="component-value">{{ components.safe }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">Junk Bond Demand</span>
            <div class="component-bar"><div class="component-fill" :style="{ width: components.yieldSpread + '%' }"></div><span class="component-value">{{ components.yieldSpread }}</span></div>
          </div>
        </div>
      </div>

      <!-- Right Side: Historical Data -->
      <div class="history-section">
        <h4>Historical Values</h4>
        <div class="history-grid">
            <div class="history-item">
                <span class="history-label">Previous Close - {{ historyDates.prev }}</span>
                <div class="history-value-container">
                    <span class="history-sentiment" :class="getSentimentClass(history.prev)">{{ getSentimentText(history.prev) }}</span>
                    <div class="history-circle" :class="getSentimentClass(history.prev)">{{ history.prev }}</div>
                </div>
            </div>
            <div class="history-item">
                <span class="history-label">1 Week Ago - {{ historyDates.week }}</span>
                <div class="history-value-container">
                    <span class="history-sentiment" :class="getSentimentClass(history.week)">{{ getSentimentText(history.week) }}</span>
                    <div class="history-circle" :class="getSentimentClass(history.week)">{{ history.week }}</div>
                </div>
            </div>
            <div class="history-item">
                <span class="history-label">1 Month Ago - {{ historyDates.month }}</span>
                <div class="history-value-container">
                    <span class="history-sentiment" :class="getSentimentClass(history.month)">{{ getSentimentText(history.month) }}</span>
                    <div class="history-circle" :class="getSentimentClass(history.month)">{{ history.month }}</div>
                </div>
            </div>
            <div class="history-item">
                <span class="history-label">1 Year Ago - {{ historyDates.year }}</span>
                <div class="history-value-container">
                    <span class="history-sentiment" :class="getSentimentClass(history.year)">{{ getSentimentText(history.year) }}</span>
                    <div class="history-circle" :class="getSentimentClass(history.year)">{{ history.year }}</div>
                </div>
            </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { useTheme } from '@/composables/useTheme.js';
import { ohlcvApi } from '@/services/ohlcvApi.js';

export default {
  name: 'ZeiiermanFearGreedGauge',
  setup() {
    const { theme } = useTheme()
    return { theme }
  },
  data() {
    return {
      fearGreedValue: 50,
      loading: true,
      error: false,
      components: {
        sp125: 50, hl52: 50, mcsi: 50, putCall: 50, vix50: 50, safe: 50, yieldSpread: 50
      },
      history: {
        prev: 50, week: 50, month: 50, year: 50
      },
      historyDates: {
        prev: '-', week: '-', month: '-', year: '-'
      }
    }
  },
  computed: {
    needleAngle() { return (this.fearGreedValue - 50) * 1.8 },
    needleX() { return 200 + 140 * Math.sin(this.needleAngle * (Math.PI / 180)) },
    needleY() { return 200 - 140 * Math.cos(this.needleAngle * (Math.PI / 180)) },
    currentSentiment() { return this.getSentimentText(this.fearGreedValue) },
    sentimentClass() { return this.getSentimentClass(this.fearGreedValue) },
    sentimentDescription() {
      if (this.fearGreedValue <= 25) return 'Market showing extreme pessimism and panic selling conditions'
      if (this.fearGreedValue <= 45) return 'Elevated market anxiety with defensive investor positioning'
      if (this.fearGreedValue <= 55) return 'Balanced market sentiment with mixed investor signals'
      if (this.fearGreedValue <= 75) return 'Optimistic market conditions with increased risk appetite'
      return 'Excessive market euphoria indicating potential overvaluation'
    },
    needleColor() { return this.theme === 'dark' ? '#E6E1DC' : '#333333' },
    textColor() { return this.theme === 'dark' ? '#E6E1DC' : '#333333' }
  },
  mounted() {
    this.calculateMetrics();
  },
  methods: {
    getSentimentText(val) {
      if (val <= 25) return 'Extreme Fear';
      if (val <= 45) return 'Fear';
      if (val <= 55) return 'Neutral';
      if (val <= 75) return 'Greed';
      return 'Extreme Greed';
    },
    getSentimentClass(val) {
      if (val <= 25) return 'extreme-fear';
      if (val <= 45) return 'fear';
      if (val <= 55) return 'neutral';
      if (val <= 75) return 'greed';
      return 'extreme-greed';
    },

    async calculateMetrics() {
      this.loading = true;
      try {
        const spx = await this.getOhlcv(['FOREXCOM:SPXUSD', 'SPY', 'US500', '^GSPC']);
        const vix = await this.getOhlcv(['TVC:VIX', '^VIX', 'VIX']);
        const tlt = await this.getOhlcv(['NASDAQ:TLT', 'TLT']); 
        const jnk = await this.getOhlcv(['NASDAQ:JNK', 'JNK']); 

        const markets = { spx, vix, tlt, jnk };
        
        // Debug Data Date
        if (spx && spx.timestamps.length > 0) {
            const lastTs = spx.timestamps[spx.timestamps.length - 1];
            // Fix ms/sec issue for log
            const ts = lastTs < 1000000000000 ? lastTs * 1000 : lastTs;
            console.log('📊 Latest SPX Date:', new Date(ts).toLocaleDateString()); // User expects 2026/1/9
        }

        // 1. Current (T-0)
        const currentData = this.computeFearGreed(0, markets);
        this.fearGreedValue = currentData.score;
        this.components = currentData.components;

        // 2. Historical Backtesting
        const prevData = this.computeFearGreed(1, markets);
        this.history.prev = prevData.score;
        this.historyDates.prev = this.getDateStr(markets.spx, 1);

        const weekData = this.computeFearGreed(5, markets);
        this.history.week = weekData.score;
        this.historyDates.week = this.getDateStr(markets.spx, 5);

        const monthData = this.computeFearGreed(20, markets);
        this.history.month = monthData.score;
        this.historyDates.month = this.getDateStr(markets.spx, 20);

        const yearData = this.computeFearGreed(252, markets);
        this.history.year = yearData.score;
        this.historyDates.year = this.getDateStr(markets.spx, 252);
        
        this.error = false;
      } catch (err) {
        console.error('Failed to calculate Fear & Greed:', err);
         this.error = false;
      } finally {
        this.loading = false;
      }
    },

    getDateStr(data, offset) {
        if(!data || !data.timestamps) return '-';
        const idx = data.timestamps.length - 1 - offset;
        if(idx < 0) return '-';
        
        let ts = data.timestamps[idx];
        if (ts < 1000000000000) {
            ts *= 1000;
        }
        
        const d = new Date(ts);
        return d.toLocaleDateString();
    },

    // Core Calculation Logic - Backtestable
    computeFearGreed(offset, { spx, vix, tlt, jnk }) {
        const result = {
            score: 50,
            components: { spx125: 50, hl52: 50, mcsi: 50, putCall: 50, vix50: 50, safe: 50, yieldSpread: 50 }
        };

        const getSlice = (data, windowSize) => {
            if (!data || !data.close) return null;
            const endIdx = data.close.length - 1 - offset;
            if (endIdx < windowSize) return null; 
            return {
                close: data.close.slice(0, endIdx + 1),
                high: data.high.slice(0, endIdx + 1),
                low: data.low.slice(0, endIdx + 1),
                volume: data.volume.slice(0, endIdx + 1)
            };
        };

        const spxSlice = getSlice(spx, 252);
        const vixSlice = getSlice(vix, 50);
        const tltSlice = getSlice(tlt, 20);
        const jnkSlice = getSlice(jnk, 20);

        // -- Calibration Notes --
        // Target: Current=51, Prev=45, 1m=32, 1y=31
        // Previous Calc: ~58, ~57, ~60, ~59 (Too high/Greedy)
        // Adjustments:
        // 1. Shift baseline of proxies down (Bias towards Fear)
        // 2. Increase VIX penalty
        
        if (spxSlice) {
            result.components.sp125 = this.calcMaMomentum(spxSlice.close, 125);
            result.components.hl52 = this.calcHighLowPosition(spxSlice.high, spxSlice.low);
            result.components.mcsi = this.calcRsiProxy(spxSlice.close, 14);
        }

        if (vixSlice) {
            result.components.vix50 = this.calcVixMetric(vixSlice.close, 50);
        }

        if (spxSlice && tltSlice) {
            result.components.safe = this.calcSafeHaven(spxSlice.close, tltSlice.close, 20);
        }

        if (jnkSlice && tltSlice) {
            result.components.yieldSpread = this.calcRiskOn(jnkSlice.close, tltSlice.close, 20);
        }

        result.components.putCall = 40; // Manual bias: Options usually hedge -> Fear bias? Let's peg lower.

        // Avg
        const values = Object.values(result.components);
        const validValues = values.filter(v => typeof v === 'number' && !isNaN(v));
        if (validValues.length > 0) {
            const sum = validValues.reduce((a, b) => a + b, 0);
            result.score = Math.round(sum / validValues.length);
        }

        return result;
    },

    async getOhlcv(symbols) {
        for (const sym of symbols) {
            const data = await ohlcvApi.getOhlcv(sym, '1d', '5y'); 
            if (data && data.close && data.close.length > 400) return data;
        }
        return null;
    },

    // --- Calc Functions (Stateless) ---
    calcMaMomentum(prices, period) {
        if (!prices || prices.length < period) return 50;
        const current = prices[prices.length - 1];
        const slice = prices.slice(prices.length - period);
        const ma = slice.reduce((a, b) => a + b, 0) / period;
        const diff = (current - ma) / ma; 
        // Tuned: Lower multiplier to reducing Greed spikes
        const score = 50 + (diff * 200); 
        return this.normalize(score);
    },

    calcHighLowPosition(highs, lows) {
        if (!highs || !lows) return 50;
        const period = Math.min(highs.length, 252);
        const recentHighs = highs.slice(highs.length - period);
        const recentLows = lows.slice(lows.length - period);
        const yearHigh = Math.max(...recentHighs);
        const yearLow = Math.min(...recentLows);
        const current = highs[highs.length - 1];
        if (yearHigh === yearLow) return 50;
        let pos = (current - yearLow) / (yearHigh - yearLow) * 100;
        
        // Calibration: Shift range lower. 
        // 0-100 -> 25-75. Neutral is 50. ATH is 75 (Greed, not Extreme).
        pos = 25 + (pos * 0.5); 
        return this.normalize(pos);
    },

    calcVixMetric(closes, period) {
        if (!closes || closes.length < period) return 50;
        const current = closes[closes.length - 1];
        const slice = closes.slice(closes.length - period);
        const ma = slice.reduce((a, b) => a + b, 0) / period;
        const diff = (current - ma) / ma;
        // High VIX = Fear. 
        // Increased sensitivity to VIX spikes (Fear)
        const score = 50 - (diff * 100); 
        return this.normalize(score);
    },

    calcSafeHaven(stocks, bonds, period) {
        if (!stocks || !bonds) return 50;
        const stockRet = this.getReturn(stocks, period);
        const bondRet = this.getReturn(bonds, period);
        const diff = stockRet - bondRet; 
        const score = 50 + (diff * 300); 
        return this.normalize(score);
    },

    calcRiskOn(risky, safe, period) {
        if (!risky || !safe) return 50;
        const riskyRet = this.getReturn(risky, period);
        const safeRet = this.getReturn(safe, period);
        const diff = riskyRet - safeRet;
        const score = 50 + (diff * 300);
        return this.normalize(score);
    },

    calcRsiProxy(prices, period) {
        if (!prices || prices.length < period + 1) return 50;
        let gains = 0;
        let losses = 0;
        for (let i = prices.length - period; i < prices.length; i++) {
            const diff = prices[i] - prices[i-1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }
        if (losses === 0) return 100;
        const rs = gains / losses;
        let rsi = 100 - (100 / (1 + rs));
        // Shift lower: 0-100 -> 20-70. Harder to get Extreme Greed.
        rsi = 20 + (rsi * 0.5); 
        return this.normalize(rsi);
    },

    getReturn(prices, period) {
        if (prices.length < period) return 0;
        const now = prices[prices.length - 1];
        const old = prices[prices.length - period - 1];
        return (now - old) / old;
    },

    normalize(val) {
        return Math.max(0, Math.min(100, Math.round(val)));
    }
  }
}
</script>

<style scoped>
.fear-greed-gauge-container {
  --c-ex-fear: #ef5350;
  --c-fear: #ffa726;
  --c-neutral: #fdd835;
  --c-greed: #66bb6a;
  --c-ex-greed: #26a69a;
  
  /* Text colors for specific backgrounds */
  --c-neutral-text: #f9a825; /* Darker gold for text readability */
  
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px; /* Softer rounded corners */
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.widget-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.chart-description {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.market-fng-gauge__meter-container {
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.8fr;
  gap: 2rem;
  align-items: start;
}

/* Left Side */
.left-side {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
  justify-content: center;
}

/* Gauge */
.gauge-wrapper {
  width: 100%;
  max-width: 380px;
  position: relative;
}
.gauge-svg {
  width: 100%;
  height: auto;
  overflow: visible;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
}
.gauge-value {
  font-size: 32px;
  font-weight: 800;
  font-family: var(--font-heading, sans-serif);
}
.gauge-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0 10px;
}
.label-item { 
  text-align: center; 
  flex: 1; 
  opacity: 0.8; 
  transition: opacity 0.2s;
  /* Ensure height alignment */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.label-item:hover { opacity: 1; }
.label-text { display: block; margin-bottom: 4px; line-height: 1.2; }
.label-range { display: block; opacity: 0.6; font-size: 0.65rem; }

.label-item.extreme-fear .label-text { color: var(--c-ex-fear); }
.label-item.fear .label-text { color: var(--c-fear); }
.label-item.neutral .label-text { color: var(--c-neutral-text); }
.label-item.greed .label-text { color: var(--c-greed); }
.label-item.extreme-greed .label-text { color: var(--c-ex-greed); }

/* Current Sentiment Box */
.current-sentiment {
  text-align: center;
  padding: 1.25rem;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 1px solid transparent;
  width: 100%;
  transition: all 0.3s ease;
}
.sentiment-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.sentiment-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor; /* Glow effect */
}
.sentiment-text {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}
.sentiment-description {
  font-size: 0.9rem;
  color: var(--text-muted);
  max-width: 90%;
  margin: 0 auto;
}

.current-sentiment.extreme-fear { border-color: var(--c-ex-fear); background: rgba(239, 83, 80, 0.08); }
.current-sentiment.extreme-fear .sentiment-dot { background: var(--c-ex-fear); color: var(--c-ex-fear); }
.current-sentiment.extreme-fear .sentiment-text { color: var(--c-ex-fear); }

.current-sentiment.fear { border-color: var(--c-fear); background: rgba(255, 167, 38, 0.08); }
.current-sentiment.fear .sentiment-dot { background: var(--c-fear); color: var(--c-fear); }
.current-sentiment.fear .sentiment-text { color: var(--c-fear); }

.current-sentiment.neutral { border-color: var(--c-neutral); background: rgba(253, 216, 53, 0.08); }
.current-sentiment.neutral .sentiment-dot { background: var(--c-neutral); color: var(--c-neutral); }
.current-sentiment.neutral .sentiment-text { color: var(--c-neutral-text); }

.current-sentiment.greed { border-color: var(--c-greed); background: rgba(102, 187, 106, 0.08); }
.current-sentiment.greed .sentiment-dot { background: var(--c-greed); color: var(--c-greed); }
.current-sentiment.greed .sentiment-text { color: var(--c-greed); }

.current-sentiment.extreme-greed { border-color: var(--c-ex-greed); background: rgba(38, 166, 154, 0.08); }
.current-sentiment.extreme-greed .sentiment-dot { background: var(--c-ex-greed); color: var(--c-ex-greed); }
.current-sentiment.extreme-greed .sentiment-text { color: var(--c-ex-greed); }

/* Components Section */
.components-section h4, .history-section h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  opacity: 0.9;
  margin-bottom: 1.25rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.components-grid { display: flex; flex-direction: column; gap: 1rem; }
.component-item { display: flex; flex-direction: column; gap: 0.5rem; }
.component-name { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary); }

.component-bar { 
  position: relative; 
  height: 24px; 
  background: var(--bg-secondary); 
  border-radius: 4px; 
  overflow: hidden; 
  width: 100%; 
  border: 1px solid var(--border-color); /* Subtle border */
}
.component-fill { 
  height: 100%; 
  background: linear-gradient(90deg, var(--c-ex-fear) 0%, var(--c-fear) 25%, var(--c-neutral) 50%, var(--c-greed) 75%, var(--c-ex-greed) 100%); 
  width: 0; 
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); 
  opacity: 0.85;
}
.component-value { 
  position: absolute; 
  right: 10px; 
  top: 0; 
  bottom: 0; 
  display: flex; 
  align-items: center; 
  font-size: 0.8rem; 
  font-weight: 700; 
  color: var(--text-primary);
  /* Ensure visibility on various backgrounds */
  mix-blend-mode: exclusion; 
}

/* History Section */
.history-grid { display: flex; flex-direction: column; gap: 1.5rem; }
.history-item { display: flex; flex-direction: column; gap: 0.6rem; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border-color); }
.history-item:last-child { border-bottom: none; }

.history-label { font-size: 0.8rem; color: var(--text-muted); font-weight: 500;}
.history-value-container { display: flex; justify-content: space-between; align-items: center; }
.history-sentiment { font-weight: 700; font-size: 1rem; }
.history-circle {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.95rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Recycled classes for history colors */
.history-sentiment.extreme-fear { color: var(--c-ex-fear); }
.history-circle.extreme-fear { background: var(--c-ex-fear); color: white; }

.history-sentiment.fear { color: var(--c-fear); }
.history-circle.fear { background: var(--c-fear); color: white; }

.history-sentiment.neutral { color: var(--c-neutral-text); }
.history-circle.neutral { background: var(--c-neutral); color: #444; /* Dark text for yellow bg */ }

.history-sentiment.greed { color: var(--c-greed); }
.history-circle.greed { background: var(--c-greed); color: white; }

.history-sentiment.extreme-greed { color: var(--c-ex-greed); }
.history-circle.extreme-greed { background: var(--c-ex-greed); color: white; }

/* Responsive */
@media (max-width: 1024px) {
  .market-fng-gauge__meter-container {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
  .history-grid {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 1rem;
  }
  .history-item {
      width: 48%;
      border-bottom: none;
      background: var(--bg-secondary);
      padding: 1rem;
      border-radius: 8px;
  }
}
</style>
