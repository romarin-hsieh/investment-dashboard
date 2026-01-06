<template>
  <div class="technical-signals">
    
    <div v-if="loading" class="loading-simple">Loading signals...</div>
    
    <div v-else class="signals-container">
      
      <!-- Pivot Points -->
      <div class="signal-block pivots-block">
                <h4 class="section-title">
                    Pivot Points (Standard)

                </h4>
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
                        <span class="label">Pivot</span>
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
                    Currently: <strong>{{ currentZone }}</strong>
                </div>
              </div>
        
              <!-- Patterns -->
              <div class="signal-block patterns-block">
                <h4>Candlestick Patterns</h4>
                <div class="patterns-list" v-if="patterns.length > 0">
                    <div v-for="(p, idx) in patterns" :key="idx" class="pattern-badge" :class="p.type">
                        {{ p.name }}
                    </div>
                </div>
                <div v-else class="no-patterns">No recent patterns detected</div>
              </div>
        
              <!-- Volatility -->
              <div class="signal-block risk-block">
                <h4 class="section-title">
                    Risk & Volatility

                </h4>
                <div class="risk-metric">
                    <span class="label">ATR (14)</span>
                    <span class="value">{{ formatPrice(risk.atr) }}</span>
                </div>
                <div class="risk-metric">
                    <span class="label">Volatility (SD)</span>
                    <span class="value">{{ risk.volatility || 'N/A' }}</span>
              </div>
            </div>
          </div>
            
            <!-- Info Modal -->
            <div v-if="showInfo" class="modal-overlay" @click.self="showInfo = false">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5>Signal Specifications</h5>
                        <button class="close-btn" @click="showInfo = false">&times;</button>
                    </div>
                    <div class="modal-body">
                        <h6>Pivot Points (Standard)</h6>
                        <p>Calculated using High, Low, Close of the previous trading day (P = (H+L+C)/3). Support (S1, S2) and Resistance (R1, R2) levels potential price reversal zones.</p>
                        
                        <h6>Risk & Volatility</h6>
                        <ul>
                            <li><strong>ATR (14):</strong> Average True Range. Measures market volatility. Higher ATR = higher risk/opportunity.</li>
                            <li><strong>Volatility (SD):</strong> Standard Deviation of returns. Statistical measure of price stability.</li>
                        </ul>
                        
                        <h6>Candlestick Patterns (Last 5 Days)</h6>
                        <ul>
                            <li><strong>Hammer:</strong> Bullish reversal signal. Long lower shadow.</li>
                            <li><strong>Engulfing:</strong> Strong reversal signal (Bullish/Bearish).</li>
                            <li><strong>Doji:</strong> Indecision signal. Small body.</li>
                        </ul>
            </div>
        </div>
    </div>
  </div>
</template>

<script>
import yahooFinanceAPI from '@/api/yahooFinanceApi.js'

