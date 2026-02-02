<template>
  <div class="advanced-chart-widget" :id="containerId" ref="container">
    <div v-if="!loaded && !error" class="chart-loading">
      <div class="loading-spinner"></div>
      <span>Loading Trading Strategy...</span>
    </div>
    
    <div v-if="error" class="chart-error">
      <span>⚠️ Failed to load</span>
      <button @click="retry" class="retry-btn">Retry</button>
    </div>

    <!-- TradingView Advanced Chart Container -->
    <div v-show="loaded" class="tradingview-widget-container" style="height:100%;width:100%">
      <div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>
      <div class="tradingview-widget-copyright">
        <a :href="`https://www.tradingview.com/symbols/${exchange}-${symbol}/`" rel="noopener nofollow" target="_blank">
          <span class="blue-text">{{ symbol }} stock chart</span>
        </a>
        <span class="trademark"> by TradingView</span>
      </div>
    </div>
  </div>
</template>

<script>
import { useTheme } from '@/composables/useTheme.js'
import { watch } from 'vue'

export default {
  name: 'TradingStrategyWidget',
  props: {
    symbol: {
      type: String,
      required: true
    },
    exchange: {
      type: String,
      default: 'NASDAQ'
    },
    priority: {
      type: Number,
      default: 4
    }
  },
  setup() {
    const { theme } = useTheme()
    return { theme }
  },
  data() {
    return {
      loaded: false,
      error: false,
      loadStartTime: 0,
      isVisible: false,
      observer: null
    }
  },
  computed: {
    containerId() {
      return `trading-strategy-${this.symbol}-${Date.now()}`
    }
  },
  async mounted() {
    this.setupIntersectionObserver()
    
    // Watch for theme changes specifically
    watch(() => this.theme, () => {
       if (this.isVisible) {
          // Reload widget with new theme
          this.loaded = false
          this.loadWidget()
       }
    })
  },
  beforeUnmount() {
    if (this.observer) {
      this.observer.disconnect()
    }
  },
  methods: {
    setupIntersectionObserver() {
      const rootMargins = {
        1: '300px',
        2: '150px', 
        3: '50px',
        4: '25px'
      }

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !this.loaded && !this.error) {
              this.isVisible = true
              this.loadWidget()
              this.observer.disconnect()
            }
          })
        },
        {
          rootMargin: rootMargins[this.priority] || '25px',
          threshold: 0.1
        }
      )

      this.observer.observe(this.$refs.container)
    },

    async loadWidget() {
      this.loadStartTime = performance.now()
      this.loaded = false
      this.error = false

      try {
        const delays = {
          1: 0,
          2: 300,
          3: 600,
          4: 900
        }

        const delay = delays[this.priority] || 0
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        await this.createWidget()

      } catch (err) {
        console.error('Failed to load Trading Strategy widget:', err)
        this.error = true
      }
    },

    async createWidget() {
      return new Promise((resolve, reject) => {
        this.$nextTick(async () => {
          const container = this.$refs.container
          if (!container) {
            reject(new Error('Container not found'))
            return
          }

          const config = this.getWidgetConfig()
          const scriptUrl = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
          
          const script = document.createElement('script')
          
          script.type = 'text/javascript'
          script.src = scriptUrl
          script.async = true
          script.innerHTML = JSON.stringify(config)
          
          const timeout = setTimeout(() => {
            this.error = true
            reject(new Error('Widget load timeout'))
          }, 8000)
          
          script.onload = () => {
            clearTimeout(timeout)
            this.loaded = true
            
            const loadTime = performance.now() - this.loadStartTime
            console.log(`Trading Strategy widget ${this.symbol} loaded in ${loadTime.toFixed(2)}ms`)
            
            resolve()
          }
          
          script.onerror = () => {
            clearTimeout(timeout)
            this.error = true
            reject(new Error('Script load failed'))
          }
          
          const widgetContainer = container.querySelector('.tradingview-widget-container__widget')
          if (widgetContainer) {
            widgetContainer.innerHTML = '' // Clear existing widget before reloading
            widgetContainer.appendChild(script)
          } else {
            container.appendChild(script)
          }
        })
      })
    },

    getWidgetConfig() {
      return {
        "allow_symbol_change": true,
        "calendar": false,
        "details": false,
        "hide_side_toolbar": true,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_volume": false,
        "hotlist": false,
        "interval": "D",
        "locale": "en",
        "save_image": true,
        "style": "9",
        "symbol": `${this.exchange}:${this.symbol}`,
        "theme": this.theme === 'dark' ? 'dark' : 'light',
        "timezone": "Etc/UTC",
        "backgroundColor": this.theme === 'dark' ? '#2C2C2C' : "#ffffff",
        "gridColor": this.theme === 'dark' ? "rgba(255, 255, 255, 0.06)" : "rgba(46, 46, 46, 0.06)",
        "watchlist": [],
        "withdateranges": true,
        "range": "6M",
        "compareSymbols": [],
        "studies": [
          "STD;MACD",
          "STD;Donchian_Channels",
          "STD;TRIX",
          "STD;RSI"
        ],
        "autosize": true
      }
    },

    async retry() {
      this.setupIntersectionObserver()
    }
  }
}
</script>

<style scoped>
.advanced-chart-widget {
  width: calc(100% + 2px); /* Expand to hide border */
  height: 100%;
  min-height: 850px;
  position: relative;
  background: transparent;
  padding: 0;
  box-sizing: border-box;
  margin-left: -1px; /* Shift left to crop */
  margin-right: -1px;
  margin-bottom: -1px; /* Crop bottom border */
}

.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 850px;
  background: var(--bg-card);
  border-radius: 8px;
  color: var(--text-secondary);
  margin: -8px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--bg-secondary);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chart-loading span {
  font-size: 0.9rem;
  font-weight: 500;
}

.chart-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 850px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  color: #721c24;
  margin: -8px;
}

.retry-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
}

.retry-btn:hover {
  background: #c82333;
}

/* TradingView Widget 樣式 */
.tradingview-widget-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.tradingview-widget-container__widget {
  width: 100%;
  height: calc(100% - 32px);
}

.tradingview-widget-copyright {
  font-size: 11px;
  color: #787B86;
  text-align: center;
  padding: 5px 0;
  line-height: 1.2;
}

.tradingview-widget-copyright a {
  text-decoration: none;
  color: #787B86;
}

.tradingview-widget-copyright .blue-text {
  color: #2962FF;
}

.tradingview-widget-copyright .trademark {
  color: #787B86;
}

.tradingview-widget-copyright a:hover .blue-text {
  color: #1E53E5;
}
</style>

<!-- 全域樣式來覆蓋 TradingView iframe 高度 -->
<style>
/* 禁用 TradingView iframe 的固定高度 - 全域樣式 */
.advanced-chart-widget .tradingview-widget-container iframe {
  height: 100% !important;
  border: none !important; /* Remove iframe border */
  box-shadow: none !important; /* Remove any shadow */
}
</style>