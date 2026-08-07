<template>
  <div class="fear-greed-gauge-container">
    <div class="widget-header">
      <h3>{{ $t('fearGreed.title') }}</h3>
      <div class="chart-info">
        <span class="chart-description">{{ $t('fearGreed.source') }}</span>
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
            
            <!-- Value Display — engraved plaque: tracked caption above the score -->
            <text x="200" y="226" text-anchor="middle" class="gauge-caption">{{ $t('fearGreed.scoreCaption') }}</text>
            <text x="200" y="258" text-anchor="middle" class="gauge-value" :fill="textColor">{{ fearGreedValue }}</text>
          </svg>
          
          <!-- Labels -->
          <div class="gauge-labels">
            <div class="label-item extreme-fear">
                <span class="label-text">{{ $t('fearGreed.zones.extremeFear') }}</span>
                <span class="label-range">0-25</span>
            </div>
            <div class="label-item fear">
                <span class="label-text">{{ $t('fearGreed.zones.fear') }}</span>
                <span class="label-range">25-45</span>
            </div>
            <div class="label-item neutral">
                <span class="label-text">{{ $t('fearGreed.zones.neutral') }}</span>
                <span class="label-range">45-55</span>
            </div>
            <div class="label-item greed">
                <span class="label-text">{{ $t('fearGreed.zones.greed') }}</span>
                <span class="label-range">55-75</span>
            </div>
            <div class="label-item extreme-greed">
                <span class="label-text">{{ $t('fearGreed.zones.extremeGreed') }}</span>
                <span class="label-range">75-100</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Middle: Component Breakdown -->
      <div class="components-section">
        <h4>{{ $t('fearGreed.componentsTitle') }}</h4>
        <div class="components-grid">
          <div class="component-item">
            <span class="component-name">{{ $t('fearGreed.components.sp125') }}</span>
            <div class="component-row"><div class="component-bar"><div class="component-fill" :style="{ width: components.sp125 + '%' }"></div></div><span class="component-value">{{ components.sp125 }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">{{ $t('fearGreed.components.hl52') }}</span>
            <div class="component-row"><div class="component-bar"><div class="component-fill" :style="{ width: components.hl52 + '%' }"></div></div><span class="component-value">{{ components.hl52 }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">{{ $t('fearGreed.components.mcsi') }}</span>
            <div class="component-row"><div class="component-bar"><div class="component-fill" :style="{ width: components.mcsi + '%' }"></div></div><span class="component-value">{{ components.mcsi }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">{{ $t('fearGreed.components.putCall') }}</span>
            <div class="component-row"><div class="component-bar"><div class="component-fill" :style="{ width: components.putCall + '%' }"></div></div><span class="component-value">{{ components.putCall }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">{{ $t('fearGreed.components.vix50') }}</span>
            <div class="component-row"><div class="component-bar"><div class="component-fill" :style="{ width: components.vix50 + '%' }"></div></div><span class="component-value">{{ components.vix50 }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">{{ $t('fearGreed.components.safe') }}</span>
            <div class="component-row"><div class="component-bar"><div class="component-fill" :style="{ width: components.safe + '%' }"></div></div><span class="component-value">{{ components.safe }}</span></div>
          </div>
          <div class="component-item">
            <span class="component-name">{{ $t('fearGreed.components.yieldSpread') }}</span>
            <div class="component-row"><div class="component-bar"><div class="component-fill" :style="{ width: components.yieldSpread + '%' }"></div></div><span class="component-value">{{ components.yieldSpread }}</span></div>
          </div>
        </div>
      </div>

      <!-- Right Side: Historical Data -->
      <div class="history-section">
        <h4>{{ $t('fearGreed.historyTitle') }}</h4>
        <div class="history-grid">
            <div class="history-item">
                <span class="history-label">{{ $t('fearGreed.history.previousClose', { date: historyDates.prev }) }}</span>
                <div class="history-value-container">
                    <span class="history-sentiment" :class="getSentimentClass(history.prev)">{{ getSentimentText(history.prev) }}</span>
                    <div class="history-circle" :class="getSentimentClass(history.prev)">{{ history.prev }}</div>
                </div>
            </div>
            <div class="history-item">
                <span class="history-label">{{ $t('fearGreed.history.oneWeekAgo', { date: historyDates.week }) }}</span>
                <div class="history-value-container">
                    <span class="history-sentiment" :class="getSentimentClass(history.week)">{{ getSentimentText(history.week) }}</span>
                    <div class="history-circle" :class="getSentimentClass(history.week)">{{ history.week }}</div>
                </div>
            </div>
            <div class="history-item">
                <span class="history-label">{{ $t('fearGreed.history.oneMonthAgo', { date: historyDates.month }) }}</span>
                <div class="history-value-container">
                    <span class="history-sentiment" :class="getSentimentClass(history.month)">{{ getSentimentText(history.month) }}</span>
                    <div class="history-circle" :class="getSentimentClass(history.month)">{{ history.month }}</div>
                </div>
            </div>
            <div class="history-item">
                <span class="history-label">{{ $t('fearGreed.history.oneYearAgo', { date: historyDates.year }) }}</span>
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

<script lang="ts">
import { defineComponent } from 'vue';
import { useTheme } from '@/composables/useTheme';
import { ohlcvApi } from '@/services/ohlcvApi';
import { withDataBase } from '@/utils/baseUrl'
import { dataCacheBust } from '@/utils/cacheBust';
import { formatDate as i18nDate } from '@/utils/dateFormat';

/** Clean OHLCV series the gauge's math consumes (validated non-empty before use). */
interface Series {
  close: number[]
  high: number[]
  low: number[]
  volume: number[]
  timestamps: number[]
}

/** Precomputed market-sentiment report (loose — only the read fields are named). */
interface ExternalSentiment {
  score?: number
  history?: {
    previous_close?: number
    '1_week_ago'?: number
    '1_month_ago'?: number
    '1_year_ago'?: number
    [key: string]: unknown
  }
  components?: {
    momentum?: number
    strength?: number
    breadth?: number
    options?: number
    volatility?: number
    safe_haven?: number
    junk_bond?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

export default defineComponent({
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
      externalSentiment: null as ExternalSentiment | null,
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
      if (this.fearGreedValue <= 25) return this.$t('fearGreed.descriptions.extremeFear')
      if (this.fearGreedValue <= 45) return this.$t('fearGreed.descriptions.fear')
      if (this.fearGreedValue <= 55) return this.$t('fearGreed.descriptions.neutral')
      if (this.fearGreedValue <= 75) return this.$t('fearGreed.descriptions.greed')
      return this.$t('fearGreed.descriptions.extremeGreed')
    },
    needleColor() { return this.theme === 'dark' ? '#E6E1DC' : '#333333' },
    textColor() { return this.theme === 'dark' ? '#E6E1DC' : '#333333' }
  },
  mounted() {
    this.calculateMetrics();
  },
  methods: {
    getSentimentText(val: number) {
      if (val <= 25) return this.$t('fearGreed.zones.extremeFear');
      if (val <= 45) return this.$t('fearGreed.zones.fear');
      if (val <= 55) return this.$t('fearGreed.zones.neutral');
      if (val <= 75) return this.$t('fearGreed.zones.greed');
      return this.$t('fearGreed.zones.extremeGreed');
    },
    async fetchExternalSentiment() {
        try {
            const url = withDataBase('data/technical-indicators/market-sentiment.json') + dataCacheBust();
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                this.externalSentiment = await res.json();
                console.log('Loaded External Sentiment:', this.externalSentiment);
            }
        } catch (e) {
            console.warn('Failed to load external sentiment:', e);
        }
    },
    getSentimentClass(val: number) {
      if (val <= 25) return 'extreme-fear';
      if (val <= 45) return 'fear';
      if (val <= 55) return 'neutral';
      if (val <= 75) return 'greed';
      return 'extreme-greed';
    },

    applyExternalData() {
        const ext = this.externalSentiment;
        if (!ext) return;

        console.log('Applying External Data...');

        // 1. Apply Key Score
        if (ext.score) {
            this.fearGreedValue = Math.round(ext.score);
        }

        // 2. Apply History
        if (ext.history) {
            const h = ext.history;
            if (h.previous_close) this.history.prev = Math.round(h.previous_close);
            if (h["1_week_ago"]) this.history.week = Math.round(h["1_week_ago"]);
            if (h["1_month_ago"]) this.history.month = Math.round(h["1_month_ago"]);
            if (h["1_year_ago"]) this.history.year = Math.round(h["1_year_ago"]);
        }

        // 3. Apply Components (as initial state / fallback)
        if (ext.components) {
            const c = ext.components;
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

      // 1. Fetch & apply the official data. market-sentiment.json is the single
      //    source of truth for the score, the seven components, and the history.
      await this.fetchExternalSentiment();
      this.applyExternalData();

      // 2. The only thing derived locally is the four history-date labels, which
      //    read off the SPX timestamps. If SPX is unavailable they stay '-'.
      try {
        const spx = await this.getOhlcv(['FOREXCOM:SPXUSD', 'SPY', 'US500', '^GSPC']);

        if (spx && spx.timestamps.length > 0) {
          const lastTs = spx.timestamps[spx.timestamps.length - 1]!;
          const ts = lastTs < 1000000000000 ? lastTs * 1000 : lastTs; // ms/sec guard
          console.log('📊 Latest SPX Date:', i18nDate(ts));

          this.historyDates.prev = this.getDateStr(spx, 1);
          this.historyDates.week = this.getDateStr(spx, 5);
          this.historyDates.month = this.getDateStr(spx, 20);
          this.historyDates.year = this.getDateStr(spx, 252);
        }

        this.error = false;
      } catch (err) {
        console.warn('History-date lookup failed, using external data only:', err);
        this.error = false; // Not an error — the external JSON already populated the gauge
      } finally {
        this.loading = false;
      }
    },

    getDateStr(data: Series | null, offset: number) {
        if(!data || !data.timestamps) return '-';
        const idx = data.timestamps.length - 1 - offset;
        if(idx < 0) return '-';

        let ts = data.timestamps[idx]!;
        if (ts < 1000000000000) {
            ts *= 1000;
        }
        
        const d = new Date(ts);
        return i18nDate(d);
    },

    // --- Helpers ---
    async getOhlcv(symbols: string | string[]): Promise<Series | null> {
        const candidates = Array.isArray(symbols) ? symbols : [symbols];

        for (const symbol of candidates) {
            try {
                // Try standard API (Local JSON first)
                const data = await ohlcvApi.getOhlcv(symbol);
                if (data && data.close && data.close.length > 50) { // Basic validation
                    // Validated non-empty; the gauge's math treats the arrays as
                    // clean number series (OhlcvData types close as (number|null)[]).
                    return data as unknown as Series;
                }
            } catch (e) {
                // Continue to next symbol
            }
        }
        return null; // No valid data found for any candidate
    },

  }
})
</script>

<style scoped>
.fear-greed-gauge-container {
  --c-ex-fear: #ef5350;
  --c-fear: #ffa726;
  --c-neutral: #fdd835;
  --c-greed: #66bb6a;
  --c-ex-greed: #26a69a;
  
  /* AA-as-text variants of the zone colors (light theme). The raw --c-* stay
     vivid for the arc/gradient/dot-glow/circle fills; text usages point at these
     darker tokens so labels/sentiment clear WCAG AA (4.5:1) on the light card
     surface. .dark-mode restores the vivid values (they pass on the dark card). */
  --c-ex-fear-text: #C62828;
  --c-fear-text: #B45309;
  --c-neutral-text: #7A6300; /* dark gold — the vivid yellow is unreadable as text */
  --c-greed-text: #2E7D32;
  --c-ex-greed-text: #00695C;
  
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md); /* Softer rounded corners */
  padding: var(--space-6);
  margin-bottom: var(--space-8);
  box-shadow: var(--shadow-md);
  transition: background-color var(--transition-slow) ease, border-color var(--transition-slow) ease;
}

.dark-mode .fear-greed-gauge-container {
  /* On the dark card the vivid zone colors clear AA as text — EXCEPT the vivid
     red --c-ex-fear #ef5350, which is only 4.01:1 on #2C2C2C. Use a lighter red
     tuned for the dark card (5.32:1). The other four vivid zones pass (4.66–10:1). */
  --c-ex-fear-text: #F47C79;
  --c-fear-text: var(--c-fear);
  --c-neutral-text: var(--c-neutral);
  --c-greed-text: var(--c-greed);
  --c-ex-greed-text: var(--c-ex-greed);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-color);
  position: relative;
}

/* Brand accent tick on the rule — matches the section headers on the parent
   surface so the hero card carries the same Renaissance through-line. */
.widget-header::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 24px;
  height: 2px;
  background: var(--primary-color);
}

.widget-header h3 {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.chart-description {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.market-fng-gauge__meter-container {
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.8fr;
  gap: var(--space-8);
  align-items: start;
}

/* Left Side */
.left-side {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
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
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  font-family: 'Roboto Mono', monospace;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
/* Plaque caption above the engraved score — brand-toned, tracked. */
.gauge-caption {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  font-family: 'Roboto Mono', monospace;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  fill: var(--primary-text);
}
.gauge-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  padding: 0 10px;
}
.label-item {
  text-align: center;
  flex: 1;
  /* No resting opacity wash: it blended the AA zone-text/range colors below
     4.5:1. The legend stays quiet via its small type and secondary-grey range. */
  /* Ensure height alignment */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.label-text { display: block; margin-bottom: 4px; line-height: 1.2; }
.label-range { display: block; color: var(--text-secondary); font-size: var(--text-xs); }

.label-item.extreme-fear .label-text { color: var(--c-ex-fear-text); }
.label-item.fear .label-text { color: var(--c-fear-text); }
.label-item.neutral .label-text { color: var(--c-neutral-text); }
.label-item.greed .label-text { color: var(--c-greed-text); }
.label-item.extreme-greed .label-text { color: var(--c-ex-greed-text); }

/* Current Sentiment Box */
.current-sentiment {
  text-align: center;
  padding: var(--space-5);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  border: 1px solid transparent;
  width: 100%;
  transition: all var(--transition-slow) ease;
}
.sentiment-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}
.sentiment-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor; /* Glow effect */
}
.sentiment-text {
  font-size: var(--text-xl);
  font-weight: var(--weight-extrabold);
  color: var(--text-primary);
  line-height: 1.2;
}
.sentiment-description {
  font-size: var(--text-base);
  /* --text-muted is only 4.2:1 on the zone-tinted dark card (rgba tint over
     #2C2C2C); --text-secondary clears AA on every zone tint (5.0–5.6:1) and in light. */
  color: var(--text-secondary);
  max-width: 90%;
  margin: 0 auto;
}

.current-sentiment.extreme-fear { border-color: var(--c-ex-fear); background: rgba(239, 83, 80, 0.08); }
.current-sentiment.extreme-fear .sentiment-dot { background: var(--c-ex-fear); color: var(--c-ex-fear); }
.current-sentiment.extreme-fear .sentiment-text { color: var(--c-ex-fear-text); }

.current-sentiment.fear { border-color: var(--c-fear); background: rgba(255, 167, 38, 0.08); }
.current-sentiment.fear .sentiment-dot { background: var(--c-fear); color: var(--c-fear); }
.current-sentiment.fear .sentiment-text { color: var(--c-fear-text); }

.current-sentiment.neutral { border-color: var(--c-neutral); background: rgba(253, 216, 53, 0.08); }
.current-sentiment.neutral .sentiment-dot { background: var(--c-neutral); color: var(--c-neutral); }
.current-sentiment.neutral .sentiment-text { color: var(--c-neutral-text); }

.current-sentiment.greed { border-color: var(--c-greed); background: rgba(102, 187, 106, 0.08); }
.current-sentiment.greed .sentiment-dot { background: var(--c-greed); color: var(--c-greed); }
.current-sentiment.greed .sentiment-text { color: var(--c-greed-text); }

.current-sentiment.extreme-greed { border-color: var(--c-ex-greed); background: rgba(38, 166, 154, 0.08); }
.current-sentiment.extreme-greed .sentiment-dot { background: var(--c-ex-greed); color: var(--c-ex-greed); }
.current-sentiment.extreme-greed .sentiment-text { color: var(--c-ex-greed-text); }

/* Components Section */
.components-section h4, .history-section h4 {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
  opacity: 0.9;
  margin-bottom: var(--space-5);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.components-grid { display: flex; flex-direction: column; gap: var(--space-4); }
.component-item { display: flex; flex-direction: column; gap: var(--space-2); }
.component-row { display: flex; align-items: center; gap: var(--space-3); }
.component-name { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-secondary); }

.component-bar { 
  position: relative; 
  height: 24px; 
  background: var(--bg-secondary);
  border-radius: var(--radius-xs);
  overflow: hidden;
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border-color); /* Subtle border */
}
.component-fill { 
  height: 100%; 
  background: linear-gradient(90deg, var(--c-ex-fear) 0%, var(--c-fear) 25%, var(--c-neutral) 50%, var(--c-greed) 75%, var(--c-ex-greed) 100%); 
  width: 0;
  /* width is intentional: reveals the full-spectrum gradient gauge left-to-right;
     transform: scaleX would squash the gradient rather than reveal it. */
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.85;
}
/* Value sits BESIDE the bar on the card surface (not overlaid), so it keeps a
   consistent --text-primary ink at AA on any fill level — no mix-blend hack. */
.component-value {
  flex-shrink: 0;
  min-width: 2.5ch;
  text-align: right;
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

/* History Section */
.history-grid { display: flex; flex-direction: column; gap: var(--space-6); }
.history-item { display: flex; flex-direction: column; gap: 0.6rem; padding-bottom: var(--space-2); border-bottom: 1px dashed var(--border-color); }
.history-item:last-child { border-bottom: none; }

.history-label { font-size: var(--text-sm); color: var(--text-muted); font-weight: var(--weight-medium);}
.history-value-container { display: flex; justify-content: space-between; align-items: center; }
.history-sentiment { font-weight: var(--weight-bold); font-size: var(--text-md); }
.history-circle {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: var(--weight-bold);
    font-size: var(--text-base);
    font-variant-numeric: tabular-nums;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Recycled classes for history colors */
.history-sentiment.extreme-fear { color: var(--c-ex-fear-text); }
.history-circle.extreme-fear { background: var(--c-ex-fear); color: #1a1a1a; }

.history-sentiment.fear { color: var(--c-fear-text); }
.history-circle.fear { background: var(--c-fear); color: #1a1a1a; }

.history-sentiment.neutral { color: var(--c-neutral-text); }
.history-circle.neutral { background: var(--c-neutral); color: #1a1a1a; }

.history-sentiment.greed { color: var(--c-greed-text); }
.history-circle.greed { background: var(--c-greed); color: #1a1a1a; }

.history-sentiment.extreme-greed { color: var(--c-ex-greed-text); }
.history-circle.extreme-greed { background: var(--c-ex-greed); color: #1a1a1a; }

/* Responsive */
@media (max-width: 1024px) {
  .market-fng-gauge__meter-container {
    grid-template-columns: 1fr;
    gap: var(--space-12);
  }
  .history-grid {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--space-4);
  }
  .history-item {
      width: 48%;
      border-bottom: none;
      background: var(--bg-secondary);
      padding: var(--space-4);
      border-radius: var(--radius-sm);
  }
}
</style>
