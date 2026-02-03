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
import { withBase } from '@/utils/baseUrl.js';

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
      externalSentiment: null, 
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
    async fetchExternalSentiment() {
        try {
            const url = withBase(`data/technical-indicators/market-sentiment.json?t=${new Date().getTime()}`);
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                this.externalSentiment = await res.json();
                console.log('Loaded External Sentiment:', this.externalSentiment);
            }
        } catch (e) {
            console.warn('Failed to load external sentiment:', e);
        }
    },
    getSentimentClass(val) {
      if (val <= 25) return 'extreme-fear';
      if (val <= 45) return 'fear';
      if (val <= 55) return 'neutral';
      if (val <= 75) return 'greed';
      return 'extreme-greed';
    },

    applyExternalData() {
        if (!this.externalSentiment) return;
        
        console.log('Applying External Data...');
        
        // 1. Apply Key Score
        if (this.externalSentiment.score) {
            this.fearGreedValue = Math.round(this.externalSentiment.score);
        }
        
        // 2. Apply History
        if (this.externalSentiment.history) {
            const h = this.externalSentiment.history;
            if (h.previous_close) this.history.prev = Math.round(h.previous_close);
            if (h["1_week_ago"]) this.history.week = Math.round(h["1_week_ago"]);
            if (h["1_month_ago"]) this.history.month = Math.round(h["1_month_ago"]);
            if (h["1_year_ago"]) this.history.year = Math.round(h["1_year_ago"]);
        }

        // 3. Apply Components (as initial state / fallback)
        if (this.externalSentiment.components) {
            const c = this.externalSentiment.components;
            // Map JSON keys (momentum, strength...) to Vue keys (sp125, hl52...)
            if(c.momentum) this.components.sp125 = Math.round(c.momentum);
            if(c.strength) this.components.hl52 = Math.round(c.strength);
            if(c.breadth) this.components.mcsi = Math.round(c.breadth);
            if(c.options) this.components.putCall = Math.round(c.options);
            if(c.volatility) this.components.vix50 = Math.round(c.volatility);
            if(c.safe_haven) this.components.safe = Math.round(c.safe_haven);
            if(c.junk_bond) this.components.yieldSpread = Math.round(c.junk_bond);
        }
    },

    async calculateMetrics() {
      this.loading = true;
      
      // 1. Fetch & Apply Official Data FIRST
      await this.fetchExternalSentiment();
      this.applyExternalData(); 

      // 2. Try to calculate "Live" components (Optional enhancement)
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

        // Only run local compute if we have data
        if (spx && vix) {
             // If we applied external data, we are good.
             // We only proceed here to update specific sub-components if we want "Live" precision 
             // or History Dates.
             
             // Let's keep the History Dates logic as it uses getOhlcv timestamps
             const prevData = this.computeFearGreed(1, markets);
             this.historyDates.prev = this.getDateStr(markets.spx, 1);

             const weekData = this.computeFearGreed(5, markets);
             this.historyDates.week = this.getDateStr(markets.spx, 5);

             const monthData = this.computeFearGreed(20, markets);
             this.historyDates.month = this.getDateStr(markets.spx, 20);

             const yearData = this.computeFearGreed(252, markets);
             this.historyDates.year = this.getDateStr(markets.spx, 252);
        }
        
        this.error = false;
      } catch (err) {
        console.warn('Local calc failed, using External Data only:', err);
        this.error = false; // Not an error if we have external data
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

    // Core Calculation Logic - Z-Score Based (CNN Methodology)
    computeFearGreed(offset, { spx, vix, tlt, jnk }) {
        const result = {
            score: 50,
            components: { spx125: 50, hl52: 50, mcsi: 50, putCall: 50, vix50: 50, safe: 50, yieldSpread: 50 }
        };

        const getSlice = (data, windowSize) => {
            if (!data || !data.close) return null;
            const endIdx = data.close.length - 1 - offset;
            if (endIdx < windowSize) return null; 
            // Return full history up to endIdx for Z-Score calc
            // We need enough history to calculate the rolling stats (125 days) for the Z-score
            // So we pass the required history length + lookback
            const startIdx = Math.max(0, endIdx - (125 * 2)); // 250 days context
            return {
                close: data.close.slice(startIdx, endIdx + 1),
                high: data.high.slice(startIdx, endIdx + 1),
                low: data.low.slice(startIdx, endIdx + 1),
                volume: data.volume.slice(startIdx, endIdx + 1)
            };
        };

        const spxSlice = getSlice(spx, 125);
        const vixSlice = getSlice(vix, 125);
        const tltSlice = getSlice(tlt, 125);
        const jnkSlice = getSlice(jnk, 125);

        // Need at least 125 points to establish a baseline
        const minHistory = 125;

        // 1. Momentum: Price / 125d MA
        if (spxSlice && spxSlice.close.length > minHistory) {
            const closes = spxSlice.close;
            const momSeries = this.calcRollingMetric(closes, (slice) => {
                const ma125 = this.getMa(slice, 125);
                return slice[slice.length-1] / ma125;
            }, 125);
            result.components.sp125 = this.normalizeZ(this.getZScore(momSeries));
            
            // 2. Strength: Position in 52w Range (Proxy)
            // Note: Strength usually looks back 52w (252d). 
            // If we shorten lookback for Z-Score to 125, we are checking "How weird is this 52w position relative to last 6m?"
            // This is acceptable tuning.
            const strSeries = [];
            const highs = spxSlice.high;
            const lows = spxSlice.low;
            for(let i=minHistory; i<closes.length; i++) {
                // Keep 252d window for High/Low calculation itself if possible, 
                // but we only have 125*2 context? 
                // Let's rely on data length.
                const start = Math.max(0, i-252+1);
                const hSlice = highs.slice(start, i+1);
                const lSlice = lows.slice(start, i+1);
                const h52 = Math.max(...hSlice);
                const l52 = Math.min(...lSlice);
                const curr = closes[i];
                strSeries.push((curr - l52) / (h52 - l52));
            }
            result.components.hl52 = this.normalizeZ(this.getZScore(strSeries));
        }

        // 3. Breadth: VIX 5d Slope (Proxy, Inverted)
        if (vixSlice && vixSlice.close.length > minHistory) {
            const closes = vixSlice.close;
            
            // Breadth
            const breadthSeries = this.calcRollingMetric(closes, (slice) => {
                return slice[slice.length-1] - slice[slice.length-6]; 
            }, 125);
            result.components.mcsi = this.normalizeZ(this.getZScore(breadthSeries), true);

            // Options (VIX Level Z-Score)
            const optSeries = closes.slice(minHistory); 
            result.components.putCall = this.normalizeZ(this.getZScore(optSeries), true);

            // Volatility
            const volSeries = this.calcRollingMetric(closes, (slice) => {
                const ma50 = this.getMa(slice, 50);
                return (slice[slice.length-1] - ma50) / ma50;
            }, 125);
            result.components.vix50 = this.normalizeZ(this.getZScore(volSeries), true);
        }

        // 6. Safe Haven (Stock - Bond 20d, Inverted? No, Higher excess return = Greed)
        if (spxSlice && tltSlice && spxSlice.close.length > minHistory) {
            const sCloses = spxSlice.close;
            const bCloses = tltSlice.close;
            const safeSeries = [];
            for(let i=minHistory; i<sCloses.length; i++) {
                const sRet = (sCloses[i] - sCloses[i-20]) / sCloses[i-20];
                const bRet = (bCloses[i] - bCloses[i-20]) / bCloses[i-20];
                safeSeries.push(sRet - bRet);
            }
            result.components.safe = this.normalizeZ(this.getZScore(safeSeries));
        }

        // 7. Junk Bond (Ratio, Higher = Greed)
        if (jnkSlice && tltSlice && jnkSlice.close.length > minHistory) {
            const jCloses = jnkSlice.close;
            const bCloses = tltSlice.close;
            const junkSeries = [];
             for(let i=minHistory; i<jCloses.length; i++) {
                const ratio = jCloses[i] / bCloses[i]; // JNK/TLT
                junkSeries.push(ratio);
            }
            result.components.yieldSpread = this.normalizeZ(this.getZScore(junkSeries));
        }

        // Equal Weight Average (Standard CNN Method)
        const values = Object.values(result.components);
        const validValues = values.filter(v => typeof v === 'number' && !isNaN(v));
        if (validValues.length > 0) {
            const sum = validValues.reduce((a, b) => a + b, 0);
            result.score = Math.round(sum / validValues.length);
        }

        return result;
    },
    
    // --- Helpers ---
    async getOhlcv(symbols) {
        if (!Array.isArray(symbols)) symbols = [symbols];
        
        for (const symbol of symbols) {
            try {
                // Try standard API (Local JSON first)
                const data = await ohlcvApi.getOhlcv(symbol);
                if (data && data.close && data.close.length > 50) { // Basic validation
                    return data;
                }
            } catch (e) {
                // Continue to next symbol
            }
        }
        return null; // No valid data found for any candidate
    },

    getMa(slice, period) {
        if(slice.length < period) return slice[slice.length-1];
        let sum = 0;
        for(let i=slice.length-period; i<slice.length; i++) sum += slice[i];
        return sum / period;
    },

    calcRollingMetric(data, calcFn, startIdx) {
        const results = [];
        for(let i=startIdx; i<data.length; i++) {
            // Pass slice inclusive of 'i' and enough history
            // We pass the whole array slice up to i, calcFn handles lookback
            const slice = data.slice(0, i+1);
            results.push(calcFn(slice));
        }
        return results;
    },

    getZScore(series) {
        if (!series || series.length === 0) return 0;
        const current = series[series.length - 1];
        // Calculate stats on the *historical distribution* (last 125 points - Tuned)
        const window = series.slice(Math.max(0, series.length - 125));
        
        const mean = window.reduce((a,b) => a+b, 0) / window.length;
        const variance = window.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / window.length;
        const std = Math.sqrt(variance);
        
        if (std === 0) return 0;
        return (current - mean) / std;
    },

    normalizeZ(z, invert=false) {
        if (invert) z = -z;
        const score = 50 + (z * 20); // Tuned Scaling Factor
        return Math.max(0, Math.min(100, Math.round(score)));
    },
    
    // Keep these for getDiff used elsewhere? No, internal logic replaced.
    // Clean up unused methods if safe, or keep for safety.
    // Keeping data fetching helpers
    getDateStr(data, offset) {
       // ... existing ... 
       if(!data || !data.timestamps) return '-';
        const idx = data.timestamps.length - 1 - offset;
        if(idx < 0) return '-';
        let ts = data.timestamps[idx];
        if (ts < 1000000000000) ts *= 1000;
        const d = new Date(ts);
        return d.toLocaleDateString();
    },

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
