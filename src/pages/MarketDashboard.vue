<template>
  <div class="market-dashboard">
    <h2>Market Overview</h2>
    <p class="text-muted mb-3">Global market indices, volatility metrics, and trending market news</p>

    <!-- 載入狀態顯示骨架屏 -->
    <div v-if="loading" class="loading-with-skeleton">
      <MarketOverviewSkeleton />
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="error" class="error">
      <p class="text-danger">{{ error }}</p>
      <button @click="refresh" class="btn btn-secondary">Retry</button>
    </div>

    <!-- 正常內容 -->
    <div v-else>
      <!-- Major Market Indices - 高優先級 -->
      <div class="widget-container-ticker">
        <div class="widget-header">
          <h3>Market Index</h3>
        </div>
        <LazyTradingViewWidget
          widget-type="Market Index"
          :config="tickersConfig"
          script-url="https://s3.tradingview.com/external-embedding/embed-widget-tickers.js"
          height="100px"
          :priority="1"
        />
      </div>

      <!-- Top Stories - 移到 Market Index 下方 -->
      <div class="widget-container">
        <div class="widget-header">
          <h3>Top Stories</h3>
        </div>
        <LazyTradingViewWidget
          :config="topStoriesConfig"
          script-url="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js"
          height="650px"
          :priority="2"
          skeleton-type="list"
        />
      </div>

      <!-- Fear & Greed Gauge - 高優先級 (不是 TradingView widget) -->
      <ZeiiermanFearGreedGauge />

      <!-- VIX Index - 移到 Fear & Greed Index 下方 -->
      <div class="widget-container vix-container">
        <div class="widget-header">
          <h3>VIX Index (Volatility Index)</h3>
        </div>
        <VixWidget :key="`vix-${vixKey}`" />
      </div>

      <!-- Smart Money Sector Rotation -->
      <div class="widget-container">
        <SectorRotationChart />
      </div>

      <!-- Stock Market Insight -->
      <div class="widget-container">
        <div class="widget-header">
          <h3>Market Insight</h3>
        </div>
        
        <div class="insight-grid">
          <div class="insight-section">
            <div class="section-header">
              <h4>Market Daily Insight (MA5)</h4>
            </div>
            <LazyTradingViewWidget
              widget-type="Market Daily Insight"
              :config="dailyConfig"
              script-url="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
              height="600px"
              :priority="2"
            />
          </div>

          <div class="insight-section weekly-section">
            <div class="section-header">
              <h4>Market Weekly Insight (MA4)</h4>
            </div>
            <LazyTradingViewWidget
              widget-type="Market Weekly Insight"
              :config="weeklyConfig"
              script-url="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
              height="600px"
              :priority="3"
            />
          </div>
        </div>
      </div>

      <!-- Stock Heatmap - 低優先級 -->
      <div class="widget-container">
        <div class="widget-header">
          <h3>Stock Heatmap</h3>
        </div>
        <LazyTradingViewWidget
          widget-type="Stock Heatmap"
          :config="heatmapConfig"
          script-url="https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js"
          height="500px"
          :priority="3"
        />
      </div>

      <!-- 移除 PerformanceMonitor，避免載入股票技術指標數據 -->
    </div>
  </div>
</template>

<script>
import LazyTradingViewWidget from '@/components/LazyTradingViewWidget.vue'
import VixWidget from '@/components/VixWidget.vue'
import ZeiiermanFearGreedGauge from '@/components/ZeiiermanFearGreedGauge.vue'
import MarketOverviewSkeleton from '@/components/MarketOverviewSkeleton.vue'
import { useTheme } from '@/composables/useTheme.js'
import { defineAsyncComponent } from 'vue'

