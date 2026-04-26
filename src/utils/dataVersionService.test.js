/**
 * Baseline tests for DataVersionService — happy + failure case per public method.
 *
 * Scope per WS-E PR-E3 audit-finding #2. The service handles
 * timestamp-based data version detection + listener notification +
 * localStorage-backed last-seen tracking. The fetch-heavy
 * `checkDataVersionAndRefresh` is NOT covered here (its surface area is
 * better suited to integration tests that exercise the full
 * status.json → cache-clear → trigger-refresh chain). What we DO cover
 * is the pure logic + storage + listener machinery.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { dataVersionService } from './dataVersionService.js'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // Each test starts from a clean localStorage so version-tracking state
  // doesn't leak across cases.
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  // Clean up any listeners attached during the test so cross-test
  // notification leaks aren't possible.
  for (const l of [...dataVersionService.listeners]) {
    dataVersionService.removeListener(l)
  }
})

describe('shouldClearCacheKey', () => {
  it('matches known prefixes the service is responsible for clearing', () => {
    expect(dataVersionService.shouldClearCacheKey('technical_indicators_AAPL')).toBe(true)
    expect(dataVersionService.shouldClearCacheKey('precomputed_NVDA')).toBe(true)
    expect(dataVersionService.shouldClearCacheKey('ohlcv_TSLA_1d')).toBe(true)
    expect(dataVersionService.shouldClearCacheKey('latest_index_2026')).toBe(true)
    expect(dataVersionService.shouldClearCacheKey('hybrid_technical_QQQ')).toBe(true)
  })

  it('does not match unrelated keys (failure path — false positive guard)', () => {
    expect(dataVersionService.shouldClearCacheKey('user_preferences')).toBe(false)
    expect(dataVersionService.shouldClearCacheKey('theme_setting')).toBe(false)
    expect(dataVersionService.shouldClearCacheKey('lastSeenDataVersion')).toBe(false)
    expect(dataVersionService.shouldClearCacheKey('')).toBe(false)
  })
})

describe('listener registry', () => {
  it('addListener / removeListener manage the listener Set', () => {
    const sizeBefore = dataVersionService.listeners.size
    const listener = vi.fn()

    dataVersionService.addListener(listener)
    expect(dataVersionService.listeners.size).toBe(sizeBefore + 1)

    dataVersionService.removeListener(listener)
    expect(dataVersionService.listeners.size).toBe(sizeBefore)
  })

  it('notifyListeners invokes all listeners with (event, data) — happy path', () => {
    const a = vi.fn()
    const b = vi.fn()
    dataVersionService.addListener(a)
    dataVersionService.addListener(b)

    dataVersionService.notifyListeners('versionChanged', { newVersion: 'v2' })

    expect(a).toHaveBeenCalledWith('versionChanged', { newVersion: 'v2' })
    expect(b).toHaveBeenCalledWith('versionChanged', { newVersion: 'v2' })
  })

  it('continues notifying remaining listeners when one throws (failure path — error isolation)', () => {
    const broken = vi.fn(() => { throw new Error('listener bug') })
    const survivor = vi.fn()
    dataVersionService.addListener(broken)
    dataVersionService.addListener(survivor)

    expect(() => dataVersionService.notifyListeners('test')).not.toThrow()
    expect(broken).toHaveBeenCalled()
    expect(survivor).toHaveBeenCalled()
  })
})

describe('localStorage-backed version tracking', () => {
  it('getCurrentVersion reads from localStorage[STORAGE_KEY]', () => {
    expect(dataVersionService.getCurrentVersion()).toBeNull()

    localStorage.setItem(dataVersionService.STORAGE_KEY, '2026-04-26')
    expect(dataVersionService.getCurrentVersion()).toBe('2026-04-26')
  })

  it('resetVersionCheck clears the stored version (failure-recovery affordance)', () => {
    localStorage.setItem(dataVersionService.STORAGE_KEY, '2026-04-26')
    dataVersionService.resetVersionCheck()
    expect(dataVersionService.getCurrentVersion()).toBeNull()
  })
})

describe('getStatus', () => {
  it('returns the expected diagnostic shape', () => {
    localStorage.setItem(dataVersionService.STORAGE_KEY, 'v1')
    const listener = vi.fn()
    dataVersionService.addListener(listener)

    const status = dataVersionService.getStatus()

    expect(status).toMatchObject({
      isChecking: expect.any(Boolean),
      currentVersion: 'v1',
      listenerCount: expect.any(Number),
      storageKey: 'lastSeenDataVersion'
    })
    expect(status.listenerCount).toBeGreaterThanOrEqual(1)
  })
})
