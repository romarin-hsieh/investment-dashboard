/**
 * TradingView Widget 快取管理
 * 避免重複載入相同的 widgets
 */

interface CacheEntry {
  data: unknown
  timestamp: number
}

class WidgetCache {
  cache: Map<string, CacheEntry>
  loadingPromises: Map<string, Promise<unknown>>
  maxCacheSize: number
  cacheTimeout: number

  constructor() {
    this.cache = new Map()
    this.loadingPromises = new Map()
    this.maxCacheSize = 50 // 最多快取 50 個 widgets
    this.cacheTimeout = 5 * 60 * 1000 // 5 分鐘過期
  }

  /**
   * 生成快取鍵值
   */
  generateKey(widgetType: string, symbol: string, exchange: string): string {
    return `${widgetType}-${symbol}-${exchange}`
  }

  /**
   * 檢查是否已快取
   */
  has(widgetType: string, symbol: string, exchange: string): boolean {
    const key = this.generateKey(widgetType, symbol, exchange)
    const cached = this.cache.get(key)

    if (!cached) return false

    // 檢查是否過期
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 獲取快取的 widget
   */
  get(widgetType: string, symbol: string, exchange: string): unknown {
    const key = this.generateKey(widgetType, symbol, exchange)
    const cached = this.cache.get(key)

    if (cached && Date.now() - cached.timestamp <= this.cacheTimeout) {
      return cached.data
    }

    return null
  }

  /**
   * 設定快取
   */
  set(widgetType: string, symbol: string, exchange: string, data: unknown): void {
    const key = this.generateKey(widgetType, symbol, exchange)

    // 如果快取已滿，刪除最舊的項目
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * 檢查是否正在載入
   */
  isLoading(widgetType: string, symbol: string, exchange: string): boolean {
    const key = this.generateKey(widgetType, symbol, exchange)
    return this.loadingPromises.has(key)
  }

  /**
   * 設定載入狀態
   */
  setLoading(widgetType: string, symbol: string, exchange: string, promise: Promise<unknown>): Promise<unknown> {
    const key = this.generateKey(widgetType, symbol, exchange)
    this.loadingPromises.set(key, promise)

    // 載入完成後清除
    promise.finally(() => {
      this.loadingPromises.delete(key)
    })

    return promise
  }

  /**
   * 獲取載入中的 Promise
   */
  getLoadingPromise(widgetType: string, symbol: string, exchange: string): Promise<unknown> | undefined {
    const key = this.generateKey(widgetType, symbol, exchange)
    return this.loadingPromises.get(key)
  }

  /**
   * 清除快取
   */
  clear(): void {
    this.cache.clear()
    this.loadingPromises.clear()
  }

  /**
   * 清除過期快取
   */
  clearExpired(): void {
    const now = Date.now()
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 獲取快取統計
   */
  getStats(): { cacheSize: number; loadingCount: number; maxCacheSize: number } {
    return {
      cacheSize: this.cache.size,
      loadingCount: this.loadingPromises.size,
      maxCacheSize: this.maxCacheSize
    }
  }
}

// 單例模式
export const widgetCache = new WidgetCache()

// 定期清理過期快取
setInterval(() => {
  widgetCache.clearExpired()
}, 60000) // 每分鐘清理一次

export default widgetCache
