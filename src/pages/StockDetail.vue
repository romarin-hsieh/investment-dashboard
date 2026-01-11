<template>
  <div class="stock-detail">
    <!-- Breadcrumb -->
    <nav class="breadcrumb">
      <router-link to="/stock-overview" class="breadcrumb-link">Stock Overview</router-link>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-current">{{ symbol }} Analysis</span>
    </nav>

    <!-- 載入狀態顯示骨架屏 -->
    <div v-if="loading" class="loading-with-skeleton">
      <StockDetailSkeleton />
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="error" class="error">
      <p class="text-danger">{{ error }}</p>
      <button @click="refresh" class="btn btn-secondary">Retry</button>
    </div>

    <!-- 正常內容 -->
    <div v-else>
      <!-- Stock Header -->
      <div class="stock-header">
        <div class="stock-info-header">
          <div class="symbol-info">
            <h3 class="symbol">{{ symbol }}</h3>
            <div class="symbol-tags">
              <span class="exchange-tag">{{ exchange }}</span>
              <span class="industry-tag" :class="`industry-${getIndustryCategory()}`">{{ getIndustry() }}</span>
            </div>
          </div>
          <div class="header-actions">
            <button @click="goBack" class="btn btn-renaissance">
              <span class="btn-icon">←</span>
              Back to Stock Overview
            </button>
          </div>
        </div>

        <!-- TradingView Widgets Container - Same as StockCard -->
        <div class="widgets-container">
          <!-- Symbol Overview (2/3 width) -->
          <div class="widget-overview">
            <div class="widget-header">
              <h4>Symbol Overview</h4>
            </div>
            <FastTradingViewWidget 
              widget-type="overview"
              :symbol="symbol" 
              :exchange="exchange"
            />
          </div>

          <!-- Technical Analysis (1/3 width) - 仿照 Symbol Overview 樣式 -->
          <div class="widget-technical">
            <div class="widget-header">
              <h4>Technical Analysis</h4>
            </div>
            <FastTradingViewWidget 
              widget-type="technical"
              :symbol="symbol" 
              :exchange="exchange"
              class="technical-overview-style"
            />
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tabs-nav">
        <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'overview' }"
            @click="activeTab = 'overview'"
        >
            Overview & Technicals
        </button>
        <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'analysis' }"
            @click="activeTab = 'analysis'"
        >
            Fundamental Analysis
        </button>
        <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'holdings' }"
            @click="activeTab = 'holdings'"
        >
            Holdings & Sentiment
        </button>
      </div>

      <!-- Tab Content: Overview -->
      <div v-show="activeTab === 'overview'" class="tab-content">
          
          <!-- Technical Signals (Tactical) -->
          <div class="widget-container">
            <div class="widget-header flex-header">
                <div style="display: flex; align-items: center;">
                    <h3>Technical Indicators</h3>
                    <button class="header-info-btn" @click="$refs.technicalSignals.openModal()" title="Signal Specifications" style="margin-left: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533l1.302-4.495z"/>
                            <path d="M9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="tactical-grid">
                 <TechnicalSignals ref="technicalSignals" :symbol="symbol" />
                 <TechnicalIndicators :symbol="symbol" :exchange="exchange" :showTitle="false" />
            </div>
          </div>

          <!-- Symbol Insight Block -->
          <div class="symbol-insight-block">
            <div class="insight-header">
              <h3>Symbol Insight</h3>
            </div>
            
            <!-- Market Regime Block (Full Width) -->
            <div class="insight-full-widget market-regime">
              <div class="widget-header">
                <h4>Market Regime</h4>
              </div>
              <MarketRegimeWidget
                :symbol="symbol"
                :exchange="exchange"
                :priority="2"
              />
            </div>

            <!-- Trading Strategy Block (Full Width) -->
            <div class="insight-full-widget trading-strategy">
              <div class="widget-header">
                <h4>Trading Strategy</h4>
              </div>
              <TradingStrategyWidget
                :symbol="symbol"
                :exchange="exchange"
                :priority="3"
              />
            </div>

            <!-- Trendlines & SR Zones Block (Full Width) -->
            <div class="insight-full-widget trendlines-sr">
              <div class="widget-header">
                <h4>Trendlines & SR Zones</h4>
              </div>
              <TrendlinesSRWidget
                :symbol="symbol"
                :exchange="exchange"
              />
            </div>

            <!-- CISD Projections Block (Full Width) -->
            <div class="insight-full-widget cisd-projections">
              <div class="widget-header">
                <h4>CISD Projections</h4>
              </div>
              <CisdWidget
                :symbol="symbol"
                :exchange="exchange"
              />
            </div>

            <!-- MFI Volume Profile Block (Full Width) -->
            <div class="insight-full-widget mfi-volume-profile">
              <div class="widget-header">
                <h4>MFI Volume Profile</h4>
              </div>
              <MFIVolumeProfilePanel
                :symbol="symbol"
                :exchange="exchange"
                :priority="4"
              />
            </div>
            
            <!-- Daily and Weekly Insight (Two Columns) -->
            <div class="insight-widgets-container">
              <!-- Daily Insight (MA5) - Left -->
              <div class="insight-widget daily-insight">
                <div class="widget-header">
                  <h4>Daily Insight (MA5)</h4>
                </div>
                <LazyTradingViewWidget
                  widget-type="Daily Insight"
                  :config="dailyInsightConfig"
                  script-url="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
                  height="550px"
                  :priority="5"
                />
              </div>

              <!-- Weekly Insight (MA4) - Right -->
              <div class="insight-widget weekly-insight">
                <div class="widget-header">
                  <h4>Weekly Insight (MA4)</h4>
                </div>
                <LazyTradingViewWidget
                  widget-type="Weekly Insight"
                  :config="weeklyInsightConfig"
                  script-url="https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js"
                  height="550px"
                  :priority="6"
                />
              </div>
            </div>
          </div>

          <!-- Performance Monitor -->
          <PerformanceMonitor />
          
          <!-- Latest News -->
          <div class="widget-container">
            <div class="widget-header">
                <h3>Latest News</h3>
            </div>
            <StockNews :symbol="symbol" />
          </div>
      </div>

      <!-- Tab Content: Analysis -->
      <div v-if="activeTab === 'analysis'" class="tab-content">
          <div class="widget-container">
             <div class="widget-header"><h3>Deep Research</h3></div>
             <FundamentalAnalysis :symbol="symbol" />
          </div>
          
          <div class="content-layout">
            <!-- Row 2: Fundamental Data (Full Width) -->
            <div class="widget-container financials-widget-container">
              <div class="widget-header">
                <h3>Financials Overview</h3>
              </div>
              <TradingViewFundamentalData 
                :symbol="symbol" 
                :exchange="exchange" 
                :color-theme="theme"
              />
            </div>

            <!-- Row 3: Company Profile (Full Width) -->
            <div class="widget-container">
              <div class="widget-header">
                <h3>Company Profile</h3>
              </div>
              <TradingViewCompanyProfile 
                :symbol="symbol" 
                :exchange="exchange" 
                :color-theme="theme"
                :is-transparent="true"
              />
            </div>
          </div>
      </div>

      <!-- Tab Content: Holdings -->
      <div v-if="activeTab === 'holdings'" class="tab-content">
          <div class="widget-container">
             <div class="widget-header"><h3>Institutional & Insider Holdings</h3></div>
             <HoldingsAnalysis :symbol="symbol" />
          </div>
      </div>
    </div>
  </div>
