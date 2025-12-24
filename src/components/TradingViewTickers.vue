<template>
  <div class="tickers-container">
    <div class="widget-header">
      <h3>Major Market Indices</h3>
    </div>
    <div class="tickers-widget" :id="widgetId" ref="container">
      <div v-if="!loaded && !error" class="tickers-loading">
        <div class="loading-spinner"></div>
        <span>Loading market indices...</span>
      </div>
      
      <div v-if="error" class="tickers-error">
        <span>⚠️ Failed to load market indices</span>
        <button @click="retry" class="retry-btn">Retry</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewTickers',
  props: {
    colorTheme: {
      type: String,
      default: 'light'
    },
    locale: {
      type: String,
      default: 'en'
    },
    isTransparent: {
      type: Boolean,
      default: true
    },
    showSymbolLogo: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      loaded: false,
      error: false,
      widgetId: `tickers-${Date.now()}`
    }
  },
  mounted() {
    this.loadTickers()
  },
  methods: {
    async loadTickers() {
      this.loaded = false
      this.error = false

      try {
        await this.$nextTick()
        this.createTickers()
      } catch (err) {
        console.error('Failed to load tickers:', err)
        this.error = true
      }
    },

    createTickers() {
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
        "symbols": [
          {
            "proName": "FOREXCOM:SPXUSD",
            "title": "S&P 500 Index"
          },
          {
            "proName": "FOREXCOM:NSXUSD",
            "title": "US 100 Cash CFD"
          },
          {
            "proName": "CRYPTOCAP:RUSSELL",
            "title": "US Russel 2000"
          },
          {
            "proName": "THINKMARKETS:US30",
            "title": "Dow Jone Index"
          },
          {
            "proName": "TVC:GOLD",
            "title": "GOLD"
          },
          {
            "proName": "EASYMARKETS:OILUSD",
            "title": "OIL"
          }
        ],
        "colorTheme": this.colorTheme,
        "locale": this.locale,
        "largeChartUrl": "",
        "isTransparent": this.isTransparent,
        "showSymbolLogo": this.showSymbolLogo
      }

      // 創建腳本
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-tickers.js'
      script.async = true
      script.innerHTML = JSON.stringify(config)

      // 設定載入事件
      script.onload = () => {
        this.loaded = true
        console.log('TradingView Tickers loaded successfully')
      }

      script.onerror = () => {
        this.error = true
        console.error('TradingView Tickers failed to load')
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
      await this.loadTickers()
    }
  }
}
</script>

<style scoped>
.tickers-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  overflow: hidden;
  position: relative;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.widget-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.tickers-widget {
  height: 70px;
  min-height: 70px;
  max-height: 70px;
  width: 100%;
  position: relative;
  overflow: hidden;
}

/* Loading 狀態 */
.tickers-loading {
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
.tickers-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 100%;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
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

/* TradingView Widget 樣式覆蓋 - 限制在容器内並防止溢出 */
:global(.tickers-container .tradingview-widget-container) {
  width: 100% !important;
  height: 70px !important;
  min-height: 70px !important;
  max-height: 70px !important;
  overflow: hidden !important;
  position: relative !important;
  box-sizing: border-box !important;
}

:global(.tickers-container .tradingview-widget-container__widget) {
  width: 100% !important;
  height: 70px !important;
  min-height: 70px !important;
  max-height: 70px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

/* 特定針對 TradingView embed widget wrapper body 的高度調整 */
:global(.tickers-container .tv-embed-widget-wrapper__body.js-embed-widget-body) {
  height: 70px !important;
  min-height: 70px !important;
  max-height: 70px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

/* 更具體的選擇器確保樣式被應用並防止溢出 */
:global(.tradingview-widget-container .tv-embed-widget-wrapper__body) {
  height: 70px !important;
  min-height: 70px !important;
  max-height: 70px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

/* 防止任何子元素溢出容器 */
:global(.tickers-container *) {
  box-sizing: border-box !important;
}

:global(.tickers-container .tradingview-widget-container *) {
  max-width: 100% !important;
  overflow: hidden !important;
}

/* 響應式設計 */
@media (max-width: 480px) {
  .tickers-container {
    padding: 0.75rem;
    margin: 0 -0.25rem 2rem -0.25rem;
  }
}
</style>