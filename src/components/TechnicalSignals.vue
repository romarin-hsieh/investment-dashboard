<template>
  <div class="technical-signals">
    
    <div v-if="loading" class="loading-container" style="padding: 1rem;">
      <WidgetSkeleton :showHeader="false" :itemCount="5" type="list" :bordered="false" />
      <div style="margin-top: 1.5rem">
        <WidgetSkeleton :showHeader="true" :itemCount="2" type="grid" :bordered="false" />
      </div>
    </div>
    
    <div v-else class="signals-container">
      
      <!-- Pivot Points -->
      <div class="signal-block pivots-block">
                <div class="section-header">
                    <h4>{{ $t('signals.pivots.title') }}</h4>
                </div>
                <div class="block-content">
                <div class="pivot-grid">
                    <div class="pivot-row resistance">
                        <span class="label">R2</span>
                        <span class="value">{{ formatPrice(pivots.r2) }}</span>
                    </div>
                    <div class="pivot-row resistance">
                        <span class="label">R1</span>
                        <span class="value">{{ formatPrice(pivots.r1) }}</span>
                    </div>
                    <div class="pivot-row main">
                        <span class="label">{{ $t('signals.pivots.pivot') }}</span>
                        <span class="value">{{ formatPrice(pivots.p) }}</span>
                    </div>
                    <div class="pivot-row support">
                        <span class="label">S1</span>
                        <span class="value">{{ formatPrice(pivots.s1) }}</span>
                    </div>
                    <div class="pivot-row support">
                        <span class="label">S2</span>
                        <span class="value">{{ formatPrice(pivots.s2) }}</span>
                    </div>
                </div>
                <div class="current-zone" v-if="currentZone">
                    {{ $t('signals.pivots.currentlyLabel') }} <strong>{{ currentZone }}</strong>
                </div>
                </div>
      </div>
        
              <!-- Patterns -->
              <div class="signal-block patterns-block">
                <div class="section-header">
                    <h4>{{ $t('signals.patterns.title') }}</h4>
                </div>
                <div class="block-content">
                <div class="patterns-list" v-if="patterns.length > 0">
                    <div v-for="(p, idx) in patterns" :key="idx" class="pattern-badge" :class="p.type">
                        {{ p.name }}
                    </div>
                </div>
                <div v-else class="no-patterns">{{ $t('signals.patterns.empty') }}</div>
                </div>
      </div>
        
              <!-- Volatility -->
              <div class="signal-block risk-block">
                <div class="section-header">
                    <h4>{{ $t('signals.risk.title') }}</h4>
                </div>
                <div class="block-content">
                <div class="risk-metric">
                    <span class="label">{{ $t('signals.risk.atrLabel') }}</span>
                    <span class="value">{{ formatPrice(risk.atr) }}</span>
                </div>
                <div class="risk-metric">
                    <span class="label">{{ $t('signals.risk.volatilityLabel') }}</span>
                    <span class="value">{{ risk.volatility || $t('signals.risk.notAvailable') }}</span>
              </div>
            </div>
          </div>
        </div>
            
            <!-- Info Modal — teleported to <body> so the position:fixed overlay escapes
                 this component's overflow:hidden clip; without it, axe color-contrast
                 can't see the modal, leaving it unguarded (e2e/a11y-modals.spec.ts). -->
            <Teleport to="body">
            <div v-if="showInfo" class="modal-overlay" @click.self="showInfo = false">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5>{{ $t('signals.info.title') }}</h5>
                        <button class="close-btn" @click="showInfo = false" :aria-label="$t('signals.info.closeAriaLabel')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <h6>{{ $t('signals.pivots.title') }}</h6>
                        <p>{{ $t('signals.info.pivotsDescription') }}</p>

                        <h6>{{ $t('signals.risk.title') }}</h6>
                        <ul>
                            <li><strong>{{ $t('signals.info.atrTerm') }}</strong> {{ $t('signals.info.atrDescription') }}</li>
                            <li><strong>{{ $t('signals.info.volatilityTerm') }}</strong> {{ $t('signals.info.volatilityDescription') }}</li>
                        </ul>

                        <h6>{{ $t('signals.info.patternsHeading') }}</h6>
                        <ul>
                            <li><strong>{{ $t('signals.info.hammerTerm') }}</strong> {{ $t('signals.info.hammerDescription') }}</li>
                            <li><strong>{{ $t('signals.info.engulfingTerm') }}</strong> {{ $t('signals.info.engulfingDescription') }}</li>
                            <li><strong>{{ $t('signals.info.dojiTerm') }}</strong> {{ $t('signals.info.dojiDescription') }}</li>
                        </ul>
            </div>
        </div>
    </div>
            </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import yahooFinanceAPI from '@/api/yahooFinanceApi'
