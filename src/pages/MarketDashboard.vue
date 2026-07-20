<template>
  <div class="market-dashboard">
    <header class="page-masthead">
      <span class="masthead-kicker">{{ $t('market.asOf') }} {{ todayStr }}</span>
      <h2 class="masthead-title">{{ $t('market.title') }}</h2>
      <p class="masthead-subtitle">{{ $t('market.subtitle') }}</p>
    </header>

    <!-- 載入狀態顯示骨架屏 -->
    <div v-if="loading" class="loading-with-skeleton">
      <MarketOverviewSkeleton />
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="error" class="error">
      <p class="text-danger">{{ error }}</p>
      <button @click="refresh" class="btn btn-secondary">{{ $t('market.retry') }}</button>
    </div>

    <!-- 正常內容 -->
    <div v-else>
      <!-- Major Market Indices - 高優先級 -->
      <div class="widget-container-ticker">
        <div class="widget-header">
          <h3>{{ $t('market.marketIndex') }}</h3>
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
          <h3>{{ $t('market.topStories') }}</h3>
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
          <h3>{{ $t('market.vixIndex') }}</h3>
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
          <h3>{{ $t('market.marketInsight') }}</h3>
        </div>
        
        <div class="insight-grid">
          <div class="insight-section">
            <div class="section-header">
              <h4>{{ $t('market.dailyInsight') }}</h4>
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
              <h4>{{ $t('market.weeklyInsight') }}</h4>
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
          <h3>{{ $t('market.stockHeatmap') }}</h3>
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
import { useTheme } from '@/composables/useTheme'
import { getToken } from '@/utils/designTokens'
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
    todayStr() {
      const locale = this.$i18n && this.$i18n.locale === 'zh-TW' ? 'zh-TW' : 'en-US'
      try {
        return new Date().toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
      } catch (e) {
        return new Date().toLocaleDateString()
      }
    },
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
      // Same pattern as StockDetail's chart configs (see PR-A1.2). Tokens
      // recomputed on theme change because `computed` re-runs when
      // `this.theme` changes.
      const upColor   = getToken('--chart-up');
      const downColor = getToken('--chart-down');
      const commonColors = {
          bg:   getToken('--bg-card'),
          text: getToken('--text-primary'),
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
        "upColor":         upColor,
        "downColor":       downColor,
        "borderUpColor":   upColor,
        "borderDownColor": downColor,
        "wickUpColor":     upColor,
        "wickDownColor":   downColor,
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
        "maLineColor": getToken('--blue-500'),
        "maLineWidth": 1,
        "hideMarketStatus": false,
        "hideSymbolLogo": false
      }
    },

    weeklyConfig() {
      const isDark = this.theme === 'dark';
      const upColor   = getToken('--chart-up');
      const downColor = getToken('--chart-down');
      const commonColors = {
          bg:   getToken('--bg-card'),
          text: getToken('--text-primary'),
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
        "upColor":         upColor,
        "downColor":       downColor,
        "borderUpColor":   upColor,
        "borderDownColor": downColor,
        "wickUpColor":     upColor,
        "wickDownColor":   downColor,
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
        "maLineColor": getToken('--blue-500'),
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

/* Editorial masthead — a museum wall-label entry point, not a timid UA-default
   heading. Title carries the page; one Florentine-blue hairline rule states the
   brand once; the kicker reads as a tracked plaque caption. */
.page-masthead {
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-8);
  border-bottom: 1px solid var(--primary-color);
}

.masthead-kicker {
  display: block;
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--primary-text);
  margin-bottom: var(--space-2);
}

.masthead-title {
  font-size: var(--text-3xl);
  font-weight: var(--weight-extrabold);
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--text-primary);
  margin: 0;
}

.masthead-subtitle {
  font-size: var(--text-base);
  color: var(--text-muted);
  max-width: 60ch;
  margin: var(--space-2) 0 0;
}

@media (max-width: 900px) {
  .masthead-title {
    font-size: var(--text-2xl);
  }
}

.loading-with-skeleton {
  /* 骨架屏載入容器 */
}

.error {
  text-align: center;
  padding: var(--space-8);
  background-color: var(--bg-card);
  border: 1px solid var(--error-color);
  border-radius: var(--radius-sm);
  margin: var(--space-4) 0;
  color: var(--error-color);
}

.btn {
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-base);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border-color);
}

.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
}

/* 統一的 Widget 容器樣式 - 限定在 market-dashboard 內 */
.market-dashboard .widget-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--widget-padding);
  margin-bottom: var(--space-8);
  overflow: hidden;
  position: relative;
  box-shadow: var(--shadow-md);
}

/* Ticker 專用的 Widget 容器樣式 - 限定在 market-dashboard 內 */
.market-dashboard .widget-container-ticker {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--widget-padding);
  margin-bottom: var(--space-8);
  overflow: hidden;
  position: relative;
  box-shadow: var(--shadow-md);
}

.market-dashboard .widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-color);
  position: relative;
}

/* Brand accent tick: a short mark sitting ON the header rule (a bottom mark,
   never a side-stripe) — a quiet Renaissance through-line across sections. */
.market-dashboard .widget-header::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 24px;
  height: 2px;
  background: var(--primary-color);
}

.market-dashboard .widget-header h3 {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin: 0;
}

.market-dashboard .insight-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-6);
  align-items: start;
}

.market-dashboard .insight-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* 第二個 insight-section 上方添加間隔線 */
.market-dashboard .weekly-section {
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-6);
}

.market-dashboard .section-header {
  padding-bottom: var(--space-2);
}

.market-dashboard .section-header h4 {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
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
    gap: var(--space-2);
  }
}

@media (max-width: 480px) {
  .market-dashboard .widget-container {
    padding: var(--space-3);
    margin: 0 calc(-1 * var(--space-1)) var(--space-8) calc(-1 * var(--space-1));
  }
  
  .market-dashboard .insight-grid {
    gap: var(--space-3);
  }
}
</style>