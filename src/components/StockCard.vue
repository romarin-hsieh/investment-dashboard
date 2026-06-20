<template>
  <div
    class="stock-card-pair"
    :class="{ 'is-selected': selected }"
    :id="domId"
    :data-symbol="quote.symbol"
    :aria-current="selected ? 'true' : null"
    tabindex="-1"
  >
    <!-- Stale Data Banner (above the fold; replaces corner badge) -->
    <div
      v-if="isStale"
      class="stale-banner"
      :class="`stale-banner-${quote.stale_level}`"
      role="status"
      aria-live="polite"
    >
      <span class="stale-banner-icon" aria-hidden="true">⚠</span>
      <span class="stale-banner-text">{{ getStaleText() }}</span>
    </div>

    <!-- Stock Info Header -->
    <div class="stock-info-header">
      <div class="symbol-info">
        <div class="symbol-wrapper">
          <h3 class="symbol">{{ quote.symbol }}</h3>
          <a :href="`https://finance.yahoo.com/chart/${quote.symbol}`" target="_blank" rel="noopener noreferrer" class="realtime-btn" :title="$t('stockCard.realtimeChartTitle')" :aria-label="$t('stockCard.realtimeChartAria', { symbol: quote.symbol })">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        </div>
        <div class="symbol-tags">
          <span class="exchange-tag">{{ getExchange() }}</span>
          <span class="industry-tag" :class="`industry-${getIndustryCategory()}`">{{ getIndustry() }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-renaissance" @click.stop="goToDetail" :title="$t('stockCard.detailButtonTitle', { symbol: quote.symbol })">
            {{ $t('stockCard.detailButton') }} <span>→</span>
        </button>
      </div>
    </div>

    <!-- TradingView Widgets Container -->
    <div class="widgets-container">
      <!-- Symbol Overview (2/3 width) -->
      <div class="widget-overview">
        <div class="widget-header">
          <h4>{{ $t('stockCard.symbolOverview') }}</h4>
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
          <h4>{{ $t('stockCard.technicalAnalysis') }}</h4>
        </div>
        <FastTradingViewWidget 
          widget-type="technical"
          :symbol="quote.symbol" 
          :exchange="getExchange()"
          :priority="2"
          class="technical-overview-style"
        />
      </div>
    </div>

    <!-- Additional Info (Optional) -->
    <div v-if="dailyData" class="additional-info">
    <div class="trading-analysis-section">
        <div class="analysis-header">
            <h5>{{ $t('stockCard.tradingAnalysis') }}</h5>
            <span class="trend-badge" :class="analysisTrendClass">{{ analysisTrend }}</span>
        </div>
        <div class="analysis-content">
            <div v-for="(point, idx) in tradingAnalysis" :key="idx" class="analysis-point" :class="point.type">
                {{ point.text }}
            </div>
        </div>
    </div>
    </div>

    <!-- Technical Indicators -->
    <TechnicalIndicators 
      :symbol="quote.symbol" 
      :exchange="getExchange()"
    />



  </div>
</template>

<script>
import FastTradingViewWidget from './FastTradingViewWidget.vue'
import TechnicalIndicators from './TechnicalIndicators.vue'

export default {
  name: 'StockCard',
  components: {
    FastTradingViewWidget,
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
    },
    selected: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    isStale() {
      return this.quote.stale_level !== 'fresh'
    },

    domId() {
      return `sym-${this.sanitizeSymbol(this.quote.symbol)}`
    },
    
    tradingAnalysis() {
        return this.generateTradingAnalysis();
    },
    
    analysisTrend() {
        // Support both real API (regularMarket...) and Mock Data (change_percent...) keys
        const change = this.quote.change_percent !== undefined ? this.quote.change_percent : (this.quote.regularMarketChangePercent || 0);

        if (change > 0.5) return this.$t('stockCard.trendBullish');
        if (change < -0.5) return this.$t('stockCard.trendBearish');
        return this.$t('stockCard.trendNeutral');
    },
    
    analysisTrendClass() {
         const change = this.quote.change_percent !== undefined ? this.quote.change_percent : (this.quote.regularMarketChangePercent || 0);

         if (change > 0.5) return 'trend-badge tag-green';
         if (change < -0.5) return 'trend-badge tag-red';
         return 'trend-badge tag-gray';
    }
  },
  methods: {
    getSector() {
      if (!this.metadata) return this.$t('stockCard.unknownSector')

      // 根據 PRD 要求，confidence < 0.7 歸類為 Unknown
      if (this.metadata.confidence < 0.7) {
        return this.$t('stockCard.unknownSector')
      }

      return this.metadata.sector || this.$t('stockCard.unknownSector')
    },

    getIndustry() {
      if (!this.metadata) {
        return this.$t('stockCard.unknownIndustry')
      }

      if (this.metadata.confidence < 0.7) {
        return this.$t('stockCard.unknownIndustry')
      }

      return this.metadata.industry || this.metadata.sector || this.$t('stockCard.unknownIndustry')
    },

    getIndustryCategory() {
      // Match against the raw industry value (not the localized display label),
      // so the CSS category stays correct in any UI language.
      const industry = this.metadata && this.metadata.confidence >= 0.7
        ? (this.metadata.industry || this.metadata.sector)
        : null

      if (!industry) return 'unknown'

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
        'Electric Vehicles': 'automotive'
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
      // Words convey state, not just colour/emoji. Screen readers announce
      // the full string; sighted users see the matching banner colour.
      switch (this.quote.stale_level) {
        case 'stale':
          return this.$t('stockCard.staleText')
        case 'very_stale':
          return this.$t('stockCard.veryStaleText')
        default:
          return ''
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
    },

    generateTradingAnalysis() {
        if (!this.quote) return [];
        
        const analysis = [];
        // Support both real API (regularMarket...) and Mock Data (change_percent...) keys
        const change = this.quote.change_percent !== undefined ? this.quote.change_percent : (this.quote.regularMarketChangePercent || 0);
        const price = this.quote.price_usd !== undefined ? this.quote.price_usd : (this.quote.regularMarketPrice || 0);
        
        // Mock data lacks MA, so we rely on price action/change for trend if MA is missing
        const fiftyDayAverage = this.quote.fiftyDayAverage;
        const twoHundredDayAverage = this.quote.twoHundredDayAverage;
        
        const volume = this.quote.volume !== undefined ? this.quote.volume : (this.quote.regularMarketVolume || 0);
        const avgVolume = this.quote.averageDailyVolume3Month || 0;
        
        // 1. Trend Analysis
        if (fiftyDayAverage && twoHundredDayAverage) {
            if (price > fiftyDayAverage && price > twoHundredDayAverage) {
                analysis.push({ text: this.$t('stockCard.analysisTrendBullishMA'), type: 'bullish' });
            } else if (price < fiftyDayAverage && price < twoHundredDayAverage) {
                analysis.push({ text: this.$t('stockCard.analysisTrendBearishMA'), type: 'bearish' });
            } else if (Math.abs(change) < 0.5) {
                analysis.push({ text: this.$t('stockCard.analysisTrendConsolidating'), type: 'neutral' });
            } else {
                analysis.push({ text: this.$t('stockCard.analysisTrendMixed'), type: 'neutral' });
            }
        } else {
            // Fallback for Mock Data (No MA) - Use Change % Intensity
            if (change > 3.0) {
                 analysis.push({ text: this.$t('stockCard.analysisStrongBullish'), type: 'bullish' });
            } else if (change > 0.5) {
                 analysis.push({ text: this.$t('stockCard.analysisPositiveBullish'), type: 'bullish' });
            } else if (change < -3.0) {
                 analysis.push({ text: this.$t('stockCard.analysisStrongBearish'), type: 'bearish' });
            } else if (change < -0.5) {
                 analysis.push({ text: this.$t('stockCard.analysisMinorBearish'), type: 'bearish' });
            } else {
                 analysis.push({ text: this.$t('stockCard.analysisRangingNeutral'), type: 'neutral' });
            }
        }

        // 2. Momentum / Volume Analysis
        if (avgVolume > 0 && volume > avgVolume * 1.5) {
             const direction = change > 0 ? this.$t('stockCard.buyingPressure') : this.$t('stockCard.sellingPressure');
             analysis.push({ text: this.$t('stockCard.analysisVolumeSpike', { direction }), type: change > 0 ? 'bullish' : 'bearish' });
        } else if (Math.abs(change) > 2.0) {
             const sentiment = change > 0 ? this.$t('stockCard.sentimentPositive') : this.$t('stockCard.sentimentNegative');
             analysis.push({ text: this.$t('stockCard.analysisMomentumAccelerating', { sentiment }), type: change > 0 ? 'bullish' : 'bearish' });
        } else {
             analysis.push({ text: this.$t('stockCard.analysisVolatilityNormal'), type: 'neutral' });
        }
        
        return analysis;
    }
  }
}
</script>

<style scoped>
/* Stock Card Pair Container */
.stock-card-pair {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  transition: all var(--transition-base);
  position: relative;
  width: 100%;
  scroll-margin-top: 80px;
  box-shadow: var(--shadow-md);
}

/* Keyboard-selected state (j/k navigation). 2px ring using the accent
   colour so it reads well in both light and dark themes. */
.stock-card-pair.is-selected {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  box-shadow: var(--shadow-md), 0 0 0 1px var(--primary-color);
}

/* Stock Info Header */
.stock-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.symbol-info .symbol {
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--text-primary);
  margin: 0 0 var(--space-2) 0;
}

