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
            <button @click="goBack" class="detail-btn">
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

          <!-- Technical Analysis (1/3 width) -->
          <div class="widget-technical">
            <div class="widget-header">
              <h4>Technical Analysis</h4>
            </div>
            <FastTradingViewWidget 
              widget-type="technical"
              :symbol="symbol" 
              :exchange="exchange"
            />
          </div>
        </div>
      </div>

      <!-- Daily and Weekly Insight Widgets -->
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
            :priority="2"
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
            :priority="3"
          />
        </div>
      </div>

      <!-- Technical Indicators - Same position as StockCard -->
      <TechnicalIndicators :symbol="symbol" :exchange="exchange" />

      <!-- Performance Monitor -->
      <PerformanceMonitor />

      <!-- Main Content Layout -->
      <div class="content-layout">
        <!-- Row 1: Stock News (Full Width) -->
        <div class="stock-news-row">
          <div class="widget-container">
            <h3 class="widget-title">Latest News</h3>
            <StockNews :symbol="symbol" />
          </div>
        </div>

        <!-- Row 2: Fundamental Data (Full Width) -->
        <div class="fundamental-data-row">
          <div class="widget-container">
            <h3 class="widget-title">Fundamental Data</h3>
            <TradingViewFundamentalData :symbol="symbol" :exchange="exchange" />
          </div>
        </div>

        <!-- Row 3: Company Profile (Full Width) -->
        <div class="company-profile-row">
          <div class="widget-container">
            <h3 class="widget-title">Company Profile</h3>
            <TradingViewCompanyProfile :symbol="symbol" :exchange="exchange" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FastTradingViewWidget from '@/components/FastTradingViewWidget.vue'
import LazyTradingViewWidget from '@/components/LazyTradingViewWidget.vue'
import TradingViewCompanyProfile from '@/components/TradingViewCompanyProfile.vue'
import TradingViewFundamentalData from '@/components/TradingViewFundamentalData.vue'
import TechnicalIndicators from '@/components/TechnicalIndicators.vue'
import PerformanceMonitor from '@/components/PerformanceMonitor.vue'
import StockNews from '@/components/StockNews.vue'
import StockDetailSkeleton from '@/components/StockDetailSkeleton.vue'
import { metadataService } from '@/utils/metadataService.js'
import { directMetadataLoader } from '@/utils/directMetadataLoader.js'

