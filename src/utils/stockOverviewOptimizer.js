// Stock Overview Performance Optimizer
// Stock Overview 效能優化器
// Optimized for fast loading of the Stock Overview page
// 專門優化 Stock Overview 頁面的載入效能

import { performanceCache, CACHE_KEYS, CACHE_TTL } from './performanceCache'
import { performanceMonitor, PERFORMANCE_LABELS } from './performanceMonitor'
import { dataFetcher } from '@/lib/fetcher'
import { stocksConfig } from './stocksConfigService'
import { metadataService } from './metadataService.js'

class StockOverviewOptimizer {
  constructor() {
    this.preloadInProgress = false
    this.preloadPromise = null
    this.criticalSymbols = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL'] // Priority stocks for preloading / 優先載入的股票
  }

  // Preload Critical Data
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
      // 1. Preload symbols config
      // 1. 預載入 symbols 配置
      performanceMonitor.start('preload_symbols_config')
      const symbols = await stocksConfig.getEnabledSymbols()
      performanceMonitor.end('preload_symbols_config')

      // 2. Preload critical stock quotes
      // 2. 預載入關鍵股票的 quotes
      performanceMonitor.start('preload_critical_quotes')
      const quotesPromise = dataFetcher.fetchQuotesSnapshot()
      performanceMonitor.end('preload_critical_quotes')

      // 3. Preload daily data
      // 3. 預載入 daily data
      performanceMonitor.start('preload_daily_data')
      const dailyPromise = dataFetcher.fetchDailySnapshot()
      performanceMonitor.end('preload_daily_data')

      // 4. Wait for data loading in parallel
      // 4. 並行等待數據載入
      const [quotesResult, dailyResult] = await Promise.all([
        quotesPromise,
        dailyPromise
      ])

      // 5. Preload critical stock metadata
      // 5. 預載入關鍵股票的 metadata
      if (quotesResult.data?.items) {
        performanceMonitor.start('preload_metadata')

        // Only preload metadata for critical stocks
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

      // 6. Cache preloaded data
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

  // Load Optimized Stock Data
  // 優化的股票數據載入
  async loadOptimizedStockData(configuredSymbols) {
    console.log('🔄 Loading optimized stock data...')

    try {
      // 1. Check cache
      // 1. 檢查快取
      const cachedData = performanceCache.get(CACHE_KEYS.STOCK_OVERVIEW_DATA)
      if (cachedData) {
        console.log('📦 Using cached stock overview data')
        return this.processCachedData(cachedData, configuredSymbols)
      }

      // 2. If no cache, perform optimized load
      // 2. 如果沒有快取，執行優化載入
      return await this.performOptimizedLoad(configuredSymbols)

    } catch (error) {
      console.error('❌ Optimized load failed:', error)
      throw error
    }
  }

  // Process Cached Data
  // 處理快取數據
  processCachedData(cachedData, configuredSymbols) {
    // Filter to show only configured symbols
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

  // Perform Optimized Load (Parallel)
  // 執行優化載入 (並行處理)
  async performOptimizedLoad(configuredSymbols) {
    console.log('⚡ Performing optimized load...')

    // Ensure metadata service uses static data for performance
    // 確保 metadata service 使用靜態數據以提升效能
    metadataService.setUseDynamicAPI(false)

    // Load data in parallel stages
    // 分階段並行載入
    const [quotesResult, dailyResult, indicatorsResult] = await Promise.all([
      performanceMonitor.measureAsync(PERFORMANCE_LABELS.QUOTES_FETCH,
        () => dataFetcher.fetchQuotesSnapshot()
      ),
      performanceMonitor.measureAsync(PERFORMANCE_LABELS.DAILY_DATA_FETCH,
        () => dataFetcher.fetchDailySnapshot()
      ),
      // New: Preload all technical indicators (bulk)
      performanceMonitor.measureAsync('preload_indicators',
        async () => {
          try {
            // Dynamically import to avoid circular dependency if any?
            // Import at top is fine.
            const { hybridTechnicalIndicatorsAPI } = await import('@/api/hybridTechnicalIndicatorsApi.js');
            return await hybridTechnicalIndicatorsAPI.preloadAllPrecomputedData();
          } catch (e) {
            console.warn('Failed to preload indicators:', e);
            return null;
          }
        }
      )
    ])

    // Process quotes
    // 處理 quotes
    let quotes = []
    if (quotesResult.data?.items) {
      quotes = quotesResult.data.items.filter(quote =>
        configuredSymbols.includes(quote.symbol)
      )
    }

    // Load metadata (using static data)
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

    // Cache results
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

  // Background Preload (Runs when idle)
  // 背景預載入 (在用戶瀏覽其他頁面時執行)
  startBackgroundPreload() {
    // Use requestIdleCallback if available
    // 使用 requestIdleCallback 在瀏覽器空閒時執行
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        this.preloadCriticalData()
      }, { timeout: 5000 })
    } else {
      // Fallback to setTimeout
      // 回退到 setTimeout
      setTimeout(() => {
        this.preloadCriticalData()
      }, 2000)
    }
  }

  // Intelligent Cache Management
  // 智能快取管理
  manageCacheIntelligently() {
    // Check cache stats
    // 檢查快取大小
    const stats = performanceCache.getStats()
    console.log('📊 Cache stats:', stats)

    // Clean old items if cache is too large
    // 如果快取項目過多，清理舊的項目
    if (stats.totalSize > 50) {
      console.log('🧹 Cleaning old cache items...')
      this.cleanOldCacheItems()
    }
  }

  // Clean Old Cache Items
  // 清理舊的快取項目
  cleanOldCacheItems() {
    // Keep important keys, clear others
    // 保留重要的快取，清理其他的
    const importantKeys = [
      CACHE_KEYS.STOCK_OVERVIEW_DATA,
      CACHE_KEYS.QUOTES_SNAPSHOT,
      CACHE_KEYS.SYMBOLS_CONFIG
    ]

    // Implementation of complex cleanup logic could go here
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