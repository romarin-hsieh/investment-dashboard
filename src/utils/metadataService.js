// Shared metadata service for stock industry information
// 支援動態 API (Yahoo Finance) 和靜態文件兩種模式
import { dataFetcher } from '@/lib/fetcher'
import { dynamicMetadataService } from './dynamicMetadataService.js'
import { paths } from './baseUrl.js'

class MetadataService {
  constructor() {
    this.cache = new Map()
    this.cacheExpiry = 24 * 60 * 60 * 1000 // 24 hours
    this.lastFetch = null
    this.metadata = null
    this.useDynamicAPI = true // 預設使用動態 API
  }

  // 設定是否使用動態 API
  setUseDynamicAPI(useDynamic) {
    this.useDynamicAPI = useDynamic
    console.log(`Metadata service mode: ${useDynamic ? 'Dynamic API' : 'Static File'}`)
  }

  // Get metadata for a specific symbol
  async getSymbolMetadata(symbol) {
    if (this.useDynamicAPI) {
      // 使用動態 Yahoo Finance API
      return await dynamicMetadataService.getSymbolMetadata(symbol)
    } else {
      // 使用原有的靜態文件方式
      return await this.getStaticSymbolMetadata(symbol)
    }
  }

  // 原有的靜態文件方式 (保留作為備用)
  async getStaticSymbolMetadata(symbol) {
    // Check if we have cached metadata
    if (this.cache.has(symbol)) {
      const cached = this.cache.get(symbol)
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data
      }
    }

    // If no cached data or expired, fetch fresh metadata
    await this.refreshMetadata()

    // Find the symbol in the metadata
    if (this.metadata && this.metadata.items) {
      const symbolMetadata = this.metadata.items.find(m => m.symbol === symbol)
      if (symbolMetadata) {
        console.log(`✅ Found static metadata for ${symbol}:`, symbolMetadata)
        // Cache the result
        this.cache.set(symbol, {
          data: symbolMetadata,
          timestamp: Date.now()
        })
        return symbolMetadata
      }
    }

    console.warn(`❌ No metadata found for ${symbol}, using default`)
    // Return default metadata if not found
    const defaultMetadata = {
      symbol,
      sector: 'Unknown',
      industry: 'Unknown Industry',
      exchange: this.getDefaultExchange(symbol),
      confidence: 0.0,
      source: 'Static File (Default)',
      isLive: false
    }

    this.cache.set(symbol, {
      data: defaultMetadata,
      timestamp: Date.now()
    })

