<script setup>
import { computed } from 'vue';

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

const signalColor = computed(() => {
  switch (props.signal) {
    case 'LAUNCHPAD': return '#FFD700'; // Gold
    case 'DIP_BUY': return '#089981';   // Green
    case 'CLIMAX': return '#F23645';    // Red
    case 'AVOID': return '#aaaaaa';     // Gray
    default: return '#5D606B';
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
          <span class="change" :class="{ 'up': isPositive, 'down': !isPositive }">
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
.signal-card {
  background: #1E222D; /* Lighter dark */
  border-radius: 8px;
  padding: 1.5rem;
  color: #D1D4DC;
  border: 1px solid #2A2E39;
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
  color: #ffffff;
}

.price-info {
  margin-top: 0.25rem;
  font-family: 'Roboto Mono', monospace;
}

.price {
  font-size: 1.25rem;
  margin-right: 0.5rem;
}

.change.up { color: #089981; }
.change.down { color: #F23645; }

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
  background: #2A2E39;
  margin: 1rem 0;
}

.commentary-box h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: #787B86;
  letter-spacing: 0.5px;
}

.commentary-box p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  color: #E0E3EB;
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1.5rem;
  border-top: 1px solid #2A2E39;
  padding-top: 1rem;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #2A2E39;
  padding: 0.5rem;
  border-radius: 4px;
}

.metric-label {
  font-size: 0.75rem;
  color: #787B86;
  margin-bottom: 0.25rem;
}

.metric-value {
  font-family: 'Roboto Mono', monospace;
  font-size: 1rem;
  color: #E0E3EB;
}
</style>