</template>

<script>
import FastTradingViewWidget from '@/components/FastTradingViewWidget.vue'
import LazyTradingViewWidget from '@/components/LazyTradingViewWidget.vue'
import MarketRegimeWidget from '@/components/MarketRegimeWidget.vue'
import TradingStrategyWidget from '@/components/TradingStrategyWidget.vue'
import MFIVolumeProfilePanel from '@/components/MFIVolumeProfilePanel.vue'
import TradingViewCompanyProfile from '@/components/TradingViewCompanyProfile.vue'
import TradingViewFundamentalData from '@/components/TradingViewFundamentalData.vue'
import TechnicalIndicators from '@/components/TechnicalIndicators.vue'
import PerformanceMonitor from '@/components/PerformanceMonitor.vue'
import StockNews from '@/components/StockNews.vue'
import StockDetailSkeleton from '@/components/StockDetailSkeleton.vue'
import FundamentalAnalysis from '@/components/FundamentalAnalysis.vue'
import HoldingsAnalysis from '@/components/HoldingsAnalysis.vue'
import TechnicalSignals from '@/components/TechnicalSignals.vue'
import TrendlinesSRWidget from '@/components/TrendlinesSRWidget.vue'
import CisdWidget from '@/components/CisdWidget.vue'
import { directMetadataLoader } from '@/utils/directMetadataLoader.js'
import { useTheme } from '@/composables/useTheme.js'

