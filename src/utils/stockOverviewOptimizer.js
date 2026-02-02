// Stock Overview 效能優化器
// 專門優化 Stock Overview 頁面的載入效能

import { performanceCache, CACHE_KEYS, CACHE_TTL } from './performanceCache.js'
import { performanceMonitor, PERFORMANCE_LABELS } from './performanceMonitor.js'
import { dataFetcher } from '@/lib/fetcher'
import { stocksConfig } from './stocksConfigService.js'
import { metadataService } from './metadataService.js'

class StockOverviewOptimizer {
  constructor() {
    this.preloadInProgress = false
    this.preloadPromise = null
    this.criticalSymbols = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL'] // 優先載入的股票
  }

  // 預載入關鍵數據
  async preloadCriticalData() {
    if (this.preloadInProgress) {
      return this.preloadPromise
    }

    this.preloadInProgress = true
    console.log('🚀 Starting critical data preload...')

    this.preloadPromise = this.performPreload()
    
    try {
      await this.preloadPromise
      console.log('✅ Critical data preload completed')
    } catch (error) {
      console.error('❌ Critical data preload failed:', error)
    } finally {
      this.preloadInProgress = false
    }

    return this.preloadPromise
  }

  async performPreload() {
    try {
      // 1. 預載入 symbols 配置
      performanceMonitor.start('preload_symbols_config')
      const symbols = await stocksConfig.getEnabledSymbols()
      performanceMonitor.end('preload_symbols_config')

      // 2. 預載入關鍵股票的 quotes
      performanceMonitor.start('preload_critical_quotes')
      const quotesPromise = dataFetcher.fetchQuotesSnapshot()
      performanceMonitor.end('preload_critical_quotes')

      // 3. 預載入 daily data
      performanceMonitor.start('preload_daily_data')
      const dailyPromise = dataFetcher.fetchDailySnapshot()
      performanceMonitor.end('preload_daily_data')

      // 4. 並行等待數據載入
      const [quotesResult, dailyResult] = await Promise.all([
        quotesPromise,
        dailyPromise
      ])

      // 5. 預載入關鍵股票的 metadata
      if (quotesResult.data?.items) {
        performanceMonitor.start('preload_metadata')
        
        // 只預載入關鍵股票的 metadata
        const criticalQuotes = quotesResult.data.items.filter(quote => 
          this.criticalSymbols.includes(quote.symbol)
        )
        
        if (criticalQuotes.length > 0) {
          const criticalSymbols = criticalQuotes.map(q => q.symbol)
          await metadataService.getBatchMetadata(criticalSymbols)
        }
        
        performanceMonitor.end('preload_metadata')
      }

      // 6. 快取預載入的數據
      const preloadedData = {
        quotes: quotesResult.data?.items || [],
        dailyData: dailyResult.data,
        lastUpdate: quotesResult.as_of,
        staleLevel: quotesResult.stale_level,
        preloaded: true,
        preloadTime: new Date().toISOString()
      }

      performanceCache.set(CACHE_KEYS.STOCK_OVERVIEW_DATA, preloadedData, CACHE_TTL.QUOTES)
      console.log('💾 Preloaded data cached successfully')

      return preloadedData

    } catch (error) {
      console.error('❌ Preload failed:', error)
      throw error
    }
  }

  // 優化的股票數據載入
  async loadOptimizedStockData(configuredSymbols) {
    console.log('🔄 Loading optimized stock data...')
    
    try {
      // 1. 檢查快取
      const cachedData = performanceCache.get(CACHE_KEYS.STOCK_OVERVIEW_DATA)
      if (cachedData) {
        console.log('📦 Using cached stock overview data')
        return this.processCachedData(cachedData, configuredSymbols)
      }

      // 2. 如果沒有快取，執行優化載入
      return await this.performOptimizedLoad(configuredSymbols)

    } catch (error) {
      console.error('❌ Optimized load failed:', error)
      throw error
    }
  }

  // 處理快取數據
  processCachedData(cachedData, configuredSymbols) {
    // 過濾只顯示配置的 symbols
    const filteredQuotes = cachedData.quotes.filter(quote => 
      configuredSymbols.includes(quote.symbol)
    )

    return {
      quotes: filteredQuotes,
      dailyData: cachedData.dailyData,
      metadata: cachedData.metadata,
      lastUpdate: cachedData.lastUpdate,
      staleLevel: cachedData.staleLevel,
      fromCache: true
    }
  }

