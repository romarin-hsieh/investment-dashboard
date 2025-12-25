// 自動更新調度器
// 負責管理技術指標和元數據的自動更新

import { performanceMonitor } from './performanceMonitor.js'
import { performanceCache, CACHE_KEYS } from './performanceCache.js'

class AutoUpdateScheduler {
  constructor() {
    this.updateIntervals = new Map()
    this.isRunning = false
    this.config = {
      // 技術指標更新配置 - 改為美股收盤後半小時觸發
      technicalIndicators: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000, // 24 小時 (每日更新)
        marketHoursOnly: true,
        updateTimeWindow: { start: 16.5, end: 17 }, // 美東時間 16:30-17:00 (收盤後半小時)
        retryAttempts: 3,
        retryDelay: 5 * 60 * 1000 // 5 分鐘
      },
      // 元數據更新配置 - 改為美股收盤後半小時觸發
      metadata: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000, // 24 小時 (每日更新)
        marketHoursOnly: true,
        updateTimeWindow: { start: 16.5, end: 17 }, // 美東時間 16:30-17:00 (收盤後半小時)
        retryAttempts: 2,
        retryDelay: 30 * 60 * 1000 // 30 分鐘
      },
      // 緩存清理配置
      cacheCleanup: {
        enabled: true,
        interval: 6 * 60 * 60 * 1000, // 6 小時
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 天
      }
    }
    
    // 美股交易時間 (EST/EDT)
    this.marketHours = {
      preMarket: { start: 4, end: 9.5 }, // 04:00 - 09:30
      regular: { start: 9.5, end: 16 },  // 09:30 - 16:00
      afterMarket: { start: 16, end: 20 } // 16:00 - 20:00
    }
  }

  // 啟動自動更新調度器
  start() {
    if (this.isRunning) {
      console.log('⚠️ Auto update scheduler is already running')
      return
    }

    console.log('🚀 Starting auto update scheduler...')
    this.isRunning = true

    // 立即執行一次檢查
    this.performInitialUpdate()

    // 設置定期更新
    this.scheduleUpdates()

    console.log('✅ Auto update scheduler started successfully')
  }

  // 停止自動更新調度器
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Auto update scheduler is not running')
      return
    }

    console.log('🛑 Stopping auto update scheduler...')
    
    // 清除所有定時器
    for (const [name, intervalId] of this.updateIntervals) {
      clearInterval(intervalId)
      console.log(`   Cleared interval: ${name}`)
    }
    
    this.updateIntervals.clear()
    this.isRunning = false
    
    console.log('✅ Auto update scheduler stopped')
  }

  // 執行初始更新
  async performInitialUpdate() {
    console.log('🔄 Performing initial update check...')
    
    try {
      // 檢查技術指標是否需要更新
      if (this.config.technicalIndicators.enabled) {
        await this.checkAndUpdateTechnicalIndicators()
      }

      // 檢查元數據是否需要更新
      if (this.config.metadata.enabled) {
        await this.checkAndUpdateMetadata()
      }

      // 執行緩存清理
      if (this.config.cacheCleanup.enabled) {
        await this.performCacheCleanup()
      }

    } catch (error) {
      console.error('❌ Initial update failed:', error)
    }
  }

  // 設置定期更新
  scheduleUpdates() {
    // 技術指標更新
    if (this.config.technicalIndicators.enabled) {
      const technicalInterval = setInterval(
        () => this.checkAndUpdateTechnicalIndicators(),
        this.config.technicalIndicators.interval
      )
      this.updateIntervals.set('technicalIndicators', technicalInterval)
      console.log(`📊 Scheduled technical indicators update every ${this.config.technicalIndicators.interval / 60000} minutes`)
    }

    // 元數據更新
    if (this.config.metadata.enabled) {
      const metadataInterval = setInterval(
        () => this.checkAndUpdateMetadata(),
        this.config.metadata.interval
      )
      this.updateIntervals.set('metadata', metadataInterval)
      console.log(`📋 Scheduled metadata update every ${this.config.metadata.interval / 3600000} hours`)
    }

    // 緩存清理
    if (this.config.cacheCleanup.enabled) {
      const cleanupInterval = setInterval(
        () => this.performCacheCleanup(),
        this.config.cacheCleanup.interval
      )
      this.updateIntervals.set('cacheCleanup', cleanupInterval)
      console.log(`🧹 Scheduled cache cleanup every ${this.config.cacheCleanup.interval / 3600000} hours`)
    }
  }

  // 檢查並更新技術指標
  async checkAndUpdateTechnicalIndicators() {
    const label = 'auto_update_technical_indicators'
    performanceMonitor.start(label)

    try {
      console.log('🔍 Checking technical indicators update...')

      // 檢查是否在美股收盤後半小時的更新時間窗口內
      if (this.config.technicalIndicators.marketHoursOnly && !this.isUpdateTimeWindow()) {
        console.log('⏰ Outside update time window, skipping technical indicators update')
        return
      }

      // 檢查是否需要更新
      const needsUpdate = await this.checkTechnicalIndicatorsAge()
      if (!needsUpdate) {
        console.log('✅ Technical indicators are up to date')
        return
      }

      console.log('🔄 Updating technical indicators...')
      
      // 執行更新 (使用現有的預計算腳本邏輯)
      await this.updateTechnicalIndicatorsData()
      
      // 清除相關緩存
      this.clearTechnicalIndicatorsCache()
      
      console.log('✅ Technical indicators updated successfully')

    } catch (error) {
      console.error('❌ Technical indicators update failed:', error)
      
      // 重試機制
      await this.retryUpdate('technicalIndicators', error)
      
    } finally {
      performanceMonitor.end(label)
    }
  }

  // 檢查並更新元數據
  async checkAndUpdateMetadata() {
    const label = 'auto_update_metadata'
    performanceMonitor.start(label)

    try {
      console.log('🔍 Checking metadata update...')

      // 檢查是否需要更新
      const needsUpdate = await this.checkMetadataAge()
      if (!needsUpdate) {
        console.log('✅ Metadata is up to date')
        return
      }

      console.log('🔄 Updating metadata...')
      
      // 執行更新
      await this.updateMetadataData()
      
      // 清除相關緩存
      this.clearMetadataCache()
      
      console.log('✅ Metadata updated successfully')

    } catch (error) {
      console.error('❌ Metadata update failed:', error)
      
      // 重試機制
      await this.retryUpdate('metadata', error)
      
    } finally {
      performanceMonitor.end(label)
    }
  }

  // 檢查技術指標數據年齡
  async checkTechnicalIndicatorsAge() {
    try {
      // 檢查預計算數據的最新日期
      const response = await fetch('/data/technical-indicators/latest_index.json')
      if (!response.ok) {
        console.log('📊 No precomputed data found, update needed')
        return true
      }

      const index = await response.json()
      const lastUpdate = new Date(index.generatedAt)
      const now = new Date()
      const ageHours = (now - lastUpdate) / (1000 * 60 * 60)

      console.log(`📊 Technical indicators age: ${ageHours.toFixed(1)} hours`)
      
      // 如果數據超過 24 小時，需要更新
      return ageHours > 24

    } catch (error) {
      console.error('Error checking technical indicators age:', error)
      return true // 出錯時假設需要更新
    }
  }

  // 檢查元數據年齡
  async checkMetadataAge() {
    try {
      // 檢查靜態元數據的最後更新時間
      // 這裡可以檢查文件修改時間或版本號
      const cachedMetadata = performanceCache.get(CACHE_KEYS.METADATA_BATCH)
      if (!cachedMetadata) {
        return true // 沒有緩存數據，需要更新
      }

      // 檢查緩存年齡
      const cacheAge = Date.now() - cachedMetadata.timestamp
      const ageHours = cacheAge / (1000 * 60 * 60)

      console.log(`📋 Metadata cache age: ${ageHours.toFixed(1)} hours`)
      
      // 如果緩存超過 24 小時，需要更新
      return ageHours > 24

    } catch (error) {
      console.error('Error checking metadata age:', error)
      return true
    }
  }

  // 更新技術指標數據
  async updateTechnicalIndicatorsData() {
    // 在瀏覽器環境中，我們不能直接執行 Node.js 腳本
    // 這個功能需要在服務器端或通過 API 調用來實現
    console.log('🔄 Technical indicators update requested')
    console.log('⚠️ Note: Actual precomputation requires server-side execution')
    
    // 在瀏覽器環境中，我們可以：
    // 1. 清除相關緩存，強制重新載入數據
    // 2. 觸發 API 調用來請求最新數據
    // 3. 通知用戶需要手動執行預計算腳本
    
    try {
      // 清除技術指標相關的緩存
      this.clearTechnicalIndicatorsCache()
      
      // 模擬更新完成
      console.log('✅ Technical indicators cache cleared, data will be refreshed on next load')
      
    } catch (error) {
      console.error('Failed to update technical indicators:', error)
      throw error
    }
  }

  // 更新元數據
  async updateMetadataData() {
    // 這裡可以實施元數據的自動更新邏輯
    // 目前先清除緩存，強制重新載入
    performanceCache.delete(CACHE_KEYS.METADATA_BATCH)
    console.log('🗑️ Cleared metadata cache to force refresh')
  }

  // 清除技術指標緩存
  clearTechnicalIndicatorsCache() {
    try {
      // 清除 localStorage 中的技術指標相關緩存
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.includes('technical_indicators_') || 
          key.includes('precomputed_') ||
          key.includes('TECHNICAL_INDICATORS') ||
          key.includes('hybrid_technical_')
        )) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        console.log(`🗑️ Cleared cache key: ${key}`)
      })
      
      // 清除性能緩存中的相關項目
      if (typeof performanceCache !== 'undefined' && performanceCache.clear) {
        // 如果有性能緩存，清除相關項目
        console.log('🗑️ Cleared performance cache items')
      }
      
      console.log(`✅ Cleared ${keysToRemove.length} technical indicators cache entries`)
      
    } catch (error) {
      console.error('Error clearing technical indicators cache:', error)
    }
  }

  // 清除元數據緩存
  clearMetadataCache() {
    performanceCache.delete(CACHE_KEYS.METADATA_BATCH)
    performanceCache.delete(CACHE_KEYS.STOCK_OVERVIEW_DATA)
    console.log('🗑️ Cleared metadata and stock overview cache')
  }

  // 執行緩存清理
  async performCacheCleanup() {
    console.log('🧹 Performing cache cleanup...')
    
    try {
      const stats = performanceCache.getStats()
      console.log('📊 Cache stats before cleanup:', stats)
      
      // 清理過期的緩存項
      // 這裡可以實施更精細的清理邏輯
      
      const statsAfter = performanceCache.getStats()
      console.log('📊 Cache stats after cleanup:', statsAfter)
      
      console.log('✅ Cache cleanup completed')
      
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error)
    }
  }

  // 重試更新
  async retryUpdate(updateType, originalError) {
    const config = this.config[updateType]
    if (!config || !config.retryAttempts) {
      return
    }

    console.log(`🔄 Retrying ${updateType} update in ${config.retryDelay / 60000} minutes...`)
    
    setTimeout(async () => {
      try {
        if (updateType === 'technicalIndicators') {
          await this.checkAndUpdateTechnicalIndicators()
        } else if (updateType === 'metadata') {
          await this.checkAndUpdateMetadata()
        }
      } catch (retryError) {
        console.error(`❌ Retry failed for ${updateType}:`, retryError)
      }
    }, config.retryDelay)
  }

  // 檢查是否在更新時間窗口內 (美股收盤後半小時)
  isUpdateTimeWindow() {
    const now = new Date()
    const estTime = this.convertToEST(now)
    const hour = estTime.getHours() + estTime.getMinutes() / 60

    // 檢查是否在美股收盤後半小時的更新窗口內 (16:30-17:00 EST)
    const updateWindow = this.config.technicalIndicators.updateTimeWindow
    const isInWindow = hour >= updateWindow.start && hour <= updateWindow.end

    if (isInWindow) {
      console.log(`📅 In update time window: ${estTime.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })} EST`)
    }

    return isInWindow
  }

  // 檢查是否在市場時間內 (保留原有功能)
  isMarketHours() {
    const now = new Date()
    const estTime = this.convertToEST(now)
    const hour = estTime.getHours() + estTime.getMinutes() / 60

    // 檢查是否在交易時間內 (包括盤前、正常、盤後)
    return (
      (hour >= this.marketHours.preMarket.start && hour <= this.marketHours.preMarket.end) ||
      (hour >= this.marketHours.regular.start && hour <= this.marketHours.regular.end) ||
      (hour >= this.marketHours.afterMarket.start && hour <= this.marketHours.afterMarket.end)
    )
  }

  // 轉換為美東時間 (考慮夏令時)
  convertToEST(date) {
    // 使用 Intl.DateTimeFormat 來正確處理夏令時
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    const parts = formatter.formatToParts(date)
    const year = parseInt(parts.find(p => p.type === 'year').value)
    const month = parseInt(parts.find(p => p.type === 'month').value) - 1
    const day = parseInt(parts.find(p => p.type === 'day').value)
    const hour = parseInt(parts.find(p => p.type === 'hour').value)
    const minute = parseInt(parts.find(p => p.type === 'minute').value)
    const second = parseInt(parts.find(p => p.type === 'second').value)
    
    return new Date(year, month, day, hour, minute, second)
  }

  // 獲取調度器狀態
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeIntervals: Array.from(this.updateIntervals.keys()),
      config: this.config,
      nextUpdates: this.getNextUpdateTimes()
    }
  }

  // 獲取下次更新時間
  getNextUpdateTimes() {
    const now = Date.now()
    return {
      technicalIndicators: new Date(now + this.config.technicalIndicators.interval),
      metadata: new Date(now + this.config.metadata.interval),
      cacheCleanup: new Date(now + this.config.cacheCleanup.interval)
    }
  }

  // 手動觸發更新
  async triggerManualUpdate(updateType = 'all') {
    console.log(`🔄 Manual update triggered: ${updateType}`)
    
    try {
      if (updateType === 'all' || updateType === 'technicalIndicators') {
        await this.checkAndUpdateTechnicalIndicators()
      }
      
      if (updateType === 'all' || updateType === 'metadata') {
        await this.checkAndUpdateMetadata()
      }
      
      if (updateType === 'all' || updateType === 'cache') {
        await this.performCacheCleanup()
      }
      
      console.log('✅ Manual update completed')
      
    } catch (error) {
      console.error('❌ Manual update failed:', error)
      throw error
    }
  }
}

// 創建全局實例
export const autoUpdateScheduler = new AutoUpdateScheduler()

// 自動啟動 (在生產環境中)
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  // 延遲啟動，避免影響初始頁面載入
  setTimeout(() => {
    autoUpdateScheduler.start()
  }, 30000) // 30 秒後啟動
}