<template>
  <div class="vix-container">
    <div class="widget-header">
      <h3>VIX Volatility Index</h3>
      <div class="vix-info">
        <span class="vix-description">Market Fear & Greed Indicator</span>
      </div>
    </div>
    <div class="vix-widget" :id="widgetId" ref="container">
      <div v-if="!loaded && !error" class="vix-loading">
        <div class="loading-spinner"></div>
        <span>Loading VIX data...</span>
      </div>
      
      <div v-if="error" class="vix-error">
        <span>⚠️ Failed to load VIX data</span>
        <button @click="retry" class="retry-btn">Retry</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewVIX',
  props: {
    colorTheme: {
      type: String,
      default: 'light'
    },
    height: {
      type: String,
      default: '400px'
    },
    locale: {
      type: String,
      default: 'en'
    },
    isTransparent: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loaded: false,
      error: false,
      widgetId: `vix-widget-${Date.now()}`
    }
  },
  mounted() {
    this.loadVIX()
  },
  methods: {
    async loadVIX() {
      this.loaded = false
      this.error = false

      try {
        await this.$nextTick()
        this.createVIX()
      } catch (err) {
        console.error('Failed to load VIX widget:', err)
        this.error = true
      }
    },

    createVIX() {
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

      // 創建配置 - 使用 Symbol Overview Widget 顯示 VIX
      const config = {
        "lineWidth": 2,
        "lineType": 0,
        "chartType": "area",
        "showVolume": false,
        "fontColor": "rgb(106, 109, 120)",
        "gridLineColor": "rgba(46, 46, 46, 0.06)",
        "backgroundColor": "#ffffff",
        "widgetFontColor": "#333333",
        "upColor": "#f7525f",
        "downColor": "#22ab94",
        "borderUpColor": "#f7525f",
        "borderDownColor": "#22ab94",
        "wickUpColor": "#f7525f",
        "wickDownColor": "#22ab94",
        "colorTheme": this.colorTheme,
        "isTransparent": this.isTransparent,
        "locale": this.locale,
        "chartOnly": false,
        "scalePosition": "right",
        "scaleMode": "Normal",
        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
        "valuesTracking": "1",
        "changeMode": "price-and-percent",
        "symbols": [["VIX", "CBOE:VIX|1D"]],
        "dateRanges": ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"],
        "fontSize": "10",
        "headerFontSize": "medium",
        "autosize": true,
        "width": "100%",
        "height": "100%",
        "noTimeScale": false,
        "hideDateRanges": false,
        "showMA": true,
        "maLength": 20,
        "maLineColor": "#2962FF",
        "maLineWidth": 1,
        "hideMarketStatus": false,
        "hideSymbolLogo": false
      }

      // 創建腳本
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
      script.async = true
      script.innerHTML = JSON.stringify(config)

      // 設定載入事件
      script.onload = () => {
        this.loaded = true
        console.log('TradingView VIX widget loaded successfully')
      }

      script.onerror = () => {
        this.error = true
        console.error('TradingView VIX widget failed to load')
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
      await this.loadVIX()
    }
  }
}
</script>

<style scoped>
.vix-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
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

.vix-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.vix-description {
  font-size: 0.85rem;
  color: #6c757d;
  font-style: italic;
}

.vix-widget {
  height: 400px;
  width: 100%;
  position: relative;
}

/* Loading 狀態 */
.vix-loading {
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
.vix-error {
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

/* TradingView Widget 樣式覆蓋 */
:global(.tradingview-widget-container) {
  width: 100% !important;
  height: 400px !important;
}

:global(.tradingview-widget-container__widget) {
  width: 100% !important;
  height: 400px !important;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .widget-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .vix-info {
    align-items: flex-start;
  }
  
  .vix-widget {
    height: 350px;
  }
}

@media (max-width: 480px) {
  .vix-container {
    padding: 0.75rem;
    margin: 0 -0.25rem 2rem -0.25rem;
  }
  
  .vix-widget {
    height: 300px;
  }
}
</style>