export default {
  name: 'StockDetail',
  components: {
    FastTradingViewWidget,
    LazyTradingViewWidget,
    TradingViewCompanyProfile,
    TradingViewFundamentalData,
    TechnicalIndicators,
    PerformanceMonitor,
    StockNews,
    StockDetailSkeleton
  },
  data() {
    return {
      loading: true,
      error: null,
      metadata: null
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
          'NYSE': 'NYSE',   // 直接的 NYSE
          'NASDAQ': 'NASDAQ' // 直接的 NASDAQ
        }
        return exchangeMap[this.metadata.exchange] || this.metadata.exchange
      }
      
      // 備用方案：根據 symbol 推測交易所（使用正確的分類）
      const symbol = this.symbol
      
      // NYSE 股票 (根據 symbols_metadata.json 的實際資料)
      if (['ORCL', 'TSM', 'RDW', 'CRM', 'PL', 'LEU', 'SMR', 'IONQ', 'HIMS'].includes(symbol)) {
        return 'NYSE'
      }
      // NASDAQ 股票
      else if (['ASTS', 'RIVN', 'ONDS', 'AVAV', 'MDB', 'RKLB', 'NVDA', 'AVGO', 'AMZN', 'GOOG', 'META', 'NFLX', 'CRWV', 'PLTR', 'TSLA'].includes(symbol)) {
        return 'NASDAQ'
      }
      
      return 'NASDAQ' // 預設值
    },

    dailyInsightConfig() {
      return {
        "lineWidth": 2,
        "lineType": 0,
        "chartType": "candlesticks",
        "showVolume": true,
        "fontColor": "rgb(106, 109, 120)",
        "gridLineColor": "rgba(46, 46, 46, 0.06)",
        "volumeUpColor": "rgba(34, 171, 148, 0.5)",
        "volumeDownColor": "rgba(247, 82, 95, 0.5)",
        "backgroundColor": "#ffffff",
        "widgetFontColor": "#0F0F0F",
        "upColor": "#22ab94",
        "downColor": "#f7525f",
        "borderUpColor": "#22ab94",
        "borderDownColor": "#f7525f",
        "wickUpColor": "#22ab94",
        "wickDownColor": "#f7525f",
        "colorTheme": "light",
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
      return {
        "lineWidth": 2,
        "lineType": 0,
        "chartType": "candlesticks",
        "showVolume": true,
        "fontColor": "rgb(106, 109, 120)",
        "gridLineColor": "rgba(46, 46, 46, 0.06)",
        "volumeUpColor": "rgba(34, 171, 148, 0.5)",
        "volumeDownColor": "rgba(247, 82, 95, 0.5)",
        "backgroundColor": "#ffffff",
        "widgetFontColor": "#0F0F0F",
        "upColor": "#22ab94",
        "downColor": "#f7525f",
        "borderUpColor": "#22ab94",
        "borderDownColor": "#f7525f",
        "wickUpColor": "#22ab94",
        "wickDownColor": "#f7525f",
        "colorTheme": "light",
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
    
    // 啟用動態 API 模式以獲取最新的 sector/industry 信息
    metadataService.setUseDynamicAPI(true)
    
    this.loadMetadata()
    this.initializePage()
  },
  methods: {
    async initializePage() {
      try {
        // 模擬載入時間
        await new Promise(resolve => setTimeout(resolve, 1000))
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
  background: #f8f9fa;
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
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  margin: 0 0.5rem;
  color: #6c757d;
}

.breadcrumb-current {
  color: #495057;
  font-weight: 600;
}

/* Stock Header - Match Stock Overview Style */
.stock-header {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.stock-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 1.5rem;
}

/* Widgets Container - Same as StockCard */
.widgets-container {
  display: grid;
  grid-template-columns: 2fr 1fr; /* 2/3 和 1/3 的比例 */
  gap: 1.5rem;
  margin-bottom: 0px; /* 移除下方 padding */
  min-height: 450px;
  will-change: transform;
}

.widget-overview,
.widget-technical {
  background: #fafafa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  contain: layout style paint;
}

.widget-overview {
  min-height: 440px; /* Symbol Overview 對齊 Technical Analysis 高度 */
  height: 440px;
}

.widget-technical {
  min-height: 440px; /* Technical Analysis 適度增加到 440px 避免 scroll bar */
  height: 440px;
}

.widget-header {
  background: #f8f9fa;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
}

.widget-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #495057;
  margin: 0;
}

/* 確保 widget 內容區域有足夠高度 */
.widget-overview > :not(.widget-header) {
  flex: 1;
  min-height: 390px; /* Symbol Overview 內容區域對齊 */
}

.widget-technical > :not(.widget-header) {
  flex: 1;
  min-height: 390px; /* Technical Analysis 內容區域適度增加到 390px */
}

/* Insight Widgets Container */
.insight-widgets-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.insight-widget {
  background: #fafafa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: visible; /* 改為 visible 讓內容可以完整顯示 */
  display: flex;
  flex-direction: column;
  min-height: 600px; /* 增加最小高度從 500px 到 600px */
  height: auto; /* 改為 auto 讓容器自適應內容 */
}

.insight-widget .widget-header {
  background: #f8f9fa;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
  height: 45px; /* 固定 header 高度 */
  display: flex;
  align-items: center;
}

.insight-widget .widget-header h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #495057;
  margin: 0;
  line-height: 1.2;
}

.insight-widget > :not(.widget-header) {
  flex: 1;
  min-height: 550px; /* 確保內容區域有足夠高度 */
  height: 550px; /* 固定內容區域高度 */
  overflow: visible; /* 讓 iframe 可以完整顯示 */
}

.symbol-info .symbol {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
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
  color: #007bff;
  background-color: #e7f3ff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  border: 1px solid #90caf9;
  display: inline-block;
}

.industry-tag {
  font-size: 0.75rem;
  color: #666;
  background-color: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  border: 1px solid #e0e0e0;
  display: inline-block;
}

/* 統一使用灰色樣式，移除彩色分類 */
.industry-tag.industry-tech-iot,
.industry-tag.industry-tech-satellite,
.industry-tag.industry-tech-software,
.industry-tag.industry-tech-hardware,
.industry-tag.industry-industrial-aerospace,
.industry-tag.industry-industrial-space,
.industry-tag.industry-communications,
.industry-tag.industry-automotive,
.industry-tag.industry-unknown,
.industry-tag.industry-other {
  background-color: #f5f5f5;
  color: #666;
  border-color: #e0e0e0;
}

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

/* Content Layout - Row-based Structure */
.content-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Row 1: Stock News (Full Width) */
.stock-news-row {
  width: 100%;
}

.stock-news-row .widget-container {
  min-height: 400px;
  height: auto; /* 讓新聞區塊自適應高度 */
}

/* Row 2: Fundamental Data (Full Width) */
.company-profile-row {
  width: 100%;
}

.company-profile-row .widget-container {
  min-height: 400px;
  height: 400px;
}

/* Row 2: Fundamental Data (Full Width) */
.fundamental-data-row {
  width: 100%;
}

.fundamental-data-row .widget-container {
  min-height: 600px;
  height: 600px;
}

/* Row 3: Company Profile (Full Width) */
.company-profile-row {
  width: 100%;
}

.company-profile-row .widget-container {
  min-height: 400px;
  height: 400px;
}

/* Widget Container - Match Stock Dashboard Style */
.widget-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.widget-title {
  background: #f8f9fa;
  padding: 0.75rem 1rem;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #495057;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
}

/* Widget Content Area */
.widget-container > :not(.widget-title) {
  flex: 1;
  min-height: 0;
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
}

@media (max-width: 768px) {
  .stock-detail {
    padding: 0.5rem;
  }
  
  .stock-header {
    padding: 1rem;
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
  
  .content-layout {
    gap: 1rem;
  }
  
  .company-profile-row .widget-container,
  .fundamental-data-row .widget-container {
    height: 350px;
    min-height: 350px;
  }
}

@media (max-width: 480px) {
  .breadcrumb {
    font-size: 0.8rem;
  }
  
  .stock-header {
    padding: 0.75rem;
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
  
  .company-profile-row .widget-container,
  .fundamental-data-row .widget-container {
    height: 300px;
    min-height: 300px;
  }
}
</style>