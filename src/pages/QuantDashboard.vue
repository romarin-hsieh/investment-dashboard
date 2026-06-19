<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ThreeDKineticChart from '@/components/ThreeDKineticChart.vue';
import SignalCard from '@/components/SignalCard.vue';
import { withDataBase } from '@/utils/baseUrl.js';

const { t } = useI18n();

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
        latestData.value = jsonData.data || [];
        
        // Initialize with first ticker or previously selected
        selectTicker(selectedTicker.value);
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
      <!-- Left Panel: Comet Chart -->
      <div class="chart-panel">
        <ThreeDKineticChart 
          v-if="currentDataPoint && currentTickerData" 
          :dataPoint="currentDataPoint"
          :historyTrace="historyTrace"
          :sectorTrace="sectorTrace"
          :signal="currentTickerData.signal"
          :commentary="currentTickerData.commentary"
          :ticker="selectedTicker"
        />
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
  margin-bottom: 2rem;
}

h1 {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.subtitle {
  color: var(--grey-500);
  font-size: var(--text-md);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

/* PR-E4: empty-state styling — quiet, centered, with token-aligned colours
 * so it sits comfortably alongside the existing loading-state / error-state
 * branches. */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.empty-state__title {
  font-size: 1.1rem;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.empty-state__hint {
  font-size: 0.9rem;
  margin: 0 auto;
  max-width: 480px;
  line-height: 1.5;
}

.empty-state code {
  background: var(--bg-secondary);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
}

.empty-state a {
  color: var(--primary-color);
  text-decoration: underline;
}

.chart-panel {
  min-height: 600px;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.ticker-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: var(--chart-bg-deep);
  padding: 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--chart-bg);
}

.ticker-btn {
  background: var(--chart-bg);
  border: 1px solid transparent;
  color: var(--grey-350);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

/* `--chart-bg` is #2a2e39; this hover uses a slightly lighter shade. No
 * matching token in tokens.css today — TradingView-style chrome doesn't
 * fit the brand greyscale exactly. Kept inline rather than introducing a
 * one-off `--chart-bg-hover` until another component needs the same shade. */
.ticker-btn:hover {
  background: #363A45;
}

/* TradingView-themed accent blue — distinct from --blue-500 (#007bff) and
 * --blue-700 (#0056b3) brand blues. Kept inline; promote to a token if
 * another TV-themed surface needs the same hue. */
.ticker-btn.active {
  background: #2962FF;
  color: white;
  border-color: #2962FF;
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
}
</style>
