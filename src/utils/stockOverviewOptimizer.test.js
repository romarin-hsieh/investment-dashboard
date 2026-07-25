/**
 * Characterization tests for stockOverviewOptimizer — written BEFORE the JS→TS
 * migration to lock current behaviour (ADR-0014). They pin the deterministic
 * logic a strict-typing pass could disturb: the cached-data filter/shape, the
 * cache-hit short-circuit in loadOptimizedStockData, the first-load
 * recommendation, and minimal-mode.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { stockOverviewOptimizer } from './stockOverviewOptimizer'
import { performanceCache, CACHE_KEYS } from './performanceCache'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // The singleton carries mutable state — reset what these tests touch.
  stockOverviewOptimizer.criticalSymbols = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'GOOGL']
  stockOverviewOptimizer.preloadInProgress = false
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('stockOverviewOptimizer.processCachedData', () => {
  it('filters cached quotes to the configured symbols and tags fromCache', () => {
    const cached = {
      quotes: [{ symbol: 'NVDA', price: 1 }, { symbol: 'ZZZZ', price: 2 }],
      dailyData: { d: 1 },
      metadata: { m: 1 },
      lastUpdate: 't0',
      staleLevel: 'fresh'
    }
    expect(stockOverviewOptimizer.processCachedData(cached, ['NVDA'])).toEqual({
      quotes: [{ symbol: 'NVDA', price: 1 }],
      dailyData: { d: 1 },
      metadata: { m: 1 },
      lastUpdate: 't0',
      staleLevel: 'fresh',
      fromCache: true
    })
  })
})

describe('stockOverviewOptimizer.loadOptimizedStockData — cache hit', () => {
  it('short-circuits to processCachedData when a cache entry exists', async () => {
    vi.spyOn(performanceCache, 'get').mockReturnValue({
      quotes: [{ symbol: 'NVDA' }, { symbol: 'X' }],
      dailyData: {},
      lastUpdate: 't1',
      staleLevel: 'fresh'
    })
    const result = await stockOverviewOptimizer.loadOptimizedStockData(['NVDA'])
    expect(result.fromCache).toBe(true)
    expect(result.quotes).toEqual([{ symbol: 'NVDA' }])
  })
})

describe('stockOverviewOptimizer.getLoadingRecommendations', () => {
  it('recommends FIRST_LOAD when the overview cache is absent', () => {
    vi.spyOn(performanceCache, 'has').mockReturnValue(false)
    const recs = stockOverviewOptimizer.getLoadingRecommendations()
    expect(recs.some(r => r.type === 'FIRST_LOAD')).toBe(true)
  })

  it('omits FIRST_LOAD when the overview cache is present', () => {
    vi.spyOn(performanceCache, 'has').mockImplementation(key => key === CACHE_KEYS.STOCK_OVERVIEW_DATA)
    const recs = stockOverviewOptimizer.getLoadingRecommendations()
    expect(recs.some(r => r.type === 'FIRST_LOAD')).toBe(false)
  })
})

describe('stockOverviewOptimizer.enableMinimalMode', () => {
  it('reduces criticalSymbols to three and returns the minimal-mode flags', () => {
    const flags = stockOverviewOptimizer.enableMinimalMode()
    expect(stockOverviewOptimizer.criticalSymbols).toEqual(['NVDA', 'TSLA', 'AAPL'])
    expect(flags).toEqual({ reducedSymbols: true, shorterCache: true, minimalMetadata: true })
  })
})
