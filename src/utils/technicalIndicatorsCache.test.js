/**
 * Tests for WS-B PR-B4: LRU eviction + proactive byte/item caps +
 * cleanupOldCache iterator-bug fix.
 *
 * Uses jsdom's built-in localStorage (from vitest.config.js `environment:
 * 'jsdom'`) and mocks global.fetch for getLatestIndex calls.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

let cacheModule

beforeEach(async () => {
  vi.resetModules()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  localStorage.clear()
  // Stub fetch so getLatestIndex doesn't try a real network call.
  // Returning null makes getCacheKey fall back to today's date.
  global.fetch = vi.fn(async () => ({ ok: false, status: 404 }))

  cacheModule = await import('./technicalIndicatorsCache.js')
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

/**
 * Build a minimal-but-valid data blob that passes `_isValidData`.
 * Needs OBV with a value AND at least one Beta field.
 */
function validIndicatorData (beta = 1.0) {
  return {
    obv: { value: 1234567 },
    yf: { beta_10d: beta }
  }
}

/**
 * Helper to directly seed a cache entry without going through
 * setTechnicalIndicators — lets tests control lastAccess independently
 * of write time.
 */
function seedEntry (cache, symbol, { writtenAt, lastAccess, sizeBytes = 500 }) {
  const key = `${cache.cachePrefix}${symbol}_2026-04-19`
  // Inflate payload so MAX_BYTES math is measurable
  const padding = 'x'.repeat(Math.max(0, sizeBytes - 200))
  const record = {
    data: { ...validIndicatorData(), _pad: padding },
    timestamp: writtenAt,
    lastAccess: lastAccess ?? writtenAt,
    symbol,
    date: '2026-04-19'
  }
  localStorage.setItem(key, JSON.stringify(record))
  return key
}

describe('TechnicalIndicatorsCache — memory cap', () => {
  it('caps the in-memory Map at MEMORY_MAX_ITEMS', async () => {
    const cache = cacheModule.technicalIndicatorsCache
    // setTechnicalIndicators mutates the singleton's memory; that's fine
    // since each test resets modules and clears storage.
    for (let i = 0; i < cache.MEMORY_MAX_ITEMS + 10; i++) {
      await cache.setTechnicalIndicators(`SYM${i}`, validIndicatorData())
    }
    expect(cache.memoryCache.size).toBeLessThanOrEqual(cache.MEMORY_MAX_ITEMS)
  })

  it('moves a touched entry to the MRU position (LRU ordering)', async () => {
    const cache = cacheModule.technicalIndicatorsCache
    await cache.setTechnicalIndicators('A', validIndicatorData())
    await cache.setTechnicalIndicators('B', validIndicatorData())
    await cache.setTechnicalIndicators('C', validIndicatorData())

    // Read A — it should move to the back (most-recently-used)
    await cache.getTechnicalIndicators('A')

    // Insertion order after the touch: B, C, A
    const orderedKeys = [...cache.memoryCache.keys()]
    expect(orderedKeys[orderedKeys.length - 1]).toContain('A')
  })
})

