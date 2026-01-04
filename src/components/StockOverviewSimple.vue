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

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading stock data...</p>
    </div>

    <div v-else-if="error" class="error">
      <p class="text-danger">{{ error }}</p>
      <button @click="refresh" class="btn btn-secondary">Retry</button>
    </div>

    <div v-else>
      <!-- Market Index Section -->
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
import { stocksConfig } from '@/utils/stocksConfigService'
import StockCard from './StockCard.vue'
import LazyTradingViewWidget from './LazyTradingViewWidget.vue'
import { directMetadataLoader } from '@/utils/directMetadataLoader.js'

export default {
  name: 'StockOverviewSimple',
  components: {
    StockCard,
    LazyTradingViewWidget
  },
  data() {
    return {
      quotes: [],
      dailyData: null,
      metadata: null,
      loading: false,
      error: null,
      lastUpdate: null,
      configuredSymbols: []
    }
  },
  computed: {
    tickersConfig() {
      return {
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
    },

    groupedStocks() {
      if (!this.quotes.length || !this.metadata) {
        return {}
      }
      
      const groups = {}
      
      this.quotes.forEach(quote => {
        const symbolMetadata = this.metadata.items.find(m => m.symbol === quote.symbol)
        const symbolDailyData = this.dailyData?.per_symbol?.find(d => d.symbol === quote.symbol)
        
        let sector = 'Unknown'
        if (symbolMetadata && symbolMetadata.confidence >= 0.7) {
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
      
      // 排序
      const sortedGroups = {}
      Object.keys(groups)
        .sort()
        .forEach(sector => {
          sortedGroups[sector] = groups[sector].sort((a, b) => {
            return a.quote.symbol.localeCompare(b.quote.symbol)
          })
        })
      
      return sortedGroups
    }
  },
  async mounted() {
    await this.loadStockData()
  },
  methods: {
    async loadStockData() {
      this.loading = true
      this.error = null
      
      try {
        console.log('🚀 Starting simple stock data load...')
        
        // 1. 載入配置
        this.configuredSymbols = await stocksConfig.getEnabledSymbols()
        console.log(`✅ Loaded ${this.configuredSymbols.length} symbols from config`)
        
        // 2. 直接載入 quotes 數據
        const quotesResponse = await fetch('/data/quotes/latest.json?t=' + Date.now())
        if (!quotesResponse.ok) {
          throw new Error(`Failed to load quotes: HTTP ${quotesResponse.status}`)
        }
        
        const quotesData = await quotesResponse.json()
        if (quotesData.items) {
          this.quotes = quotesData.items.filter(quote => 
            this.configuredSymbols.includes(quote.symbol)
          )
          this.lastUpdate = quotesData.as_of
          console.log(`✅ Loaded ${this.quotes.length} quotes`)
        }
        
        // 3. 直接載入 daily 數據
        const dailyResponse = await fetch('/data/daily/2025-12-28.json?t=' + Date.now())
        if (dailyResponse.ok) {
          this.dailyData = await dailyResponse.json()
          console.log(`✅ Loaded daily data`)
        }
        
        // 4. 使用 DirectMetadataLoader 載入元數據 (已優化去重和緩存)
        try {
          this.metadata = await directMetadataLoader.loadMetadata()
          if (this.metadata && this.metadata.items) {
             console.log(`✅ Loaded metadata for ${this.metadata.items.length} symbols`)
          }
        } catch (metaError) {
          console.warn('❌ Failed to load metadata via loader:', metaError)
        }
        
        console.log('✅ Simple stock data load completed successfully!')
        
      } catch (err) {
        this.error = String(err)
        console.error('❌ Simple stock data load failed:', err)
      } finally {
        this.loading = false
      }
    },

    async refresh() {
      await this.loadStockData()
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

.loading {
  text-align: center;
  padding: 3rem;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
  margin: -1rem -1rem 1rem -1rem;
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

.stocks-in-group {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.stocks-in-group > * {
  width: 100%;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.text-muted {
  color: #6c757d;
}

.text-danger {
  color: #dc3545;
}

.mb-3 {
  margin-bottom: 1rem;
}

@media (max-width: 767px) {
  .stock-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .sector-group {
    padding: 1rem;
    margin: 0 -0.5rem;
  }
  
  .stocks-in-group {
    gap: 1.5rem;
  }
}

@media (max-width: 480px) {
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