<script setup>
import { computed } from 'vue';
import { getToken } from '@/utils/designTokens';

const props = defineProps({
  ticker: {
    type: String,
    required: true
  },
  signal: {
    type: String,
    required: true
  },
  commentary: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  changePercent: {
    type: Number,
    required: true
  },
  coordinates: {
    type: Object,
    default: null
  }
});

// Reads the --signal-* tokens defined in styles/tokens.css.
// Recomputes on theme change because Vue's `computed` re-runs when its
// reactive deps change — but signal tokens are theme-fixed (same hex in
// light & dark), so this returns a stable hex per signal value.
const signalColor = computed(() => {
  switch (props.signal) {
    case 'LAUNCHPAD': return getToken('--signal-launchpad');
    case 'DIP_BUY':   return getToken('--signal-dip-buy');
    case 'CLIMAX':    return getToken('--signal-climax');
    case 'AVOID':     return getToken('--signal-avoid');
    default:          return getToken('--signal-neutral');
  }
});

const signalText = computed(() => {
  return props.signal.replace('_', ' ');
});

const isPositive = computed(() => props.changePercent >= 0);
</script>

<template>
  <div class="signal-card">
    <div class="header">
      <div class="ticker-info">
        <h2>{{ ticker }}</h2>
        <div class="price-info">
          <span class="price">${{ price }}</span>
          <span
            class="change"
            :class="{ 'up': isPositive, 'down': !isPositive }"
            :aria-label="isPositive ? `Up ${changePercent}%` : `Down ${changePercent}%`"
          >
            <!-- Glyph carries direction for colour-blind / greyscale users.
                 Hidden from screen readers (which use the aria-label above)
                 to avoid 'up arrow up two percent' double-reading. -->
            <span class="change-glyph" aria-hidden="true">{{ isPositive ? '▲' : '▼' }}</span>
            {{ isPositive ? '+' : '' }}{{ changePercent }}%
          </span>
        </div>
      </div>
      <div class="signal-badge" :style="{ borderColor: signalColor, color: signalColor }">
        {{ signalText }}
      </div>
    </div>
    
    <div class="divider"></div>
    
    <div class="commentary-box">
      <h4>Algorithmic Analysis</h4>
      <p>{{ commentary }}</p>
    </div>

    <div class="metrics-grid" v-if="coordinates">
      <div class="metric-item">
        <span class="metric-label">X: Trend</span>
        <span class="metric-value">{{ coordinates.x_trend }}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Y: Momentum</span>
        <span class="metric-value">{{ coordinates.y_momentum }}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Z: Structure</span>
        <span class="metric-value">{{ coordinates.z_structure }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Always-dark card (does not invert in light mode — uses chart palette tokens) */
.signal-card {
  background: var(--chart-bg-deep);
  border-radius: 8px;
  padding: 1.5rem;
  color: var(--grey-350);
  border: 1px solid var(--chart-bg);
  box-shadow: 0 4px 6px rgba(0,0,0,0.2);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.ticker-info h2 {
  margin: 0;
  font-size: 2rem;
  color: white;
}

.price-info {
  margin-top: 0.25rem;
  font-family: 'Roboto Mono', monospace;
}

.price {
  font-size: 1.25rem;
  margin-right: 0.5rem;
}

.change.up { color: var(--chart-up-alt); }
.change.down { color: var(--chart-down-alt); }

/* Glyph spacing — keeps arrow tight to the number, not floating away */
.change-glyph {
  display: inline-block;
  margin-right: 0.15em;
  font-size: 0.85em;
}

.signal-badge {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 2px solid;
  font-weight: bold;
  font-size: 0.9rem;
  letter-spacing: 1px;
}

.divider {
  height: 1px;
  background: var(--chart-bg);
  margin: 1rem 0;
}

.commentary-box h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--grey-500);
  letter-spacing: 0.5px;
}

.commentary-box p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--grey-250);
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
  border-top: 1px solid var(--chart-bg);
  padding-top: 1rem;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--chart-bg);
  padding: 0.5rem;
  border-radius: 4px;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--grey-500);
  margin-bottom: 0.25rem;
}

.metric-value {
  font-family: 'Roboto Mono', monospace;
  font-size: 1rem;
  color: var(--grey-250);
}

/* Narrow viewports: 3-column metrics grid is too cramped at <600px.
   Tablet portrait (≥601px) keeps 3 columns; phones drop to 1 column. */
@media (max-width: 600px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