export default {
  name: 'MarketDashboard',
  components: {
    LazyTradingViewWidget,
    VixWidget,
    ZeiiermanFearGreedGauge,
    MarketOverviewSkeleton,
    SectorRotationChart: defineAsyncComponent(() => import('@/components/SectorRotationChart.vue'))
  },
  setup() {
    const { theme } = useTheme()
    return { theme }
  },
  data() {
    return {
      loading: true,
      error: null,
      vixKey: Date.now() // 添加 VIX 專用的 key
    }
  },
  mounted() {
    // 頁面載入時滾動到頂部
    this.scrollToTop()
    this.initializePage()
  },
  watch: {
    $route() {
      // 當路由改變時，滾動到頂部
      this.scrollToTop()
    },
    theme() {
      // Theme changed, re-render VIX widget
      this.vixKey = Date.now()
    }
  },
  methods: {
    async initializePage() {
      try {
        // 模擬初始化過程
        await new Promise(resolve => setTimeout(resolve, 800))
        this.loading = false
      } catch (err) {
        this.error = String(err)
        this.loading = false
      }
    },
    async refresh() {
      this.loading = true
      this.error = null
      this.vixKey = Date.now() // 強制重新載入 VIX widget
      await this.initializePage()
    },

    // 滾動到頁面頂部
    scrollToTop() {
      // 使用 nextTick 確保 DOM 已更新
      this.$nextTick(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        })
        
        // 備用方案：立即滾動
        setTimeout(() => {
          window.scrollTo(0, 0)
        }, 100)
      })
    },


  },
  computed: {
    tickersConfig() {
      const isDark = this.theme === 'dark';
      return {
        "symbols": [
          {
            "proName": "FOREXCOM:SPXUSD",
            "title": "S&P 500 Index"
          },
          {
            "proName": "FOREXCOM:NSXUSD",
            "title": "NASDAQ 100 Index"
          },
          {
            "proName": "OPOFINANCE:DJIUSD",
            "title": "Dow Jone Index"
          },
          {
            "proName": "CAPITALCOM:RTY",
            "title": "Russel 2000"
          },
          {
            "proName": "INDEX:BTCUSD",
            "title": "BTC"
          },
          {
            "proName": "OANDA:XAUUSD",
            "title": "GOLD"
          }
        ],
        "colorTheme": isDark ? "dark" : "light",
        "locale": "en",
        "largeChartUrl": "",
        "isTransparent": true,
        "showSymbolLogo": true
      }
    },

    topStoriesConfig() {
      const isDark = this.theme === 'dark';
      return {
        "displayMode": "regular",
        "feedMode": "market",
        "colorTheme": isDark ? "dark" : "light",
        "isTransparent": true,
        "locale": "en",
        "market": "stock",
        "width": "100%",
        "height": "100%"
      }
    },

    dailyConfig() {
      const isDark = this.theme === 'dark';
      const commonColors = {
          bg: isDark ? '#2C2C2C' : '#ffffff',
          text: isDark ? '#E6E1DC' : '#0F0F0F',
          grid: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(46, 46, 46, 0.06)',
      }
      return {
        "lineWidth": 2,
        "lineType": 0,
        "chartType": "candlesticks",
        "showVolume": true,
        "fontColor": "rgb(106, 109, 120)",
        "gridLineColor": commonColors.grid,
        "volumeUpColor": "rgba(34, 171, 148, 0.5)",
        "volumeDownColor": "rgba(247, 82, 95, 0.5)",
        "backgroundColor": commonColors.bg,
        "widgetFontColor": commonColors.text,
        "upColor": "#22ab94",
        "downColor": "#f7525f",
        "borderUpColor": "#22ab94",
        "borderDownColor": "#f7525f",
        "wickUpColor": "#22ab94",
        "wickDownColor": "#f7525f",
        "colorTheme": isDark ? "dark" : "light",
        "isTransparent": true,
        "locale": "en",
        "chartOnly": false,
        "scalePosition": "right",
        "scaleMode": "Normal",
        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
        "valuesTracking": "1",
        "changeMode": "price-and-percent",
        "symbols": [["VANTAGE:SP500|6M"],["NASDAQ:NDX|6M"],["OPOFINANCE:DJIUSD|6M"],["CAPITALCOM:RTY|6M"],["INDEX:BTCUSD|6M"],["TVC:GOLD|6M"]],
        "dateRanges": ["6m|1D"],
        "fontSize": "10",
        "headerFontSize": "medium",
        "autosize": true,
        "width": "100%",
        "height": "100%",
        "noTimeScale": false,
        "hideDateRanges": false,
        "showMA": true,
        "maLength": "5",
        "maLineColor": "#2962FF",
        "maLineWidth": 1,
        "hideMarketStatus": false,
        "hideSymbolLogo": false
      }
    },

    weeklyConfig() {
      const isDark = this.theme === 'dark';
      const commonColors = {
          bg: isDark ? '#2C2C2C' : '#ffffff',
          text: isDark ? '#E6E1DC' : '#0F0F0F',
          grid: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(46, 46, 46, 0.06)',
      }
      return {
        "lineWidth": 2,
        "lineType": 0,
        "chartType": "candlesticks",
        "showVolume": true,
        "fontColor": "rgb(106, 109, 120)",
        "gridLineColor": commonColors.grid,
        "volumeUpColor": "rgba(34, 171, 148, 0.5)",
        "volumeDownColor": "rgba(247, 82, 95, 0.5)",
        "backgroundColor": commonColors.bg,
        "widgetFontColor": commonColors.text,
        "upColor": "#22ab94",
        "downColor": "#f7525f",
        "borderUpColor": "#22ab94",
        "borderDownColor": "#f7525f",
        "wickUpColor": "#22ab94",
        "wickDownColor": "#f7525f",
        "colorTheme": isDark ? "dark" : "light",
        "isTransparent": true,
        "locale": "en",
        "chartOnly": false,
        "scalePosition": "right",
        "scaleMode": "Normal",
        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
        "valuesTracking": "1",
        "changeMode": "price-and-percent",
        "symbols": [["VANTAGE:SP500|6M"],["NASDAQ:NDX|6M"],["OPOFINANCE:DJIUSD|6M"],["CAPITALCOM:RTY|6M"],["INDEX:BTCUSD|6M"],["TVC:GOLD|6M"]],
        "dateRanges": ["6m|1W"],
        "fontSize": "10",
        "headerFontSize": "medium",
        "autosize": true,
        "width": "100%",
        "height": "100%",
        "noTimeScale": false,
        "hideDateRanges": false,
        "showMA": true,
        "maLength": "4",
        "maLineColor": "#2962FF",
        "maLineWidth": 1,
        "hideMarketStatus": false,
        "hideSymbolLogo": false
      }
    },

    heatmapConfig() {
      const isDark = this.theme === 'dark';
      return {
        "exchanges": [],
        "dataSource": "SPX500",
        "grouping": "sector",
        "blockSize": "market_cap_basic",
        "blockColor": "change",
        "locale": "en",
        "symbolUrl": "",
        "colorTheme": isDark ? "dark" : "light",
        "hasTopBar": false,
        "isDataSetEnabled": false,
        "isZoomEnabled": true,
        "hasSymbolTooltip": true,
        "width": "100%",
        "height": "100%"
      }
    }
  }
}
</script>

