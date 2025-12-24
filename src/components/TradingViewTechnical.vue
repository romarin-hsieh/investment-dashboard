<template>
  <div class="tradingview-technical">
    <div class="tradingview-widget-container" :id="widgetId">
      <div class="tradingview-widget-container__widget"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewTechnical',
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
  computed: {
    widgetId() {
      return `tradingview-technical-${this.symbol}`
    }
  },
  mounted() {
    this.loadWidget()
  },
  methods: {
    loadWidget() {
      // 等待 DOM 完全載入
      this.$nextTick(() => {
        const container = document.getElementById(this.widgetId)
        if (!container) {
          console.error('TradingView container not found:', this.widgetId)
          return
        }

        const widgetDiv = container.querySelector('.tradingview-widget-container__widget')
        if (!widgetDiv) {
          console.error('TradingView widget div not found')
          return
        }

        // 清除現有內容
        widgetDiv.innerHTML = ''

        // 創建 TradingView widget 配置
        const config = {
          "colorTheme": "light",
          "displayMode": "single",
          "isTransparent": false,
          "locale": "en",
          "interval": "1D", // 使用日線圖
          "disableInterval": false,
          "width": "100%",
          "height": "100%",
          "symbol": `${this.exchange}:${this.symbol}`,
          "showIntervalTabs": true
        }

        // 載入 TradingView 腳本
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js'
        script.async = true
        script.innerHTML = JSON.stringify(config)
        
        // 添加載入完成事件
        script.onload = () => {
          console.log('TradingView technical-analysis loaded for', this.symbol)
        }
        
        script.onerror = () => {
          console.error('Failed to load TradingView technical script for', this.symbol)
        }
        
        widgetDiv.appendChild(script)
      })
    }
  }
}
</script>

<style scoped>
.tradingview-technical {
  width: 100%;
  height: 100%;
  min-height: 480px; /* 使用官方建議的高度 */
}

.tradingview-widget-container {
  width: 100%;
  height: 100%;
  min-height: 480px; /* 使用官方建議的高度 */
}

/* 確保 TradingView widget 容器有正確的大小 */
.tradingview-widget-container__widget {
  width: 100% !important;
  height: 480px !important; /* 使用官方建議的高度 */
  min-height: 480px !important;
}

/* 全域樣式覆蓋 TradingView 內部容器 */
:global(.tv-widget-chart__container-wrapper) {
  width: 100% !important;
  height: 480px !important; /* 使用官方建議的高度 */
  min-height: 480px !important;
}

:global(.tradingview-widget-container iframe) {
  width: 100% !important;
  height: 480px !important; /* 使用官方建議的高度 */
  min-height: 480px !important;
}
</style>