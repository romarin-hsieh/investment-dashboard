// 直接載入 metadata 的簡化服務
// 繞過複雜的 dataFetcher 和 metadataService

class DirectMetadataLoader {
  constructor() {
    this.cache = null
    this.loading = false
  }

  getMetadataUrl() {
    // 環境檢測邏輯，與其他服務保持一致
    const hostname = window.location.hostname
    const pathname = window.location.pathname
    
    // 正式環境 (GitHub Pages)
    if (hostname === 'romarin-hsieh.github.io') {
      return '/investment-dashboard/data/symbols_metadata.json'
    }
    
    // 如果路徑包含 investment-dashboard，使用完整路徑
    if (pathname.includes('/investment-dashboard/')) {
      return '/investment-dashboard/data/symbols_metadata.json'
    }
    
    // 本地開發環境
    return '/data/symbols_metadata.json'
  }

  async loadMetadata() {
    if (this.cache) {
      return this.cache
    }

    if (this.loading) {
      // 等待載入完成
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return this.cache
    }

    this.loading = true
    
    try {
      const url = this.getMetadataUrl()
      console.log('🔍 DirectMetadataLoader fetching from:', url)
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      this.cache = data
      
      console.log('✅ DirectMetadataLoader loaded successfully:', data.items?.length, 'items')
      return this.cache
      
    } catch (error) {
      console.error('❌ DirectMetadataLoader failed:', error)
      return null
    } finally {
      this.loading = false
    }
  }

  async getSymbolMetadata(symbol) {
    const data = await this.loadMetadata()
    if (!data || !data.items) {
      return {
        symbol,
        sector: 'Unknown',
        industry: 'Unknown Industry',
        exchange: 'NASDAQ',
        confidence: 0.0,
        source: 'DirectLoader (Failed)'
      }
    }

    const symbolData = data.items.find(item => item.symbol === symbol)
    if (symbolData) {
      return {
        ...symbolData,
        source: 'DirectLoader (Success)'
      }
    }

    return {
      symbol,
      sector: 'Unknown',
      industry: 'Unknown Industry',
      exchange: 'NASDAQ',
      confidence: 0.0,
      source: 'DirectLoader (Not Found)'
    }
  }

  async getBatchMetadata(symbols) {
    const results = new Map()
    
    for (const symbol of symbols) {
      const metadata = await this.getSymbolMetadata(symbol)
      results.set(symbol, metadata)
    }
    
    return results
  }
}

export const directMetadataLoader = new DirectMetadataLoader()