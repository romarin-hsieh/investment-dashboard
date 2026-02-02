<template>
  <div class="fear-greed-chart-container">
    <div class="widget-header">
      <h3>Fear & Greed Index</h3>
      <div class="chart-info">
        <span class="chart-description">Market Sentiment Analysis by Zeiierman</span>
      </div>
    </div>
    <div class="fear-greed-widget" :id="widgetId" ref="container">
      <!-- TradingView Widget BEGIN -->
      <div class="tradingview-widget-container" style="height:100%;width:100%">
        <div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
        {
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
            "PUB;Fear%1%26%1Greed%1Index%1%28Zeiierman%29"
          ],
          "hide_top_toolbar": false,
          "hide_legend": false,
          "save_image": false,
          "backgroundColor": "#ffffff",
          "gridColor": "rgba(46, 46, 46, 0.06)",
          "hide_volume": true,
          "support_host": "https://www.tradingview.com"
        }
        </script>
      </div>
      <!-- TradingView Widget END -->
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewFearGreedChart',
  props: {
    symbol: {
      type: String,
      default: 'SPX'
    },
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
    }
  },
  data() {
    return {
      loaded: false,
      error: false,
      widgetId: `fear-greed-chart-${Date.now()}`
    }
  },
  mounted() {
    this.loaded = true
    console.log('TradingView Fear & Greed Chart (Zeiierman) loaded')
  }
}
</script>

<style scoped>
.fear-greed-chart-container {
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

.fear-greed-widget {
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
  
  .fear-greed-widget {
    height: 350px;
  }
}

@media (max-width: 480px) {
  .fear-greed-chart-container {
    padding: 0.75rem;
    margin: 0 -0.25rem 2rem -0.25rem;
  }
  
  .fear-greed-widget {
    height: 300px;
  }
}
</style>