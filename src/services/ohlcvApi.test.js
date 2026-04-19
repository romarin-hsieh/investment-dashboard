/**
 * Regression tests for the request-deduplication Map in OhlcvApi.
 *
 * The Apr 2026 audit claimed `inflightRequests.delete()` wasn't called on
 * rejection paths. These tests PROVE that claim one way or the other and
 * lock in the correct behavior going forward — any future refactor that
 * re-introduces the leak will fail CI.
 *
 * The key invariant: after any awaited fetch (whether it resolved, rejected,
 * or returned null), `api.inflightRequests` must contain zero entries for
 * that request.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Dynamic import so we can reset the module's singleton between tests
let ohlcvApiModule

beforeEach(async () => {
  vi.resetModules()
  // Silence production console noise
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // Re-import after reset
  ohlcvApiModule = await import('./ohlcvApi.js')
})
afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Construct a fresh OhlcvApi-like instance with mocked fetch. We don't use
 * the exported singleton to avoid cross-test pollution — each test gets
 * its own private instance.
 */
function makeApi () {
  // Instantiate by accessing the class via the module's internal singleton.
  // The module exports `ohlcvApi` as a default singleton; we reset modules
  // in beforeEach so each test gets a fresh one.
  return ohlcvApiModule.ohlcvApi
}

/**
 * Returns valid-shape OHLCV data (25 points — validateOhlcvData requires >=20).
 */
function validOhlcv () {
  const n = 25
  const ts = Array.from({ length: n }, (_, i) => 1_700_000_000_000 + i * 86400000)
  const seq = (base) => Array.from({ length: n }, (_, i) => base + i * 0.5)
  return {
    timestamps: ts,
    open:   seq(100),
    high:   seq(101),
    low:    seq(99),
    close:  seq(100.5),
    volume: Array(n).fill(1_000_000)
  }
}

describe('OhlcvApi — inflightRequests cleanup', () => {
  it('clears the map after a successful fetch', async () => {
    const api = makeApi()
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      async json () { return validOhlcv() }
    }))

    const result = await api.fetchLocalOhlcv('TEST', '1d', '3mo')
    expect(result).not.toBeNull()
    expect(api.inflightRequests.size).toBe(0)
  })

  it('clears the map after a 404 (returns null gracefully)', async () => {
    const api = makeApi()
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    }))

    const result = await api.fetchLocalOhlcv('NOTFOUND', '1d', '3mo')
    expect(result).toBeNull()
    expect(api.inflightRequests.size).toBe(0)
  })

  it('clears the map after a rejected fetch (the audit scenario)', async () => {
    const api = makeApi()
    // Simulate a genuine network error — fetch throws
    global.fetch = vi.fn(async () => {
      throw new Error('Network error')
    })

    // The promise must reject, but the map must still be clean afterwards.
    await expect(api.fetchLocalOhlcv('REJECT', '1d', '3mo'))
      .rejects.toThrow('Network error')
    expect(api.inflightRequests.size).toBe(0)
  })

  it('clears the map after a non-404 HTTP error (5xx)', async () => {
    const api = makeApi()
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    }))

    await expect(api.fetchLocalOhlcv('SERVER_ERR', '1d', '3mo'))
      .rejects.toThrow(/HTTP 500/)
    expect(api.inflightRequests.size).toBe(0)
  })

  it('deduplicates concurrent requests for the same symbol', async () => {
    const api = makeApi()
    let callCount = 0
    global.fetch = vi.fn(async () => {
      callCount++
      await new Promise(r => setTimeout(r, 20))  // ensure overlap
      return { ok: true, status: 200, async json () { return validOhlcv() } }
    })

    const [a, b] = await Promise.all([
      api.fetchLocalOhlcv('DEDUP', '1d', '3mo'),
      api.fetchLocalOhlcv('DEDUP', '1d', '3mo')
    ])

    // Same resolved value shared — the exact promise was reused
    expect(a).toBe(b)
    // Only one underlying fetch (precomputed URL) fired
    expect(callCount).toBe(1)
    // And the map is clean after both awaits settle
    expect(api.inflightRequests.size).toBe(0)
  })

  it('clears the map after a rejection, even under concurrent deduplication', async () => {
    const api = makeApi()
    global.fetch = vi.fn(async () => {
      throw new Error('Concurrent network error')
    })

    const [r1, r2] = await Promise.allSettled([
      api.fetchLocalOhlcv('CONCURRENT_REJECT', '1d', '3mo'),
      api.fetchLocalOhlcv('CONCURRENT_REJECT', '1d', '3mo')
    ])

    // Both should reject with the same error (shared rejected promise)
    expect(r1.status).toBe('rejected')
    expect(r2.status).toBe('rejected')
    // Critical: map must be empty after BOTH awaits — no lingering key
    expect(api.inflightRequests.size).toBe(0)
  })
})