export default {
  name: 'TechnicalSignals',
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
      pivots: { p: null, r1: null, s1: null, r2: null, s2: null },
      patterns: [],
      risk: { atr: null, volatility: null },
      risk: { atr: null, volatility: null },
      ohlcHistory: [],
      showInfo: false
    }
  },
  computed: {
    currentZone() {
        if (!this.currentPrice || !this.pivots.p) return null;
        const p = this.pivots;
        const cp = this.currentPrice;
        
        if (cp > p.r2) return 'Above R2 (Strong Bullish)';
        if (cp > p.r1) return 'Testing R1-R2 Zone';
        if (cp > p.p) return 'Above Pivot (Bullish Bias)';
        if (cp > p.s1) return 'Below Pivot (Bearish Bias)';
        if (cp > p.s2) return 'Testing S1-S2 Zone';
        return 'Below S2 (Oversold)';
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
                this.calculatePivots(ohlcv);
                this.detectPatterns(ohlcv);
                this.calculateRisk(ohlcv);
            }
        } catch (err) {
            console.error('Signals calculation error:', err);
        } finally {
            this.loading = false;
        }
    },
    
    calculatePivots(data) {
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
    
    detectPatterns(data) {
        // Scan last 5 days for patterns
        const len = data.close.length;
        if (len < 6) return;
        
        const rawPatterns = [];
        
        // Helper
        const isBullish = (i) => data.close[i] > data.open[i];
        const bodySize = (i) => Math.abs(data.close[i] - data.open[i]);
        const fullSize = (i) => data.high[i] - data.low[i];
        
        // Loop from last candle backwards (up to 5 days)
        for (let i = len - 1; i >= len - 5; i--) {
             if (i < 2) continue;
             
             const date = new Date(data.date ? data.date[i] : Date.now()); 
             const dateStr = (data.date && data.date[i]) ? new Date(data.date[i]).toLocaleDateString() : '';

             // 1. Hammer (Small body, long lower shadow)
             const lowerShadow = Math.min(data.open[i], data.close[i]) - data.low[i];
             const upperShadow = data.high[i] - Math.max(data.open[i], data.close[i]);
             const body = bodySize(i);
             const range = fullSize(i);
             
             if (range > 0 && lowerShadow > 2 * body && upperShadow < body) {
                 rawPatterns.push({ name: 'Hammer', type: 'bullish', date: dateStr });
             }
             
             // 2. Engulfing
             const prev = i - 1;
             if (isBullish(i) && !isBullish(prev)) {
                  if (data.close[i] > data.open[prev] && data.open[i] < data.close[prev]) {
                      rawPatterns.push({ name: 'Bullish Engulfing', type: 'bullish', date: dateStr });
                  }
             } else if (!isBullish(i) && isBullish(prev)) {
                 if (data.close[i] < data.open[prev] && data.open[i] > data.close[prev]) {
                     rawPatterns.push({ name: 'Bearish Engulfing', type: 'bearish', date: dateStr });
                 }
             }
             
             // 3. Doji (Very small body)
             if (range > 0 && body < range * 0.1) {
                 rawPatterns.push({ name: 'Doji', type: 'neutral', date: dateStr });
             }
             
             // Stop if we found enough patterns to avoid clutter
             if (rawPatterns.length >= 3) break;
        }
        
        this.patterns = rawPatterns;
    },
    
    calculateRisk(data) {
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
    
    formatPrice(val) {
        if (!val) return '--';
        return val.toFixed(2);
    },
    
    openModal() {
        this.showInfo = true;
    }
  }
}
</script>

<style scoped>
.technical-signals {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.loading-simple {
    font-size: 0.9rem;
    color: #999;
    text-align: center;
}

h4 {
    margin: 0 0 0.8rem 0;
    font-size: 0.95rem;
    color: #495057;
    border-bottom: 1px solid #e9ecef;
    padding-bottom: 0.4rem;
}

.section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.inline-info-btn {
    background: none;
    border: none;
    padding: 2px 4px;
    color: #adb5bd;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: color 0.2s;
}

.inline-info-btn:hover {
    color: #007bff;
}

.signal-block {
    margin-bottom: 1.5rem;
}

.signal-block:last-child {
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
    font-size: 0.85rem;
    padding: 2px 0;
}

.pivot-row.resistance { color: #dc3545; }
.pivot-row.support { color: #28a745; }
.pivot-row.main { font-weight: bold; color: #495057; border-top: 1px dashed #dee2e6; border-bottom: 1px dashed #dee2e6; padding: 4px 0; }

.current-zone {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    background: #e9ecef;
    padding: 4px 8px;
    border-radius: 4px;
    text-align: center;
}

/* Patterns */
.patterns-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.pattern-badge {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 600;
}

.pattern-badge.bullish { background: #d4edda; color: #155724; }
.pattern-badge.bearish { background: #f8d7da; color: #721c24; }
.pattern-badge.neutral { background: #e2e3e5; color: #383d41; }

.no-patterns {
    font-size: 0.8rem;
    color: #adb5bd;
    font-style: italic;
}

/* Risk */
.risk-metric {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
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
    background: white;
    width: 90%;
    max-width: 400px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 1rem;
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
    padding: 1rem;
    font-size: 0.9rem;
    color: #212529;
}

.modal-body h6 {
    margin: 0.5rem 0 0.5rem 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #007bff;
}

.modal-body ul {
    margin: 0 0 1rem 0;
    padding-left: 1.2rem;
}

.modal-body li {
    margin-bottom: 0.4rem;
}
</style>
