/**
 * Baseline tests for AutoUpdateScheduler — happy + failure case for the
 * lifecycle surface (start / stop / config defaults).
 *
 * Scope per WS-E PR-E3 audit-finding #2. The scheduler owns three
 * setInterval timers (technical indicators, metadata, cache cleanup).
 * Tests target lifecycle invariants (start/stop idempotency, interval
 * registration, isRunning flag) and config integrity. The actual
 * `checkAndUpdateTechnicalIndicators` / `checkAndUpdateMetadata` /
 * `performCacheCleanup` work is integration-shaped (network + cache +
 * version-service collaboration) and intentionally NOT covered here.
 *
 * `performInitialUpdate` is auto-called from `start()`, so we mock the
 * three "check" methods to no-ops in the start lifecycle test. We
 * intentionally rely on `vi.useFakeTimers` to assert interval
 * registration without waiting 24 hours of real wall-clock.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock heavy collaborators so importing the service doesn't fire side effects.
vi.mock('./performanceMonitor.js', () => ({
  performanceMonitor: { start: vi.fn(), end: vi.fn() }
}))
vi.mock('./performanceCache.js', () => ({
  performanceCache: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
  CACHE_KEYS: {}
}))
// dataVersionService is dynamically imported by the scheduler's
// check methods — no top-level mock needed since we don't invoke them.

let module

beforeEach(async () => {
  vi.resetModules()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  module = await import('./autoUpdateScheduler.js')
})

afterEach(() => {
  // Always stop the scheduler so cross-test interval leakage isn't possible.
  try { module?.autoUpdateScheduler?.stop?.() } catch { /* idempotent */ }
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('config defaults', () => {
  it('exposes a config block with the three expected sections', () => {
    expect(module.autoUpdateScheduler.config).toMatchObject({
      technicalIndicators: expect.any(Object),
      metadata: expect.any(Object),
      cacheCleanup: expect.any(Object)
    })
  })

  it('uses 24-hour intervals for technicalIndicators + metadata (sanity)', () => {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000
    expect(module.autoUpdateScheduler.config.technicalIndicators.interval).toBe(ONE_DAY_MS)
    expect(module.autoUpdateScheduler.config.metadata.interval).toBe(ONE_DAY_MS)
  })
})

describe('start lifecycle', () => {
  beforeEach(() => {
    // Stub the network-touching methods so start()'s performInitialUpdate
    // doesn't try to actually fetch anything.
    vi.spyOn(module.autoUpdateScheduler, 'checkAndUpdateTechnicalIndicators').mockResolvedValue()
    vi.spyOn(module.autoUpdateScheduler, 'checkAndUpdateMetadata').mockResolvedValue()
    vi.spyOn(module.autoUpdateScheduler, 'performCacheCleanup').mockResolvedValue()
    vi.useFakeTimers()
  })

  it('sets isRunning=true and registers three intervals (happy path)', () => {
    expect(module.autoUpdateScheduler.isRunning).toBe(false)
    expect(module.autoUpdateScheduler.updateIntervals.size).toBe(0)

    module.autoUpdateScheduler.start()

    expect(module.autoUpdateScheduler.isRunning).toBe(true)
    expect(module.autoUpdateScheduler.updateIntervals.size).toBe(3)
    expect([...module.autoUpdateScheduler.updateIntervals.keys()]).toEqual(
      expect.arrayContaining(['technicalIndicators', 'metadata', 'cacheCleanup'])
    )
  })

  it('start when already running is a no-op (idempotent — failure-guard path)', () => {
    module.autoUpdateScheduler.start()
    const firstIntervalIds = [...module.autoUpdateScheduler.updateIntervals.values()]

    module.autoUpdateScheduler.start() // second call

    // Same intervals — second call did NOT replace them.
    const secondIntervalIds = [...module.autoUpdateScheduler.updateIntervals.values()]
    expect(secondIntervalIds).toEqual(firstIntervalIds)
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('already running')
    )
  })
})

describe('stop lifecycle', () => {
  beforeEach(() => {
    vi.spyOn(module.autoUpdateScheduler, 'checkAndUpdateTechnicalIndicators').mockResolvedValue()
    vi.spyOn(module.autoUpdateScheduler, 'checkAndUpdateMetadata').mockResolvedValue()
    vi.spyOn(module.autoUpdateScheduler, 'performCacheCleanup').mockResolvedValue()
    vi.useFakeTimers()
  })

  it('clears all intervals and sets isRunning=false (happy path)', () => {
    module.autoUpdateScheduler.start()
    expect(module.autoUpdateScheduler.updateIntervals.size).toBe(3)

    module.autoUpdateScheduler.stop()

    expect(module.autoUpdateScheduler.updateIntervals.size).toBe(0)
    expect(module.autoUpdateScheduler.isRunning).toBe(false)
  })

  it('stop when not running is a no-op (failure-guard path)', () => {
    expect(module.autoUpdateScheduler.isRunning).toBe(false)

    module.autoUpdateScheduler.stop() // not running yet

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('not running')
    )
    // Still not running, no exception thrown
    expect(module.autoUpdateScheduler.isRunning).toBe(false)
  })
})

describe('singleton', () => {
  it('exports a default singleton instance', () => {
    expect(module.autoUpdateScheduler).toBeDefined()
    expect(typeof module.autoUpdateScheduler.start).toBe('function')
    expect(typeof module.autoUpdateScheduler.stop).toBe('function')
  })
})
