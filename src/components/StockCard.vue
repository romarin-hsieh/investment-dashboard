<template>
  <div 
    class="stock-card-pair"
    :id="domId"
    :data-symbol="quote.symbol"
    tabindex="-1"
  >
    <!-- Stock Info Header -->
    <div class="stock-info-header">
      <div class="symbol-info">
        <h3 class="symbol">{{ quote.symbol }}</h3>
        <div class="symbol-tags">
          <span class="exchange-tag">{{ getExchange() }}</span>
          <span class="industry-tag" :class="`industry-${getIndustryCategory()}`">{{ getIndustry() }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button 
          @click="goToDetail" 
          class="detail-btn"
          :title="`View detailed analysis for ${quote.symbol}`"
        >
          Detail
          <span class="btn-icon">→</span>
        </button>
      </div>
    </div>

    <!-- TradingView Widgets Container -->
    <div class="widgets-container">
      <!-- Symbol Overview (2/3 width) -->
      <div class="widget-overview">
        <div class="widget-header">
          <h4>Symbol Overview</h4>
        </div>
        <FastTradingViewWidget 
          widget-type="overview"
          :symbol="quote.symbol" 
          :exchange="getExchange()"
          :priority="1"
        />
      </div>

      <!-- Technical Analysis (1/3 width) - 使用新的 TechnicalAnalysisWidget -->
      <div class="widget-overview">
        <div class="widget-header">
          <h4>Technical Analysis</h4>
        </div>
        <TechnicalAnalysisWidget 
          :symbol="quote.symbol" 
          :exchange="getExchange()"
          :priority="2"
        />
      </div>
    </div>

    <!-- Additional Info (Optional) -->
    <div v-if="dailyData" class="additional-info">
      <div class="brief-section">
        <h5>Daily Brief</h5>
        <p class="brief-text">{{ dailyData.short_brief_zh }}</p>
      </div>
    </div>

    <!-- Technical Indicators -->
    <TechnicalIndicators 
      :symbol="quote.symbol" 
      :exchange="getExchange()"
    />



    <!-- Stale Indicator -->
    <div v-if="isStale" class="stale-indicator">
      <span class="stale-badge" :class="`stale-${quote.stale_level}`">
        {{ getStaleText() }}
      </span>
    </div>
  </div>
</template>

<script>
import FastTradingViewWidget from './FastTradingViewWidget.vue'
import TechnicalAnalysisWidget from './TechnicalAnalysisWidget.vue'
import TechnicalIndicators from './TechnicalIndicators.vue'

export default {
  name: 'StockCard',
  components: {
    FastTradingViewWidget,
    TechnicalAnalysisWidget,
    TechnicalIndicators
  },
  props: {
    quote: {
      type: Object,
      required: true
    },
    dailyData: {
      type: Object,
      default: null
    },
    metadata: {
      type: Object,
      default: null
    }
  },
  computed: {
    isStale() {
      return this.quote.stale_level !== 'fresh'
    },

    domId() {
      return `sym-${this.sanitizeSymbol(this.quote.symbol)}`
    }
  },
  methods: {
    getSector() {
      if (!this.metadata) return 'Unknown'
      
      // 根據 PRD 要求，confidence < 0.7 歸類為 Unknown
      if (this.metadata.confidence < 0.7) {
        return 'Unknown'
      }
      
      return this.metadata.sector || 'Unknown'
    },

    getIndustry() {
      if (!this.metadata) {
        return 'Unknown Industry'
      }
      
      if (this.metadata.confidence < 0.7) {
        return 'Unknown Industry'
      }
      
      return this.metadata.industry || this.metadata.sector || 'Unknown Industry'
    },

    getIndustryCategory() {
      const industry = this.getIndustry()
      
      // 根據 industry 返回主要分類，用於樣式
      const industryCategories = {
        'Industrial IoT Solutions': 'tech-iot',
        'Satellite Imaging & Analytics': 'tech-satellite',
        'Database Software': 'tech-software',
        'Enterprise Software': 'tech-software',
        'Semiconductors': 'tech-hardware',
        'Aerospace & Defense': 'industrial-aerospace',
        'Space Infrastructure': 'industrial-space',
        'Satellite Communications': 'communications',
        'Electric Vehicles': 'automotive',
        'Unknown Industry': 'unknown'
      }
      
      return industryCategories[industry] || 'other'
    },

    getExchange() {
      if (this.metadata && this.metadata.exchange) {
        // 將 metadata 中的 exchange 代碼轉換為顯示名稱
        const exchangeMap = {
          'NYQ': 'NYSE',    // New York Stock Exchange
          'NMS': 'NASDAQ',  // NASDAQ Global Select Market
          'NCM': 'NASDAQ',  // NASDAQ Capital Market
          'NGM': 'NASDAQ',  // NASDAQ Global Market
          'ASE': 'AMEX'     // NYSE American (原 American Stock Exchange)
        }
        return exchangeMap[this.metadata.exchange] || this.metadata.exchange
      }
      
      // 根據 symbol 推測交易所（備用方案）
      const symbol = this.quote.symbol
      
      // NYSE 股票
      if (['ORCL', 'TSM', 'RDW', 'CRM', 'PL', 'LEU', 'SMR', 'IONQ', 'HIMS'].includes(symbol)) {
        return 'NYSE'
      }
      // NASDAQ 股票
      else if (['ASTS', 'RIVN', 'ONDS', 'AVAV', 'MDB', 'RKLB', 'NVDA', 'AVGO', 'AMZN', 'GOOG', 'META', 'NFLX', 'CRWV', 'PLTR', 'TSLA'].includes(symbol)) {
        return 'NASDAQ'
      }
      
      return 'NASDAQ' // 預設值
    },

    getStaleText() {
      switch (this.quote.stale_level) {
        case 'stale': return '🟡 Stale Data'
        case 'very_stale': return '🔴 Very Stale'
        default: return ''
      }
    },

    goToDetail() {
      // 導航到股票詳細頁面 (新路由結構)
      console.log('Navigating to stock detail for:', this.quote.symbol)
      this.$router.push({
        name: 'stock-detail',
        params: { symbol: this.quote.symbol }
      }).catch(err => {
        console.error('Navigation error:', err)
      })
    },

    sanitizeSymbol(symbol) {
      // 將 symbol 轉換為有效的 DOM ID
      // 替換非字母數字字符為底線
      return symbol.replace(/[^a-zA-Z0-9]/g, '_')
    }
  }
}
</script>

<style scoped>
/* Stock Card Pair Container */
.stock-card-pair {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
  position: relative;
  width: 100%;
  scroll-margin-top: 80px; /* Handle sticky header offset */
}

/* Stock Info Header */
.stock-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f0f0f0;
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
  background-color: #e8f4fd;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  border: 1px solid #b3d9ff;
  display: inline-block;
}

