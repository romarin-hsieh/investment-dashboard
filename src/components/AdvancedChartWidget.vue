<template>
  <div class="advanced-chart-widget" ref="container">
    <!-- Loading overlay -->
    <div v-if="!loaded && !error" class="widget-overlay skeleton-overlay">
      <div class="skeleton-pulse"></div>
    </div>
    <!-- Error state -->
    <div v-if="error" class="widget-overlay error-overlay">
      <span>⚠️ Chart unavailable</span>
      <button class="retry-btn" @click="retry">Retry</button>
    </div>
    <!-- Widget target -->
    <div ref="widgetTarget" class="widget-target"></div>
  </div>
</template>

<script>
import { useTheme } from '@/composables/useTheme.js'

export default {
  name: 'AdvancedChartWidget',
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
  setup() {
    const { theme } = useTheme()
    return { theme }
  },
  data() {
    return {
      loaded: false,
      error: false
    }
  },
  computed: {
    fullSymbol() {
      return `${this.exchange}:${this.symbol}`
    },
    widgetConfig() {
      const isDark = this.theme === 'dark'
      return {
        "allow_symbol_change": true,
        "calendar": false,
        "details": true,
        "hide_side_toolbar": false,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_volume": false,
        "hotlist": false,
        "interval": "D",
        "locale": "en",
        "save_image": true,
        "style": "1",
        "symbol": this.fullSymbol,
        "theme": isDark ? "dark" : "light",
        "timezone": "Etc/UTC",
        "backgroundColor": isDark ? "#0F0F0F" : "#ffffff",
        "gridColor": isDark ? "rgba(242, 242, 242, 0.06)" : "rgba(46, 46, 46, 0.06)",
        "watchlist": [],
        "withdateranges": true,
        "range": "12M",
        "compareSymbols": [],
        "show_popup_button": true,
        "popup_height": "1080",
        "popup_width": "1920",
        "studies": [
          "STD;VWMA",
          "STD;DEMA",
          "STD;Least%1Squares%1Moving%1Average",
          "STD;Kaufmans_Adaptive_Moving_Average",
          "STD;Hull%1MA"
        ],
        "autosize": true
      }
    }
  },
  watch: {
    theme() {
      this.reloadWidget()
    },
    symbol() {
      this.reloadWidget()
    },
    exchange() {
      this.reloadWidget()
    }
  },
  mounted() {
    this.createWidget()
  },
  methods: {
    async createWidget() {
      this.loaded = false
      this.error = false

      await this.$nextTick()
      const target = this.$refs.widgetTarget
      if (!target) {
        this.error = true
        return
      }

      // Clear existing content
      target.innerHTML = ''

      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
      script.async = true
      script.innerHTML = JSON.stringify(this.widgetConfig)

      const timeout = setTimeout(() => {
        this.error = true
      }, 8000)

      script.onload = () => {
        clearTimeout(timeout)
        this.loaded = true
      }

      script.onerror = () => {
        clearTimeout(timeout)
        this.error = true
      }

      target.appendChild(script)
    },

    reloadWidget() {
      this.createWidget()
    },

    retry() {
      this.error = false
      this.createWidget()
    }
  }
}
</script>

<style scoped>
.advanced-chart-widget {
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
}

.widget-target {
  width: 100%;
  height: 100%;
}

.widget-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2;
  background: var(--bg-card);
}

.skeleton-overlay .skeleton-pulse {
  width: 80%;
  height: 60%;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    var(--bg-card) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.error-overlay {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--error-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
}

.retry-btn:hover {
  opacity: 0.9;
}
</style>
