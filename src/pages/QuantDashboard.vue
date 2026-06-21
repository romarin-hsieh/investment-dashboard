<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ThreeDKineticChart from '@/components/ThreeDKineticChart.vue';
import SignalCard from '@/components/SignalCard.vue';
import { withDataBase } from '@/utils/baseUrl.js';
import { formatNumber } from '@/utils/numberFormat';

const { t, locale } = useI18n();

const latestData = ref([]);
const selectedTicker = ref('SPY');
const loading = ref(true);
const error = ref(null);

const currentDataPoint = ref(null);
const historyTrace = ref([]);
const sectorTrace = ref([]);

const fetchData = async () => {
    try {
        loading.value = true;
        // Fetch the generated analysis report
        const response = await fetch(withDataBase('data/dashboard_status.json'));
        if (!response.ok) throw new Error(t('quant.errorLoadFailed'));
        
        const jsonData = await response.json();
        const rows = jsonData.data || [];
        // Defensive: the ETL has leaked per-lookback OHLCV variant keys (e.g.
        // TRV_1D_1825D) as phantom rows alongside the clean per-symbol rows.
        // Keep only real symbols so the selector isn't flooded with ~400 dupes.
        latestData.value = rows.filter(d => d && d.ticker && !/_\d+[a-z]_\d+[a-z]$/i.test(d.ticker));

        // Select the saved/default ticker if present, else fall back to the first
        // available row — the hardcoded 'SPY' default isn't always in the dataset,
        // which previously left the dashboard blank until a ticker was clicked.
        const initial = latestData.value.some(d => d.ticker === selectedTicker.value)
            ? selectedTicker.value
            : latestData.value[0]?.ticker;
        if (initial) selectTicker(initial);
    } catch (e) {
        error.value = e.message;
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const selectTicker = (ticker) => {
    selectedTicker.value = ticker;
    const tickerData = latestData.value.find(d => d.ticker === ticker);
    
    if (tickerData) {
        currentDataPoint.value = {
            x_trend: tickerData.coordinates.x_trend,
            y_momentum: tickerData.coordinates.y_momentum,
            z_structure: tickerData.coordinates.z_structure
        };
        historyTrace.value = tickerData.trace || [];
        sectorTrace.value = tickerData.sector_trace || [];
    }
};

const currentTickerData = computed(() => {
    return latestData.value.find(d => d.ticker === selectedTicker.value);
});

const isPositive = computed(() => (currentTickerData.value?.change_percent ?? 0) >= 0);

const signalLabel = computed(() => {
    const s = currentTickerData.value?.signal;
    switch (s) {
        case 'LAUNCHPAD': return t('signalCard.signals.launchpad');
        case 'DIP_BUY':   return t('signalCard.signals.dipBuy');
        case 'CLIMAX':    return t('signalCard.signals.climax');
        case 'AVOID':     return t('signalCard.signals.avoid');
        default:          return (s || 'WAIT').replace('_', ' ');
    }
});

const displayPrice = computed(() => formatNumber(currentTickerData.value?.price ?? 0, 2));
const displayChange = computed(() => formatNumber(currentTickerData.value?.change_percent ?? 0, 2));

// Analysis date for this ticker (the data's `date` field) — surfaced as a plate
// caption beneath the kinetic plot; parsed at local midnight to avoid a TZ
// day-shift, falls back to the raw string if unparseable.
const dataDateLabel = computed(() => {
    const d = currentTickerData.value?.date;
    if (!d) return '';
    const localeStr = locale.value === 'zh-TW' ? 'zh-TW' : 'en-US';
    try {
        return new Date(d + 'T00:00:00').toLocaleDateString(localeStr, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        return d;
    }
});

onMounted(() => {
    fetchData();
});
</script>

<template>
  <div class="quant-dashboard">
    <div class="header-section">
      <h1>{{ $t('quant.title') }}</h1>
      <p class="subtitle">{{ $t('quant.subtitle') }}</p>
    </div>

    <div v-if="loading" class="loading-state">
      {{ $t('quant.loading') }}
    </div>

    <div v-else-if="error" class="error-state">
      {{ error }}
    </div>

    <!-- PR-E4: explicit empty state when the daily ETL produced no
         signals (rare but real — happens between pipeline failures and
         the next successful run). Without this branch we'd render an
         empty .ticker-list with no visual feedback. -->
    <div v-else-if="latestData.length === 0" class="empty-state" role="status" aria-live="polite">
      <p class="empty-state__title">{{ $t('quant.emptyTitle') }}</p>
      <p class="empty-state__hint">
        {{ $t('quant.emptyHintBefore') }}<a href="/system-manager">{{ $t('quant.emptyHintLink') }}</a>{{ $t('quant.emptyHintAfter') }}
      </p>
    </div>

    <div v-else class="dashboard-grid">
      <!-- Left Panel: Verdict band + Comet Chart -->
      <div class="chart-panel">
        <div class="verdict-band" v-if="currentTickerData">
          <div class="verdict-id">
            <span class="verdict-ticker">{{ selectedTicker }}</span>
            <span class="verdict-quote">
              <span class="verdict-price">${{ displayPrice }}</span>
              <span
                class="verdict-change"
                :class="{ up: isPositive, down: !isPositive }"
                :aria-label="isPositive ? $t('signalCard.priceUp', { percent: displayChange }) : $t('signalCard.priceDown', { percent: displayChange })"
              >
                <span class="change-glyph" aria-hidden="true">{{ isPositive ? '▲' : '▼' }}</span>{{ isPositive ? '+' : '' }}{{ displayChange }}%
              </span>
            </span>
          </div>
          <span class="verdict-pill" :class="currentTickerData.signal.toLowerCase()">{{ signalLabel }}</span>
        </div>

        <ThreeDKineticChart
          v-if="currentDataPoint && currentTickerData" 
          :dataPoint="currentDataPoint"
          :historyTrace="historyTrace"
          :sectorTrace="sectorTrace"
          :signal="currentTickerData.signal"
          :commentary="currentTickerData.commentary"
          :ticker="selectedTicker"
        />
        <p class="plate-caption" v-if="dataDateLabel">{{ $t('market.asOf') }} {{ dataDateLabel }}</p>
      </div>

      <!-- Right Panel: Signals & List -->
      <div class="side-panel">
        <!-- Ticker Selector -->
        <div class="ticker-list">
          <button 
            v-for="item in latestData" 
            :key="item.ticker"
            class="ticker-btn"
            :class="{ active: selectedTicker === item.ticker }"
            @click="selectTicker(item.ticker)"
          >
            <span class="symbol">{{ item.ticker }}</span>
            <span class="signal-dot" :class="item.signal.toLowerCase()"></span>
          </button>
        </div>

        <!-- Active Signal Card -->
        <SignalCard 
          v-if="currentTickerData"
          :ticker="selectedTicker"
          :signal="currentTickerData.signal"
          :commentary="currentTickerData.commentary"
          :price="currentTickerData.price"
          :changePercent="currentTickerData.change_percent"
          :coordinates="currentTickerData.coordinates"
        />

        <!-- Kinetic-state legend: in-UI explanation of the axes + signal types (onboarding). -->
        <details class="kinetic-legend">
          <summary>{{ $t('quant.legend.title') }}</summary>
          <p class="legend-axes">{{ $t('quant.legend.axes') }}</p>
          <ul>
            <li><span class="signal-dot launchpad"></span>{{ $t('quant.legend.launchpad') }}</li>
            <li><span class="signal-dot dip_buy"></span>{{ $t('quant.legend.dipBuy') }}</li>
            <li><span class="signal-dot climax"></span>{{ $t('quant.legend.climax') }}</li>
            <li><span class="signal-dot avoid"></span>{{ $t('quant.legend.avoid') }}</li>
          </ul>
        </details>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quant-dashboard {
  /* Gutter, max-width and centering come from Layout's .container;
     vertical spacing from .main-content. */
}

.header-section {
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--primary-color);
}

h1 {
  font-size: var(--text-3xl);
  font-weight: var(--weight-extrabold);
  letter-spacing: -0.02em;
  margin-bottom: var(--space-2);
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  font-size: var(--text-md);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-8);
}

/* PR-E4: empty-state styling — quiet, centered, with token-aligned colours
 * so it sits comfortably alongside the existing loading-state / error-state
 * branches. */
.empty-state {
  text-align: center;
  padding: 4rem var(--space-8);
  color: var(--text-secondary);
}

.empty-state__title {
  font-size: var(--text-md);
  margin: 0 0 var(--space-2);
  color: var(--text-primary);
}

.empty-state__hint {
  font-size: var(--text-base);
  margin: 0 auto;
  max-width: 480px;
  line-height: 1.5;
}

.empty-state code {
  background: var(--bg-secondary);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-family: ui-monospace, monospace;
  font-size: var(--text-sm);
}

.empty-state a {
  color: var(--primary-color);
  text-decoration: underline;
}

.chart-panel {
  min-height: 600px;
}

/* Museum plate caption beneath the kinetic specimen — surfaces the analysis
   date (not shown elsewhere) and labels the matted instrument. */
.plate-caption {
  margin-top: var(--space-3);
  text-align: center;
  font-family: 'Roboto Mono', monospace;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* Verdict band — the single committed-accent zone on the surface: ticker,
   directional price, and signal verdict fused into one brand bar above the
   matted kinetic plot. */
.verdict-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  background: var(--primary-strong);
  color: #fff;
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
}

.verdict-id {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  flex-wrap: wrap;
  min-width: 0;
}

.verdict-ticker {
  font-size: var(--text-3xl);
  font-weight: var(--weight-extrabold);
  letter-spacing: -0.02em;
  line-height: 1;
}

.verdict-quote {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-3);
  font-family: 'Roboto Mono', monospace;
}

