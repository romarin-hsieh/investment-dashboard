/**
 * Data Fetcher - 實現 PRD 要求的 status-first + fallback 策略
 * 
 * Fetch 順序:
 * 1. /data/status.json (檢查時間戳)
 * 2. 網路快照 (latest)
 * 3. localStorage 快照 (last-known-good)
 * 4. 顯示 N/A + stale indicator
 */
/// <reference types="vite/client" />

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
}

export class DataFetcher {
  private baseUrl: string
  private cacheBustingEnabled: boolean

  constructor(baseUrl: string = '', cacheBustingEnabled: boolean = true) {
    this.baseUrl = baseUrl
    this.cacheBustingEnabled = cacheBustingEnabled
  }

  /**
   * 獲取系統狀態 - 所有其他請求的基礎
   */
  async fetchSystemStatus(): Promise<FetchResult<SystemStatus>> {
    try {
      const timestamp = new Date().getTime()
      const response = await fetch(`${this.baseUrl}/data/status.json?t=${timestamp}`)
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
        as_of: validation.data!.last_updated
      }
    } catch (error) {
      console.warn('Failed to fetch system status:', error)

      // Fallback to cached status if available
      const state = StateManager.loadState()
      if (state.cache.last_daily_snapshot) {
        return {
          data: null, // We don't cache status.json separately
          source: 'fallback',
          stale_level: 'very_stale',
          error: String(error)
        }
      }

      return {
        data: null,
        source: 'fallback',
        stale_level: 'very_stale',
        error: String(error)
      }
    }
  }

  /**
   * 獲取股價快照 - 實現 last-known-good 策略
   */
  async fetchQuotesSnapshot(): Promise<FetchResult<QuotesSnapshot>> {
    try {
      // 1. 先檢查 status.json 獲取時間戳
      const statusResult = await this.fetchSystemStatus()
      let cacheBuster = ''

      if (this.cacheBustingEnabled && statusResult.data?.last_updated) {
        const timestamp = new Date(statusResult.data.last_updated).getTime()
        cacheBuster = `?t=${timestamp}`
      }

      // 2. 嘗試獲取最新快照
      const response = await fetch(`${this.baseUrl}/data/quotes/latest.json${cacheBuster}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const validation = validateQuotesSnapshot(data)

      if (!validation.success) {
        throw new Error(`Invalid quotes snapshot: ${validation.error?.message}`)
      }

      // 3. 成功時更新 localStorage cache
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
      console.warn('Failed to fetch quotes snapshot:', error)

      // 4. Fallback to localStorage cache
      const userState = StateManager.loadState()
      if (userState.cache.last_quotes_snapshot) {
        return {
          data: userState.cache.last_quotes_snapshot,
          source: 'cache',
          stale_level: this.calculateStaleness(userState.cache.last_quotes_snapshot.as_of),
          as_of: userState.cache.last_quotes_snapshot.as_of,
          error: String(error)
        }
      }

      // 5. 最終 fallback
      return {
        data: null,
        source: 'fallback',
        stale_level: 'very_stale',
        error: String(error)
      }
    }
  }

  /**
   * 獲取每日快照 (Smart Backtracking)
   * 自動嘗試今天 -> 昨天 -> 前天，直到找到可用數據
   */
  async fetchDailySnapshot(date?: string): Promise<FetchResult<DailySnapshot>> {
    const maxBacktrackDays = 2 // 最多回溯2天
    const targetDate = date || this.getTaipeiDateString()
    let attemptDate = targetDate

    // 如果有緩存且有效，直接返回 (避免重複請求)
    const userState = StateManager.loadState()
    if (userState.cache.last_daily_snapshot) {
      const cachedDateStr = userState.cache.last_daily_snapshot.generated_at_utc.split('T')[0]
      // 如果緩存的日期是我們想要的，或是我們正在尋找的日期範圍內
      if (cachedDateStr === targetDate) {
        return {
          data: userState.cache.last_daily_snapshot,
          source: 'cache',
          stale_level: this.calculateStaleness(userState.cache.last_daily_snapshot.generated_at_utc),
          as_of: userState.cache.last_daily_snapshot.generated_at_utc
        }
      }
    }

    try {
      const statusResult = await this.fetchSystemStatus()
      let cacheBuster = ''

      if (this.cacheBustingEnabled && statusResult.data?.last_updated) {
        const timestamp = new Date(statusResult.data.last_updated).getTime()
        cacheBuster = `?t=${timestamp}`
      }

      // 智能回溯迴圈
      for (let i = 0; i <= maxBacktrackDays; i++) {
        try {
          // 計算嘗試日期
          if (i > 0) {
            const dateObj = new Date(targetDate)
            dateObj.setDate(dateObj.getDate() - i)
            const fallbackDate = dateObj.toISOString().split('T')[0]
            attemptDate = fallbackDate
            console.log(`⚠️ Daily data for ${targetDate} not found, backtracking to ${attemptDate}...`)
          }

          const response = await fetch(`${this.baseUrl}/data/daily/${attemptDate}.json${cacheBuster}`)

          // 如果 404 且還有重試機會，繼續下一次迴圈
          if (!response.ok) {
            if (response.status === 404 && i < maxBacktrackDays) {
              continue
            }
            throw new Error(`HTTP ${response.status} for ${attemptDate}`)
          }

          // 成功獲取
          const data = await response.json()
          const validation = validateDailySnapshot(data)

          if (!validation.success) {
            throw new Error(`Invalid daily snapshot (${attemptDate}): ${validation.error?.message}`)
          }

          // 更新 cache
          StateManager.updateCache({
            last_daily_snapshot: validation.data!
          })

          return {
            data: validation.data!,
            source: 'network',
            stale_level: this.calculateStaleness(validation.data!.generated_at_utc),
            as_of: validation.data!.generated_at_utc
          }

        } catch (iterError) {
          // 如果是最後一次嘗試，或非 404 錯誤，則拋出
          if (i === maxBacktrackDays) throw iterError
        }
      }

      throw new Error(`Daily data not found after ${maxBacktrackDays + 1} attempts`)

    } catch (error) {
      console.warn('Failed to fetch daily snapshot:', error)

      // Fallback to cache (last resort)
      if (userState.cache.last_daily_snapshot) {
        return {
          data: userState.cache.last_daily_snapshot,
          source: 'cache',
          stale_level: this.calculateStaleness(userState.cache.last_daily_snapshot.generated_at_utc),
          as_of: userState.cache.last_daily_snapshot.generated_at_utc,
          error: String(error)
        }
      }

      return {
        data: null,
        source: 'fallback',
        stale_level: 'very_stale',
        error: String(error)
      }
    }
  }

  /**
   * 獲取元數據快照
   */
  async fetchMetadataSnapshot(): Promise<FetchResult<MetadataSnapshot>> {
    try {
      const statusResult = await this.fetchSystemStatus()
      let cacheBuster = ''

      if (this.cacheBustingEnabled && statusResult.data?.last_updated) {
        const timestamp = new Date(statusResult.data.last_updated).getTime()
        cacheBuster = `?t=${timestamp}`
      }

      const response = await fetch(`${this.baseUrl}/data/symbols_metadata.json${cacheBuster}`)
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
        as_of: validation.data!.as_of
      }

    } catch (error) {
      console.warn('Failed to fetch metadata snapshot:', error)

      // Fallback to cache
      const userState = StateManager.loadState()
      if (userState.cache.last_metadata) {
        return {
          data: userState.cache.last_metadata,
          source: 'cache',
          stale_level: this.calculateStaleness(userState.cache.last_metadata.as_of),
          as_of: userState.cache.last_metadata.as_of,
          error: String(error)
        }
      }

      return {
        data: null,
        source: 'fallback',
        stale_level: 'very_stale',
        error: String(error)
      }
    }
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
}

// 導出單例實例 - 根據環境設置正確的基礎路徑
const getBaseUrl = () => {
  // Use Standard Vite Environment Variable
  const startUrl = import.meta.env.BASE_URL;
  return startUrl.endsWith('/') ? startUrl.slice(0, -1) : startUrl;
}

export const dataFetcher = new DataFetcher(getBaseUrl())