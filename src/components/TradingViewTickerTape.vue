<template>
  <div class="widget-container-ticker">
    <div class="widget-header">
      <h3>Market Index</h3>
      <span class="ticker-info">Live market data</span>
    </div>
    <div class="ticker-tape-widget" ref="container">
      <!-- TradingView Ticker Tape will be inserted here -->
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradingViewTickerTape',
  mounted() {
    this.loadTickerTape()
  },
  methods: {
    loadTickerTape() {
      const container = this.$refs.container
      if (!container) return

      // 使用新的 TradingView Tickers Widget
      container.innerHTML = `
        <!-- TradingView Widget BEGIN -->
        <div class="tradingview-widget-container">
          <div class="tradingview-widget-container__widget"></div>
          <div class="tradingview-widget-copyright">
            <a href="https://www.tradingview.com/markets/" rel="noopener nofollow" target="_blank">
              <span class="blue-text">Markets today</span>
            </a>
            <span class="trademark"> by TradingView</span>
          </div>
          <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-tickers.js" async>
          {
            "symbols": [
              {"proName": "FOREXCOM:SPXUSD","title": "S&P 500 Index"},
              {"proName": "NASDAQ:NDX","title": "NASDAQ 100 Index"},
              {"proName": "OPOFINANCE:DJIUSD","title": "DJI 30 Index"},
              {"proName": "CAPITALCOM:RTY","title": "Russel 2000 Index"},
              {"proName": "CRYPTO:BTCUSD","title": "BTC"},
              {"proName": "TVC:GOLD","title": "Gold"}
            ],
            "colorTheme": "dark",
            "locale": "en",
            "largeChartUrl": "",
            "isTransparent": true,
            "showSymbolLogo": true
          }
          <\/script>
        </div>
        <!-- TradingView Widget END -->
      `
    }
  }
}
</script>

<style scoped>
.widget-container-ticker {
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

.ticker-info {
  font-size: 0.8rem;
  color: #666;
  font-style: italic;
}

.ticker-tape-widget {
  min-height: 120px;
  overflow: hidden;
  position: relative;
}

/* TradingView Widget 樣式 */
.ticker-tape-widget .tradingview-widget-container {
  width: 100%;
  height: 100%;
}

.ticker-tape-widget .tradingview-widget-container__widget {
  width: 100%;
  height: 100%;
}

.ticker-tape-widget .tradingview-widget-copyright {
  font-size: 11px;
  color: #999;
  text-align: center;
  margin-top: 5px;
}

.ticker-tape-widget .blue-text {
  color: #2962FF;
}

.ticker-tape-widget .trademark {
  color: #999;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .widget-container-ticker {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .widget-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .widget-header h3 {
    font-size: 0.9rem;
  }
  
  .ticker-info {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .widget-container-ticker {
    padding: 0.5rem;
    margin: 0 -0.25rem 1rem -0.25rem;
  }
}
</style>