// 動態元數據服務 - 使用 Yahoo Finance API 獲取即時的 sector 和 industry 信息
import { yahooFinanceAPI } from '@/api/yahooFinanceApi.js'

class DynamicMetadataService {
  constructor() {
    this.cache = new Map()
    this.cacheExpiry = 24 * 60 * 60 * 1000 // 24 hours - sector/industry 信息變化不頻繁
    this.batchSize = 5 // 批量處理大小
    this.requestDelay = 1000 // 請求間隔 (毫秒)
  }

  // 獲取單個股票的元數據
  async getSymbolMetadata(symbol) {
    try {
      // 檢查緩存
      if (this.cache.has(symbol)) {
        const cached = this.cache.get(symbol)
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          console.log(`Using cached metadata for ${symbol}`)
          return cached.data
        }
      }

      console.log(`Fetching fresh metadata for ${symbol} from Yahoo Finance API...`)

      // 從 Yahoo Finance API 獲取股票信息
      const stockInfo = await yahooFinanceAPI.getStockInfo(symbol)

      if (stockInfo && !stockInfo.error && stockInfo.sector !== 'Unknown') {
        // 轉換為標準元數據格式
        const metadata = {
          symbol: symbol,
          sector: stockInfo.sector || 'Unknown',
          industry: stockInfo.industry || 'Unknown Industry',
          exchange: stockInfo.exchange || this.getDefaultExchange(symbol),
          marketCap: stockInfo.marketCap,
          marketCapFormatted: stockInfo.marketCapFormatted,
          marketCapCategory: stockInfo.marketCapCategory || 'unknown',
          currency: stockInfo.currency || 'USD',
          country: stockInfo.country || 'Unknown',
          website: stockInfo.website,
          employees: stockInfo.employees,
          businessSummary: stockInfo.businessSummary,
          confidence: stockInfo.confidence || 0.95, // Yahoo Finance API 信心度很高
          source: 'Yahoo Finance API (Live)',
          lastUpdated: stockInfo.lastUpdated || new Date().toISOString(),
          isLive: true // 標記為即時數據
        }

        // 緩存結果
        this.cache.set(symbol, {
          data: metadata,
          timestamp: Date.now()
        })

        console.log(`Successfully fetched metadata for ${symbol}:`, {
          sector: metadata.sector,
          industry: metadata.industry,
          confidence: metadata.confidence
        })

        return metadata
      } else {
        // API 失敗或返回無效數據，使用靜態數據作為回退
        console.warn(`Yahoo Finance API failed for ${symbol}, using static fallback data`)
        return this.getStaticFallbackMetadata(symbol)
      }
    } catch (error) {
      console.error(`Error fetching metadata for ${symbol}:`, error)
      return this.getStaticFallbackMetadata(symbol)
    }
  }

  // 靜態回退數據 (基於原有的 symbols_metadata.json)
  getStaticFallbackMetadata(symbol) {
    const staticData = {
      'ASTS': { sector: 'Communication Services', industry: 'Satellite Communications', confidence: 0.75 },
      'RIVN': { sector: 'Consumer Cyclical', industry: 'Electric Vehicles', confidence: 0.90 },
      'PL': { sector: 'Technology', industry: 'Satellite Imaging & Analytics', confidence: 0.90 },
      'ONDS': { sector: 'Technology', industry: 'Industrial IoT Solutions', confidence: 0.75 },
      'RDW': { sector: 'Industrials', industry: 'Space Infrastructure', confidence: 0.75 },
      'AVAV': { sector: 'Industrials', industry: 'Aerospace & Defense', confidence: 0.75 },
      'MDB': { sector: 'Technology', industry: 'Database Software', confidence: 0.90 },
      'ORCL': { sector: 'Technology', industry: 'Enterprise Software', confidence: 0.90 },
      'TSM': { sector: 'Technology', industry: 'Semiconductors', confidence: 0.90 },
      'RKLB': { sector: 'Industrials', industry: 'Aerospace & Defense', confidence: 0.90 },
      'CRM': { sector: 'Technology', industry: 'Enterprise Software', confidence: 0.90 },
      'NVDA': { sector: 'Technology', industry: 'Semiconductors', confidence: 0.90 },
      'AVGO': { sector: 'Technology', industry: 'Semiconductors', confidence: 0.90 },
      'AMZN': { sector: 'Consumer Cyclical', industry: 'Internet Retail', confidence: 0.90 },
      'GOOG': { sector: 'Communication Services', industry: 'Internet Content & Information', confidence: 0.90 },
      'META': { sector: 'Communication Services', industry: 'Internet Content & Information', confidence: 0.90 },
      'NFLX': { sector: 'Communication Services', industry: 'Entertainment', confidence: 0.90 },
      'LEU': { sector: 'Energy', industry: 'Uranium', confidence: 0.75 },
      'SMR': { sector: 'Energy', industry: 'Nuclear Energy', confidence: 0.75 },
      'CRWV': { sector: 'Technology', industry: 'Software - Application', confidence: 0.75 },
      'IONQ': { sector: 'Technology', industry: 'Quantum Computing', confidence: 0.75 },
      'PLTR': { sector: 'Technology', industry: 'Software - Infrastructure', confidence: 0.90 },
      'HIMS': { sector: 'Healthcare', industry: 'Health Information Services', confidence: 0.75 },
      'TSLA': { sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', confidence: 0.90 }
    }

    const fallbackData = staticData[symbol] || {
      sector: 'Unknown',
      industry: 'Unknown Industry',
      confidence: 0.0
    }

    const metadata = {
      symbol: symbol,
      sector: fallbackData.sector,
      industry: fallbackData.industry,
      exchange: this.getDefaultExchange(symbol),
      marketCap: null,
      marketCapFormatted: 'N/A',
      marketCapCategory: 'unknown',
      currency: 'USD',
      country: 'Unknown',
      website: null,
      employees: null,
      businessSummary: null,
      confidence: fallbackData.confidence,
      source: 'Static Fallback Data',
      lastUpdated: new Date().toISOString(),
      isLive: false
    }

    // 緩存回退數據 (較短的緩存時間)
    this.cache.set(symbol, {
      data: metadata,
      timestamp: Date.now()
    })

    console.log(`Using static fallback for ${symbol}:`, {
      sector: metadata.sector,
      industry: metadata.industry,
      confidence: metadata.confidence
    })

    return metadata
  }

  // 批量獲取多個股票的元數據
  async getBatchMetadata(symbols) {
    const results = new Map()
    const batches = this.createBatches(symbols, this.batchSize)

    console.log(`Fetching metadata for ${symbols.length} symbols in ${batches.length} batches...`)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} symbols)`)

      // 並行處理批次內的請求
      const batchPromises = batch.map(symbol =>
        this.getSymbolMetadata(symbol).catch(error => {
          console.error(`Failed to fetch metadata for ${symbol}:`, error)
          return this.getDefaultMetadata(symbol)
        })
      )

      const batchResults = await Promise.all(batchPromises)

      // 存儲結果
      batch.forEach((symbol, index) => {
        results.set(symbol, batchResults[index])
      })

      // 在批次之間添加延遲，避免 API 限制
      if (i < batches.length - 1) {
        console.log(`Waiting ${this.requestDelay}ms before next batch...`)
        await this.delay(this.requestDelay)
      }
    }

    console.log(`Completed fetching metadata for ${results.size} symbols`)
    return results
  }

  // 獲取默認元數據
  getDefaultMetadata(symbol) {
    return {
      symbol: symbol,
      sector: 'Unknown',
      industry: 'Unknown Industry',
      exchange: this.getDefaultExchange(symbol),
      marketCap: null,
      marketCapFormatted: 'N/A',
      marketCapCategory: 'unknown',
      currency: 'USD',
      country: 'Unknown',
      website: null,
      employees: null,
      businessSummary: null,
      confidence: 0.0,
      source: 'Default (API Failed)',
      lastUpdated: new Date().toISOString(),
      isLive: false
    }
  }

  // 獲取默認交易所
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

  // 獲取行業顯示名稱 (兼容舊版 API)
  getIndustryDisplay(metadata) {
    if (!metadata || metadata.confidence < 0.7) {
      return 'Unknown Industry'
    }

    return metadata.industry || metadata.sector || 'Unknown Industry'
  }

  // 獲取行業分類 (用於 CSS 樣式)
  getIndustryCategory(metadata) {
    const industry = this.getIndustryDisplay(metadata)

    const industryCategories = {
      // 科技類
      'Software - Application': 'tech-software',
      'Software - Infrastructure': 'tech-software',
      'Database Software': 'tech-software',
      'Enterprise Software': 'tech-software',
      'Internet Content & Information': 'tech-internet',
      'Semiconductors': 'tech-hardware',
      'Quantum Computing': 'tech-quantum',

      // 工業類
      'Aerospace & Defense': 'industrial-aerospace',
      'Space Infrastructure': 'industrial-space',
      'Industrial IoT Solutions': 'tech-iot',

      // 通訊類
      'Satellite Communications': 'communications',
      'Satellite Imaging & Analytics': 'tech-satellite',

      // 汽車類
      'Auto Manufacturers': 'automotive',
      'Electric Vehicles': 'automotive',

      // 零售類
      'Internet Retail': 'retail',

      // 娛樂類
      'Entertainment': 'entertainment',

      // 能源類
      'Uranium': 'energy-nuclear',
      'Nuclear Energy': 'energy-nuclear',

      // 醫療類
      'Health Information Services': 'healthcare',

      // 未知
      'Unknown Industry': 'unknown'
    }

    return industryCategories[industry] || 'other'
  }

  // 生成行業統計
  generateSectorGrouping(metadataMap) {
    const sectorGrouping = {}

    for (const [symbol, metadata] of metadataMap) {
      const sector = metadata.sector || 'Unknown'

      if (!sectorGrouping[sector]) {
        sectorGrouping[sector] = []
      }

      sectorGrouping[sector].push(symbol)
    }

    return sectorGrouping
  }

  // 生成信心度分佈統計
  generateConfidenceDistribution(metadataMap) {
    const distribution = {
      high_confidence_0_90: 0,
      medium_confidence_0_75: 0,
      low_confidence_0_50: 0,
      unknown_confidence: 0
    }

    for (const [symbol, metadata] of metadataMap) {
      const confidence = metadata.confidence || 0

      if (confidence >= 0.90) {
        distribution.high_confidence_0_90++
      } else if (confidence >= 0.75) {
        distribution.medium_confidence_0_75++
      } else if (confidence >= 0.50) {
        distribution.low_confidence_0_50++
      } else {
        distribution.unknown_confidence++
      }
    }

    return distribution
  }

  // 創建批次
  createBatches(array, batchSize) {
    const batches = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  // 延遲函數
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 清除緩存
  clearCache() {
    this.cache.clear()
    console.log('Dynamic metadata cache cleared')
  }

  // 獲取緩存統計
  getCacheStats() {
    const stats = {
      totalCached: this.cache.size,
      cacheEntries: {}
    }

    for (const [symbol, cached] of this.cache.entries()) {
      stats.cacheEntries[symbol] = {
        age: Date.now() - cached.timestamp,
        expired: Date.now() - cached.timestamp > this.cacheExpiry,
        sector: cached.data.sector,
        industry: cached.data.industry,
        confidence: cached.data.confidence
      }
    }

    return stats
  }

  // 預熱緩存 - 為常用股票預先獲取元數據
  async warmupCache(symbols) {
    console.log(`Warming up metadata cache for ${symbols.length} symbols...`)

    const startTime = Date.now()
    const results = await this.getBatchMetadata(symbols)
    const duration = Date.now() - startTime

    console.log(`Cache warmup completed in ${duration}ms for ${results.size} symbols`)

    return {
      duration,
      symbolsProcessed: results.size,
      successRate: (results.size / symbols.length * 100).toFixed(1) + '%'
    }
  }
}

// 導出單例實例
export const dynamicMetadataService = new DynamicMetadataService()
export default dynamicMetadataService