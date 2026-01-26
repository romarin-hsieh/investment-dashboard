/**
 * Optimized Data Fetcher - 優化版本，避免 status.json 阻塞主要數據載入
 * 
 * 優化策略:
 * 1. status.json 載入失敗時不影響主要數據
 * 2. 並行載入而非串行載入
 * 3. 更短的超時時間
 * 4. 更好的錯誤處理
 */

import type {
  SystemStatus,
  QuotesSnapshot,
  DailySnapshot,
  MetadataSnapshot
} from '@/types'
import {
  validateSystemStatus,
  validateQuotesSnapshot,
  validateDailySnapshot,
  validateMetadataSnapshot
} from '@/utils/validation'
import { StateManager } from '@/utils/state-manager'

export interface FetchResult<T> {
  data: T | null
  source: 'network' | 'cache' | 'fallback'
  stale_level: 'fresh' | 'stale' | 'very_stale'
  error?: string
  as_of?: string
  loadTime?: number
}

export class OptimizedDataFetcher {
  private baseUrl: string
  private cacheBustingEnabled: boolean
  private statusTimeout: number = 3000 // 3秒超時
  private dataTimeout: number = 10000   // 10秒超時

  constructor(baseUrl: string = '', cacheBustingEnabled: boolean = true) {
    this.baseUrl = baseUrl
    this.cacheBustingEnabled = cacheBustingEnabled
  }

  /**
   * 獲取系統狀態 - 非阻塞版本
   */
  async fetchSystemStatus(): Promise<FetchResult<SystemStatus>> {
    const startTime = performance.now()

    try {
      // 使用 AbortController 實現超時
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.statusTimeout)

      const response = await fetch(`${this.baseUrl}/data/status.json`, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const validation = validateSystemStatus(data)

      if (!validation.success) {
        throw new Error(`Invalid status.json: ${validation.error?.message}`)
      }

      return {
        data: validation.data!,
        source: 'network',
        stale_level: 'fresh',
        as_of: validation.data!.last_updated,
        loadTime: performance.now() - startTime
      }
    } catch (error) {
      const loadTime = performance.now() - startTime
      console.warn(`Status.json failed after ${loadTime.toFixed(2)}ms:`, error)

      return {
        data: null,
        source: 'fallback',
        stale_level: 'very_stale',
        error: String(error),
        loadTime
      }
    }
  }

  /**
   * 獲取股價快照 - 優化版本
   */
  async fetchQuotesSnapshot(): Promise<FetchResult<QuotesSnapshot>> {
    const startTime = performance.now()

    try {
      // 並行載入 status 和 quotes，但不讓 status 阻塞 quotes
      const statusPromise = this.fetchSystemStatus()
      const quotesPromise = this.fetchQuotesDirectly()

      // 等待 quotes 載入，status 可以稍後完成
      const quotesResult = await quotesPromise

      // 如果 quotes 成功，嘗試使用 status 的時間戳進行緩存破壞
      try {
        const statusResult = await Promise.race([
          statusPromise,
          new Promise(resolve => setTimeout(() => resolve(null), 1000)) // 1秒後放棄等待 status
        ])

        if (statusResult && (statusResult as any).data) {
          console.log('✅ Status loaded for cache busting')
        }
      } catch (error) {
        console.warn('⚠️ Status loading failed, continuing without cache busting')
      }

      return {
        ...quotesResult,
        loadTime: performance.now() - startTime
      }

    } catch (error) {
      const loadTime = performance.now() - startTime
      console.warn('Failed to fetch quotes snapshot:', error)

      // Fallback to cache
      const userState = StateManager.loadState()
      if (userState.cache.last_quotes_snapshot) {
        return {
          data: userState.cache.last_quotes_snapshot,
          source: 'cache',
          stale_level: this.calculateStaleness(userState.cache.last_quotes_snapshot.as_of),
          as_of: userState.cache.last_quotes_snapshot.as_of,
          error: String(error),
          loadTime
        }
      }

      return {
        data: null,
        source: 'fallback',
        stale_level: 'very_stale',
        error: String(error),
        loadTime
      }
    }
  }