export default {
  name: 'StockDetail',
  components: {
    FastTradingViewWidget,
    LazyTradingViewWidget,
    MarketRegimeWidget,
    TradingStrategyWidget,
    MFIVolumeProfilePanel,
    TradingViewCompanyProfile,
    TradingViewFundamentalData,
    TechnicalIndicators,
    PerformanceMonitor,
    StockNews,
    StockDetailSkeleton,
    FundamentalAnalysis,
    HoldingsAnalysis,
    TechnicalSignals,
    TrendlinesSRWidget,
    CisdWidget
  },
  setup() {
    const { theme } = useTheme()
    return { theme }
  },
  data() {
    return {
      loading: true,
      error: null,
      metadata: null,
      activeTab: 'overview'
    }
  },
  computed: {
    symbol() {
      return this.$route.params.symbol || 'RKLB'
    },
    exchange() {
      // 優先使用 metadata 中的交易所資訊
      if (this.metadata && this.metadata.exchange) {
        // 將 metadata 中的 exchange 代碼轉換為顯示名稱
        const exchangeMap = {
          'NYQ': 'NYSE',    // New York Stock Exchange
          'NMS': 'NASDAQ',  // NASDAQ Global Select Market
          'NCM': 'NASDAQ',  // NASDAQ Capital Market
          'NGM': 'NASDAQ',  // NASDAQ Global Market
          'ASE': 'AMEX',    // NYSE American (原 American Stock Exchange)
          'NYSE': 'NYSE',   // 直接的 NYSE
          'NASDAQ': 'NASDAQ' // 直接的 NASDAQ
        }
        return exchangeMap[this.metadata.exchange] || this.metadata.exchange
      }
      
      // 備用方案：根據 symbol 推測交易所（使用正確的分類）
      const symbol = this.symbol
      
      // NYSE 股票 (根據 symbols_metadata.json 的實際資料)
      if (['ORCL', 'TSM', 'RDW', 'CRM', 'PL', 'LEU', 'SMR', 'IONQ', 'HIMS', 'UUUU'].includes(symbol)) {
        return 'NYSE'
      }
      // NASDAQ 股票
      else if (['ASTS', 'RIVN', 'ONDS', 'AVAV', 'MDB', 'RKLB', 'NVDA', 'AVGO', 'AMZN', 'GOOG', 'META', 'NFLX', 'CRWV', 'PLTR', 'TSLA'].includes(symbol)) {
        return 'NASDAQ'
      }
      
      return 'NASDAQ' // 預設值
    },

    dailyInsightConfig() {
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
        "symbols": [[`${this.exchange}:${this.symbol}|6M`]],
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

    weeklyInsightConfig() {
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
        "symbols": [[`${this.exchange}:${this.symbol}|6M`]],
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
    }
  },
  watch: {
    symbol() {
      // 當 symbol 改變時，滾動到頂部並重新載入數據
      this.scrollToTop()
      this.loadMetadata()
    },
    $route() {
      // 當路由改變時，滾動到頂部
      this.scrollToTop()
    }
  },
    mounted() {
    // 頁面載入時滾動到頂部
    this.scrollToTop()
    
    this.loadMetadata()
    this.initializePage()
  },
  methods: {
    async initializePage() {
      try {
        // Remove fixed delay for better performance
        this.loading = false
      } catch (err) {
        this.error = String(err)
        this.loading = false
      }
    },
    async refresh() {
      this.loading = true
      this.error = null
      await this.initializePage()
    },
    async loadMetadata() {
      try {
        // 使用 DirectMetadataLoader 以保持與 StockOverview 一致
        this.metadata = await directMetadataLoader.getSymbolMetadata(this.symbol)
        console.log(`📊 StockDetail loaded metadata for ${this.symbol}:`, this.metadata)
      } catch (error) {
        console.warn(`Failed to load metadata for ${this.symbol}:`, error)
        this.metadata = null
      }
    },

    getSector() {
      if (!this.metadata || this.metadata.confidence < 0.7) {
        return 'Unknown'
      }
      return this.metadata.sector || 'Unknown'
    },

    getIndustry() {
      if (!this.metadata) {
        return 'Unknown Industry'
      }
      
      // 根據 PRD 要求，confidence < 0.7 歸類為 Unknown
      if (this.metadata.confidence < 0.7) {
        return 'Unknown Industry'
      }
      
      return this.metadata.industry || this.metadata.sector || 'Unknown Industry'
    },

    getIndustryCategory() {
      const industry = this.getIndustry()
      
      // 根據 industry 返回主要分類，用於樣式
      const industryCategories = {
        'Software - Application': 'tech-software',
        'Computer Hardware': 'tech-hardware',
        'Communication Equipment': 'tech-satellite',
        'Database Software': 'tech-software',
        'Enterprise Software': 'tech-software',
        'Semiconductors': 'tech-hardware',
        'Aerospace & Defense': 'industrial-aerospace',
        'Space Infrastructure': 'industrial-space',
        'Satellite Communications': 'communications',
        'Auto Manufacturers': 'automotive',
        'Unknown Industry': 'unknown'
      }
      
      return industryCategories[industry] || 'other'
    },

    goBack() {
      console.log('Navigating back to stock overview')
      this.$router.push({ name: 'stock-overview' }).catch(err => {
        console.error('Navigation error:', err)
      })
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
    }
  }
}
</script>

<style scoped>
.stock-detail {
  background: var(--bg-primary);
  padding: 1rem;
  min-height: 100vh;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.breadcrumb-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  margin: 0 0.5rem;
  color: var(--text-muted);
}

.breadcrumb-current {
  color: var(--text-secondary);
  font-weight: 600;
}

/* Stock Header - Match Stock Overview Style */
.stock-header {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.stock-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.5rem;
}

/* Widgets Container - Same as StockCard */
.widgets-container {
  display: grid;
  grid-template-columns: 2fr 1fr; 
  gap: 1.5rem;
  margin-bottom: 0px; 
  min-height: 450px;
  will-change: transform;
}

.widget-overview,
.widget-technical {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  contain: layout style paint;
}

.widget-overview {
  min-height: 440px; 
  height: 440px;
}

.widget-technical {
  min-height: 440px; 
  height: 440px;
}

.widget-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background: transparent; /* Removed gray background */
  flex-shrink: 0;
  margin: 0; 
}

