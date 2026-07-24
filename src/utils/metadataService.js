// Shared metadata service for stock industry information
// 支援動態 API (Yahoo Finance) 和靜態文件兩種模式
import { dataFetcher } from '@/lib/fetcher'
import { dynamicMetadataService } from './dynamicMetadataService.js'
import { directMetadataLoader } from './directMetadataLoader'
import { paths } from './baseUrl'

class MetadataService {
  constructor() {
    this.cache = new Map()
    this.cacheExpiry = 24 * 60 * 60 * 1000 // 24 hours
    this.lastFetch = null
    this.lastAttempt = null // Track last attempt time for cooldown
    this.metadata = null
    this.useDynamicAPI = false // 預設使用靜態文件 (更穩定)
    this.fetchCooldown = 2000 // 2 seconds cooldown
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

  // 設置批量元數據 (供優化器使用)
  setBulkMetadata(items) {
    if (!items || !Array.isArray(items)) {
      console.warn('❌ Invalid items passed to setBulkMetadata')
      return
    }

    // 初始化 metadata 結構如果不存在
    if (!this.metadata) {
      this.metadata = { items: [], source: 'Injected via setBulkMetadata' }
    }

    this.metadata.items = items
    this.lastFetch = Date.now()
    console.log(`📦 Bulk metadata set: ${items.length} items injected`)

    // Update map cache immediately
    items.forEach(item => {
      if (item && item.symbol) {
        this.cache.set(item.symbol, {
          data: item,
          timestamp: Date.now()
        })
      }
    })
  }

  // 批量獲取元數據
  async getBatchMetadata(symbols) {
    if (this.useDynamicAPI) {
      return await dynamicMetadataService.getBatchMetadata(symbols)
    } else {
      // 靜態文件模式的批量處理 (Optimized)
      console.log(`🔄 getBatchMetadata (static mode) for ${symbols.length} symbols`)

      // 1. Ensure metadata is loaded (ONCE)
      await this.refreshMetadata()

      const results = new Map()

      // 2. Create a quick lookup map if metadata exists
      const metadataMap = new Map()
      const metadataMapLower = new Map() // Case-insensitive lookup

      if (this.metadata && Array.isArray(this.metadata.items)) {
        console.log(`🔍 SAMA-DEBUG: metadata.items is Array of length ${this.metadata.items.length}`)

        // Debug specific symbols
        const debugSymbols = ['TSM', 'CRM', 'NVDA']
        debugSymbols.forEach(sym => {
          const found = this.metadata.items.find(i => i.symbol === sym)
          console.log(`🔍 SAMA-DEBUG: Content Check [${sym}]:`, found ? 'FOUND' : 'MISSING', found ? `(Conf: ${found.confidence})` : '')
        })

        this.metadata.items.forEach(item => {
          if (item && item.symbol) {
            metadataMap.set(item.symbol, item)
            metadataMapLower.set(item.symbol.toLowerCase(), item)
          }
        })
      } else {
        console.error('❌ SAMA-DEBUG: CRITICAL - this.metadata structure is wrong:', this.metadata)
        if (this.metadata && !this.metadata.items) console.error('❌ SAMA-DEBUG: items property is missing')
        if (this.metadata && this.metadata.items && !Array.isArray(this.metadata.items)) console.error('❌ SAMA-DEBUG: items is NOT an array')
      }

      // 3. Populate results
      for (const symbol of symbols) {
        // Try cache first
        if (this.cache.has(symbol)) {
          const cached = this.cache.get(symbol)
          if (Date.now() - cached.timestamp < this.cacheExpiry) {
            // Ensure we don't return cached "Unknown" if we have better data now
            if (cached.data.confidence > 0 || !metadataMap.has(symbol)) {
              results.set(symbol, cached.data)
              continue
            }
          }
        }

        // Try loaded metadata (Exact match)
        let metadata = metadataMap.get(symbol)

        // Try case-insensitive match
        if (!metadata) {
          metadata = metadataMapLower.get(symbol.toLowerCase())
          if (metadata) {
            console.log(`⚠️ Found metadata for ${symbol} via case-insensitive match`)
          }
        }

        if (metadata) {
          // Cache valid metadata
          this.cache.set(symbol, {
            data: metadata,
            timestamp: Date.now()
          })
        } else {
          // Use default/fallback if missing
          // console.warn(`❌ Missing metadata for ${symbol}`) // Optional: reduce noise
          metadata = {
            symbol,
            sector: 'Unknown',
            industry: 'Unknown Industry',
            exchange: this.getDefaultExchange(symbol),
            confidence: 0.0,
            source: 'Static File (Default)',
            isLive: false
          }
          // Cache default (but with short TTL ideally? For now standard TTL)
          this.cache.set(symbol, {
            data: metadata,
            timestamp: Date.now()
          })
        }
        results.set(symbol, metadata)
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
    // Return existing promise if loading
    if (this._loadingPromise) {
      // console.log('🔄 Metadata refresh already in progress, waiting...')
      return this._loadingPromise
    }

    // Check cooldown (prevent request storm even if previous fetch failed)
    if (this.lastAttempt && Date.now() - this.lastAttempt < this.fetchCooldown) {
      console.log('⏳ Metadata refresh cooling down...')
      return
    }

    this._loadingPromise = (async () => {
      this.lastAttempt = Date.now() // Mark attempt start
      try {
        console.log('🔄 SAMA-DEBUG: Refreshing metadata from dataFetcher...')

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

        if (result && result.data) {
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
      } finally {
        this._loadingPromise = null
      }
    })()

    return this._loadingPromise
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