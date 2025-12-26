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
export default {
  name: 'TechnicalAnalysisWidget',
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
      observer: null
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

        await this.createWidget()

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
          
          // 設定超時
          const timeout = setTimeout(() => {
            this.error = true
            reject(new Error('Widget load timeout'))
          }, 5000)
          
          script.onload = () => {
            clearTimeout(timeout)
            this.loaded = true
            
            const loadTime = performance.now() - this.loadStartTime
            console.log(`Technical Analysis widget ${this.symbol} loaded in ${loadTime.toFixed(2)}ms`)
            
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
      return {
        "colorTheme": "light",
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
  background: #ffffff;
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
  background: #f8f9fa;
  border-radius: 8px;
  color: #6c757d;
}

/* 載入狀態調整 */
.fast-widget.overview-widget .fast-loading {
  margin: -8px; /* 抵消容器的 padding */
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e9ecef;
  border-top: 3px solid #007bff;
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
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  color: #721c24;
}

/* 錯誤狀態調整 */
.fast-widget.overview-widget .fast-error {
  margin: -8px; /* 抵消容器的 padding */
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
  height: 100%; /* 移除 copyright 後使用全高度 */
}
</style>