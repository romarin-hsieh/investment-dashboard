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
    
    <p class="text-muted mb-3">Detailed performance tracking of individual stocks, organized by sector and industry</p>

    <!-- Loading State removed from here to allow layout to persist -->

    <div v-if="error" class="error">
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
          
          <!-- Loading Skeletons for Sectors -->
          <div v-if="loading" class="sector-skeletons">
             <div v-for="i in 3" :key="`skeleton-sector-${i}`" class="sector-group skeleton-group">
                <StockCardSkeleton v-for="j in 2" :key="`skeleton-card-${i}-${j}`" />
             </div>
          </div>

          <!-- Real Data -->
          <div 
            v-else
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
import WidgetSkeleton from '@/components/WidgetSkeleton.vue'
import StockCardSkeleton from './StockCardSkeleton.vue'
import { navigationService } from '@/services/NavigationService.js'
import { scrollSpyService } from '@/services/ScrollSpyService.js'
import { dataFetcher } from '@/lib/fetcher'
import { directMetadataLoader } from '@/utils/directMetadataLoader.js'
import { stockOverviewOptimizer } from '@/utils/stockOverviewOptimizer.js'
import { useTheme } from '@/composables/useTheme.js'
import { computed } from 'vue'

export default {
  name: 'StockOverview',
  components: {
    StockCard,
    LazyTradingViewWidget,
    NavigationPanel,
    WidgetSkeleton,
    StockCardSkeleton
  },
  setup() {
    const { theme } = useTheme()
    return { theme }
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
      searchQuery: '',
      expandedSections: new Set()
    }
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
      
      // Define Sector priority order
      // 定義 Sector 優先順序
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
      
      // Define Industry priority order (grouped by sector)
      // 定義 Industry 優先順序 (依 Sector 分組)
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
      
      // Sort groups by priority, but keep Object structure for iteration
      // 依優先級排序群組，但保持 Object 結構以便迭代
      const sortedGroups = {}
      
      // 1. Process sectors in predefined priority order
      // 1. 依預定義優先級處理 Sector
      sectorPriority.forEach(sector => {
        if (groups[sector] && groups[sector].length > 0) {
          // Get industry priority list for this sector
          // 獲取該 Sector 的 Industry 優先級列表
          const sectorIndustryPriority = industryPriority[sector] || []
          
          // Group by industry
          // 依 Industry 分組
          const industryGroups = {}
          groups[sector].forEach(stock => {
            const industry = stock.metadata?.industry || 'Unknown Industry'
            if (!industryGroups[industry]) {
              industryGroups[industry] = []
            }
            industryGroups[industry].push(stock)
          })
          
          // Array to store sorted stocks for this sector
          // 儲存該 Sector 已排序股票的陣列
          const sortedStocks = []
          
          // Sort industries by priority
          // 依優先級排序 Industry
          sectorIndustryPriority.forEach(industry => {
            if (industryGroups[industry]) {
              // Sort stocks within industry by Market Cap (descending)
              // 在該 Industry 內依 Market Cap 降序排序
              const sortedIndustryStocks = industryGroups[industry].sort((a, b) => {
                const marketCapA = a.metadata?.market_cap || 0
                const marketCapB = b.metadata?.market_cap || 0
                
                // If Market Caps are equal, sort by Symbol (alphabetical)
                // 如果 Market Cap 相等，依 Symbol 字首排序
                if (marketCapA === marketCapB) {
                  return a.quote.symbol.localeCompare(b.quote.symbol)
                }
                
                // Sort by Market Cap descending
                // Market Cap 降序排序
                return marketCapB - marketCapA
              })
              sortedStocks.push(...sortedIndustryStocks)
            }
          })
          
          // Process remaining industries not in priority list
          // 處理不在優先級列表中的其他 Industry
          Object.keys(industryGroups).forEach(industry => {
            if (!sectorIndustryPriority.includes(industry)) {
              const sortedIndustryStocks = industryGroups[industry].sort((a, b) => {
                const marketCapA = a.metadata?.market_cap || 0
                const marketCapB = b.metadata?.market_cap || 0
                
                // If Market Caps are equal, sort by Symbol (alphabetical)
                // 如果 Market Cap 相等，依 Symbol 字首排序
                if (marketCapA === marketCapB) {
                  return a.quote.symbol.localeCompare(b.quote.symbol)
                }
                
                // Sort by Market Cap descending
                // Market Cap 降序排序
                return marketCapB - marketCapA
              })
              sortedStocks.push(...sortedIndustryStocks)
            }
          })
          
          sortedGroups[sector] = sortedStocks
        }
      })
      
      // 2. Sort sectors not in priority list (e.g. Unknown)
      // 2. 排序不在優先級列表中的其他 Sector (例如 Unknown)
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
      
      // Use groupedStocks calculation to generate tree structure
      // 使用 groupedStocks 計算結果生成樹狀結構
      Object.entries(this.groupedStocks).forEach(([sectorName, stocks]) => {
        const sectorNode = {
          id: `sector-${this.sanitizeId(sectorName)}`,
          type: 'sector',
          label: sectorName,
          children: []
        }

        // Group by Industry
        // 依 Industry 分組
        const industryGroups = {}
        stocks.forEach(stock => {
          const industry = stock.metadata?.industry || 'Unknown Industry'
          if (!industryGroups[industry]) {
            industryGroups[industry] = []
          }
          industryGroups[industry].push(stock)
        })

        // Build nodes for each Industry
        // 每個 Industry 建立節點
        Object.entries(industryGroups).forEach(([industryName, industryStocks]) => {
          const industryNode = {
            id: `industry-${this.sanitizeId(sectorName)}-${this.sanitizeId(industryName)}`,
            type: 'industry',
            label: industryName,
            children: []
          }

          // Build nodes for each Symbol
          // 每個 Symbol 建立節點
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

    // Map for quick metadata lookup
    // 快速查找 Metadata 的 Map
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
    // Clear focus query param when leaving stock-overview route
    // 離開 stock-overview 路由時清除 focus 參數
    if (this.$route.query.focus) {
      console.log('Navigation: Clearing focus parameter on route leave')
      // Replace history to avoid back button issues
      // 替換歷史記錄以避免上一頁問題
      this.$router.replace({
        query: { ...this.$route.query, focus: undefined }
      }).catch(() => {}) // Ignore errors, user might have already navigated away / 忽略錯誤，用戶可能已經導航離開
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
        console.log('🚀 Starting optimized stock data load...')
        
        // 1. Ensure configured symbols are loaded
        if (this.configuredSymbols.length === 0) {
           this.configuredSymbols = await stocksConfig.getEnabledSymbols()
        }

        // Use StockOverviewOptimizer to load data (including bulk technical indicators)
        const optimizedData = await stockOverviewOptimizer.loadOptimizedStockData(this.configuredSymbols)
        
        // Assign data from optimized result
        if (optimizedData.quotes) {
            this.quotes = optimizedData.quotes
        }
        
        if (optimizedData.lastUpdate) {
            this.lastUpdate = optimizedData.lastUpdate
        }
        
        if (optimizedData.dailyData) {
             this.dailyData = optimizedData.dailyData
        }
        
        if (optimizedData.metadata) {
             this.metadata = optimizedData.metadata
        } else {
             // Fallback if optimizer didn't return metadata (e.g. from cache without it)
             // But optimizer usually loads it.
             // If missing, load it here?
             if (!this.metadata) {
                  this.metadata = await directMetadataLoader.loadMetadata()
             }
        }
        
        console.log('✅ Stock data load completed successfully (Optimized)!')
        
      } catch (err) {
        this.error = String(err)
        console.error('❌ Stock data load failed:', err)
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
        'ASE': 'AMEX'     // NYSE American (American Stock Exchange)
      }
      
      return exchangeMap[exchangeCode] || exchangeCode
    },

    sanitizeId(str) {
      // Sanitize string for valid DOM ID
      // 清理字串以符合 DOM ID 規範
      return str.replace(/[^a-zA-Z0-9]/g, '_')
    },
    async onSymbolClick(symbol) {
      console.log('Navigation: Symbol clicked:', symbol)
      
      // Pause ScrollSpy to avoid conflict
      // 暫停 ScrollSpy 以避免衝突
      scrollSpyService.pause()
      
      try {
        // Use Vue Router query and NavigationService (Hash Router compatible)
        // 使用 Vue Router query 與 NavigationService (Hash Router 相容)
        await this.$router.replace({
          query: { ...this.$route.query, focus: symbol }
        })
        
        // Scroll to symbol
        // 滾動到指定 Symbol
        await navigationService.scrollToSymbol(symbol)
        
        // Update active symbol
        // 更新當前 Symbol
        this.activeSymbol = symbol
        
        // Auto-expand relevant sections
        // 自動展開相關區塊
        this.autoExpandForSymbol(symbol)
      } finally {
        // Resume ScrollSpy
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
      
      // Save to localStorage
      // 儲存至 localStorage
      this.saveExpandedSections()
    },

    autoExpandForSymbol(symbol) {
      // Find sector and industry for symbol
      // 查找 Symbol 所屬的 Sector 與 Industry
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
      // Load saved expanded sections, default to collapsed if none
      // 載入儲存的展開區塊，若無則預設收起
      this.loadExpandedSections()
      
      // If no saved sections, expand all by default
      // 若無儲存記錄，預設展開所有區塊
      if (this.expandedSections.size === 0) {
        this.expandAllSections()
      }
      
      // Check Vue Router query params (Hash Router compatible)
      // 檢查 Vue Router query 參數 (Hash Router 相容)
      const focusSymbol = this.$route.query.focus
      if (focusSymbol && this.isSymbolValid(focusSymbol)) {
        console.log('Navigation: Found focus symbol in URL:', focusSymbol)
        
        // Wait for DOM updates
        // 等待 DOM 更新
        this.$nextTick(() => {
          setTimeout(() => {
            this.onSymbolClick(focusSymbol)
          }, 500)
        })
      }
      
      // Initialize ScrollSpy
      // 初始化 ScrollSpy
      this.$nextTick(() => {
        this.setupScrollSpy()
      })
    },

    setupScrollSpy() {
      try {
        // Select all StockCard elements
        // 選取所有 StockCard 元素
        const stockCardElements = document.querySelectorAll('[data-symbol]')
        
        if (stockCardElements.length === 0) {
          console.warn('ScrollSpy: No stock card elements found')
          return
        }
        
        // Setup ScrollSpy
        // 設定 ScrollSpy
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
      // Expand all sector and industry sections
      // 展開所有 Sector 與 Industry 區塊
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
  width: 300px;
  /* Position handling moved to component */
}

.main-content {
  flex: 1;
  min-width: 0; 
}

.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.stock-header h2 {
    color: var(--text-primary);
}

.widget-wrapper {
  margin-bottom: 2rem;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  padding: 1rem;
}

.widget-container-ticker {
  margin-bottom: 2rem;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  padding: 1rem;
}

.widget-container-ticker .widget-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.widget-container-ticker .widget-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.sector-title {
  margin: 2rem 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-color);
  color: var(--primary-color);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sector-title .stock-count {
  font-size: 1rem;
  color: var(--text-muted);
  font-weight: normal;
}

.sector-group {
    margin-bottom: 3rem;
    scroll-margin-top: 100px;
}

.stocks-in-group {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.loading, .error, .no-data {
  text-align: center;
  padding: 3rem;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  margin-top: 1rem;
  color: var(--text-secondary);
}

.skeleton-group {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    margin-bottom: 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--bg-secondary);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  .main-layout {
    flex-direction: column;
  }
  
  .navigation-sidebar {
    width: 100%;
    position: static;
    max-height: none;
    margin-bottom: 1.5rem;
  }
}
</style>
