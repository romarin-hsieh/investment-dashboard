<template>
  <div class="fast-widget overview-widget" :id="containerId" ref="container">
    <div v-if="!loaded && !error" class="fast-loading">
      <div class="loading-spinner"></div>
      <span>Loading Technical Analysis...</span>
    </div>
    
    <div v-if="error" class="fast-error">
      <span>⚠️ Failed to load</span>
      <button @click="retry" class="retry-btn">Retry</button>
    </div>

    <!-- TradingView Widget Container -->
    <div v-show="loaded" class="tradingview-widget-container">
      <div class="tradingview-widget-container__widget"></div>
    </div>
  </div>
</template>

<script>
import { widgetLoadManager } from '@/utils/widgetLoadManager'
import { useTheme } from '@/composables/useTheme.js'

export default {
  name: 'TechnicalAnalysisWidget',
  setup() {
    const { theme } = useTheme()
    return { theme }
  },
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
      default: 2
    }
  },
  data() {
    return {
      loaded: false,
      error: false,
      loadStartTime: 0,
      isVisible: false,
      observer: null,
      retryCount: 0
    }
  },
  computed: {
    containerId() {
      return `technical-analysis-${this.symbol}-${Date.now()}`
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

        // 使用 Widget Load Manager 管理併發
        const widgetId = `technical-analysis-${this.symbol}-${this.containerId}`
        await widgetLoadManager.addToQueue(
          () => this.createWidget(),
          widgetId,
          this.priority
        )

      } catch (err) {
        console.error('Failed to load Technical Analysis widget:', err)
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
          const scriptUrl = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js'
          
          const script = document.createElement('script')
          
          script.type = 'text/javascript'
          script.src = scriptUrl
          script.async = true
          script.innerHTML = JSON.stringify(config)
          
          // 調整 timeout - 根據優先級和重試次數
          const baseTimeouts = {
            1: 8000,   // 高優先級：8秒
            2: 12000,  // 中優先級：12秒
            3: 15000   // 低優先級：15秒
          }
          
          const retryCount = this.retryCount || 0
          const timeoutDuration = baseTimeouts[this.priority] + (retryCount * 3000) // 每次重試增加 3 秒
          
          const timeout = setTimeout(() => {
            this.error = true
            reject(new Error(`Widget load timeout after ${timeoutDuration}ms (retry: ${retryCount})`))
          }, timeoutDuration)
          
          script.onload = () => {
            clearTimeout(timeout)
            this.loaded = true
            
            const loadTime = performance.now() - this.loadStartTime
            console.log(`Technical Analysis widget ${this.symbol} loaded in ${loadTime.toFixed(2)}ms (retry: ${retryCount})`)
            
            resolve()
          }
          
          script.onerror = () => {
            clearTimeout(timeout)
            this.error = true
            reject(new Error('Script load failed'))
          }
          
          // 將 script 添加到 tradingview-widget-container__widget 中
          const widgetContainer = container.querySelector('.tradingview-widget-container__widget')
          if (widgetContainer) {
            widgetContainer.appendChild(script)
          } else {
            container.appendChild(script)
          }
        })
      })
    },

    getWidgetConfig() {
      const isDark = this.theme === 'dark';
      return {
        "colorTheme": isDark ? "dark" : "light",
        "displayMode": "single",
        "isTransparent": true,
        "locale": "en",
        "interval": "1D",
        "disableInterval": false,
        "width": "100%",
        "height": "100%",
        "symbol": `${this.exchange}:${this.symbol}`,
        "showIntervalTabs": true
      }
    },

    async retry() {
      // 實施指數退避重試
      this.retryCount = (this.retryCount || 0) + 1
      const maxRetries = 2
      
      if (this.retryCount > maxRetries) {
        console.error(`Technical Analysis widget ${this.symbol} exceeded max retries (${maxRetries})`)
        return
      }
      
      // 指數退避延遲
      const backoffDelay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 5000) // 最多 5 秒
      console.log(`Technical Analysis widget ${this.symbol} retrying in ${backoffDelay}ms (attempt ${this.retryCount}/${maxRetries})`)
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay))
      
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

/* 使用與 Symbol Overview 相同的樣式 */
.fast-widget.overview-widget {
  background: var(--bg-card);
  padding: 8px;
  box-sizing: border-box;
}

.fast-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 500px;
  background: var(--bg-secondary);
  border-radius: 8px;
  color: var(--text-muted);
}

/* 載入狀態調整 */
.fast-widget.overview-widget .fast-loading {
  margin: -8px; /* 抵消容器的 padding */
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fast-loading span {
  font-size: 0.9rem;
  font-weight: 500;
}

.fast-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 500px;
  background: var(--bg-card);
  border: 1px solid var(--error-color);
  border-radius: 8px;
  color: var(--error-color);
}

/* 錯誤狀態調整 */
.fast-widget.overview-widget .fast-error {
  margin: -8px; /* 抵消容器的 padding */
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

/* TradingView Widget 樣式 */
.tradingview-widget-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.tradingview-widget-container__widget {
  width: 100%;
  height: 100%; /* 移除 copyright 後使用全高度 */
}
</style>