<template>
  <div class="tradingview-timeline">
    <div class="tradingview-widget-container" :id="widgetId">
      <div class="tradingview-widget-container__widget"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewTimeline',
  props: {
    symbol: {
      type: String,
      required: true
    }
  },
  computed: {
    widgetId() {
      return `tradingview-timeline-${this.symbol}`
    }
  },
  mounted() {
    this.loadWidget()
  },
  methods: {
    loadWidget() {
      // 清除現有的 widget
      const container = document.getElementById(this.widgetId)
      if (container) {
        const widgetDiv = container.querySelector('.tradingview-widget-container__widget')
        if (widgetDiv) {
          widgetDiv.innerHTML = ''
        }
      }

      // 創建新的 script 標籤
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js'
      script.async = true
      
      const config = {
        "feedMode": "symbol",
        "symbol": this.symbol,
        "isTransparent": false,
        "displayMode": "regular",
        "width": "100%",
        "height": "100%",
        "colorTheme": "light",
        "locale": "en"
      }
      
      script.innerHTML = JSON.stringify(config)
      
      // 添加到容器
      const widgetDiv = container.querySelector('.tradingview-widget-container__widget')
      if (widgetDiv) {
        widgetDiv.appendChild(script)
      }
    }
  }
}
</script>

<style scoped>
.tradingview-timeline {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.tradingview-widget-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

/* 確保 TradingView widget 容器有正確的大小 */
.tradingview-widget-container__widget {
  width: 100% !important;
  height: 500px !important;
  min-height: 500px !important;
}

/* 全域樣式覆蓋 TradingView 內部容器 */
:global(.tv-widget-chart__container-wrapper) {
  width: 100% !important;
  height: 500px !important;
  min-height: 500px !important;
}

:global(.tradingview-widget-container iframe) {
  width: 100% !important;
  height: 500px !important;
  min-height: 500px !important;
}
</style>