.symbol-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--space-2);
}

.symbol-wrapper .symbol {
  margin: 0; /* Remove bottom margin as it is handled by wrapper */
}

.realtime-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted); /* Subtle color */
  opacity: 0.6;
  transition: all var(--transition-base) ease;
  padding: 4px;
  border-radius: var(--radius-xs);
}

.realtime-btn:hover {
  opacity: 1;
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}

.symbol-tags {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}

.exchange-tag {
  font-size: var(--text-xs);
  color: var(--tag-text-blue);
  background-color: var(--tag-bg-blue);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  font-weight: var(--weight-medium);
  border: 1px solid transparent;
}

.industry-tag {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  font-weight: var(--weight-medium);
  border: 1px solid transparent;
}

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

/* Orphaned .detail-btn styles removed */

.btn-icon {
  font-size: var(--text-md);
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

/* Widgets Container */
.widgets-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-6);
  margin-bottom: 0px; 
  min-height: 450px; 
  will-change: transform; 
}

.widget-overview,
.widget-technical {
  background: var(--bg-card); /* Should match card bg or slightly different? Usually plain bg is fine */
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
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
  background: transparent;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0; 
}

.widget-header h4 {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
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

/* Trading Analysis Section */
.trading-analysis-section {
  margin-top: var(--space-6);
  margin-bottom: var(--space-2);
}

.analysis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
}