.widget-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
}

/* 確保 widget 內容區域有足夠高度 */
.widget-overview > :not(.widget-header) {
  flex: 1;
  min-height: 390px;
}

.widget-technical > :not(.widget-header) {
  flex: 1;
  min-height: 390px; 
}

/* Technical Analysis 仿照 Symbol Overview 樣式 */
.technical-overview-style {
  background: transparent !important;
  padding: 0px !important; 
  box-sizing: border-box !important;
}

/* Technical Analysis loading 狀態調整 */
.technical-overview-style .fast-loading {
  background: var(--bg-card); 
  border-radius: 0; 
  margin: 0; 
}

/* Technical Analysis error 狀態調整 */
.technical-overview-style .fast-error {
  background: var(--bg-card); 
  border: 1px solid var(--border-color); 
  border-radius: 0; 
  color: var(--error-color); 
  margin: 0; 
}

/* Symbol Insight Block - Match stock-card style */
.symbol-insight-block {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.insight-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.5rem;
}

.insight-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

/* Insight Widgets Container */
.insight-widgets-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

/* Full Width Insight Widgets */
.insight-full-widget {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 900px; 
  height: 900px;
  margin-bottom: 1.5rem;
}

/* Remove borders from full-width chart widgets to avoid double borders */
.insight-full-widget.market-regime,
.insight-full-widget.trading-strategy,
.insight-full-widget.trendlines-sr,
.insight-full-widget.cisd-projections {
  border: none !important;
  background: transparent !important;
}

/* MFI Volume Profile specific styling */
.insight-full-widget.mfi-volume-profile {
  /* 移除固定高度限制，讓內容自然展開 */
  min-height: auto;
  height: auto;
}