/* Industry Category Specific Styles */
.industry-tech-iot {
  background-color: #e3f2fd;
  color: #1565c0;
  border-color: #90caf9;
}

.industry-tech-satellite {
  background-color: #f3e5f5;
  color: #7b1fa2;
  border-color: #ce93d8;
}

.industry-tech-software {
  background-color: #e8f5e8;
  color: #2e7d32;
  border-color: #a5d6a7;
}

.industry-tech-hardware {
  background-color: #fff3e0;
  color: #ef6c00;
  border-color: #ffcc80;
}

.industry-industrial-aerospace {
  background-color: #fce4ec;
  color: #c2185b;
  border-color: #f8bbd9;
}

.industry-industrial-space {
  background-color: #f1f8e9;
  color: #558b2f;
  border-color: #c5e1a5;
}

.industry-communications {
  background-color: #e0f2f1;
  color: #00695c;
  border-color: #80cbc4;
}

.industry-automotive {
  background-color: #fff8e1;
  color: #ff8f00;
  border-color: #ffcc02;
}

.industry-unknown {
  background-color: #f5f5f5;
  color: #757575;
  border-color: #e0e0e0;
}

.industry-other {
  background-color: #fafafa;
  color: #616161;
  border-color: #bdbdbd;
}

.exchange-info .exchange {
  font-size: 0.9rem;
  color: #007bff;
  background-color: #e7f3ff;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-weight: 600;
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
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
  line-height: 1;
  min-height: 36px;
}