.analysis-header h5 {
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    color: var(--text-primary);
    margin: 0;
}

.trend-badge {
    font-size: var(--text-xs);
    padding: 2px 8px;
    border-radius: var(--radius-xs);
    font-weight: var(--weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
/* Colors now handled by global utilities: .tag-green, .tag-red, .tag-gray */


.analysis-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.analysis-point {
    padding: 0.8rem var(--space-4);
    background: rgba(0, 0, 0, 0.02); /* Very subtle background */
    border-radius: var(--radius-xs);
    font-size: var(--text-base);
    color: var(--text-secondary);
    line-height: 1.5;
}

/* Dark mode adjustment for very subtle background */
@media (prefers-color-scheme: dark) {
    .analysis-point {
        background: rgba(255, 255, 255, 0.03); 
    }
}

/* Dynamic Accent Colors */
.analysis-point.bullish { border-left-color: var(--success-color); }
.analysis-point.bearish { border-left-color: var(--error-color); }
.analysis-point.neutral { border-left-color: var(--text-muted); }

.additional-info {
  /* margin-bottom: var(--space-4); Removed logic */ 
}

/* Stale Data Banner — top of card, full width, prominent */
.stale-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.6rem var(--space-4);
  margin-bottom: var(--space-4);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  /* Default: less-severe ('stale') uses the warning palette */
  background-color: var(--warning-bg);
  color: var(--warning-fg);
  border: 1px solid var(--warning-solid);
}

/* Severe staleness uses the danger palette so the banner reads urgently */
.stale-banner.stale-banner-very_stale {
  background-color: var(--danger-bg);
  color: var(--danger-fg);
  border-color: var(--danger-border);
}

.stale-banner-icon {
  font-size: var(--text-md);
  line-height: 1;
}

.stale-banner-text {
  flex: 1;
  line-height: 1.4;
}

/* Technical Analysis 仿照 Symbol Overview 樣式 */
.technical-overview-style {
  background: transparent !important;
  padding: 0px !important; 
  box-sizing: border-box !important;
}

/* Technical Analysis loading 狀態調整 - Override */
.technical-overview-style .fast-loading {
  background: var(--bg-card); 
  border-radius: 0; 
  margin: 0; 
}

/* 響應式設計 */

/* 大螢幕 (桌機) - 1200px 以上 */
@media (min-width: 1201px) {
  .stock-card-pair {
    padding: var(--space-8);
  }
  
  .symbol-info .symbol {
    font-size: var(--text-xl);
  }
  
  .widgets-container {
    gap: var(--space-8);
  }
}

/* 類似 StockDetail: 1200px 以下就轉為單欄，避免 Technical Widget 過窄出現卷軸 */
@media (max-width: 1200px) {
  .stock-card-pair {
    padding: var(--space-6);
  }

  .widgets-container {
    grid-template-columns: 1fr; /* Switch to 1 column earlier */
    gap: var(--space-6);
  }

  /* 讓 Overview 和 Technical 高度一致或自適應 */
  .widget-overview,
  .widget-technical {
    min-height: 450px;
    height: 450px;
  }
}

/* 中小螢幕調整 - 768px 以下 */
@media (max-width: 767px) {
  .stock-card-pair {
    padding: var(--space-4);
  }
  
  .stock-info-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .btn-renaissance {
    padding: 0.4rem 0.8rem;
    font-size: var(--text-sm);
  }
  
  .symbol-info .symbol {
    font-size: var(--text-lg);
  }
  
  /* 手機版：widgets 垂直排列 */
  .widgets-container {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  .widget-overview {
    height: 380px; 
    min-height: 380px;
  }
  
  .widget-technical {
    height: 380px; 
    min-height: 380px;
  }
  
  .widget-header h4 {
    font-size: var(--text-base);
  }
}

/* 極小螢幕 (小手機) - 480px 以下 */
@media (max-width: 480px) {
  .stock-card-pair {
    padding: var(--space-3);
  }
  
  .symbol-info .symbol {
    font-size: var(--text-lg);
  }
  
  .exchange-tag,
  .industry-tag {
    font-size: var(--text-xs);
    padding: 0.2rem 0.4rem;
  }
  
  .widgets-container {
    gap: var(--space-3);
  }
  
  .widget-overview {
    height: 330px; 
    min-height: 330px;
  }
  
  .widget-technical {
    height: 330px; 
    min-height: 330px;
  }
  
  .widget-header {
    padding: var(--space-2) var(--space-3);
  }
}
</style>