import WidgetSkeleton from './WidgetSkeleton.vue'
import { formatDate as i18nDate } from '@/utils/dateFormat'

/** Parallel OHLC arrays used for the pivot / pattern / risk maths. */
interface Candles {
  open: number[]
  high: number[]
  low: number[]
  close: number[]
  date?: (string | number)[]
}
interface Pivots {
  p: number | null; r1: number | null; s1: number | null; r2: number | null; s2: number | null
}
interface Pattern { name: string; type: string; date: string }

export default defineComponent({
  name: 'TechnicalSignals',
  components: { WidgetSkeleton },
  props: {
    symbol: {
      type: String,
      required: true
    },
    currentPrice: {
      type: Number,
      default: null
    }
  },
  data() {
    return {
      loading: true,
      pivots: { p: null, r1: null, s1: null, r2: null, s2: null } as Pivots,
      patterns: [] as Pattern[],
      risk: { atr: null as number | null, volatility: null as number | null },
      ohlcHistory: [] as unknown,
      showInfo: false
    }
  },
  computed: {
    currentZone() {
        if (!this.currentPrice || !this.pivots.p) return null;
        const p = this.pivots;
        const cp = this.currentPrice;
        
        if (cp > p.r2!) return this.$t('signals.zones.aboveR2');
        if (cp > p.r1!) return this.$t('signals.zones.testingR1R2');
        if (cp > p.p!) return this.$t('signals.zones.abovePivot');
        if (cp > p.s1!) return this.$t('signals.zones.belowPivot');
        if (cp > p.s2!) return this.$t('signals.zones.testingS1S2');
        return this.$t('signals.zones.belowS2');
    }
  },
  watch: {
    symbol: {
      handler: 'loadData',
      immediate: true
    }
  },
  methods: {
    async loadData() {
        if (!this.symbol) return;
        this.loading = true;
        try {
            // Get OHLCV for calculation (1 month is enough)
            const ohlcv = await yahooFinanceAPI.getOhlcv(this.symbol, '1d', '1mo');
            if (ohlcv && ohlcv.close && ohlcv.close.length > 0) {
                this.ohlcHistory = ohlcv;
                const candles = ohlcv as unknown as Candles;
                this.calculatePivots(candles);
                this.detectPatterns(candles);
                this.calculateRisk(candles);
            }
        } catch (err) {
            console.error('Signals calculation error:', err);
        } finally {
            this.loading = false;
        }
    },
    
    calculatePivots(data: Candles) {
        if (!data || !data.close) return;
        const len = data.close.length;
        console.log(`Calculating pivots for ${this.symbol}, items: ${len}`);

        if (len < 2) return;
        
        // Use the last complete candle (usually len-2 if today is included, or len-1 if not)
        // Yahoo Finance 1d often returns current day as last item.
        const i = len - 1; // Try taking the VERY last candle first for debugging
        
        const high = data.high[i];
        const low = data.low[i];
        const close = data.close[i];
        
        console.log(`Pivot Source Data (Index ${i}): H=${high}, L=${low}, C=${close}`);

        if (high == null || low == null || close == null) {
             console.warn('Pivot source data contains nulls');
             return;
        }
        
        const p = (high + low + close) / 3;
        const r1 = (2 * p) - low;
        const s1 = (2 * p) - high;
        const r2 = p + (high - low);
        const s2 = p - (high - low);
        
        this.pivots = { p, r1, s1, r2, s2 };
    },
    
    detectPatterns(data: Candles) {
        // Scan last 5 days for patterns
        const len = data.close.length;
        if (len < 6) return;

        const rawPatterns: Pattern[] = [];

        // Helper
        const isBullish = (i: number) => data.close[i] > data.open[i];
        const bodySize = (i: number) => Math.abs(data.close[i] - data.open[i]);
        const fullSize = (i: number) => data.high[i] - data.low[i];
        
        // Loop from last candle backwards (up to 5 days)
        for (let i = len - 1; i >= len - 5; i--) {
             if (i < 2) continue;
             
             const dateStr = (data.date && data.date[i]) ? i18nDate(data.date[i]) : '';

             // 1. Hammer (Small body, long lower shadow)
             const lowerShadow = Math.min(data.open[i], data.close[i]) - data.low[i];
             const upperShadow = data.high[i] - Math.max(data.open[i], data.close[i]);
             const body = bodySize(i);
             const range = fullSize(i);
             
             if (range > 0 && lowerShadow > 2 * body && upperShadow < body) {
                 rawPatterns.push({ name: this.$t('signals.patternNames.hammer'), type: 'bullish', date: dateStr });
             }
             
             // 2. Engulfing
             const prev = i - 1;
             if (isBullish(i) && !isBullish(prev)) {
                  if (data.close[i] > data.open[prev] && data.open[i] < data.close[prev]) {
                      rawPatterns.push({ name: this.$t('signals.patternNames.bullishEngulfing'), type: 'bullish', date: dateStr });
                  }
             } else if (!isBullish(i) && isBullish(prev)) {
                 if (data.close[i] < data.open[prev] && data.open[i] > data.close[prev]) {
                     rawPatterns.push({ name: this.$t('signals.patternNames.bearishEngulfing'), type: 'bearish', date: dateStr });
                 }
             }
             
             // 3. Doji (Very small body)
             if (range > 0 && body < range * 0.1) {
                 rawPatterns.push({ name: this.$t('signals.patternNames.doji'), type: 'neutral', date: dateStr });
             }
             
             // Stop if we found enough patterns to avoid clutter
             if (rawPatterns.length >= 3) break;
        }
        
        this.patterns = rawPatterns;
    },
    
    calculateRisk(data: Candles) {
       // Simple ATR 14 approx
       // For accurate ATR we use TR = Max(H-L, |H-Cp|, |L-Cp|)
       // Here we just use H-L average for simplicity or fetch if available
       const len = data.close.length;
       if (len < 15) return;
       
       let sumTR = 0;
       for(let i = len-14; i < len; i++) {
           sumTR += (data.high[i] - data.low[i]); // Approx TR
       }
       this.risk.atr = sumTR / 14;
    },
    
    formatPrice(val: number | null | undefined) {
        if (!val) return '--';
        return val.toFixed(2);
    },

    openModal() {
        this.showInfo = true;
    }
  }
})
</script>

