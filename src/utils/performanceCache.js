// 性能優化緩存服務
// 提供多層緩存和預載入功能

class PerformanceCache {
  constructor() {
    this.memoryCache = new Map()
    this.localStoragePrefix = 'investment_dashboard_cache_'
    this.defaultTTL = 24 * 60 * 60 * 1000 // 24 hours
  }

  // 設置緩存項
  set(key, data, ttl = this.defaultTTL) {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      ttl
    }

    // 內存緩存
    this.memoryCache.set(key, cacheItem)

    // 本地存儲緩存（用於跨會話持久化）
    try {
      localStorage.setItem(
        this.localStoragePrefix + key,
        JSON.stringify(cacheItem)
      )
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }

  // 獲取緩存項
  get(key) {
    // 首先檢查內存緩存
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key)
      if (this.isValid(item)) {
        return item.data
      } else {
        this.memoryCache.delete(key)
      }
    }

    // 檢查本地存儲緩存
    try {
      const stored = localStorage.getItem(this.localStoragePrefix + key)
      if (stored) {
        const item = JSON.parse(stored)
        if (this.isValid(item)) {
          // 恢復到內存緩存
          this.memoryCache.set(key, item)
          return item.data
        } else {
          localStorage.removeItem(this.localStoragePrefix + key)
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error)
    }

    return null
  }

  // 檢查緩存項是否有效
  isValid(item) {
    if (!item || !item.timestamp) return false
    return Date.now() - item.timestamp < item.ttl
  }

  // 檢查是否有緩存
  has(key) {
    return this.get(key) !== null
  }

  // 清除特定緩存
  delete(key) {
    this.memoryCache.delete(key)
    try {
      localStorage.removeItem(this.localStoragePrefix + key)
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error)
    }
  }

  // 清除所有緩存
  clear() {
    this.memoryCache.clear()
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.localStoragePrefix)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }

  // 獲取緩存統計信息
  getStats() {
    const memorySize = this.memoryCache.size
    let localStorageSize = 0
    
    try {
      const keys = Object.keys(localStorage)
      localStorageSize = keys.filter(key => 
        key.startsWith(this.localStoragePrefix)
      ).length
    } catch (error) {
      console.warn('Failed to get localStorage stats:', error)
    }

    return {
      memoryCache: memorySize,
      localStorage: localStorageSize,
      totalSize: memorySize + localStorageSize
    }
  }

  // 預載入數據
  async preload(key, dataLoader, ttl = this.defaultTTL) {
    if (this.has(key)) {
      return this.get(key)
    }

    try {
      const data = await dataLoader()
      this.set(key, data, ttl)
      return data
    } catch (error) {
      console.error(`Failed to preload data for key ${key}:`, error)
      throw error
    }
  }

  // 批量預載入
  async batchPreload(items) {
    const results = new Map()
    const promises = items.map(async ({ key, loader, ttl }) => {
      try {
        const data = await this.preload(key, loader, ttl)
        results.set(key, data)
      } catch (error) {
        console.error(`Failed to preload ${key}:`, error)
        results.set(key, null)
      }
    })

    await Promise.all(promises)
    return results
  }
}

// 創建全局實例
export const performanceCache = new PerformanceCache()

// 專用的股票數據緩存鍵
export const CACHE_KEYS = {
  QUOTES_SNAPSHOT: 'quotes_snapshot',
  DAILY_SNAPSHOT: 'daily_snapshot',
  METADATA_BATCH: 'metadata_batch',
  SYMBOLS_CONFIG: 'symbols_config',
  STOCK_OVERVIEW_DATA: 'stock_overview_data'
}

// 緩存 TTL 配置
// 注意：股價現在使用 TradingView Widget 實時顯示，Yahoo Finance API 數據改為每日更新
export const CACHE_TTL = {
  QUOTES: 24 * 60 * 60 * 1000,     // 24 hours - 改為每日更新 (美股收盤後半小時觸發)
  DAILY_DATA: 24 * 60 * 60 * 1000, // 24 hours - 改為每日更新 (美股收盤後半小時觸發)
  METADATA: 24 * 60 * 60 * 1000,   // 24 hours - 元數據變化很少
  CONFIG: 60 * 60 * 1000,          // 1 hour - 配置數據保持不變
  TECHNICAL_INDICATORS: 24 * 60 * 60 * 1000 // 24 hours - 技術指標每日更新
}