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
        <div class="symbol-wrapper">
          <h3 class="symbol">{{ quote.symbol }}</h3>
          <a :href="`https://finance.yahoo.com/chart/${quote.symbol}`" target="_blank" rel="noopener noreferrer" class="realtime-btn" title="View Realtime Chart on Yahoo Finance">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        </div>
        <div class="symbol-tags">
          <span class="exchange-tag">{{ getExchange() }}</span>
          <span class="industry-tag" :class="`industry-${getIndustryCategory()}`">{{ getIndustry() }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-renaissance" @click.stop="goToDetail" :title="`View detailed analysis for ${quote.symbol}`">
            Detail <span>→</span>
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
            <h5>Trading Analysis</h5>
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
        
        if (change > 0.5) return 'Bullish';
        if (change < -0.5) return 'Bearish';
        return 'Neutral';
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
                analysis.push({ text: "Primary trend is bullish; price is sustaining above key moving averages.", type: 'bullish' });
            } else if (price < fiftyDayAverage && price < twoHundredDayAverage) {
                analysis.push({ text: "Primary trend is bearish, trading below major resistance levels.", type: 'bearish' });
            } else if (Math.abs(change) < 0.5) {
                analysis.push({ text: "Price action is consolidating sideways, awaiting a directional catalyst.", type: 'neutral' });
            } else {
                analysis.push({ text: "Market structure is mixed; monitor local support levels closely.", type: 'neutral' });
            }
        } else {
            // Fallback for Mock Data (No MA) - Use Change % Intensity
            if (change > 3.0) {
                 analysis.push({ text: "Strong bullish momentum detected; price is surging significantly.", type: 'bullish' });
            } else if (change > 0.5) {
                 analysis.push({ text: "Positive price action observed; trend inclination is bullish.", type: 'bullish' });
            } else if (change < -3.0) {
                 analysis.push({ text: "Strong bearish pressure; sharp decline suggests caution.", type: 'bearish' });
            } else if (change < -0.5) {
                 analysis.push({ text: "Minor weakness in price action; short-term bias is bearish.", type: 'bearish' });
            } else {
                 analysis.push({ text: "Price is ranging tightly; market sentiment appears neutral.", type: 'neutral' });
            }
        }
        
        // 2. Momentum / Volume Analysis
        if (avgVolume > 0 && volume > avgVolume * 1.5) {
             const direction = change > 0 ? "buying pressure" : "selling pressure";
             analysis.push({ text: `Significant volume spike detected, indicating strong ${direction}.`, type: change > 0 ? 'bullish' : 'bearish' });
        } else if (Math.abs(change) > 2.0) {
             const sentiment = change > 0 ? "Positive" : "Negative";
             analysis.push({ text: `${sentiment} momentum is accelerating in the short term.`, type: change > 0 ? 'bullish' : 'bearish' });
        } else {
             analysis.push({ text: "Volatility remains within standard ranges.", type: 'neutral' });
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
  padding: 1.5rem;
  transition: all 0.2s;
  position: relative;
  width: 100%;
  scroll-margin-top: 80px; 
  box-shadow: var(--shadow-md);
}

/* Stock Info Header */
.stock-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.symbol-info .symbol {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.symbol-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0.5rem;
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
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 4px;
}

.realtime-btn:hover {
  opacity: 1;
  color: var(--text-primary);
  background-color: var(--bg-secondary);
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
}

.industry-tag {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  border: 1px solid transparent;
}

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Orphaned .detail-btn styles removed */

.btn-icon {
  font-size: 1rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

/* Widgets Container */
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
  background: var(--bg-card); /* Should match card bg or slightly different? Usually plain bg is fine */
  border: 1px solid var(--border-color);
  border-radius: 8px;
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
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0; 
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

/* Trading Analysis Section */
.trading-analysis-section {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.analysis-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
}

.analysis-header h5 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.trend-badge {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
/* Colors now handled by global utilities: .tag-green, .tag-red, .tag-gray */


.analysis-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.analysis-point {
    padding: 0.8rem 1rem;
    background: rgba(0, 0, 0, 0.02); /* Very subtle background */
    border-radius: 4px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    border-left: 3px solid var(--border-color);
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
  /* margin-bottom: 1rem; Removed logic */ 
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
  background-color: var(--tag-bg-red);
  color: var(--tag-text-red);
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
    padding: 2rem;
  }
  
  .symbol-info .symbol {
    font-size: 1.6rem;
  }
  
  .widgets-container {
    gap: 2rem;
  }
}

/* 類似 StockDetail: 1200px 以下就轉為單欄，避免 Technical Widget 過窄出現卷軸 */
@media (max-width: 1200px) {
  .stock-card-pair {
    padding: 1.5rem;
  }

  .widgets-container {
    grid-template-columns: 1fr; /* Switch to 1 column earlier */
    gap: 1.5rem;
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
  
  .btn-renaissance {
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
    height: 380px; 
    min-height: 380px;
  }
  
  .widget-technical {
    height: 380px; 
    min-height: 380px;
  }
  
  .widget-header h4 {
    font-size: 0.9rem;
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
    height: 330px; 
    min-height: 330px;
  }
  
  .widget-technical {
    height: 330px; 
    min-height: 330px;
  }
  
  .widget-header {
    padding: 0.5rem 0.75rem;
  }
}
</style>