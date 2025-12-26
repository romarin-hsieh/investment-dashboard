<template>
  <div class="fundamental-data-container">
    <div class="fundamental-data-widget" :id="widgetId" ref="container">
      <div v-if="!loaded && !error" class="fundamental-loading">
        <div class="loading-spinner"></div>
        <span>Loading fundamental data...</span>
      </div>
      
      <div v-if="error" class="fundamental-error">
        <span>⚠️ Failed to load fundamental data</span>
        <button @click="retry" class="retry-btn">Retry</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewFundamentalData',
  props: {
    symbol: {
      type: String,
      required: true
    },
    exchange: {
      type: String,
      default: 'NASDAQ'
    },
    colorTheme: {
      type: String,
      default: 'dark'
    },
    displayMode: {
      type: String,
      default: 'regular'
    },
    isTransparent: {
      type: Boolean,
      default: true
    },
    locale: {
      type: String,
      default: 'zh_TW'
    }
  },
  data() {
    return {
      loaded: false,
      error: false,
      widgetId: `fundamental-data-${Date.now()}`
    }
  },
  computed: {
    fullSymbol() {
      return `${this.exchange}:${this.symbol}`
    }
  },
  mounted() {
    this.loadFundamentalData()
  },
  watch: {
    symbol() {
      this.loadFundamentalData()
    },
    exchange() {
      this.loadFundamentalData()
    }
  },
  methods: {
    async loadFundamentalData() {
      this.loaded = false
      this.error = false

      try {
        await this.$nextTick()
        this.createFundamentalData()
      } catch (err) {
        console.error('Failed to load fundamental data:', err)
        this.error = true
      }
    },

    createFundamentalData() {
      const container = this.$refs.container
      if (!container) return

      // 清除現有的 widget
      container.innerHTML = ''

      // 創建 widget 容器結構
      const widgetContainer = document.createElement('div')
      widgetContainer.className = 'tradingview-widget-container'
      widgetContainer.style.height = '100%'
      widgetContainer.style.width = '100%'

      const widgetContent = document.createElement('div')
      widgetContent.className = 'tradingview-widget-container__widget'

      widgetContainer.appendChild(widgetContent)
      container.appendChild(widgetContainer)

      // 創建配置
      const config = {
        "symbol": this.fullSymbol,
        "colorTheme": "light",
        "displayMode": "regular",
        "isTransparent": true,
        "locale": "zh_TW",
        "width": "100%",
        "height": "100%"
      }

      // 創建腳本
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-financials.js'
      script.async = true
      script.innerHTML = JSON.stringify(config)

      // 設定載入事件
      script.onload = () => {
        this.loaded = true
        console.log('TradingView Fundamental Data loaded successfully')
      }

      script.onerror = () => {
        this.error = true
        console.error('TradingView Fundamental Data failed to load')
      }

      // 添加腳本到 widget 容器
      widgetContent.appendChild(script)

      // 設定超時保護
      setTimeout(() => {
        if (!this.loaded && !this.error) {
          this.loaded = true
        }
      }, 8000)
    },

    async retry() {
      await this.loadFundamentalData()
    }
  }
}
</script>

<style scoped>
.fundamental-data-container {
  height: 100%;
  width: 100%;
  min-height: 950px;
  overflow: hidden;
}

.fundamental-data-widget {
  height: 100%;
  width: 100%;
  position: relative;
  min-height: 950px;
  overflow: hidden;
}

/* Loading 狀態 */
.fundamental-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 100%;
  color: #6c757d;
  font-size: 0.9rem;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e9ecef;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error 狀態 */
.fundamental-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 100%;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
}

.retry-btn {
  padding: 0.25rem 0.75rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
}

.retry-btn:hover {
  background: #c82333;
}

/* TradingView Widget 樣式覆蓋 - 僅針對 Fundamental Data */
:global(.fundamental-data-widget .tradingview-widget-container) {
  width: 100% !important;
  height: 100% !important;
  min-height: 950px !important;
  max-height: none !important;
}

:global(.fundamental-data-widget .tradingview-widget-container__widget) {
  width: 100% !important;
  height: calc(100% - 32px) !important;
  min-height: 910px !important;
  max-height: none !important;
}

:global(.fundamental-data-widget .tradingview-widget-container iframe) {
  width: 100% !important;
  height: 950px !important;
  min-height: 600px !important;
  max-height: none !important;
}

/* Simplified TradingView overrides - 僅針對 Fundamental Data */
:global(.fundamental-data-widget .tv-embed-widget-wrapper) {
  height: 950px !important;
  min-height: 950px !important;
  overflow: auto !important;
}

:global(.fundamental-data-widget .tv-feed-widget) {
  height: 910px !important;
  min-height: 910px !important;
  overflow: auto !important;
}

:global(.fundamental-data-widget .tv-feed-widget__body) {
  height: auto !important;
  min-height: 850px !important;
  overflow: auto !important;
}
</style>