<style scoped>
.market-dashboard {
  padding: 0;
  overflow-x: hidden;
  max-width: 100%;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.text-muted {
  color: var(--text-muted);
}

.loading-with-skeleton {
  /* 骨架屏載入容器 */
}

.error {
  text-align: center;
  padding: 2rem;
  background-color: var(--bg-card);
  border: 1px solid var(--error-color);
  border-radius: 8px;
  margin: 1rem 0;
  color: var(--error-color);
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border-color);
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

/* 統一的 Widget 容器樣式 - 限定在 market-dashboard 內 */
.market-dashboard .widget-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1rem;
  margin-bottom: 2rem;
  overflow: hidden;
  position: relative;
  box-shadow: var(--shadow-md);
}

/* Ticker 專用的 Widget 容器樣式 - 限定在 market-dashboard 內 */
.market-dashboard .widget-container-ticker {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1rem;
  margin-bottom: 2rem;
  overflow: hidden;
  position: relative;
  box-shadow: var(--shadow-md);
}

.market-dashboard .widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.market-dashboard .widget-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.market-dashboard .insight-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  align-items: start;
}

.market-dashboard .insight-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 第二個 insight-section 上方添加間隔線 */
.market-dashboard .weekly-section {
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
}

.market-dashboard .section-header {
  padding-bottom: 0.5rem;
}

.market-dashboard .section-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
}

/* VIX 專用容器樣式 - 限定在 market-dashboard 內 */
.market-dashboard .vix-container {
  min-height: 600px; /* 整體容器 600px */
  overflow: hidden; 
}

/* 響應式設計 */
@media (max-width: 768px) {
  .market-dashboard .widget-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .market-dashboard .widget-container {
    padding: 0.75rem;
    margin: 0 -0.25rem 2rem -0.25rem;
  }
  
  .market-dashboard .insight-grid {
    gap: 0.75rem;
  }
}
</style>