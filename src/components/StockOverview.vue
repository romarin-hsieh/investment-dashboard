<template>
  <div class="stock-overview">
    <div class="stock-header">
      <h2>Stock Overview</h2>
      <div class="header-right">
        <div class="update-info" v-if="lastUpdate">
          <span class="text-muted">Last updated: {{ formatTime(lastUpdate) }}</span>
        </div>
      </div>
    </div>
    
    <p class="text-muted mb-3">Stock universe overview and analysis</p>



    <div v-if="loading" class="loading-with-skeleton">
      <SkeletonLoader />
    </div>

    <div v-else-if="error" class="error">
      <p class="text-danger">{{ error }}</p>
      <button @click="refresh" class="btn btn-secondary">Retry</button>
    </div>

    <div v-else>
      <!-- Market Index Section - 複製自 Market Overview -->
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
      
      <!-- Sector Groups -->
      <div class="sector-groups">
        <div 
          v-for="(group, sector) in groupedStocks" 
          :key="sector"
          class="sector-group"
        >
          <h4 class="sector-title">
            {{ sector }}
            <span class="stock-count">({{ group.length }})</span>
          </h4>
          
          <div class="stocks-in-group">
            <StockCard
              v-for="stock in group"
              :key="stock.quote.symbol"
              :quote="stock.quote"
              :daily-data="stock.dailyData"
              :metadata="stock.metadata"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && Object.keys(groupedStocks).length === 0" class="no-data">
      <p>No stock data available</p>
    </div>
  </div>
</template>

<script>
import { dataFetcher } from '@/lib/fetcher'
import { stocksConfig } from '@/utils/stocksConfigService'
import StockCard from './StockCard.vue'
import LazyTradingViewWidget from './LazyTradingViewWidget.vue'
import SkeletonLoader from './SkeletonLoader.vue'
import { metadataService } from '@/utils/metadataService.js'
import { performanceCache, CACHE_KEYS, CACHE_TTL } from '@/utils/performanceCache.js'
import { performanceMonitor, PERFORMANCE_LABELS } from '@/utils/performanceMonitor.js'

// 配置常數 - 集中管理，易於維護
const STOCK_OVERVIEW_CONFIG = {
  // 交易所代碼映射
  EXCHANGE_CODE_MAP: {
    'NYQ': 'NYSE',    // New York Stock Exchange
    'NMS': 'NASDAQ',  // NASDAQ Global Select Market
    'NCM': 'NASDAQ',  // NASDAQ Capital Market
    'NGM': 'NASDAQ',  // NASDAQ Global Market
    'ASE': 'AMEX',    // American Stock Exchange
    'AMEX': 'AMEX'    // American Stock Exchange
  },
  
  // Symbol 到交易所的映射（備用方案）
  SYMBOL_EXCHANGE_MAP: {
    // NYSE symbols
    'ORCL': 'NYSE', 'TSM': 'NYSE', 'RDW': 'NYSE', 'CRM': 'NYSE', 'PL': 'NYSE',
    'LEU': 'NYSE', 'SMR': 'NYSE', 'IONQ': 'NYSE', 'HIMS': 'NYSE', 'VST': 'NYSE',
    'RBRK': 'NYSE', 'OKLO': 'NYSE', 'PATH': 'NYSE', 'SE': 'NYSE', 'NU': 'NYSE',
    'CRCL': 'NYSE', 'VRT': 'NYSE', 'ETN': 'NYSE', 'FIG': 'NYSE', 'ZETA': 'NYSE',
    'MP': 'NYSE',
    
    // NASDAQ symbols
    'ASTS': 'NASDAQ', 'RIVN': 'NASDAQ', 'ONDS': 'NASDAQ', 'AVAV': 'NASDAQ',
    'MDB': 'NASDAQ', 'RKLB': 'NASDAQ', 'NVDA': 'NASDAQ', 'AVGO': 'NASDAQ',
    'AMZN': 'NASDAQ', 'GOOG': 'NASDAQ', 'META': 'NASDAQ', 'NFLX': 'NASDAQ',
    'CRWV': 'NASDAQ', 'PLTR': 'NASDAQ', 'TSLA': 'NASDAQ', 'KTOS': 'NASDAQ',
    'MELI': 'NASDAQ', 'SOFI': 'NASDAQ', 'EOSE': 'NASDAQ', 'CEG': 'NASDAQ',
    'TMDX': 'NASDAQ', 'GRAB': 'NASDAQ', 'RBLX': 'NASDAQ', 'IREN': 'NASDAQ',
    'INTR': 'NASDAQ', 'KSPI': 'NASDAQ', 'LUNR': 'NASDAQ', 'HOOD': 'NASDAQ',
    'APP': 'NASDAQ', 'CHYM': 'NASDAQ', 'COIN': 'NASDAQ', 'IBKR': 'NASDAQ',
    'CCJ': 'NASDAQ', 'MSFT': 'NASDAQ', 'ADBE': 'NASDAQ', 'PAWN': 'NASDAQ',
    'CRWD': 'NASDAQ', 'DDOG': 'NASDAQ', 'DUOL': 'NASDAQ', 'AXON': 'NASDAQ',
    'ALAB': 'NASDAQ', 'LRCX': 'NASDAQ', 'BWXT': 'NASDAQ', 'RR': 'NASDAQ',
    
    // AMEX symbols
    'UUUU': 'AMEX', 'UMAC': 'AMEX'
  },
  
  // 預設交易所
  DEFAULT_EXCHANGE: 'NASDAQ',
  
  // 最低信心度閾值
  MIN_CONFIDENCE_THRESHOLD: 0.7,
  
  // Market Index 配置
  MARKET_INDEX_CONFIG: {
    "symbols": [
      {"proName": "FOREXCOM:SPXUSD","title": "S&P 500 Index"},
      {"proName": "NASDAQ:NDX","title": "NASDAQ 100 Index"},
      {"proName": "OPOFINANCE:DJIUSD","title": "Dow Jone Index"},
      {"proName": "CAPITALCOM:RTY","title": "US Russel 2000"},
      {"proName": "INDEX:BTCUSD","title": "BTC"},
      {"proName": "TVC:GOLD","title": "GOLD"}
    ],
    "colorTheme": "light",
    "locale": "en",
    "largeChartUrl": "",
    "isTransparent": true,
    "showSymbolLogo": true
  }
}

