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

    <div v-else class="main-layout">
      <!-- Navigation Panel (Desktop) -->
      <NavigationPanel
        :toc-tree="tocTree"
        :active-symbol="activeSymbol"
        :search-query="searchQuery"
        :is-visible="true"
        @symbol-click="onSymbolClick"
        @search-change="onSearchChange"
        class="navigation-sidebar"
      />

      <!-- Main Content -->
      <div class="main-content">
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
import NavigationPanel from './NavigationPanel.vue'
import { navigationService } from '@/services/NavigationService.js'
import { scrollSpyService } from '@/services/ScrollSpyService.js'

export default {
  name: 'StockOverview',
  components: {
    StockCard,
    LazyTradingViewWidget,
    NavigationPanel
  },
  data() {
    return {
      quotes: [],
      dailyData: null,
      metadata: null,
      loading: false,
      error: null,
      lastUpdate: null,
      configuredSymbols: [],
      // Navigation state
      activeSymbol: '',
      searchQuery: ''
      // 移除 expandedSections，因為不再需要展開/收合功能
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
      
      // 自訂 Sector 排序順序
      const sectorPriority = [
        'Technology',
        'Financial Services',
        'Consumer Cyclical',
        'Communication Services',
        'Healthcare',
        'Industrials',
        'Consumer Defensive',
        'Energy',
        'Basic Materials',
        'Real Estate',
        'Utilities'
      ]
      
      // 自訂 Industry 排序順序 (按 sector 分組)
      const industryPriority = {
        'Technology': [
          'Semiconductors',
          'Software - Infrastructure',
          'Consumer Electronics',
          'Software - Application',
          'Information Technology Services',
          'Semiconductor Equipment & Materials',
          'Communication Equipment',
          'Computer Hardware',
          'Electronic Components',
          'Scientific & Technical Instruments',
          'Solar',
          'Electronics & Computer Distribution'
        ],
        'Financial Services': [
          'Banks - Diversified',
          'Credit Services',
          'Asset Management',
          'Capital Markets',
          'Insurance - Diversified',
          'Banks - Regional',
          'Financial Data & Stock Exchanges',
          'Insurance - Property & Casualty',
          'Insurance Brokers',
          'Insurance - Life',
          'Insurance - Specialty',
          'Mortgage Finance',
          'Insurance - Reinsurance',
          'Financial Conglomerates',
          'Shell Companies'
        ],
        'Consumer Cyclical': [
          'Internet Retail',
          'Auto Manufacturers',
          'Restaurants',
          'Home Improvement Retail',
          'Travel Services',
          'Apparel Retail',
          'Auto Parts',
          'Specialty Retail',
          'Lodging',
          'Residential Construction',
          'Auto & Truck Dealerships',
          'Packaging & Containers',
          'Footwear & Accessories',
          'Resorts & Casinos',
          'Gambling',
          'Leisure',
          'Apparel Manufacturing',
          'Furnishings, Fixtures & Appliances',
          'Personal Services',
          'Luxury Goods',
          'Recreational Vehicles',
          'Department Stores',
          'Education & Training Services'
        ],
        'Communication Services': [
          'Internet Content & Information',
          'Telecom Services',
          'Entertainment',
          'Advertising Agencies',
          'Electronic Gaming & Multimedia',
          'Publishing',
          'Broadcasting'
        ],
        'Healthcare': [
          'Drug Manufacturers - General',
          'Biotechnology',
          'Medical Devices',
          'Diagnostics & Research',
          'Healthcare Plans',
          'Medical Instruments & Supplies',
          'Medical Distribution',
          'Medical Care Facilities',
          'Drug Manufacturers - Specialty & Generic',
          'Health Information Services',
          'Pharmaceutical Retailers'
        ],
        'Industrials': [
          'Aerospace & Defense',
          'Specialty Industrial Machinery',
          'Farm & Heavy Construction Machinery',
          'Railroads',
          'Engineering & Construction',
          'Building Products & Equipment',
          'Specialty Business Services',
          'Waste Management',
          'Industrial Distribution',
          'Conglomerates',
          'Integrated Freight & Logistics',
          'Electrical Equipment & Parts',
          'Rental & Leasing Services',
          'Airlines',
          'Trucking',
          'Consulting Services',
          'Tools & Accessories',
          'Metal Fabrication',
          'Pollution & Treatment Controls',
          'Security & Protection Services',
          'Marine Shipping',
          'Airports & Air Services',
          'Staffing & Employment Services',
          'Business Equipment & Supplies',
          'Infrastructure Operations'
        ],
        'Consumer Defensive': [
          'Discount Stores',
          'Beverages - Non-Alcoholic',
          'Household & Personal Products',
          'Tobacco',
          'Packaged Foods',
          'Confectioners',
          'Farm Products',
          'Food Distribution',
          'Grocery Stores',
          'Education & Training Services',
          'Beverages - Brewers',
          'Beverages - Wineries & Distilleries'
        ],
        'Energy': [
          'Oil & Gas Integrated',
          'Oil & Gas Midstream',
          'Oil & Gas E&P',
          'Oil & Gas Equipment & Services',
          'Oil & Gas Refining & Marketing',
          'Uranium',
          'Oil & Gas Drilling',
          'Thermal Coal',
          'Utilities - Independent Power Producers'
        ],
        'Basic Materials': [
          'Gold',
          'Specialty Chemicals',
          'Building Materials',
          'Copper',
          'Steel',
          'Agricultural Inputs',
          'Other Industrial Metals & Mining',
          'Chemicals',
          'Other Precious Metals & Mining',
          'Aluminum',
          'Lumber & Wood Production',
          'Silver',
          'Coking Coal',
          'Paper & Paper Products'
        ],
        'Real Estate': [
          'REIT - Specialty',
          'REIT - Industrial',
          'REIT - Healthcare Facilities',
          'REIT - Retail',
          'REIT - Residential',
          'Real Estate Services',
          'REIT - Mortgage',
          'REIT - Office',
          'REIT - Diversified',
          'REIT - Hotel & Motel',
          'Real Estate - Development',
          'Real Estate - Diversified'
        ],
        'Utilities': [
          'Utilities - Regulated Electric',
          'Utilities - Independent Power Producers',
          'Utilities - Regulated Gas',
          'Utilities - Diversified',
          'Utilities - Renewable',
          'Utilities - Regulated Water'
        ]
      }
      
      // 按自訂順序排序，只顯示有股票的 sector
      const sortedGroups = {}
      
      // 1. 先按優先順序添加有股票的 sector
      sectorPriority.forEach(sector => {
        if (groups[sector] && groups[sector].length > 0) {
          // 在每個 sector 內按 industry 排序
          const sectorIndustryPriority = industryPriority[sector] || []
          
          // 按 industry 分組
          const industryGroups = {}
          groups[sector].forEach(stock => {
            const industry = stock.metadata?.industry || 'Unknown Industry'
            if (!industryGroups[industry]) {
              industryGroups[industry] = []
            }
            industryGroups[industry].push(stock)
          })
          
          // 按 industry 優先順序排序
          const sortedStocks = []
          
          // 先添加有優先順序的 industry
          sectorIndustryPriority.forEach(industry => {
            if (industryGroups[industry]) {
              // 在每個 industry 內按 market cap 從大到小排序
              const sortedIndustryStocks = industryGroups[industry].sort((a, b) => {
                const marketCapA = a.metadata?.market_cap || 0
                const marketCapB = b.metadata?.market_cap || 0
                
                // 如果 market cap 相同或都為 0，則按 symbol 字母順序排序
                if (marketCapA === marketCapB) {
                  return a.quote.symbol.localeCompare(b.quote.symbol)
                }
                
                // Market cap 從大到小排序
                return marketCapB - marketCapA
              })
              sortedStocks.push(...sortedIndustryStocks)
            }
          })
          
          // 再添加不在優先列表中的其他 industry
          Object.keys(industryGroups).forEach(industry => {
            if (!sectorIndustryPriority.includes(industry)) {
              const sortedIndustryStocks = industryGroups[industry].sort((a, b) => {
                const marketCapA = a.metadata?.market_cap || 0
                const marketCapB = b.metadata?.market_cap || 0
                
                // 如果 market cap 相同或都為 0，則按 symbol 字母順序排序
                if (marketCapA === marketCapB) {
                  return a.quote.symbol.localeCompare(b.quote.symbol)
                }
                
                // Market cap 從大到小排序
                return marketCapB - marketCapA
              })
              sortedStocks.push(...sortedIndustryStocks)
            }
          })
          
          sortedGroups[sector] = sortedStocks
        }
      })
      
      // 2. 添加不在優先列表中但有股票的其他 sector (如 Unknown)
      Object.keys(groups).forEach(sector => {
        if (!sectorPriority.includes(sector) && groups[sector].length > 0) {
          sortedGroups[sector] = groups[sector].sort((a, b) => {
            return a.quote.symbol.localeCompare(b.quote.symbol)
          })
        }
      })
      
      return sortedGroups
    },

    tocTree() {
      if (!this.quotes.length || !this.metadata) {
        return []
      }

      const tree = []
      
      // 使用與 groupedStocks 相同的邏輯來確保一致性
      Object.entries(this.groupedStocks).forEach(([sectorName, stocks]) => {
        const sectorNode = {
          id: `sector-${this.sanitizeId(sectorName)}`,
          type: 'sector',
          label: sectorName,
          children: []
        }

        // 按 industry 分組
        const industryGroups = {}
        stocks.forEach(stock => {
          const industry = stock.metadata?.industry || 'Unknown Industry'
          if (!industryGroups[industry]) {
            industryGroups[industry] = []
          }
          industryGroups[industry].push(stock)
        })

        // 為每個 industry 創建節點
        Object.entries(industryGroups).forEach(([industryName, industryStocks]) => {
          const industryNode = {
            id: `industry-${this.sanitizeId(sectorName)}-${this.sanitizeId(industryName)}`,
            type: 'industry',
            label: industryName,
            children: []
          }

          // 為每個 symbol 創建節點
          industryStocks.forEach(stock => {
            const symbolNode = {
              id: `symbol-${this.sanitizeId(stock.quote.symbol)}`,
              type: 'symbol',
              label: stock.quote.symbol,
              symbol: stock.quote.symbol,
              metadata: {
                sector: sectorName,
                industry: industryName,
                exchange: this.mapExchangeCode(stock.metadata?.exchange),
                marketCap: stock.metadata?.market_cap || 0
              }
            }
            industryNode.children.push(symbolNode)
          })

          sectorNode.children.push(industryNode)
        })

        tree.push(sectorNode)
      })

      return tree
    },

    // 效能優化的資料映射
    metadataMap() {
      if (!this.metadata?.items) return new Map()
      
      const map = new Map()
      this.metadata.items.forEach(item => {
        map.set(item.symbol, item)
      })
      return map
    },

    dailyDataMap() {
      if (!this.dailyData?.per_symbol) return new Map()
      
      const map = new Map()
      this.dailyData.per_symbol.forEach(item => {
        map.set(item.symbol, item)
      })
      return map
    }
  },
  async mounted() {
    await this.loadStockData()
    this.initializeNavigation()
  },

  beforeRouteLeave(to, from, next) {
    // 清理 focus query 參數當離開 stock-overview 頁面
    if (this.$route.query.focus) {
      console.log('Navigation: Clearing focus parameter on route leave')
      // 不等待，避免阻塞導航
      this.$router.replace({
        query: { ...this.$route.query, focus: undefined }
      }).catch(() => {}) // 忽略錯誤，因為用戶可能已經導航到其他頁面
    }
    next()
  },

  beforeUnmount() {
    this.cleanupNavigation()
  },
  methods: {
    async loadStockData() {
      this.loading = true
      this.error = null
      
      try {
        console.log('🚀 Starting simple stock data load...')
        
        // 動態獲取 base path
        const basePath = import.meta.env.PROD ? '/investment-dashboard' : ''
        
        // 1. 載入配置
        this.configuredSymbols = await stocksConfig.getEnabledSymbols()
        console.log(`✅ Loaded ${this.configuredSymbols.length} symbols from config`)
        
        // 2. 直接載入 quotes 數據
        const quotesResponse = await fetch(`${basePath}/data/quotes/latest.json?t=` + Date.now())
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
        const dailyResponse = await fetch(`${basePath}/data/daily/2025-12-28.json?t=` + Date.now())
        if (dailyResponse.ok) {
          this.dailyData = await dailyResponse.json()
          console.log(`✅ Loaded daily data`)
        }
        
        // 4. 直接載入 metadata
        const metadataResponse = await fetch(`${basePath}/data/symbols_metadata.json?t=` + Date.now())
        if (metadataResponse.ok) {
          this.metadata = await metadataResponse.json()
          console.log(`✅ Loaded metadata for ${this.metadata.items.length} symbols`)
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
    },

    // Helper method to map exchange codes to display names
    mapExchangeCode(exchangeCode) {
      if (!exchangeCode) return 'Unknown'
      
      const exchangeMap = {
        'NYQ': 'NYSE',    // New York Stock Exchange
        'NMS': 'NASDAQ',  // NASDAQ Global Select Market
        'NCM': 'NASDAQ',  // NASDAQ Capital Market
        'NGM': 'NASDAQ',  // NASDAQ Global Market
        'ASE': 'AMEX'     // NYSE American (原 American Stock Exchange)
      }
      
      return exchangeMap[exchangeCode] || exchangeCode
    },

    sanitizeId(str) {
      // 將字串轉換為有效的 DOM ID
      return str.replace(/[^a-zA-Z0-9]/g, '_')
    },
    async onSymbolClick(symbol) {
      console.log('Navigation: Symbol clicked:', symbol)
      
      // 暫停 ScrollSpy 避免衝突
      scrollSpyService.pause()
      
      try {
        // 使用 Vue Router query 而非 NavigationService (Hash Router 兼容)
        await this.$router.replace({
          query: { ...this.$route.query, focus: symbol }
        })
        
        // 滾動到目標
        await navigationService.scrollToSymbol(symbol)
        
        // 更新 active symbol
        this.activeSymbol = symbol
        
        // 自動展開對應的 sections
        this.autoExpandForSymbol(symbol)
      } finally {
        // 恢復 ScrollSpy
        setTimeout(() => {
          scrollSpyService.resume()
        }, 500)
      }
    },

    onSearchChange(query) {
      this.searchQuery = query
    },

    onToggleSection(sectionId, expanded) {
      if (expanded) {
        this.expandedSections.add(sectionId)
      } else {
        this.expandedSections.delete(sectionId)
      }
      
      // 儲存到 localStorage
      this.saveExpandedSections()
    },

    autoExpandForSymbol(symbol) {
      // 找到 symbol 對應的 sector 和 industry
      for (const sectorNode of this.tocTree) {
        for (const industryNode of sectorNode.children) {
          const symbolNode = industryNode.children.find(s => s.symbol === symbol)
          if (symbolNode) {
            this.expandedSections.add(sectorNode.id)
            this.expandedSections.add(industryNode.id)
            this.saveExpandedSections()
            return
          }
        }
      }
    },

    saveExpandedSections() {
      try {
        const sectionsArray = Array.from(this.expandedSections)
        localStorage.setItem('stock-overview-expanded-sections', JSON.stringify(sectionsArray))
      } catch (error) {
        console.warn('Failed to save expanded sections:', error)
      }
    },

    loadExpandedSections() {
      try {
        const saved = localStorage.getItem('stock-overview-expanded-sections')
        if (saved) {
          const sectionsArray = JSON.parse(saved)
          this.expandedSections = new Set(sectionsArray)
        }
      } catch (error) {
        console.warn('Failed to load expanded sections:', error)
        this.expandedSections = new Set()
      }
    },

    initializeNavigation() {
      // 載入儲存的展開狀態，如果沒有儲存的狀態則預設全部展開
      this.loadExpandedSections()
      
      // 如果沒有儲存的展開狀態，預設展開所有 sections
      if (this.expandedSections.size === 0) {
        this.expandAllSections()
      }
      
      // 檢查 Vue Router query 參數 (Hash Router 兼容)
      const focusSymbol = this.$route.query.focus
      if (focusSymbol && this.isSymbolValid(focusSymbol)) {
        console.log('Navigation: Found focus symbol in URL:', focusSymbol)
        
        // 延遲執行以確保 DOM 已渲染
        this.$nextTick(() => {
          setTimeout(() => {
            this.onSymbolClick(focusSymbol)
          }, 500)
        })
      }
      
      // 初始化 ScrollSpy
      this.$nextTick(() => {
        this.setupScrollSpy()
      })
    },

    setupScrollSpy() {
      try {
        // 獲取所有 StockCard 元素
        const stockCardElements = document.querySelectorAll('[data-symbol]')
        
        if (stockCardElements.length === 0) {
          console.warn('ScrollSpy: No stock card elements found')
          return
        }
        
        // 設置 ScrollSpy
        scrollSpyService.setup(
          Array.from(stockCardElements),
          (activeSymbol) => {
            console.log('ScrollSpy: Active symbol changed to:', activeSymbol)
            this.activeSymbol = activeSymbol
            this.autoExpandForSymbol(activeSymbol)
          }
        )
        
        console.log(`ScrollSpy: Initialized with ${stockCardElements.length} elements`)
      } catch (error) {
        console.error('Failed to setup ScrollSpy:', error)
      }
    },

    cleanupNavigation() {
      scrollSpyService.cleanup()
    },

    isSymbolValid(symbol) {
      return navigationService.isSymbolValid(symbol)
    },

    expandAllSections() {
      // 展開所有 sector 和 industry sections
      this.tocTree.forEach(sectorNode => {
        this.expandedSections.add(sectorNode.id)
        sectorNode.children.forEach(industryNode => {
          this.expandedSections.add(industryNode.id)
        })
      })
      this.saveExpandedSections()
      console.log('Navigation: Expanded all sections by default')
    }
  }
}
</script>

<style scoped>
.stock-overview {
  margin-bottom: 1rem;
}

/* Main Layout */
.main-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.navigation-sidebar {
  flex-shrink: 0;
}

.main-content {
  flex: 1;
  min-width: 0; /* 防止 flex item 溢出 */
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
  
  /* 行動版隱藏導覽面板 */
  .main-layout {
    flex-direction: column;
    gap: 1rem;
  }
  
  .navigation-sidebar {
    display: none;
  }
  
  .sector-group {
    padding: 1rem;
    margin: 0 -0.5rem;
  }
  
  .stocks-in-group {
    gap: 1.5rem;
  }
}

@media (max-width: 1023px) {
  .main-layout {
    flex-direction: column;
    gap: 1rem;
  }
  
  .navigation-sidebar {
    display: none;
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