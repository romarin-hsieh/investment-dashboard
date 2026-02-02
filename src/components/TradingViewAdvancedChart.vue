<template>
  <div class="tradingview-advanced-chart">
    <div class="tradingview-widget-container" :id="widgetId">
      <div class="tradingview-widget-container__widget"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewAdvancedChart',
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
      return `tradingview-advanced-${this.symbol}`
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
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
      script.async = true
      
      const config = {
        "allow_symbol_change": true,
        "calendar": false,
        "details": true,
        "hide_side_toolbar": true,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_volume": false,
        "hotlist": false,
        "interval": "D",
        "locale": "en",
        "save_image": true,
        "style": "1",
        "symbol": `${this.exchange}:${this.symbol}`,
        "theme": "dark",
        "timezone": "Etc/UTC",
        "backgroundColor": "#0F0F0F",
        "gridColor": "rgba(242, 242, 242, 0.06)",
        "watchlist": [],
        "withdateranges": false,
        "compareSymbols": [],
        "studies": ["STD;Bollinger_Bands","STD;Divergence%1Indicator","STD;Money_Flow","STD;CCI"],
        "autosize": true
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
.tradingview-advanced-chart {
  width: 100%;
  height: 500px;
  min-height: 500px;
}

.tradingview-widget-container {
  width: 100%;
  height: 500px;
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