<style scoped>
.technical-signals {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    padding: 0; /* Remove padding to allow full-width headers */
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-color);
    overflow: hidden; /* Ensure headers don't overflow corners */
}

.loading-simple {
    padding: var(--space-8);
    font-size: var(--text-base);
    color: var(--text-muted);
    text-align: center;
}

.section-header {
    background: transparent;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-color);
    border-top: 1px solid var(--border-color);
}

.signal-block:first-child .section-header {
    border-top: none;
}

h4 {
    margin: 0;
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
    border: none;
    padding: 0;
}

.block-content {
    padding: var(--space-4);
}

.signal-block {
    margin-bottom: 0;
}

/* Pivot Grid */
.pivot-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.pivot-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-sm);
    padding: 2px 0;
}

.pivot-row.resistance { color: var(--danger-strong); }
.pivot-row.support { color: var(--success-strong); }
.pivot-row.main { font-weight: bold; color: var(--text-secondary); border-top: 1px dashed var(--border-color); border-bottom: 1px dashed var(--border-color); padding: 4px 0; }

.current-zone {
    margin-top: var(--space-2);
    font-size: var(--text-sm);
    background: var(--bg-secondary);
    padding: 4px 8px;
    border-radius: var(--radius-xs);
    text-align: center;
    color: var(--text-primary);
}

/* Patterns */
.patterns-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.pattern-badge {
    font-size: var(--text-xs);
    padding: 2px 8px;
    border-radius: var(--radius-md);
    font-weight: var(--weight-semibold);
}

.pattern-badge.bullish { background: rgba(34, 171, 148, 0.15); color: var(--success-strong); border: 1px solid rgba(34, 171, 148, 0.3); }
.pattern-badge.bearish { background: rgba(247, 82, 95, 0.15); color: var(--danger-strong); border: 1px solid rgba(247, 82, 95, 0.3); }
.pattern-badge.neutral { background: var(--bg-secondary); color: var(--text-secondary); border: 1px solid var(--border-color); }

.no-patterns {
    font-size: var(--text-sm);
    color: var(--text-muted);
    font-style: italic;
}

/* Risk */
.risk-metric {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-sm);
    margin-bottom: 4px;
}

/* Info Button removed (moved to parent) */
.signals-container {
    padding-bottom: 0;
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
    z-index: 1000;
}

.modal-content {
    background: var(--bg-card);
    width: 90%;
    max-width: 400px;
    border-radius: var(--radius-sm);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem var(--space-4);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
}

.modal-header h5 {
    margin: 0;
    font-size: var(--text-md);
    color: var(--text-secondary);
}

.close-btn {
    background: none;
    border: none;
    font-size: var(--text-xl);
    line-height: 1;
    cursor: pointer;
    color: var(--text-muted);
}

.modal-body {
    padding: var(--space-4);
    font-size: var(--text-base);
    color: var(--text-primary);
}

.modal-body h6 {
    margin: var(--space-2) 0 var(--space-2) 0;
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    /* --primary-color is a FILL token (4.21:1 as text); --primary-text is the AA link/text token */
    color: var(--primary-text);
}

.modal-body ul {
    margin: 0 0 var(--space-4) 0;
    padding-left: 1.2rem;
}

.modal-body li {
    margin-bottom: 0.4rem;
}
</style>
