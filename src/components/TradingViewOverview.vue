<template>
  <div class="tradingview-overview" :id="widgetId" ref="container">
    <!-- TradingView widget 會直接插入到這裡 -->
  </div>
</template>

<script>
export default {
  name: 'TradingViewOverview',
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
      return `tradingview-overview-${this.symbol}`
    }
  },
  mounted() {
    this.loadWidget()
  },
  methods: {
    loadWidget() {
      // 等待 DOM 完全載入
      this.$nextTick(() => {
        const container = this.$refs.container
        if (!container) {
          console.error('TradingView container not found:', this.widgetId)
          return
        }

        // 清除現有內容
        container.innerHTML = ''

        // 創建 TradingView widget 配置 - 與 FastTradingViewWidget 完全相同
        const config = {
          "lineWidth": 2,
          "lineType": 0,
          "chartType": "candlesticks",
          "showVolume": true,
          "fontColor": "rgb(106, 109, 120)",
          "gridLineColor": "rgba(242, 242, 242, 0.06)",
          "volumeUpColor": "rgba(34, 171, 148, 0.5)",
          "volumeDownColor": "rgba(247, 82, 95, 0.5)",
          "backgroundColor": "#FFFFFF",
          "widgetFontColor": "#333333",
          "upColor": "#22ab94",
          "downColor": "#f7525f",
          "borderUpColor": "#22ab94",
          "borderDownColor": "#f7525f",
          "wickUpColor": "#22ab94",
          "wickDownColor": "#f7525f",
          "colorTheme": "light",
          "isTransparent": false,
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

        // 載入 TradingView 腳本 - 直接添加到容器
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
        script.async = true
        script.innerHTML = JSON.stringify(config)
        
        // 添加載入完成事件
        script.onload = () => {
          console.log('TradingView symbol-overview loaded for', this.symbol)
        }
        
        script.onerror = () => {
          console.error('Failed to load TradingView script for', this.symbol)
        }
        
        container.appendChild(script)
      })
    }
  }
}
</script>

<style scoped>
.tradingview-overview {
  width: 100%;
  height: 100%;
  min-height: 500px; /* 增加到 500px 確保 X-axis 顯示 */
  position: relative;
}

/* 移除所有複雜的 CSS 覆蓋，讓 TradingView 自己處理樣式 */
</style>