.insight-full-widget .widget-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  /* border-top-left-radius: 8px; Removed */
  /* border-top-right-radius: 8px; Removed */
  background: transparent; /* Removed gray background */
  flex-shrink: 0;
  margin: 0;
}

.insight-full-widget .widget-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
}

.insight-full-widget > :not(.widget-header) {
  flex: 1;
  min-height: 850px;
  height: 850px;
}

/* MFI Volume Profile content area */
.insight-full-widget.mfi-volume-profile > :not(.widget-header) {
  /* 移除固定高度限制，讓內容自然展開 */
  min-height: auto;
  height: auto;
}

.insight-widget {
  background: var(--bg-card); /* 改為變量 */
  border: 1px solid var(--border-color); /* 統一邊框顏色 */
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 600px; /* 增加最小高度從 500px 到 600px */
  height: auto; /* 改為 auto 讓容器自適應內容 */
}

.insight-widget .widget-header {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1rem;
  flex-shrink: 0;
  height: auto; /* 改為 auto 讓高度自適應 */
  display: flex;
  align-items: center;
}

.insight-widget .widget-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.2;
}

.insight-widget > :not(.widget-header) {
  flex: 1;
  min-height: 550px; /* 確保內容區域有足夠高度 */
  height: 550px; /* 固定內容區域高度 */
  overflow: visible; /* 讓 iframe 可以完整顯示 */
}

/* Symbol Insight 區塊內的 lazy-widget 添加 8px padding */
.insight-widget .lazy-widget {
  padding: 8px;
  box-sizing: border-box;
}