describe('TechnicalIndicatorsCache — pruneCache', () => {
  it('evicts the oldest-by-lastAccess entries first', async () => {
    const cache = cacheModule.technicalIndicatorsCache
    // Seed 10 entries with varying lastAccess
    const keys = []
    for (let i = 0; i < 10; i++) {
      keys.push(seedEntry(cache, `SYM${i}`, {
        writtenAt: 1_000_000_000 + i * 1000,
        lastAccess: 1_000_000_000 + i * 1000,   // 0 is oldest, 9 is newest
        sizeBytes: 500
      }))
    }

    cache.pruneCache()

    // With 10 items and EVICT_FRACTION 0.2 we'd evict 2 — but targetCount
    // is max(5, floor(10 * 0.2)) = 5. So bottom 5 (lastAccess 0..4) go.
    for (let i = 0; i < 5; i++) {
      expect(localStorage.getItem(keys[i])).toBeNull()
    }
    // Top 5 (lastAccess 5..9) survive
    for (let i = 5; i < 10; i++) {
      expect(localStorage.getItem(keys[i])).not.toBeNull()
    }
  })

  it('purges corrupt entries first (sortKey 0)', async () => {
    const cache = cacheModule.technicalIndicatorsCache
    // 1 corrupt + 5 valid
    localStorage.setItem(`${cache.cachePrefix}CORRUPT_2026-04-19`, '{not valid json')
    for (let i = 0; i < 5; i++) {
      seedEntry(cache, `OK${i}`, {
        writtenAt: 2_000_000_000 + i * 1000,
        lastAccess: 2_000_000_000 + i * 1000
      })
    }
    cache.pruneCache()
    // Corrupt entry is gone
    expect(localStorage.getItem(`${cache.cachePrefix}CORRUPT_2026-04-19`)).toBeNull()
  })

  it('completes in under 100 ms for a 200-entry cache (PR-B4 target)', async () => {
    const cache = cacheModule.technicalIndicatorsCache
    for (let i = 0; i < 200; i++) {
      seedEntry(cache, `PERF${i}`, {
        writtenAt: 3_000_000_000 + i,
        lastAccess: 3_000_000_000 + i,
        sizeBytes: 800
      })
    }
    const start = performance.now()
    cache.pruneCache()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(100)
  })
})

describe('TechnicalIndicatorsCache — cleanupOldCache', () => {
  it('deletes ALL expired entries (fixes the iterator-shift bug)', async () => {
    const cache = cacheModule.technicalIndicatorsCache
    const now = Date.now()
    const expiredAge = now - (25 * 60 * 60 * 1000) // 25h ago, past 24h timeout

    // Seed 10 expired entries — the old buggy loop would skip every other one
    for (let i = 0; i < 10; i++) {
      seedEntry(cache, `EXP${i}`, {
        writtenAt: expiredAge,
        lastAccess: expiredAge
      })
    }
    // Plus 3 fresh entries that should survive
    for (let i = 0; i < 3; i++) {
      seedEntry(cache, `FRESH${i}`, {
        writtenAt: now,
        lastAccess: now
      })
    }

    cache.cleanupOldCache()

    // All 10 expired must be gone (not just 5 if the old bug were present)
    for (let i = 0; i < 10; i++) {
      expect(localStorage.getItem(`${cache.cachePrefix}EXP${i}_2026-04-19`)).toBeNull()
    }
    // Fresh ones survive
    for (let i = 0; i < 3; i++) {
      expect(localStorage.getItem(`${cache.cachePrefix}FRESH${i}_2026-04-19`)).not.toBeNull()
    }
  })

  it('purges corrupt JSON entries regardless of age', async () => {
    const cache = cacheModule.technicalIndicatorsCache
    localStorage.setItem(`${cache.cachePrefix}CORRUPT_2026-04-19`, 'not json{')
    cache.cleanupOldCache()
    expect(localStorage.getItem(`${cache.cachePrefix}CORRUPT_2026-04-19`)).toBeNull()
  })
})

describe('TechnicalIndicatorsCache — byte counters', () => {
  it('_countLocalStorageBytes sums only cache entries', async () => {
    const cache = cacheModule.technicalIndicatorsCache
    seedEntry(cache, 'A', { writtenAt: 1, lastAccess: 1, sizeBytes: 1000 })
    // An unrelated key should NOT count
    localStorage.setItem('unrelated-key', 'junk')
    const bytes = cache._countLocalStorageBytes()
    expect(bytes).toBeGreaterThan(0)
    // rough sanity: roughly size of entry * 2 (UTF-16)
    expect(bytes).toBeGreaterThan(1000)
  })

  it('_countLocalStorageItems returns the number of cache entries', async () => {
    const cache = cacheModule.technicalIndicatorsCache
    for (let i = 0; i < 4; i++) {
      seedEntry(cache, `CNT${i}`, { writtenAt: i, lastAccess: i })
    }
    localStorage.setItem('unrelated', 'x')
    expect(cache._countLocalStorageItems()).toBe(4)
  })
})
