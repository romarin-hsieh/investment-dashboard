// 緩存預熱服務
// 在環境版本更新時預載所有股票的技術指標數據

import { hybridTechnicalIndicatorsAPI } from './hybridTechnicalIndicatorsApi.js'
import { performanceCache, CACHE_KEYS } from './performanceCache.js'
import { performanceMonitor } from './performanceMonitor.js'

class CacheWarmupService {
  constructor() {
    this.isWarming = false
    this.warmupProgress = 0
    this.warmupResults = new Map()
    this.warmupStartTime = null
    this.warmupEndTime = null
    
    // 配置
    this.config = {
      maxConcurrent: 2, // 最大並發數，避免過多 API 請求
      batchDelay: 2000, // 批次間延遲 (毫秒)
      retryAttempts: 2, // 重試次數
      retryDelay: 5000, // 重試延遲
      enableAutoWarmup: true, // 是否啟用自動預熱
      warmupOnVersionChange: true, // 版本更新時預熱
      warmupOnFirstLoad: true, // 首次載入時預熱
      warmupInterval: 6 * 60 * 60 * 1000 // 6 小時自動預熱一次
    }
    
    // 追蹤的股票代碼
    this.trackedSymbols = [
      'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
      'CRM', 'NVDA', 'AVGO', 'AMZN', 'GOOG', 'META', 'NFLX', 'LEU', 'SMR', 'CRWV',
      'IONQ', 'PLTR', 'HIMS', 'TSLA'
    ]
  }

  // 啟動緩存預熱服務
  async start() {
    console.log('🔥 Starting Cache Warmup Service...')
    
    try {
      // 檢查是否需要預熱
      const shouldWarmup = await this.shouldPerformWarmup()
      
      if (shouldWarmup.needed) {
        console.log(`🔥 Warmup needed: ${shouldWarmup.reason}`)
        await this.performWarmup()
      } else {
        console.log('✅ Cache warmup not needed')
      }
      
      // 設置定期預熱
      if (this.config.enableAutoWarmup) {
        this.schedulePeriodicWarmup()
      }
      
    } catch (error) {
      console.error('❌ Failed to start cache warmup service:', error)
    }
  }

  // 檢查是否需要執行預熱
  async shouldPerformWarmup() {
    try {
      // 檢查版本變更
      const currentVersion = await this.getCurrentVersion()
      const lastWarmupVersion = this.getLastWarmupVersion()
      
      if (this.config.warmupOnVersionChange && currentVersion !== lastWarmupVersion) {
        return {
          needed: true,
          reason: `Version changed from ${lastWarmupVersion} to ${currentVersion}`
        }
      }
      
      // 檢查首次載入
      const lastWarmupTime = this.getLastWarmupTime()
      if (this.config.warmupOnFirstLoad && !lastWarmupTime) {
        return {
          needed: true,
          reason: 'First load - no previous warmup found'
        }
      }
      
      // 檢查時間間隔
      if (lastWarmupTime) {
        const timeSinceLastWarmup = Date.now() - lastWarmupTime
        if (timeSinceLastWarmup > this.config.warmupInterval) {
          return {
            needed: true,
            reason: `Time interval exceeded (${Math.round(timeSinceLastWarmup / 3600000)}h ago)`
          }
        }
      }
      
      // 檢查緩存覆蓋率
      const cacheStats = await this.getCacheStats()
      if (cacheStats.coverage < 0.8) { // 少於 80% 的股票有緩存
        return {
          needed: true,
          reason: `Low cache coverage (${Math.round(cacheStats.coverage * 100)}%)`
        }
      }
      
      return { needed: false, reason: 'Cache is fresh and complete' }
      
    } catch (error) {
      console.error('Error checking warmup need:', error)
      return { needed: true, reason: 'Error checking - performing warmup as fallback' }
    }
  }