    return defaultMetadata
  }

  // 批量獲取元數據
  async getBatchMetadata(symbols) {
    if (this.useDynamicAPI) {
      return await dynamicMetadataService.getBatchMetadata(symbols)
    } else {
      // 靜態文件模式的批量處理
      console.log(`🔄 getBatchMetadata (static mode) for ${symbols.length} symbols:`, symbols)
      const results = new Map()

      // 先確保 metadata 已載入
      await this.refreshMetadata()

      for (const symbol of symbols) {
        const metadata = await this.getStaticSymbolMetadata(symbol)
        results.set(symbol, metadata)

        // 特別除錯 CRM 和 IONQ
        if (['CRM', 'IONQ'].includes(symbol)) {
          console.log(`🎯 getBatchMetadata result for ${symbol}:`, metadata)
        }
      }

      console.log(`✅ getBatchMetadata completed, ${results.size} results`)
      return results
    }
  }

  // 獲取 metadata 文件的正確路徑
  getMetadataUrl() {
    return paths.symbolsMetadata()
  }

  // Refresh metadata from API
  async refreshMetadata() {
    try {
      console.log('🔄 Refreshing metadata from dataFetcher...')

      // 嘗試直接載入 JSON 檔案作為備用方案
      let result;
      try {
        result = await dataFetcher.fetchMetadataSnapshot()
      } catch (fetcherError) {
        console.warn('❌ dataFetcher failed, trying direct loader:', fetcherError)

        // 使用 DirectMetadataLoader (已優化)
        try {
          const data = await directMetadataLoader.loadMetadata()
          result = { data }
        } catch (loaderError) {
          console.error('❌ Direct loader also failed:', loaderError)
          throw loaderError
        }
      }

      if (result && result.data) { // Check for result AND result.data
        this.metadata = result.data
        this.lastFetch = Date.now()
        console.log(`✅ Metadata refreshed successfully, ${this.metadata.items?.length || 0} items loaded`)

        // Debug: Check if CRM is in the loaded data
        if (this.metadata.items) {
          const crmData = this.metadata.items.find(item => item.symbol === 'CRM')
          if (crmData) {
            console.log('✅ CRM found in refreshed metadata:', crmData)
          } else {
            console.warn('❌ CRM not found in refreshed metadata')
            console.log('Available symbols:', this.metadata.items.map(item => item.symbol).slice(0, 10))
          }
        }
      } else {
        console.warn('❌ No data returned from fetchMetadataSnapshot')
      }
    } catch (error) {
      console.warn('❌ Failed to refresh metadata:', error)
    }
  }

  // Get default exchange for a symbol
  getDefaultExchange(symbol) {
    const nasdaqSymbols = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'RKLB', 'ASTS', 'RIVN', 'MDB', 'ONDS', 'PL', 'AVAV', 'CRM', 'AVGO', 'LEU', 'SMR', 'CRWV', 'IONQ', 'PLTR', 'HIMS']
    const nyseSymbols = ['TSM', 'ORCL', 'RDW']

    if (nasdaqSymbols.includes(symbol)) {
      return 'NASDAQ'
    } else if (nyseSymbols.includes(symbol)) {
      return 'NYSE'
    }

    return 'NASDAQ' // Default
  }

  // Get industry display name (兼容兩種模式)
  getIndustryDisplay(metadata) {
    if (this.useDynamicAPI) {
      return dynamicMetadataService.getIndustryDisplay(metadata)
    }

    // 原有邏輯
    if (!metadata || metadata.confidence < 0.7) {
      return 'Unknown Industry'
    }

    return metadata.industry || metadata.sector || 'Unknown Industry'
  }

  // Get industry category for styling (兼容兩種模式)
  getIndustryCategory(metadata) {
    if (this.useDynamicAPI) {
      return dynamicMetadataService.getIndustryCategory(metadata)
    }

    // 原有邏輯
    const industry = this.getIndustryDisplay(metadata)

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
  }

  // 預熱緩存
  async warmupCache(symbols) {
    if (this.useDynamicAPI) {
      return await dynamicMetadataService.warmupCache(symbols)
    } else {
      // 靜態文件模式的預熱
      console.log(`Warming up static metadata cache for ${symbols.length} symbols...`)
      const startTime = Date.now()

      await this.refreshMetadata()

      for (const symbol of symbols) {
        await this.getStaticSymbolMetadata(symbol)
      }

      const duration = Date.now() - startTime
      console.log(`Static cache warmup completed in ${duration}ms`)

      return {
        duration,
        symbolsProcessed: symbols.length,
        mode: 'static'
      }
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear()
    this.metadata = null
    this.lastFetch = null

    if (this.useDynamicAPI) {
      dynamicMetadataService.clearCache()
    }
  }

  // 獲取緩存統計
  getCacheStats() {
    if (this.useDynamicAPI) {
      return {
        mode: 'dynamic',
        ...dynamicMetadataService.getCacheStats()
      }
    } else {
      return {
        mode: 'static',
        totalCached: this.cache.size,
        lastFetch: this.lastFetch,
        metadataLoaded: !!this.metadata
      }
    }
  }

  // 獲取當前模式
  getCurrentMode() {
    return this.useDynamicAPI ? 'dynamic' : 'static'
  }
}

// Export singleton instance
export const metadataService = new MetadataService()