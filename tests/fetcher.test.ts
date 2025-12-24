/**
 * DataFetcher 測試
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataFetcher } from '@/lib/fetcher'
import { StateManager } from '@/utils/state-manager'

// Mock fetch
global.fetch = vi.fn()

describe('DataFetcher', () => {
  let fetcher: DataFetcher
  
  beforeEach(() => {
    fetcher = new DataFetcher('', false) // 關閉 cache busting 以便測試
    vi.clearAllMocks()
    
    // 清理 localStorage
    StateManager.clearState()
  })

  describe('fetchSystemStatus', () => {
    it('should fetch system status successfully', async () => {
      const mockStatus = {
        description: 'Test status',
        last_updated: '2025-12-23T10:00:00Z',
        system_status: 'operational',
        jobs: {},
        data_freshness: {},
        system_health: {},
        degradation_status: {
          enabled: true,
          active_fallbacks: [],
          cache_hits_last_hour: 0
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatus)
      } as Response)

      const result = await fetcher.fetchSystemStatus()
      
      expect(result.source).toBe('network')
      expect(result.stale_level).toBe('fresh')
      expect(result.data).toEqual(mockStatus)
    })

    it('should handle fetch failure gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await fetcher.fetchSystemStatus()
      
      expect(result.source).toBe('fallback')
      expect(result.stale_level).toBe('very_stale')
      expect(result.data).toBeNull()
      expect(result.error).toContain('Network error')
    })
  })

  describe('fetchQuotesSnapshot', () => {
    it('should fetch quotes and update cache', async () => {
      const mockStatus = {
        description: 'Test',
        last_updated: '2025-12-23T10:00:00Z',
        system_status: 'operational',
        jobs: {},
        data_freshness: {},
        system_health: {},
        degradation_status: { enabled: true, active_fallbacks: [], cache_hits_last_hour: 0 }
      }

      const mockQuotes = {
        as_of: '2025-12-23T10:00:00Z',
        provider: 'test_provider',
        items: [
          {
            symbol: 'AAPL',
            price_usd: 150.0,
            price_type: 'latest',
            market_state: 'open',
            is_delayed: false,
            stale_level: 'fresh',
            error: null
          }
        ]
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStatus)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockQuotes)
        } as Response)

      const result = await fetcher.fetchQuotesSnapshot()
      
      expect(result.source).toBe('network')
      expect(result.data).toEqual(mockQuotes)
      
      // 驗證 cache 已更新
      const userState = StateManager.loadState()
      expect(userState.cache.last_quotes_snapshot).toEqual(mockQuotes)
    })

    it('should fallback to cache when network fails', async () => {
      const mockQuotes = {
        as_of: '2025-12-23T09:00:00Z',
        provider: 'cached_provider',
        items: []
      }

      // 先設置 cache
      StateManager.updateCache({ last_quotes_snapshot: mockQuotes })

      // Mock network failure
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await fetcher.fetchQuotesSnapshot()
      
      expect(result.source).toBe('cache')
      expect(result.data).toEqual(mockQuotes)
      expect(result.error).toContain('Network error')
    })
  })

  describe('calculateStaleness', () => {
    it('should calculate staleness correctly', async () => {
      const now = new Date()
      
      // Fresh (30 minutes ago)
      const fresh = new Date(now.getTime() - 30 * 60 * 1000).toISOString()

      // 我們需要通過實際調用來測試 staleness 計算
      // 因為 calculateStaleness 是 private 方法，我們通過 fetchQuotesSnapshot 來測試

      const mockStatus = {
        description: 'Test',
        last_updated: now.toISOString(),
        system_status: 'operational',
        jobs: {}, data_freshness: {}, system_health: {},
        degradation_status: { enabled: true, active_fallbacks: [], cache_hits_last_hour: 0 }
      }

      // Test fresh data
      const freshQuotes = { as_of: fresh, provider: 'test', items: [] }
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) } as Response)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(freshQuotes) } as Response)

      const freshResult = await fetcher.fetchQuotesSnapshot()
      expect(freshResult.stale_level).toBe('fresh')
    })
  })

  describe('getTaipeiDateString', () => {
    it('should return correct Taipei date format', async () => {
      // 我們通過 fetchDailySnapshot 來間接測試這個功能
      const mockStatus = {
        description: 'Test',
        last_updated: '2025-12-23T10:00:00Z',
        system_status: 'operational',
        jobs: {}, data_freshness: {}, system_health: {},
        degradation_status: { enabled: true, active_fallbacks: [], cache_hits_last_hour: 0 }
      }

      const mockDaily = {
        as_of_date_taipei: '2025-12-23',
        generated_at_utc: '2025-12-23T10:00:00Z',
        universe: ['AAPL'],
        per_symbol: [],
        macro: { items: [] }
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStatus) } as Response)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockDaily) } as Response)

      const result = await fetcher.fetchDailySnapshot()
      expect(result.data?.as_of_date_taipei).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})