  /**
   * 直接載入 quotes 數據，不依賴 status.json
   */
  private async fetchQuotesDirectly(): Promise<FetchResult<QuotesSnapshot>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.dataTimeout)

    try {
      // 使用簡單的時間戳緩存破壞
      const cacheBuster = this.cacheBustingEnabled ? `?t=${Date.now()}` : ''

      const response = await fetch(`${this.baseUrl}/data/quotes/latest.json${cacheBuster}`, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const validation = validateQuotesSnapshot(data)

      if (!validation.success) {
        throw new Error(`Invalid quotes snapshot: ${validation.error?.message}`)
      }

      // 更新 cache
      StateManager.updateCache({
        last_quotes_snapshot: validation.data!
      })

      return {
        data: validation.data!,
        source: 'network',
        stale_level: this.calculateStaleness(validation.data!.as_of),
        as_of: validation.data!.as_of
      }

    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  /**
   * 獲取每日快照 - 優化版本
   */
  async fetchDailySnapshot(date?: string): Promise<FetchResult<DailySnapshot>> {
    const startTime = performance.now()

    try {
      const targetDate = date || this.getTaipeiDateString()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.dataTimeout)

      // 直接載入，不等待 status.json
      const cacheBuster = this.cacheBustingEnabled ? `?t=${Date.now()}` : ''

      const response = await fetch(`${this.baseUrl}/data/daily/${targetDate}.json${cacheBuster}`, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const validation = validateDailySnapshot(data)

      if (!validation.success) {
        throw new Error(`Invalid daily snapshot: ${validation.error?.message}`)
      }

      // 更新 cache
      StateManager.updateCache({
        last_daily_snapshot: validation.data!
      })

      return {
        data: validation.data!,
        source: 'network',
        stale_level: this.calculateStaleness(validation.data!.generated_at_utc),
        as_of: validation.data!.generated_at_utc,
        loadTime: performance.now() - startTime
      }

    } catch (error) {
      const loadTime = performance.now() - startTime
      console.warn('Failed to fetch daily snapshot:', error)

      // Fallback to cache
      const userState = StateManager.loadState()
      if (userState.cache.last_daily_snapshot) {
        return {
          data: userState.cache.last_daily_snapshot,
          source: 'cache',
          stale_level: this.calculateStaleness(userState.cache.last_daily_snapshot.generated_at_utc),
          as_of: userState.cache.last_daily_snapshot.generated_at_utc,
          error: String(error),
          loadTime
        }
      }

      return {
        data: null,
        source: 'fallback',
        stale_level: 'very_stale',
        error: String(error),
        loadTime
      }
    }
  }

  /**
   * 獲取元數據快照 - 優化版本
   */
  async fetchMetadataSnapshot(): Promise<FetchResult<MetadataSnapshot>> {
    const startTime = performance.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.dataTimeout)

      const cacheBuster = this.cacheBustingEnabled ? `?t=${Date.now()}` : ''

      const response = await fetch(`${this.baseUrl}/data/symbols_metadata.json${cacheBuster}`, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const validation = validateMetadataSnapshot(data)

      if (!validation.success) {
        throw new Error(`Invalid metadata snapshot: ${validation.error?.message}`)
      }

      // 更新 cache
      StateManager.updateCache({
        last_metadata: validation.data!
      })

      return {
        data: validation.data!,
        source: 'network',
        stale_level: this.calculateStaleness(validation.data!.as_of),
        as_of: validation.data!.as_of,
        loadTime: performance.now() - startTime
      }

    } catch (error) {
      const loadTime = performance.now() - startTime
      console.warn('Failed to fetch metadata snapshot:', error)

      // Fallback to cache
      const userState = StateManager.loadState()
      if (userState.cache.last_metadata) {
        return {
          data: userState.cache.last_metadata,
          source: 'cache',
          stale_level: this.calculateStaleness(userState.cache.last_metadata.as_of),
          as_of: userState.cache.last_metadata.as_of,
          error: String(error),
          loadTime
        }
      }

      return {
        data: null,
        source: 'fallback',
        stale_level: 'very_stale',
        error: String(error),
        loadTime
      }
    }
  }

  /**
   * 批量載入所有數據 - 並行優化
   */
  async fetchAllData(): Promise<{
    quotes: FetchResult<QuotesSnapshot>
    daily: FetchResult<DailySnapshot>
    metadata: FetchResult<MetadataSnapshot>
    totalTime: number
  }> {
    const startTime = performance.now()

    // 並行載入所有數據
    const [quotes, daily, metadata] = await Promise.all([
      this.fetchQuotesSnapshot(),
      this.fetchDailySnapshot(),
      this.fetchMetadataSnapshot()
    ])

    const totalTime = performance.now() - startTime

    console.log(`📊 Batch load completed in ${totalTime.toFixed(2)}ms:`)
    console.log(`   Quotes: ${quotes.loadTime?.toFixed(2)}ms (${quotes.source})`)
    console.log(`   Daily: ${daily.loadTime?.toFixed(2)}ms (${daily.source})`)
    console.log(`   Metadata: ${metadata.loadTime?.toFixed(2)}ms (${metadata.source})`)

    return { quotes, daily, metadata, totalTime }
  }

  /**
   * 計算數據新鮮度
   */
  private calculateStaleness(asOfString: string): 'fresh' | 'stale' | 'very_stale' {
    try {
      const asOf = new Date(asOfString)
      const now = new Date()
      const ageMinutes = (now.getTime() - asOf.getTime()) / (1000 * 60)

      if (ageMinutes <= 60) return 'fresh'        // 1 小時內
      if (ageMinutes <= 24 * 60) return 'stale'  // 24 小時內
      return 'very_stale'                         // 超過 24 小時
    } catch {
      return 'very_stale'
    }
  }

  /**
   * 獲取 Taipei 時區的日期字串 (YYYY-MM-DD)
   */
  private getTaipeiDateString(): string {
    const now = new Date()
    // 轉換為 Taipei 時區 (UTC+8)
    const taipeiTime = new Date(now.getTime() + (8 * 60 * 60 * 1000))
    return taipeiTime.toISOString().split('T')[0]
  }

  /**
   * 設置超時時間
   */
  setTimeouts(statusTimeout: number, dataTimeout: number) {
    this.statusTimeout = statusTimeout
    this.dataTimeout = dataTimeout
  }

  /**
   * 獲取載入統計
   */
  getLoadingStats() {
    return {
      statusTimeout: this.statusTimeout,
      dataTimeout: this.dataTimeout,
      cacheBustingEnabled: this.cacheBustingEnabled,
      baseUrl: this.baseUrl
    }
  }
}

/// <reference types="vite/client" />

// 導出優化版本的實例
const getBaseUrl = () => {
  // Use Standard Vite Environment Variable
  const startUrl = import.meta.env.BASE_URL;
  return startUrl.endsWith('/') ? startUrl.slice(0, -1) : startUrl;
}

export const optimizedDataFetcher = new OptimizedDataFetcher(getBaseUrl())

// 為了向後兼容，也導出為 dataFetcher
export const dataFetcher = optimizedDataFetcher