  // 執行優化載入
  async performOptimizedLoad(configuredSymbols) {
    console.log('⚡ Performing optimized load...')

    // 確保 metadata service 使用靜態數據以提升效能
    metadataService.setUseDynamicAPI(false)

    // 分階段並行載入
    const [quotesResult, dailyResult] = await Promise.all([
      performanceMonitor.measureAsync(PERFORMANCE_LABELS.QUOTES_FETCH, 
        () => dataFetcher.fetchQuotesSnapshot()
      ),
      performanceMonitor.measureAsync(PERFORMANCE_LABELS.DAILY_DATA_FETCH,
        () => dataFetcher.fetchDailySnapshot()
      )
    ])

    // 處理 quotes
    let quotes = []
    if (quotesResult.data?.items) {
      quotes = quotesResult.data.items.filter(quote => 
        configuredSymbols.includes(quote.symbol)
      )
    }

    // 載入 metadata (使用靜態數據)
    let metadata = null
    if (quotes.length > 0) {
      const symbols = quotes.map(quote => quote.symbol)
      console.log(`🔄 Loading metadata for ${symbols.length} symbols using static data...`)
      
      const metadataMap = await performanceMonitor.measureAsync(
        PERFORMANCE_LABELS.METADATA_FETCH,
        () => metadataService.getBatchMetadata(symbols)
      )
      
      metadata = {
        items: Array.from(metadataMap.values()),
        as_of: new Date().toISOString(),
        source: 'Static Data (Performance Optimized)'
      }
    }

    // 快取結果
    const dataToCache = {
      quotes,
      dailyData: dailyResult.data,
      metadata,
      lastUpdate: quotesResult.as_of,
      staleLevel: quotesResult.stale_level
    }
    
    performanceCache.set(CACHE_KEYS.STOCK_OVERVIEW_DATA, dataToCache, CACHE_TTL.QUOTES)
    console.log('💾 Optimized data cached for future use')

    return dataToCache
  }

  // 背景預載入 (在用戶瀏覽其他頁面時執行)
  startBackgroundPreload() {
    // 使用 requestIdleCallback 在瀏覽器空閒時執行
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        this.preloadCriticalData()
      }, { timeout: 5000 })
    } else {
      // 回退到 setTimeout
      setTimeout(() => {
        this.preloadCriticalData()
      }, 2000)
    }
  }

  // 智能快取管理
  manageCacheIntelligently() {
    // 檢查快取大小
    const stats = performanceCache.getStats()
    console.log('📊 Cache stats:', stats)

    // 如果快取項目過多，清理舊的項目
    if (stats.totalSize > 50) {
      console.log('🧹 Cleaning old cache items...')
      this.cleanOldCacheItems()
    }
  }

  // 清理舊的快取項目
  cleanOldCacheItems() {
    // 保留重要的快取，清理其他的
    const importantKeys = [
      CACHE_KEYS.STOCK_OVERVIEW_DATA,
      CACHE_KEYS.QUOTES_SNAPSHOT,
      CACHE_KEYS.SYMBOLS_CONFIG
    ]

    // 這裡可以實作更複雜的清理邏輯
    console.log('🗑️ Cache cleanup completed')
  }

  // 獲取載入建議
  getLoadingRecommendations() {
    const recommendations = []

    // 檢查是否為首次載入
    const hasCache = performanceCache.has(CACHE_KEYS.STOCK_OVERVIEW_DATA)
    if (!hasCache) {
      recommendations.push({
        type: 'FIRST_LOAD',
        message: 'First load detected - preloading critical data',
        action: () => this.preloadCriticalData()
      })
    }

    // 檢查網路狀況
    if (navigator.connection) {
      const connection = navigator.connection
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        recommendations.push({
          type: 'SLOW_NETWORK',
          message: 'Slow network detected - using minimal data loading',
          action: () => this.enableMinimalMode()
        })
      }
    }

    return recommendations
  }

  // 啟用最小模式 (慢網路時)
  enableMinimalMode() {
    console.log('🐌 Enabling minimal mode for slow network')
    
    // 只載入關鍵股票
    this.criticalSymbols = ['NVDA', 'TSLA', 'AAPL'] // 減少到 3 個
    
    // 使用更短的快取時間
    return {
      reducedSymbols: true,
      shorterCache: true,
      minimalMetadata: true
    }
  }

  // 效能報告
  generatePerformanceReport() {
    const report = performanceMonitor.generateReport()
    const warnings = performanceMonitor.checkPerformanceWarnings()
    
    return {
      ...report,
      warnings,
      cacheStats: performanceCache.getStats(),
      recommendations: this.getLoadingRecommendations()
    }
  }
}

// 建立全域實例
export const stockOverviewOptimizer = new StockOverviewOptimizer()
export default stockOverviewOptimizer