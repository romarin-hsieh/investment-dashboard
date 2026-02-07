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
import { directMetadataLoader } from '@/utils/directMetadataLoader.js'
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
      
      // ?芾? Sector ????
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
      
      // ?芾? Industry ???? (??sector ??)
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
      
      // ?閮?摨?摨??芷＊蝷箸??∠巨??sector
      const sortedGroups = {}
      
      // 1. ???芸???瘛餃??蟡函? sector
      sectorPriority.forEach(sector => {
        if (groups[sector] && groups[sector].length > 0) {
          // ?冽???sector ?扳? industry ??
          const sectorIndustryPriority = industryPriority[sector] || []
          
          // ??industry ??
          const industryGroups = {}
          groups[sector].forEach(stock => {
            const industry = stock.metadata?.industry || 'Unknown Industry'
            if (!industryGroups[industry]) {
              industryGroups[industry] = []
            }
            industryGroups[industry].push(stock)
          })
          
          // ??industry ?芸?????
          const sortedStocks = []
          
          // ?溶???芸?????industry
          sectorIndustryPriority.forEach(industry => {
            if (industryGroups[industry]) {
              // ?冽???industry ?扳? market cap 敺之?啣???
              const sortedIndustryStocks = industryGroups[industry].sort((a, b) => {
                const marketCapA = a.metadata?.market_cap || 0
                const marketCapB = b.metadata?.market_cap || 0
                
                // 憒? market cap ?詨????0嚗???symbol 摮?????
                if (marketCapA === marketCapB) {
                  return a.quote.symbol.localeCompare(b.quote.symbol)
                }
                
                // Market cap 敺之?啣???
                return marketCapB - marketCapA
              })
              sortedStocks.push(...sortedIndustryStocks)
            }
          })
          
          // ?溶???典??銵其葉?隞?industry
          Object.keys(industryGroups).forEach(industry => {
            if (!sectorIndustryPriority.includes(industry)) {
              const sortedIndustryStocks = industryGroups[industry].sort((a, b) => {
                const marketCapA = a.metadata?.market_cap || 0
                const marketCapB = b.metadata?.market_cap || 0
                
                // 憒? market cap ?詨????0嚗???symbol 摮?????
                if (marketCapA === marketCapB) {
                  return a.quote.symbol.localeCompare(b.quote.symbol)
                }
                
                // Market cap 敺之?啣???
                return marketCapB - marketCapA
              })
              sortedStocks.push(...sortedIndustryStocks)
            }
          })
          
          sortedGroups[sector] = sortedStocks
        }
      })
      
      // 2. 瘛餃?銝?芸??”銝凋??蟡函??嗡? sector (憒?Unknown)
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
      
      // 雿輻??groupedStocks ?詨???頛臭?蝣箔?銝?湔?
      Object.entries(this.groupedStocks).forEach(([sectorName, stocks]) => {
        const sectorNode = {
          id: `sector-${this.sanitizeId(sectorName)}`,
          type: 'sector',
          label: sectorName,
          children: []
        }

        // ??industry ??
        const industryGroups = {}
        stocks.forEach(stock => {
          const industry = stock.metadata?.industry || 'Unknown Industry'
          if (!industryGroups[industry]) {
            industryGroups[industry] = []
          }
          industryGroups[industry].push(stock)
        })

        // ?箸???industry ?萄遣蝭暺?
        Object.entries(industryGroups).forEach(([industryName, industryStocks]) => {
          const industryNode = {
            id: `industry-${this.sanitizeId(sectorName)}-${this.sanitizeId(industryName)}`,
            type: 'industry',
            label: industryName,
            children: []
          }

          // ?箸???symbol ?萄遣蝭暺?
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

    // ??芸?????撠?
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
    // 皜? focus query ??園??stock-overview ?
    if (this.$route.query.focus) {
      console.log('Navigation: Clearing focus parameter on route leave')
      // 銝?敺??踹??餃?撠
      this.$router.replace({
        query: { ...this.$route.query, focus: undefined }
      }).catch(() => {}) // 敹賜?航炊嚗??箇?嗅?賢歇蝬??芸?嗡??
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
        console.log('?? Starting simple stock data load...')
        
        // ???脣? base path
        const basePath = import.meta.env.BASE_URL.endsWith('/') 
            ? import.meta.env.BASE_URL.slice(0, -1) 
            : import.meta.env.BASE_URL;
        
        // 1. 頛?蔭
        this.configuredSymbols = await stocksConfig.getEnabledSymbols()
        console.log(`??Loaded ${this.configuredSymbols.length} symbols from config`)
        
        // 2. ?湔頛 quotes ?豢?
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
          console.log(`??Loaded ${this.quotes.length} quotes`)
        }
        
        // 3. ?湔頛 daily ?豢?
        // 3. 根據 quotes 數據中的日期提取 daily 數據
        let dailyDateStr = ''
        try {
          // 優先使用 quotesData.as_of
          if (quotesData.as_of) {
             const asOfDate = new Date(quotesData.as_of)
             // 轉換為 YYYY-MM-DD 格式 (本地時間)
             // 注意：這裡假設 as_of 是 ISO 格式，我們需要它的日期部分
             // 如果在台北時間運行，可能需要考慮時區，但這裡簡單取 ISO 的日期部分通常足夠
             // 或者根據 generate-daily-snapshot.js 的邏輯，它生成的是 "Taipei" date filename
             
             // 嘗試解析出台北時間的日期 (簡單處理: 依賴後端生成時的約定)
             // generate-daily-snapshot.js 使用: return taipeiTime.toISOString().split('T')[0]
             
             // 如果 as_of 是 ISO String (e.g. 2025-02-02T15:00:00.000Z)
             // 我們直接嘗試用 split('T')[0] 
             dailyDateStr = quotesData.as_of.split('T')[0] 
          }
        } catch (e) {
          console.warn('Failed to parse date from quotes data', e)
        }

        // 如果無法從 quotes 獲取，回退到今天
        if (!dailyDateStr) {
           const now = new Date()
           const taipeiTime = new Date(now.getTime() + (8 * 60 * 60 * 1000))
           dailyDateStr = taipeiTime.toISOString().split('T')[0]
        }
        
        console.log(`??Fetching daily data for date: ${dailyDateStr}`)

        try {
           const dailyResponse = await fetch(`${basePath}/data/daily/${dailyDateStr}.json?t=` + Date.now())
           if (dailyResponse.ok) {
             this.dailyData = await dailyResponse.json()
             console.log(`??Loaded daily data for ${dailyDateStr}`)
           } else {
             // 嘗試回退到昨天 (以防今天數據尚未生成)
             console.warn(`??Daily data for ${dailyDateStr} not found, trying yesterday...`)
             // 簡單減去一天
             const dateObj = new Date(dailyDateStr)
             dateObj.setDate(dateObj.getDate() - 1)
             const prevDateStr = dateObj.toISOString().split('T')[0]
             
             const prevDailyResponse = await fetch(`${basePath}/data/daily/${prevDateStr}.json?t=` + Date.now())
             if (prevDailyResponse.ok) {
                this.dailyData = await prevDailyResponse.json()
                console.log(`??Loaded daily data for ${prevDateStr} (fallback)`)
             } else {
                console.warn(`??Daily data for ${prevDateStr} also not found.`)
             }
           }
        } catch (dailyErr) {
            console.warn('??Failed to fetch daily data:', dailyErr)
        }
        
        // 4. 雿輻 DirectMetadataLoader 頛???(撌脣???蝺拙?)
        try {
          // directMetadataLoader ?折????base URL
          this.metadata = await directMetadataLoader.loadMetadata()
          
          if (this.metadata && this.metadata.items) {
             console.log(`??Loaded metadata for ${this.metadata.items.length} symbols`)
          } else {
             console.warn('?? Metadata loaded but likely empty or invalid')
          }
        } catch (metaError) {
          console.warn('??Failed to load metadata via loader:', metaError)
          // Fallback?? No, loader already handles errors gracefully returning null
        }
        
        console.log('??Simple stock data load completed successfully!')
        
      } catch (err) {
        this.error = String(err)
        console.error('??Simple stock data load failed:', err)
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
        'ASE': 'AMEX'     // NYSE American (??American Stock Exchange)
      }
      
      return exchangeMap[exchangeCode] || exchangeCode
    },

    sanitizeId(str) {
      // 撠?銝脰??????DOM ID
      return str.replace(/[^a-zA-Z0-9]/g, '_')
    },
    async onSymbolClick(symbol) {
      console.log('Navigation: Symbol clicked:', symbol)
      
      // ?怠? ScrollSpy ?踹?銵?
      scrollSpyService.pause()
      
      try {
        // 雿輻 Vue Router query ?? NavigationService (Hash Router ?澆捆)
        await this.$router.replace({
          query: { ...this.$route.query, focus: symbol }
        })
        
        // 皛曉??啁璅?
        await navigationService.scrollToSymbol(symbol)
        
        // ?湔 active symbol
        this.activeSymbol = symbol
        
        // ?芸?撅?撠???sections
        this.autoExpandForSymbol(symbol)
      } finally {
        // ?Ｗ儔 ScrollSpy
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
      
      // ?脣???localStorage
      this.saveExpandedSections()
    },

    autoExpandForSymbol(symbol) {
      // ?曉 symbol 撠???sector ??industry
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
      // 頛?脣???????憒?瘝??脣??????身?券撅?
      this.loadExpandedSections()
      
      // 憒?瘝??脣????????身撅????sections
      if (this.expandedSections.size === 0) {
        this.expandAllSections()
      }
      
      // 瑼Ｘ Vue Router query ? (Hash Router ?澆捆)
      const focusSymbol = this.$route.query.focus
      if (focusSymbol && this.isSymbolValid(focusSymbol)) {
        console.log('Navigation: Found focus symbol in URL:', focusSymbol)
        
        // 撱園?瑁?隞亦Ⅱ靽?DOM 撌脫葡??
        this.$nextTick(() => {
          setTimeout(() => {
            this.onSymbolClick(focusSymbol)
          }, 500)
        })
      }
      
      // ????ScrollSpy
      this.$nextTick(() => {
        this.setupScrollSpy()
      })
    },

    setupScrollSpy() {
      try {
        // ?脣????StockCard ??
        const stockCardElements = document.querySelectorAll('[data-symbol]')
        
        if (stockCardElements.length === 0) {
          console.warn('ScrollSpy: No stock card elements found')
          return
        }
        
        // 閮剔蔭 ScrollSpy
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
      // 撅????sector ??industry sections
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