.symbol-info .symbol {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.symbol-tags {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.exchange-tag {
  font-size: 0.75rem;
  color: var(--tag-text-blue);
  background-color: var(--tag-bg-blue);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  border: 1px solid transparent;
  display: inline-block;
}

.industry-tag {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  border: 1px solid transparent;
  display: inline-block;
}

/* 統一使用灰色樣式，移除彩色分類 */
/* Removed granular industry tag colors to match StockOverview uniformity */

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.detail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #6c757d, #5a6268);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(108, 117, 125, 0.2);
  line-height: 1;
  min-height: 36px;
}

.detail-btn:hover {
  background: linear-gradient(135deg, #5a6268, #495057);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3);
}

.btn-icon {
  font-size: 1rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

/* Widget Container - Match Market Overview Style */
.widget-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1rem;
  margin-bottom: 2rem;
  overflow: hidden;
  position: relative;
}

.widget-container .widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem; /* 保持 widget-container 內的 header margin */
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  background: transparent; /* Ensure transparent */
}

.widget-container .widget-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

/* Content Layout - Row-based Structure */
.content-layout {
  display: flex;
  flex-direction: column;
  gap: 0; /* 移除 gap，讓 widget-container 的 margin-bottom 控制間距 */
  margin-top: 0; /* 移除 margin-top */
}

.financials-widget-container {
  display: flex !important;
  flex-direction: column !important;
  height: 1000px !important;
  min-height: 1000px !important;
}

.financials-widget-container .fundamental-data-container {
  flex: 1 !important;
  height: auto !important;
  min-height: 100% !important;
}

/* 響應式設計 */
@media (max-width: 1200px) {
  .widgets-container {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .insight-widgets-container {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .insight-full-widget {
    min-height: 800px;
    height: 800px;
  }
  
  .insight-full-widget.mfi-volume-profile {
    /* 移除固定高度限制，讓內容自然展開 */
    min-height: auto;
    height: auto;
  }
  
  .insight-full-widget > :not(.widget-header) {
    min-height: 750px;
    height: 750px;
  }
  
  .insight-full-widget.mfi-volume-profile > :not(.widget-header) {
    /* 移除固定高度限制，讓內容自然展開 */
    min-height: auto;
    height: auto;
  }
  
  .symbol-insight-block {
    padding: 1rem;
  }
  
  .widget-container {
    padding: 0.75rem;
    margin-bottom: 1.5rem;
  }
}

@media (max-width: 768px) {
  .stock-detail {
    padding: 0.5rem;
  }
  
  .stock-header {
    padding: 1rem;
  }
  
  .symbol-insight-block {
    padding: 1rem;
  }
  
  .widget-container {
    padding: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .stock-info-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .widgets-container {
    grid-template-columns: 1fr;
    gap: 1rem;
    min-height: auto;
  }
  
  .insight-widgets-container {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .insight-full-widget {
    min-height: 700px;
    height: 700px;
  }
  
  .insight-full-widget.mfi-volume-profile {
    /* 移除固定高度限制，讓內容自然展開 */
    min-height: auto;
    height: auto;
  }
  
  .insight-full-widget > :not(.widget-header) {
    min-height: 650px;
    height: 650px;
  }
  
  .insight-full-widget.mfi-volume-profile > :not(.widget-header) {
    /* 移除固定高度限制，讓內容自然展開 */
    min-height: auto;
    height: auto;
  }
  
  .insight-widget {
    height: auto; /* 手機版自適應高度 */
    min-height: 500px;
  }
  
  .insight-widget > :not(.widget-header) {
    height: 500px;
    min-height: 500px;
  }
  
  .widget-overview {
    height: 380px; /* 手機版對齊高度 */
    min-height: 380px;
  }
  
  .widget-technical {
    height: 380px; /* 手機版 Technical Analysis 適度調整 */
    min-height: 380px;
  }
}

@media (max-width: 480px) {
  .breadcrumb {
    font-size: 0.8rem;
  }
  
  .stock-header {
    padding: 0.75rem;
  }
  
  .symbol-insight-block {
    padding: 0.75rem;
  }
  
  .insight-header h3 {
    font-size: 1.1rem;
  }
  
  .symbol-info .symbol {
    font-size: 1.2rem;
  }
  
  .widget-header {
    padding: 0.5rem 0.75rem;
  }
  
  .widget-header h4 {
    font-size: 0.9rem;
  }
  
  .widget-title {
    font-size: 0.9rem;
    padding: 0.5rem 0.75rem;
  }
  
  .detail-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
  
  .widgets-container {
    gap: 0.75rem;
  }
  
  .insight-widgets-container {
    gap: 0.75rem;
  }
  
  .insight-full-widget {
    min-height: 600px;
    height: 600px;
    margin-bottom: 1rem;
  }
  
  .insight-full-widget.mfi-volume-profile {
    /* 移除固定高度限制，讓內容自然展開 */
    min-height: auto;
    height: auto;
  }
  
  .insight-full-widget > :not(.widget-header) {
    min-height: 550px;
    height: 550px;
  }
  
  .insight-full-widget.mfi-volume-profile > :not(.widget-header) {
    /* 移除固定高度限制，讓內容自然展開 */
    min-height: auto;
    height: auto;
  }
  
  .insight-widget {
    height: auto; /* 小螢幕自適應高度 */
    min-height: 450px;
  }
  
  .insight-widget > :not(.widget-header) {
    height: 450px;
    min-height: 450px;
  }
  
  .widget-overview {
    height: 330px; /* 小螢幕對齊高度 */
    min-height: 330px;
  }
  
  .widget-technical {
    height: 330px; /* 小螢幕 Technical Analysis 適度調整 */
    min-height: 330px;
  }
  
  .content-layout {
    margin-top: 0.75rem; /* 小螢幕進一步減少間隔 */
  }
  
  .company-profile-row .widget-container {
    height: 300px;
    min-height: 300px;
  }


}
/* Tabs Navigation */
.tabs-nav {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 0px;
}

.tab-btn {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    color: #6c757d;
    transition: all 0.2s;
}

.tab-btn:hover {
    color: #007bff;
    background: rgba(0, 123, 255, 0.05);
}

.tab-btn.active {
    color: #007bff;
    border-bottom-color: #007bff;
}

/* Tactical Grid for Overview Tab */
.tactical-grid {
    display: grid;
    grid-template-columns: 1fr 3fr; /* 1:3 ratio ensures all 4 inner columns are effectively equal (25% each) */
    gap: 1.5rem;
    align-items: start;
}

@media (max-width: 1024px) {
    .tactical-grid {
        grid-template-columns: 1fr;
    }
}
.flex-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info-btn {
  background: none;
  border: none;
  padding: 4px;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
  display: flex;
  align-items: center;
}

.header-info-btn:hover {
  color: var(--text-secondary);
}
</style>