<template>
  <div class="fast-widget" :class="{ 'overview-widget': widgetType === 'overview' }" :id="containerId" ref="container">
    <!-- Overlay for Loading -->
    <div v-if="!loaded && !error" class="widget-overlay skeleton-overlay">
      <WidgetSkeleton :bordered="false" :show-header="false" type="chart" />
    </div>
    
    <!-- Overlay for Error -->
    <div v-if="error" class="widget-overlay fast-error">
      <span>⚠️ Failed to load</span>
      <button @click="retry" class="retry-btn">Retry</button>
    </div>

    <!-- Static Widget Target -->
    <div ref="widgetTarget" class="widget-target"></div>
  </div>
</template>

<script>
import { widgetCache } from '@/utils/widgetCache'
import { widgetThrottle } from '@/utils/widgetThrottle'
import { widgetPreloader } from '@/utils/widgetPreloader'
import { widgetLoadManager } from '@/utils/widgetLoadManager'
import { useTheme } from '@/composables/useTheme.js'
import WidgetSkeleton from '@/components/WidgetSkeleton.vue'
import { watch } from 'vue'

export default {
  name: 'FastTradingViewWidget',
  components: {
    WidgetSkeleton
  },
  props: {
    widgetType: {
      type: String,
      required: true,
      validator: (value) => ['overview', 'technical'].includes(value)
    },
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
      default: 1 // 1=高優先級, 2=中優先級, 3=低優先級
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
      return `fast-widget-${this.widgetType}-${this.symbol}-${Date.now()}`
    },
    
    cacheKey() {
      return `${this.widgetType}-${this.symbol}-${this.exchange}`
    }
  },
  watch: {
    theme() {
      // Reload on theme change if visible
      if (this.isVisible) {
        this.loadWidget()
      }
    }
  },
  async mounted() {
    this.setupIntersectionObserver()
  },
  beforeUnmount() {
    if (this.observer) {
      this.observer.disconnect()
    }
  },
  methods: {
    setupIntersectionObserver() {
      // 根據優先級設置不同的 rootMargin
      const rootMargins = {
        1: '300px', // 高優先級：提前 300px 載入
        2: '150px', // 中優先級：提前 150px 載入
        3: '50px'   // 低優先級：提前 50px 載入
      }

      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !this.loaded && !this.error) {
              this.isVisible = true
              this.loadWidget()
              this.observer.disconnect() // 載入後停止觀察
            }
          })
        },
        {
          rootMargin: rootMargins[this.priority] || '150px',
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
        // 根據優先級添加延遲
        const delays = {
          1: 0,     // 高優先級：立即載入
          2: 300,   // 中優先級：延遲 300ms
          3: 600    // 低優先級：延遲 600ms
        }

        const delay = delays[this.priority] || 0
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        // 檢查快取
        if (widgetCache.has(this.widgetType, this.symbol, this.exchange)) {
          const cached = widgetCache.get(this.widgetType, this.symbol, this.exchange)
          if (cached) {
            this.renderCachedWidget(cached)
            return
          }
        }

        // 檢查是否正在載入相同的 widget
        if (widgetCache.isLoading(this.widgetType, this.symbol, this.exchange)) {
          const loadingPromise = widgetCache.getLoadingPromise(this.widgetType, this.symbol, this.exchange)
          await loadingPromise
          return
        }

        // 使用 Widget Load Manager 管理併發
        const widgetId = `fast-${this.widgetType}-${this.symbol}-${this.containerId}`
        const loadPromise = widgetLoadManager.addToQueue(
          () => this.createWidget(),
          widgetId,
          this.priority
        )
        widgetCache.setLoading(this.widgetType, this.symbol, this.exchange, loadPromise)
        
        await loadPromise

      } catch (err) {
        console.error('Failed to load widget:', err)
        this.error = true
      }
    },

    async createWidget() {
      return new Promise((resolve, reject) => {
        this.$nextTick(async () => {
          const target = this.$refs.widgetTarget
          
          if (!target) {
            reject(new Error('Widget target container not found'))
            return
          }
          
          // Clear existing content for theme reload
          target.innerHTML = ''

          const config = this.getWidgetConfig()
          const scriptUrl = this.getScriptUrl()
          
          // 檢查是否已預載入腳本
          if (!widgetPreloader.isPreloaded(scriptUrl)) {
            try {
              await widgetPreloader.preloadScript(scriptUrl)
            } catch (error) {
              console.warn('Script preload failed, continuing with normal load:', error)
            }
          }

          const script = document.createElement('script')
          
          script.type = 'text/javascript'
          script.src = scriptUrl
          script.async = true
          script.innerHTML = JSON.stringify(config)
          
          // 設定超時
          const timeouts = {
            1: 3000,
            2: 5000,
            3: 8000
          }
          
          const timeout = setTimeout(() => {
            this.error = true
            reject(new Error('Widget load timeout'))
          }, timeouts[this.priority] || 5000)
          
          script.onload = () => {
            clearTimeout(timeout)
            this.loaded = true
            
            const loadTime = performance.now() - this.loadStartTime
            
            resolve()
          }
          
          script.onerror = () => {
            clearTimeout(timeout)
            this.error = true
            reject(new Error('Script load failed'))
          }
          
          target.appendChild(script)
        })
      })
    },

    getWidgetConfig() {
      const isDark = this.theme === 'dark';
      const commonColors = {
          bg: isDark ? '#2C2C2C' : '#ffffff',
          text: isDark ? '#E6E1DC' : '#0F0F0F',
          grid: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(46, 46, 46, 0.06)',
      }

      if (this.widgetType === 'overview') {
        return {
          "lineWidth": 2,
          "lineType": 0,
          "chartType": "candlesticks",
          "showVolume": true,
          "fontColor": "rgb(106, 109, 120)",
          "gridLineColor": commonColors.grid,
          "volumeUpColor": "rgba(34, 171, 148, 0.5)",
          "volumeDownColor": "rgba(247, 82, 95, 0.5)",
          "backgroundColor": commonColors.bg,
          "widgetFontColor": commonColors.text,
          "upColor": "#22ab94",
          "downColor": "#f7525f",
          "borderUpColor": "#22ab94",
          "borderDownColor": "#f7525f",
          "wickUpColor": "#22ab94",
          "wickDownColor": "#f7525f",
          "colorTheme": isDark ? "dark" : "light",
          "isTransparent": true,
          "locale": "en",
          "chartOnly": false,
          "scalePosition": "right",
          "scaleMode": "Normal",
          "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
          "valuesTracking": "1",
          "changeMode": "price-and-percent",
          "symbols": [[this.symbol, `${this.exchange}:${this.symbol}|1D`]],
          "dateRanges": ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"],
          "fontSize": "10",
          "headerFontSize": "medium",
          "autosize": true,
          "width": "100%",
          "height": "100%",
          "noTimeScale": false,
          "hideDateRanges": false,
          "showMA": true,
          "maLength": 9,
          "maLineColor": "#2962FF",
          "maLineWidth": 1,
          "hideMarketStatus": false,
          "hideSymbolLogo": false
        }
      } else if (this.widgetType === 'technical') {
        return {
          "interval": "1D",
          "width": "100%",
          "height": "100%",
          "isTransparent": true,
          "symbol": `${this.exchange}:${this.symbol}`,
          "showIntervalTabs": true,
          "locale": "en",
          "colorTheme": isDark ? "dark" : "light"
        }
      }
    },

    getScriptUrl() {
      if (this.widgetType === 'overview') {
        return 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
      } else if (this.widgetType === 'technical') {
        return 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js'
      }
    },

    renderCachedWidget(cached) {
      this.$nextTick(() => {
        const target = this.$refs.widgetTarget
        if (!target) return

        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = cached.scriptUrl
        script.async = true
        script.innerHTML = JSON.stringify(cached.config)
        
        script.onload = () => {
          this.loaded = true
          const loadTime = performance.now() - this.loadStartTime
          console.log(`Cached widget ${this.cacheKey} loaded in ${loadTime.toFixed(2)}ms`)
        }
        
        target.appendChild(script)
      })
    },

    async retry() {
      this.setupIntersectionObserver()
    }
  }
}
</script>

<style scoped>
.fast-widget {
  width: 100%;
  height: 100%;
  min-height: 500px;
  position: relative;
}

/* Symbol Overview 特殊樣式 - 白底和 padding */
.fast-widget.overview-widget {
  background: var(--bg-card);
  padding: 8px;
  box-sizing: border-box;
}

/* Skeleton Overlay Style */
.skeleton-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background: var(--bg-card);
  padding: 0;
}

/* Symbol Overview 的 padding 調整 */
.fast-widget.overview-widget .skeleton-overlay {
  padding: 0; /* Skeleton 內部有 padding, 這邊不需要 */
}



.fast-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--error-color);
  border-radius: 8px;
  color: var(--error-color);
}

/* Symbol Overview 的 error 狀態調整 */
.fast-widget.overview-widget .fast-error {
  margin: 0;
}

/* Widget Target */
.widget-target {
  width: 100% !important;
  height: 100% !important;
  position: relative;
  z-index: 1; 
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