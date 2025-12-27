/**
 * 統一股票配置服務
 * 所有模組都通過此服務獲取股票配置，避免重複維護多個配置文件
 */

class StocksConfigService {
  constructor() {
    this.cache = null
    this.lastUpdate = null
    this.cacheTimeout = 5 * 60 * 1000 // 5分鐘緩存
  }

  /**
   * 獲取股票配置文件的 URL
   */
  getConfigUrl() {
    // 使用相對路徑，讓 Vite 的 base URL 自動處理
    return '/config/stocks.json'
  }

  /**
   * 載入股票配置
   */
  async loadConfig() {
    try {
      // 檢查緩存
      if (this.cache && this.lastUpdate && 
          (Date.now() - this.lastUpdate) < this.cacheTimeout) {
        return this.cache
      }

      const url = this.getConfigUrl()
      const response = await fetch(`${url}?t=${Date.now()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const config = await response.json()
      
      // 驗證配置格式
      if (!config.stocks || !Array.isArray(config.stocks)) {
        throw new Error('Invalid config format: missing stocks array')
      }
      
      // 更新緩存
      this.cache = config
      this.lastUpdate = Date.now()
      
      console.log(`✅ Loaded ${config.stocks.length} stocks from config/stocks.json`)
      return config
      
    } catch (error) {
      console.error('❌ Failed to load stocks config:', error)
      
      // 返回緩存數據（如果有）
      if (this.cache) {
        console.warn('⚠️ Using cached config due to load failure')
        return this.cache
      }
      
      // 最終 fallback
      return this.getFallbackConfig()
    }
  }

  /**
   * 獲取所有啟用的股票符號
   */
  async getEnabledSymbols() {
    const config = await this.loadConfig()
    return config.stocks
      .filter(stock => stock.enabled)
      .map(stock => stock.symbol)
  }

  /**
   * 獲取指定優先級的股票符號
   */
  async getSymbolsByPriority(priority = 1) {
    const config = await this.loadConfig()
    return config.stocks
      .filter(stock => stock.enabled && stock.priority === priority)
      .map(stock => stock.symbol)
  }

  /**
   * 獲取股票的交易所
   */
  async getStockExchange(symbol) {
    const config = await this.loadConfig()
    const stock = config.stocks.find(s => s.symbol === symbol)
    return stock ? stock.exchange : 'NASDAQ' // 預設為 NASDAQ
  }

  /**
   * 獲取股票的 sector
   */
  async getStockSector(symbol) {
    const config = await this.loadConfig()
    const stock = config.stocks.find(s => s.symbol === symbol)
    return stock ? stock.sector : 'Unknown'
  }

  /**
   * 獲取股票的 industry
   */
  async getStockIndustry(symbol) {
    const config = await this.loadConfig()
    const stock = config.stocks.find(s => s.symbol === symbol)
    return stock ? stock.industry : 'Unknown'
  }

  /**
   * 獲取完整的股票信息
   */
  async getStockInfo(symbol) {
    const config = await this.loadConfig()
    return config.stocks.find(s => s.symbol === symbol) || null
  }

  /**
   * 獲取所有交易所列表
   */
  async getExchanges() {
    const config = await this.loadConfig()
    return config.metadata?.exchanges || ['NYSE', 'NASDAQ', 'AMEX']
  }

  /**
   * 獲取所有 sector 列表
   */
  async getSectors() {
    const config = await this.loadConfig()
    return config.metadata?.sectors || []
  }

  /**
   * 按交易所分組股票
   */
  async getStocksByExchange() {
    const config = await this.loadConfig()
    const groups = {}
    
    config.stocks
      .filter(stock => stock.enabled)
      .forEach(stock => {
        if (!groups[stock.exchange]) {
          groups[stock.exchange] = []
        }
        groups[stock.exchange].push(stock.symbol)
      })
    
    return groups
  }

  /**
   * 按 sector 分組股票
   */
  async getStocksBySector() {
    const config = await this.loadConfig()
    const groups = {}
    
    config.stocks
      .filter(stock => stock.enabled)
      .forEach(stock => {
        if (!groups[stock.sector]) {
          groups[stock.sector] = []
        }
        groups[stock.sector].push(stock.symbol)
      })
    
    return groups
  }

  /**
   * 獲取配置統計信息
   */
  async getStats() {
    const config = await this.loadConfig()
    const enabledStocks = config.stocks.filter(s => s.enabled)
    
    return {
      total: config.stocks.length,
      enabled: enabledStocks.length,
      disabled: config.stocks.length - enabledStocks.length,
      exchanges: [...new Set(enabledStocks.map(s => s.exchange))],
      sectors: [...new Set(enabledStocks.map(s => s.sector))],
      version: config.version,
      lastUpdated: config.last_updated
    }
  }

  /**
   * 清除緩存
   */
  clearCache() {
    this.cache = null
    this.lastUpdate = null
    console.log('🗑️ StocksConfigService cache cleared')
  }

  /**
   * 手動刷新配置
   */
  async refresh() {
    this.clearCache()
    return await this.loadConfig()
  }

  /**
   * 緊急 fallback 配置
   */
  getFallbackConfig() {
    console.warn('⚠️ Using emergency fallback config')
    return {
      version: "1.0.0-fallback",
      stocks: [
        { symbol: "ASTS", exchange: "NASDAQ", sector: "Technology", industry: "Communication Equipment", enabled: true, priority: 1 },
        { symbol: "RIVN", exchange: "NASDAQ", sector: "Consumer Cyclical", industry: "Auto Manufacturers", enabled: true, priority: 1 },
        { symbol: "PL", exchange: "NYSE", sector: "Industrials", industry: "Aerospace & Defense", enabled: true, priority: 1 },
        { symbol: "CRM", exchange: "NYSE", sector: "Technology", industry: "Software - Application", enabled: true, priority: 1 },
        { symbol: "NVDA", exchange: "NASDAQ", sector: "Technology", industry: "Semiconductors", enabled: true, priority: 1 },
        { symbol: "TSLA", exchange: "NASDAQ", sector: "Consumer Cyclical", industry: "Auto Manufacturers", enabled: true, priority: 1 },
        { symbol: "RR", exchange: "NASDAQ", sector: "Technology", industry: "Software - Application", enabled: true, priority: 2 }
      ],
      metadata: {
        total_stocks: 7,
        enabled_stocks: 7,
        exchanges: ["NYSE", "NASDAQ"],
        sectors: ["Technology", "Consumer Cyclical", "Industrials"]
      }
    }
  }

  /**
   * 驗證股票符號是否存在
   */
  async isValidSymbol(symbol) {
    const config = await this.loadConfig()
    return config.stocks.some(stock => stock.symbol === symbol && stock.enabled)
  }

  /**
   * 獲取與舊版 symbolsConfig 兼容的格式
   */
  async getSymbolsList() {
    return await this.getEnabledSymbols()
  }

  /**
   * 獲取配置來源信息
   */
  getConfigSource() {
    return this.cache ? 'stocks.json' : 'fallback'
  }

  /**
   * 獲取緩存信息
   */
  getCacheInfo() {
    return {
      cached: !!this.cache,
      lastUpdate: this.lastUpdate,
      cacheAge: this.lastUpdate ? Date.now() - this.lastUpdate : 0,
      cacheTimeout: this.cacheTimeout
    }
  }
}

// 導出單例
export const stocksConfig = new StocksConfigService()

// 為了向後兼容，也導出類
export { StocksConfigService }