export default {
  name: 'StockOverview',
  components: {
    StockCard,
    LazyTradingViewWidget,
    SkeletonLoader
  },
  data() {
    return {
      quotes: [],
      dailyData: null,
      metadata: null,
      loading: false,
      error: null,
      lastUpdate: null,
      staleLevel: 'fresh',
      configuredSymbols: [],
      configSource: 'static',
      cacheInfo: {},
      // 分階段載入狀態
      loadingStages: {
        config: false,
        quotes: false,
        dailyData: false,
        metadata: false
      }
    }
  },
  computed: {
    tickersConfig() {
      return STOCK_OVERVIEW_CONFIG.MARKET_INDEX_CONFIG
    },

    groupedStocks() {
      if (!this.quotes.length || !this.metadata) {
        return {}
      }
      
      const groups = {}
      
      this.quotes.forEach(quote => {
        const symbolMetadata = this.metadata.items.find(m => m.symbol === quote.symbol)
        const symbolDailyData = this.dailyData?.per_symbol.find(d => d.symbol === quote.symbol)
        
        // 根據 PRD 要求：confidence >= 0.7 歸類為對應 sector
        let sector = 'Unknown'
        if (symbolMetadata && symbolMetadata.confidence >= STOCK_OVERVIEW_CONFIG.MIN_CONFIDENCE_THRESHOLD) {
          sector = symbolMetadata.sector || 'Unknown'
        }
        
        if (!groups[sector]) {
          groups[sector] = []
        }
        
        groups[sector].push({
          quote,
          dailyData: symbolDailyData,
          metadata: symbolMetadata
        })
      })
      
      // 排序邏輯保持不變
      const sortedGroups = {}
      Object.keys(groups)
        .sort()
        .forEach(sector => {
          sortedGroups[sector] = groups[sector].sort((a, b) => {
            const exchangeA = this.getStockExchange(a.quote.symbol, a.metadata)
            const exchangeB = this.getStockExchange(b.quote.symbol, b.metadata)
            
            if (exchangeA !== exchangeB) {
              return exchangeA.localeCompare(exchangeB)
            }
            
            const industryA = this.getStockIndustry(a.metadata)
            const industryB = this.getStockIndustry(b.metadata)
            
            if (industryA !== industryB) {
              return industryA.localeCompare(industryB)
            }
            
            return a.quote.symbol.toUpperCase().localeCompare(b.quote.symbol.toUpperCase())
          })
        })
      
      return sortedGroups
    }
  },
  async mounted() {
    // 頁面載入時滾動到頂部
    this.scrollToTop()
    
    // 🔍 檢查是否需要強制刷新 (來自修復工具)
    const forceReload = sessionStorage.getItem('force_reload_stock_overview')
    const emergencyFix = sessionStorage.getItem('emergency_fix_applied')
    const targetedFix = sessionStorage.getItem('targeted_fix_applied')
    
    if (forceReload || emergencyFix || targetedFix) {
      console.log('🔄 Force reload detected, clearing all caches')
      performanceCache.delete(CACHE_KEYS.STOCK_OVERVIEW_DATA)
      performanceCache.delete(CACHE_KEYS.QUOTES_SNAPSHOT)
      performanceCache.delete(CACHE_KEYS.SYMBOLS_CONFIG)
      
      // 🚨 重要：也清除 stocksConfig 的內存緩存
      await stocksConfig.refresh()
      console.log('🗑️ StocksConfig cache cleared')
      
      // 清除標記以避免重複執行
      sessionStorage.removeItem('force_reload_stock_overview')
      if (emergencyFix) {
        console.log('🚨 Emergency fix applied at:', new Date(parseInt(emergencyFix)))
        sessionStorage.removeItem('emergency_fix_applied')
      }
      if (targetedFix) {
        console.log('🎯 Targeted fix applied at:', new Date(parseInt(targetedFix)))
        sessionStorage.removeItem('targeted_fix_applied')
      }
    }
    
    performanceMonitor.start(PERFORMANCE_LABELS.STOCK_OVERVIEW_LOAD)
    
    await this.loadSymbolsConfig()
    await this.loadStockData()
    
    performanceMonitor.end(PERFORMANCE_LABELS.STOCK_OVERVIEW_LOAD)
    
    // 生成性能報告
    const report = performanceMonitor.generateReport()
    performanceMonitor.checkPerformanceWarnings()
  },
  watch: {
    $route() {
      // 當路由改變時，滾動到頂部
      this.scrollToTop()
    }
  },
  methods: {
    async loadSymbolsConfig() {
      this.loadingStages.config = true
      try {
        await performanceMonitor.measureAsync(PERFORMANCE_LABELS.SYMBOLS_CONFIG_LOAD, async () => {
          this.configuredSymbols = await stocksConfig.getEnabledSymbols()
          this.configSource = stocksConfig.getConfigSource()
          this.cacheInfo = stocksConfig.getCacheInfo()
        })
        
        console.log(`✅ Loaded ${this.configuredSymbols.length} symbols from ${this.configSource}:`, this.configuredSymbols)
        console.log('📊 Cache info:', this.cacheInfo)
        
        // 檢查是否有遺漏的股票 - 從 stocksConfig 獲取完整列表
        const allSymbols = await stocksConfig.getEnabledSymbols()
        const missingSymbols = allSymbols.filter(symbol => !this.configuredSymbols.includes(symbol))
        if (missingSymbols.length > 0) {
          console.warn('⚠️ Missing symbols:', missingSymbols)
        }
        
      } catch (error) {
        console.warn('❌ Failed to load stocks config:', error)
        this.configuredSymbols = await stocksConfig.getEnabledSymbols()
        this.configSource = 'fallback'
        this.cacheInfo = stocksConfig.getCacheInfo()
        console.log(`🔄 Fallback to emergency symbols (${this.configuredSymbols.length}):`, this.configuredSymbols)
      } finally {
        this.loadingStages.config = false
      }
    },

    async getStockExchange(symbol, metadata) {
      // 優先使用統一配置服務
      try {
        const exchange = await stocksConfig.getStockExchange(symbol)
        return exchange
      } catch (error) {
        console.warn(`Failed to get exchange for ${symbol}:`, error)
        
        // Fallback 到 metadata
        if (metadata && metadata.exchange) {
          return STOCK_OVERVIEW_CONFIG.EXCHANGE_CODE_MAP[metadata.exchange] || metadata.exchange
        }
        
        // 最終 fallback
        return STOCK_OVERVIEW_CONFIG.DEFAULT_EXCHANGE
      }
    },

    getStockIndustry(metadata) {
      if (!metadata) {
        console.warn('No metadata provided to getStockIndustry')
        return 'Unknown Industry'
      }
      
      // Debug logging for problematic symbols
      if (metadata.symbol && ['CRM', 'IONQ'].includes(metadata.symbol)) {
        console.log(`StockOverview - ${metadata.symbol} metadata:`, metadata)
        console.log(`StockOverview - ${metadata.symbol} confidence:`, metadata.confidence)
        console.log(`StockOverview - ${metadata.symbol} industry:`, metadata.industry)
        console.log(`StockOverview - ${metadata.symbol} sector:`, metadata.sector)
      }
      
      // 根據 PRD 要求，confidence < 0.7 歸類為 Unknown
      if (metadata.confidence < STOCK_OVERVIEW_CONFIG.MIN_CONFIDENCE_THRESHOLD) {
        console.warn(`Low confidence (${metadata.confidence}) for ${metadata.symbol}`)
        return 'Unknown Industry'
      }
      
      // 返回完整的 industry 信息，如果沒有則顯示 sector
      const result = metadata.industry || metadata.sector || 'Unknown Industry'
      
      // Debug logging for problematic symbols
      if (metadata.symbol && ['CRM', 'IONQ'].includes(metadata.symbol)) {
        console.log(`StockOverview - ${metadata.symbol} final industry result:`, result)
      }
      
      return result
    },

    async loadStockData() {
      this.loading = true
      this.error = null
      
      try {
        // 🚀 性能優化：檢查緩存中是否有完整的股票概覽數據
        const cachedData = performanceCache.get(CACHE_KEYS.STOCK_OVERVIEW_DATA)
        if (cachedData) {
          // 🔍 檢查緩存數據是否包含足夠的股票數量 (應該有 67 個)
          const expectedMinSymbols = 60 // 設置最小期望數量，允許一些容錯
          const cachedSymbolCount = cachedData.quotes ? cachedData.quotes.length : 0
          
          if (cachedSymbolCount >= expectedMinSymbols) {
            console.log(`📦 Using cached stock overview data (${cachedSymbolCount} symbols)`)
            this.quotes = cachedData.quotes
            this.dailyData = cachedData.dailyData
            this.metadata = cachedData.metadata
            this.lastUpdate = cachedData.lastUpdate
            this.staleLevel = cachedData.staleLevel
            this.loading = false
            return
          } else {
            console.warn(`🗑️ Cached data has insufficient symbols (${cachedSymbolCount} < ${expectedMinSymbols}), clearing cache`)
            performanceCache.delete(CACHE_KEYS.STOCK_OVERVIEW_DATA)
          }
        }

        // 🚀 性能優化：暫時禁用動態 API，使用靜態數據
        // 避免大量 Yahoo Finance API 請求導致載入緩慢
        metadataService.setUseDynamicAPI(false)
        
        // 分階段並行載入數據
        this.loadingStages.quotes = true
        this.loadingStages.dailyData = true
        
        const [quotesResult, dailyResult] = await Promise.all([
          dataFetcher.fetchQuotesSnapshot(),
          dataFetcher.fetchDailySnapshot()
        ])
        
        // 處理 quotes - 只顯示配置中的 symbols
        if (quotesResult.data && quotesResult.data.items) {
          // 過濾只顯示配置的 symbols
          const allQuotes = quotesResult.data.items
          this.quotes = allQuotes.filter(quote => 
            this.configuredSymbols.includes(quote.symbol)
          )
          
          console.log(`📈 Total quotes available: ${allQuotes.length}`)
          console.log(`🎯 Filtered quotes for configured symbols: ${this.quotes.length}`)
          console.log(`📋 Quote symbols:`, this.quotes.map(q => q.symbol).sort())
          
          this.lastUpdate = quotesResult.as_of
          this.staleLevel = quotesResult.stale_level
        }
        this.loadingStages.quotes = false
        
        // 處理 daily data
        if (dailyResult.data) {
          this.dailyData = dailyResult.data
        }
        this.loadingStages.dailyData = false
        
        // 獲取所有股票的 metadata (使用直接載入器)
        if (this.quotes.length > 0) {
          this.loadingStages.metadata = true
          const symbols = this.quotes.map(quote => quote.symbol)
          
          // 使用直接載入器
          const { directMetadataLoader } = await import('@/utils/directMetadataLoader.js')
          const metadataMap = await directMetadataLoader.getBatchMetadata(symbols)
          
          // 轉換為原有格式以保持兼容性
          this.metadata = {
            items: Array.from(metadataMap.values()),
            as_of: new Date().toISOString(),
            source: 'DirectMetadataLoader'
          }
          
          this.loadingStages.metadata = false
        }
        
        // 🚀 緩存完整的股票概覽數據
        const dataToCache = {
          quotes: this.quotes,
          dailyData: this.dailyData,
          metadata: this.metadata,
          lastUpdate: this.lastUpdate,
          staleLevel: this.staleLevel
        }
        performanceCache.set(CACHE_KEYS.STOCK_OVERVIEW_DATA, dataToCache, CACHE_TTL.QUOTES)
        console.log('💾 Cached stock overview data for future use')
        
        // 如果沒有任何數據，顯示錯誤
        if (!this.quotes.length && !this.dailyData && !this.metadata) {
          throw new Error('No stock data available')
        }
        
      } catch (err) {
        this.error = String(err)
        console.error('Failed to load stock data:', err)
        // 重置所有載入狀態
        Object.keys(this.loadingStages).forEach(key => {
          this.loadingStages[key] = false
        })
      } finally {
        this.loading = false
      }
    },

    async refresh() {
      // 清除緩存以強制重新載入
      performanceCache.delete(CACHE_KEYS.STOCK_OVERVIEW_DATA)
      console.log('🗑️ Cleared stock overview cache')
      
      // 🚨 重要：也清除 stocksConfig 的內存緩存
      await stocksConfig.refresh()
      console.log('🗑️ Cleared stocksConfig cache')
      
      // 手動刷新 symbols 配置快取
      await this.loadSymbolsConfig()
      await this.loadStockData()
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

    formatTime(timeString) {
      if (!timeString) return ''
      
      try {
        const date = new Date(timeString)
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch {
        return timeString
      }
    }
  }
}
</script>

<style scoped>
.stock-overview {
  margin-bottom: 1rem;
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.stock-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin: 0;
  flex-shrink: 0;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.header-right .text-muted {
  margin: 0;
  font-size: 0.9rem;
}

.header-right .mb-3 {
  margin-bottom: 0;
}

.config-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.config-source {
  color: #007bff;
  font-weight: 500;
}

.symbols-count {
  color: #6c757d;
  font-style: italic;
}

.cache-info {
  color: #28a745;
  font-weight: 500;
  font-size: 0.8rem;
}

.update-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.9rem;
}

/* 統一的 Widget 容器樣式 */
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
  background: #f8f9fa;
  margin: -1rem -1rem 1rem -1rem; /* 負邊距讓 header 延伸到容器邊緣 */
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e9ecef;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.widget-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.sector-groups {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.sector-group {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
}

.sector-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stock-count {
  font-size: 0.8rem;
  color: #666;
  font-weight: 400;
}

/* Stock Cards Grid Layout */
.stocks-in-group {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 每個 StockCard 現在是一個完整的行，包含兩個 widgets */
.stocks-in-group > * {
  width: 100%;
}

/* 禁用 stocks-in-group 的 hover 效果 */
.stocks-in-group:hover {
  /* 移除任何 hover 效果 */
}

.loading-with-skeleton {
  /* 骨架屏載入容器 */
}

.error {
  text-align: center;
  padding: 2rem;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  margin: 1rem 0;
}

.no-data {
  text-align: center;
  padding: 3rem;
  color: #666;
  background-color: #f8f9fa;
  border-radius: 8px;
}

/* 響應式設計 */

/* 大螢幕 (桌機) - 1200px 以上 */
@media (min-width: 1200px) {
  .stocks-in-group {
    gap: 2.5rem;
  }
  
  .sector-group {
    padding: 2rem;
  }
}

/* 中等螢幕 (平板橫向) - 768px 到 1199px */
@media (min-width: 768px) and (max-width: 1199px) {
  .stocks-in-group {
    gap: 2rem;
  }
  
  .sector-group {
    padding: 1.5rem;
  }
}

/* 小螢幕 (平板直向和手機) - 768px 以下 */
@media (max-width: 767px) {
  .stock-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .update-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .stocks-in-group {
    gap: 1.5rem;
  }
  
  .sector-group {
    padding: 1rem;
    margin: 0 -0.5rem; /* 讓 sector group 稍微延伸到邊緣 */
  }
  
  .sector-title {
    font-size: 1rem;
  }
}

/* 極小螢幕 (小手機) - 480px 以下 */
@media (max-width: 480px) {
  .stock-overview {
    margin-bottom: 1rem;
  }
  
  .sector-groups {
    gap: 1.5rem;
  }
  
  .sector-group {
    padding: 0.75rem;
    margin: 0 -0.25rem;
  }
  
  .stocks-in-group {
    gap: 1rem;
  }
}
</style>