  // 執行緩存預熱
  async performWarmup() {
    if (this.isWarming) {
      console.log('⚠️ Warmup already in progress')
      return this.warmupResults
    }

    console.log(`🔥 Starting cache warmup for ${this.trackedSymbols.length} symbols...`)
    
    this.isWarming = true
    this.warmupProgress = 0
    this.warmupResults.clear()
    this.warmupStartTime = Date.now()
    
    const label = 'cache_warmup_total'
    performanceMonitor.start(label)
    
    try {
      // 分批處理股票
      const batches = this.createBatches(this.trackedSymbols, this.config.maxConcurrent)
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        console.log(`🔥 Processing batch ${i + 1}/${batches.length}: ${batch.join(', ')}`)
        
        // 並行處理批次中的股票
        const batchPromises = batch.map(symbol => this.warmupSymbol(symbol))
        const batchResults = await Promise.all(batchPromises)
        
        // 記錄結果
        batchResults.forEach((result, index) => {
          this.warmupResults.set(batch[index], result)
        })
        
        // 更新進度
        this.warmupProgress = ((i + 1) / batches.length) * 100
        console.log(`📊 Warmup progress: ${Math.round(this.warmupProgress)}%`)
        
        // 批次間延遲
        if (i < batches.length - 1) {
          console.log(`⏳ Waiting ${this.config.batchDelay}ms before next batch...`)
          await this.sleep(this.config.batchDelay)
        }
      }
      
      this.warmupEndTime = Date.now()
      const duration = this.warmupEndTime - this.warmupStartTime
      
      // 統計結果
      const stats = this.getWarmupStats()
      
      console.log(`🎉 Cache warmup completed in ${Math.round(duration / 1000)}s`)
      console.log(`📊 Results: ${stats.successful}/${stats.total} successful (${stats.successRate}%)`)
      
      // 保存預熱記錄
      this.saveWarmupRecord(stats)
      
      return this.warmupResults
      
    } catch (error) {
      console.error('❌ Cache warmup failed:', error)
      throw error
    } finally {
      this.isWarming = false
      performanceMonitor.end(label)
    }
  }

  // 預熱單個股票
  async warmupSymbol(symbol, attempt = 1) {
    const startTime = Date.now()
    
    try {
      console.log(`🔥 Warming up ${symbol} (attempt ${attempt}/${this.config.retryAttempts + 1})`)
      
      // 獲取技術指標數據 (這會觸發緩存)
      const data = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators(symbol)
      
      const duration = Date.now() - startTime
      
      if (data && !data.error) {
        console.log(`✅ ${symbol} warmed up successfully in ${duration}ms (${data.source})`)
        return {
          success: true,
          duration,
          source: data.source,
          timestamp: new Date().toISOString()
        }
      } else {
        throw new Error(data?.error || 'Unknown error')
      }
      
    } catch (error) {
      console.error(`❌ Failed to warm up ${symbol} (attempt ${attempt}): ${error.message}`)
      
      // 重試機制
      if (attempt <= this.config.retryAttempts) {
        console.log(`🔄 Retrying ${symbol} in ${this.config.retryDelay}ms...`)
        await this.sleep(this.config.retryDelay)
        return this.warmupSymbol(symbol, attempt + 1)
      } else {
        return {
          success: false,
          error: error.message,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  // 創建批次
  createBatches(items, batchSize) {
    const batches = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  // 獲取當前版本
  async getCurrentVersion() {
    try {
      // 嘗試從 package.json 或構建信息獲取版本
      const response = await fetch('/package.json')
      if (response.ok) {
        const pkg = await response.json()
        return pkg.version || '1.0.0'
      }
    } catch (error) {
      // 如果無法獲取，使用構建時間戳
      return Date.now().toString()
    }
    
    return '1.0.0'
  }

  // 獲取上次預熱版本
  getLastWarmupVersion() {
    return localStorage.getItem('cache_warmup_version') || null
  }

  // 獲取上次預熱時間
  getLastWarmupTime() {
    const time = localStorage.getItem('cache_warmup_time')
    return time ? parseInt(time) : null
  }

  // 獲取緩存統計
  async getCacheStats() {
    let cachedCount = 0
    
    for (const symbol of this.trackedSymbols) {
      try {
        // 檢查是否有緩存數據
        const cached = performanceCache.get(`technical_indicators_${symbol}`)
        if (cached) {
          cachedCount++
        }
      } catch (error) {
        // 忽略錯誤
      }
    }
    
    return {
      total: this.trackedSymbols.length,
      cached: cachedCount,
      coverage: cachedCount / this.trackedSymbols.length
    }
  }

  // 獲取預熱統計
  getWarmupStats() {
    const results = Array.from(this.warmupResults.values())
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    return {
      total: results.length,
      successful,
      failed,
      successRate: Math.round((successful / results.length) * 100),
      duration: this.warmupEndTime - this.warmupStartTime,
      averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length
    }
  }

  // 保存預熱記錄
  saveWarmupRecord(stats) {
    const currentVersion = this.getCurrentVersion()
    
    localStorage.setItem('cache_warmup_version', currentVersion)
    localStorage.setItem('cache_warmup_time', Date.now().toString())
    localStorage.setItem('cache_warmup_stats', JSON.stringify(stats))
    
    console.log('💾 Warmup record saved')
  }

  // 設置定期預熱
  schedulePeriodicWarmup() {
    console.log(`⏰ Scheduled periodic warmup every ${this.config.warmupInterval / 3600000} hours`)
    
    setInterval(async () => {
      console.log('⏰ Periodic warmup triggered')
      try {
        await this.performWarmup()
      } catch (error) {
        console.error('❌ Periodic warmup failed:', error)
      }
    }, this.config.warmupInterval)
  }

  // 手動觸發預熱
  async triggerManualWarmup() {
    console.log('🔥 Manual warmup triggered')
    return this.performWarmup()
  }

  // 獲取預熱狀態
  getWarmupStatus() {
    return {
      isWarming: this.isWarming,
      progress: this.warmupProgress,
      results: Object.fromEntries(this.warmupResults),
      lastWarmupTime: this.getLastWarmupTime(),
      lastWarmupVersion: this.getLastWarmupVersion(),
      trackedSymbols: this.trackedSymbols,
      config: this.config
    }
  }

  // 工具函數：延遲
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 更新配置
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    console.log('🔧 Cache warmup config updated:', this.config)
  }

  // 添加追蹤股票
  addTrackedSymbol(symbol) {
    if (!this.trackedSymbols.includes(symbol)) {
      this.trackedSymbols.push(symbol)
      console.log(`➕ Added ${symbol} to tracked symbols`)
    }
  }

  // 移除追蹤股票
  removeTrackedSymbol(symbol) {
    const index = this.trackedSymbols.indexOf(symbol)
    if (index > -1) {
      this.trackedSymbols.splice(index, 1)
      console.log(`➖ Removed ${symbol} from tracked symbols`)
    }
  }
}

// 創建全局實例
export const cacheWarmupService = new CacheWarmupService()
export default cacheWarmupService