.detail-btn:hover {
  background: linear-gradient(135deg, #0056b3, #004085);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
}

.detail-btn:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 1rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

/* Widgets Container */
.widgets-container {
  display: grid;
  grid-template-columns: 2fr 1fr; /* 2/3 和 1/3 的比例 */
  gap: 1.5rem;
  margin-bottom: 0px; /* 移除下方 padding */
  min-height: 450px; /* 減少高度從 600px 到 450px */
  will-change: transform; /* 優化動畫性能 */
}

.widget-overview,
.widget-technical {
  background: #fafafa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  contain: layout style paint; /* CSS containment 優化 */
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
  flex-shrink: 0; /* 防止 header 被壓縮 */
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

/* Additional Info */
.additional-info {
  margin-bottom: 1rem;
}

.brief-section {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  border-left: 4px solid #007bff;
  display: none; /* 隱藏 brief-section，後續會用別的方式實作內容 */
}

.brief-section h5 {
  font-size: 0.9rem;
  color: #495057;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.brief-text {
  font-size: 0.85rem;
  line-height: 1.5;
  color: #6c757d;
  margin: 0;
}



/* Stale Indicator */
.stale-indicator {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.stale-badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.stale-badge.stale-very_stale {
  background-color: #f8d7da;
  color: #721c24;
}

/* 響應式設計 */

/* 大螢幕 (桌機) - 1200px 以上 */
@media (min-width: 1200px) {
  .stock-card-pair {
    padding: 2rem;
  }
  
  .symbol-info .symbol {
    font-size: 1.6rem;
  }
  
  .widgets-container {
    gap: 2rem;
  }
}

/* 中等螢幕 (平板橫向) - 768px 到 1199px */
@media (min-width: 768px) and (max-width: 1199px) {
  .stock-card-pair {
    padding: 1.5rem;
  }
  
  .symbol-info .symbol {
    font-size: 1.4rem;
  }
  
  .widgets-container {
    gap: 1.25rem;
  }
}

/* 小螢幕 (平板直向和手機) - 768px 以下 */
@media (max-width: 767px) {
  .stock-card-pair {
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
  
  .detail-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
  
  .symbol-info .symbol {
    font-size: 1.3rem;
  }
  
  /* 手機版：widgets 垂直排列 */
  .widgets-container {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .widget-overview {
    height: 380px; /* 手機版對齊高度 */
    min-height: 380px;
  }
  
  .widget-technical {
    height: 380px; /* 手機版 Technical Analysis 適度調整 */
    min-height: 380px;
  }
  
  .widget-header h4 {
    font-size: 0.9rem;
  }
  
  .brief-section {
    padding: 0.75rem;
    display: none; /* 隱藏 brief-section */
  }
  
  .brief-text {
    font-size: 0.8rem;
  }
}

/* 極小螢幕 (小手機) - 480px 以下 */
@media (max-width: 480px) {
  .stock-card-pair {
    padding: 0.75rem;
  }
  
  .symbol-info .symbol {
    font-size: 1.2rem;
  }
  
  .exchange-tag,
  .industry-tag {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }
  
  .widgets-container {
    gap: 0.75rem;
  }
  
  .widget-overview {
    height: 330px; /* 小螢幕對齊高度 */
    min-height: 330px;
  }
  
  .widget-technical {
    height: 330px; /* 小螢幕 Technical Analysis 適度調整 */
    min-height: 330px;
  }
  
  .widget-header {
    padding: 0.5rem 0.75rem;
  }
  
  .brief-section {
    padding: 0.5rem;
    display: none; /* 隱藏 brief-section */
  }
}
</style>