<template>
  <div>
    <div class="widget-header">
      <h3>Fear & Greed Index</h3>
      <div class="chart-info">
        <span class="chart-description">Zeiierman's Fear & Greed Index</span>
      </div>
    </div>
    <div class="zeiierman-widget" :id="widgetId" ref="container">
      <div v-if="!loaded && !error" class="chart-loading">
        <div class="loading-spinner"></div>
        <span>Loading Fear & Greed Index...</span>
      </div>
      
      <div v-if="error" class="chart-error">
        <span>⚠️ Failed to load Fear & Greed Index</span>
        <button @click="retry" class="retry-btn">Retry</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ZeiiermanFearGreedIndex',
  props: {
    height: {
      type: String,
      default: '400px'
    }
  },
  data() {
    return {
      loaded: false,
      error: false,
      widgetId: `zeiierman-fear-greed-${Date.now()}`
    }
  },
  mounted() {
    this.loadZeiiermanChart()
  },
  methods: {
    async loadZeiiermanChart() {
      this.loaded = false
      this.error = false

      try {
        await this.$nextTick()
        this.createZeiiermanChart()
      } catch (err) {
        console.error('Failed to load Zeiierman Fear & Greed Chart:', err)
        this.error = true
      }
    },

    createZeiiermanChart() {
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

      // 創建配置 - Advanced Chart with Zeiierman Fear & Greed Index
      const config = {
        "autosize": true,
        "symbol": "SPX",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "allow_symbol_change": false,
        "calendar": false,
        "studies": [
          "PUB;Fear%20%26%20Greed%20Index%20%28Zeiierman%29@tv-basicstudies-1"
        ],
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "backgroundColor": "#ffffff",
        "gridColor": "rgba(46, 46, 46, 0.06)",
        "hide_volume": true,
        "support_host": "https://www.tradingview.com",
        "container_id": this.widgetId,
        "width": "100%",
        "height": "100%"
      }

      // 創建腳本
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
      script.async = true
      script.innerHTML = JSON.stringify(config)

      // 設定載入事件
      script.onload = () => {
        this.loaded = true
        console.log('Zeiierman Fear & Greed Chart loaded successfully')
      }

      script.onerror = () => {
        this.error = true
        console.error('Zeiierman Fear & Greed Chart failed to load')
      }

      // 添加腳本到 widget 容器
      widgetContent.appendChild(script)

      // 設定超時保護
      setTimeout(() => {
        if (!this.loaded && !this.error) {
          this.loaded = true
        }
      }, 10000)
    },

    async retry() {
      await this.loadZeiiermanChart()
    }
  }
}
</script>

<style scoped>
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

.chart-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.chart-description {
  font-size: 0.85rem;
  color: #6c757d;
  font-style: italic;
}

.zeiierman-widget {
  height: 400px;
  width: 100%;
  position: relative;
}

/* Loading 狀態 */
.chart-loading {
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
.chart-error {
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
  
  .chart-info {
    align-items: flex-start;
  }
  
  .zeiierman-widget {
    height: 350px;
  }
}

@media (max-width: 480px) {
  .zeiierman-widget {
    height: 300px;
  }
}
</style>