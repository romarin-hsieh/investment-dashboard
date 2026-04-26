/**
 * Baseline tests for CacheWarmupService — happy + failure case for the
 * pure / locally-scoped surface area.
 *
 * Scope per WS-E PR-E3 audit-finding #2. The class has heavy collaborators
 * (`hybridTechnicalIndicatorsAPI`, `performanceCache`, `performanceMonitor`)
 * that we mock as no-ops so the test never makes a real network or cache
 * call. Tests target: pure helpers (createBatches, sleep), config merge,
 * tracked-symbol mutation, and localStorage-backed last-warmup readers.
 *
 * The full warmup pipeline (`performWarmup`, `start`, `schedulePeriodicWarmup`)
 * is intentionally NOT tested — it's integration-shaped (network + cache
 * + scheduler) and the value of a regression net there is lower than the
 * cost of mocking 3+ collaborators per case.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock heavy collaborators so importing the service doesn't fire side effects.
vi.mock('@/api/hybridTechnicalIndicatorsApi.js', () => ({
  hybridTechnicalIndicatorsAPI: { fetchTechnicalIndicators: vi.fn() }
}))
vi.mock('./performanceCache.js', () => ({
  performanceCache: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
  CACHE_KEYS: {}
}))
vi.mock('./performanceMonitor.js', () => ({
  performanceMonitor: { start: vi.fn(), end: vi.fn() }
}))

import { cacheWarmupService } from './cacheWarmupService.js'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createBatches', () => {
  it('splits an array into evenly-sized batches (happy path)', () => {
    const batches = cacheWarmupService.createBatches([1, 2, 3, 4, 5, 6], 2)
    expect(batches).toEqual([[1, 2], [3, 4], [5, 6]])
  })

  it('puts the remainder in a smaller final batch', () => {
    const batches = cacheWarmupService.createBatches([1, 2, 3, 4, 5], 2)
    expect(batches).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns one batch when batchSize >= length', () => {
    const batches = cacheWarmupService.createBatches([1, 2, 3], 10)
    expect(batches).toEqual([[1, 2, 3]])
  })

  it('returns empty array for empty input (failure-edge path)', () => {
    expect(cacheWarmupService.createBatches([], 2)).toEqual([])
  })
})

describe('sleep', () => {
  it('returns a Promise that resolves after the given ms (happy path)', async () => {
    const start = Date.now()
    await cacheWarmupService.sleep(20)
    expect(Date.now() - start).toBeGreaterThanOrEqual(15) // allow scheduler jitter
  })

  it('resolves immediately for ms=0 (edge case)', async () => {
    await expect(cacheWarmupService.sleep(0)).resolves.toBeUndefined()
  })
})

describe('updateConfig', () => {
  it('shallow-merges new config onto existing config', () => {
    const before = { ...cacheWarmupService.config }
    cacheWarmupService.updateConfig({ maxConcurrent: 99 })

    expect(cacheWarmupService.config.maxConcurrent).toBe(99)
    // Other keys preserved
    expect(cacheWarmupService.config.batchDelay).toBe(before.batchDelay)

    // Restore so we don't leak state into other test files
    cacheWarmupService.config = before
  })
})

describe('localStorage-backed last-warmup readers', () => {
  it('getLastWarmupVersion returns null when no record (failure path)', () => {
    expect(cacheWarmupService.getLastWarmupVersion()).toBeNull()
  })

  it('getLastWarmupVersion reads the stored value (happy path)', () => {
    localStorage.setItem('cache_warmup_version', '1.2.3')
    expect(cacheWarmupService.getLastWarmupVersion()).toBe('1.2.3')
  })

  it('getLastWarmupTime returns null when no record', () => {
    expect(cacheWarmupService.getLastWarmupTime()).toBeNull()
  })

  it('getLastWarmupTime parses the stored numeric timestamp', () => {
    localStorage.setItem('cache_warmup_time', '1730000000000')
    expect(cacheWarmupService.getLastWarmupTime()).toBe(1730000000000)
  })
})

describe('singleton + invariants', () => {
  it('exports a non-null singleton with the expected config keys', () => {
    expect(cacheWarmupService).toBeDefined()
    expect(cacheWarmupService.config).toMatchObject({
      maxConcurrent: expect.any(Number),
      batchDelay: expect.any(Number),
      retryAttempts: expect.any(Number)
    })
  })

  it('trackedSymbols starts as a non-empty array of string symbols', () => {
    expect(Array.isArray(cacheWarmupService.trackedSymbols)).toBe(true)
    expect(cacheWarmupService.trackedSymbols.length).toBeGreaterThan(0)
    for (const s of cacheWarmupService.trackedSymbols) {
      expect(typeof s).toBe('string')
    }
  })
})