.verdict-price { font-size: var(--text-xl); font-weight: var(--weight-semibold); }
.verdict-change { font-size: var(--text-md); font-variant-numeric: tabular-nums; }
.verdict-change .change-glyph { margin-right: 0.1em; font-size: 0.85em; }

.verdict-pill {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-pill);
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  letter-spacing: 1px;
  text-transform: uppercase;
  white-space: nowrap;
  /* Default covers wait / neutral / no_data / no_trade — slate + white. */
  background: var(--signal-neutral);
  color: #fff;
}

/* Filled verdict pill — the large bold label clears 3:1 large-text AA, so
   light fills (gold / avoid-grey) take dark --signal-ink and the rest white. */
.verdict-pill.launchpad { background: var(--signal-launchpad); color: var(--signal-ink); }
.verdict-pill.dip_buy   { background: var(--signal-dip-buy);   color: #fff; }
.verdict-pill.climax    { background: var(--signal-climax);    color: #fff; }
.verdict-pill.avoid     { background: var(--signal-avoid);     color: var(--signal-ink); }

.side-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.ticker-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  background: var(--bg-secondary);
  padding: var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  /* Cap the selector so a large universe scrolls instead of burying the
     SignalCard below a tall wall of buttons. */
  max-height: 340px;
  overflow-y: auto;
}

.ticker-btn {
  background: var(--bg-card);
  border: 1px solid transparent;
  color: var(--text-secondary);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  transition: all var(--transition-base);
}

.ticker-btn:hover {
  background: var(--border-color);
}

/* Selected ticker = restrained (outline + brand-toned label) so the only
   full-saturation zone on the surface is the verdict band. */
.ticker-btn.active {
  background: var(--bg-card);
  border-color: var(--primary-color);
  color: var(--primary-text);
  font-weight: var(--weight-semibold);
}

.signal-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.signal-dot.launchpad { background-color: var(--signal-launchpad); box-shadow: 0 0 5px var(--signal-launchpad); }
.signal-dot.dip_buy   { background-color: var(--signal-dip-buy);   box-shadow: 0 0 5px var(--signal-dip-buy); }
.signal-dot.climax    { background-color: var(--signal-climax);    box-shadow: 0 0 5px var(--signal-climax); }
.signal-dot.avoid     { background-color: var(--signal-neutral); }
.signal-dot.wait      { background-color: var(--signal-neutral); }

/* Tablet collapse aligned with PR-A4 standard (≤900). The previous
 * 1024px breakpoint over-collapsed the 2fr 1fr grid in the 901-1024
 * range where side-by-side still fits comfortably (verified via
 * preview_eval at 901/950/1100 — at ≥901, side panel renders ~280px
 * which is readable). */
@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  h1 { font-size: var(--text-2xl); }
}

/* Kinetic-state legend (onboarding) — collapsible, token-driven. */
.kinetic-legend {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.kinetic-legend summary {
  cursor: pointer;
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
  list-style: none;
}
.kinetic-legend summary::-webkit-details-marker { display: none; }
.kinetic-legend summary::before {
  content: '▸';
  display: inline-block;
  margin-right: var(--space-2);
  transition: transform var(--transition-fast) ease;
}
.kinetic-legend[open] summary::before { transform: rotate(90deg); }
.kinetic-legend .legend-axes { margin: var(--space-3) 0; line-height: 1.5; }
.kinetic-legend ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.kinetic-legend li { display: flex; align-items: center; gap: var(--space-2); line-height: 1.4; }
.kinetic-legend li .signal-dot { flex-shrink: 0; }
</style>
