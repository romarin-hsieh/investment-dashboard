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

// ===================================================================
// Ingestion guards (R6): getOhlcv unwrap / alias / validation.
//
// getOhlcv -> fetchLocalOhlcv fetches a JSON file, then: unwraps a nested
// { symbol, ohlcv:{...} } payload (copying `symbol` into the child if it's
// missing); aliases `data.timestamp -> data.timestamps` when timestamps is
// absent; runs validateOhlcvData (equal-length arrays, >=20 points). An
// invalid payload throws inside fetchLocalOhlcv, so getOhlcv logs it and —
// in production (import.meta.env.DEV false, no ?debug) — returns null, which
// is what renders the blank chart in ADR-0012.
// ===================================================================

/** n-point OHLCV in the flat shape validateOhlcvData expects. */
function ohlcvOfLength (n) {
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
const okJson = (payload) => ({ ok: true, status: 200, async json () { return payload } })

describe('OhlcvApi — payload unwrap / alias / validation guards (R6)', () => {
  afterEach(() => { vi.unstubAllEnvs() })

  it('unwraps a nested { ohlcv:{...} } payload and inherits the parent symbol when the child lacks it', async () => {
    const api = makeApi()
    const child = ohlcvOfLength(25) // no `symbol` field on the child
    global.fetch = vi.fn(async () => okJson({ symbol: 'NEST', ohlcv: child }))

    const result = await api.fetchLocalOhlcv('NEST', '1d', '3mo')
    expect(result).not.toBeNull()
    expect(result.symbol).toBe('NEST')       // inherited from the parent wrapper
    expect(result.timestamps).toHaveLength(25)
    expect(result.close).toHaveLength(25)
  })

  it('keeps the child symbol when the nested payload already carries one (no overwrite)', async () => {
    const api = makeApi()
    const child = { ...ohlcvOfLength(25), symbol: 'CHILD' }
    global.fetch = vi.fn(async () => okJson({ symbol: 'PARENT', ohlcv: child }))

    const result = await api.fetchLocalOhlcv('PARENT', '1d', '3mo')
    expect(result.symbol).toBe('CHILD')
  })

  it('aliases data.timestamp -> data.timestamps when timestamps is absent, then validates', async () => {
    const api = makeApi()
    const base = ohlcvOfLength(25)
    const aliased = { ...base, timestamp: base.timestamps }
    delete aliased.timestamps                 // only `timestamp` (singular) present
    global.fetch = vi.fn(async () => okJson(aliased))

    const result = await api.fetchLocalOhlcv('ALIAS', '1d', '3mo')
    expect(result).not.toBeNull()
    expect(result.timestamps).toHaveLength(25) // aliased through and passed validation
  })

  it('getOhlcv returns null for a thin 19-point payload (validateOhlcvData < 20; ADR-0012 blank chart)', async () => {
    vi.stubEnv('DEV', false)                   // production path: no Yahoo DEV fallback
    const api = makeApi()
    const thin = ohlcvOfLength(19)
    global.fetch = vi.fn(async () => okJson(thin))

    expect(api.validateOhlcvData(thin)).toBe(false) // guard rejects <20 points
    const result = await api.getOhlcv('THIN', '1d', '3mo')
    expect(result).toBeNull()
  })

  it('getOhlcv returns null when array lengths mismatch (close one element short)', async () => {
    vi.stubEnv('DEV', false)
    const api = makeApi()
    const mismatch = ohlcvOfLength(25)
    mismatch.close = mismatch.close.slice(0, 24) // 24 closes vs 25 timestamps
    global.fetch = vi.fn(async () => okJson(mismatch))

    expect(api.validateOhlcvData(mismatch)).toBe(false) // length-mismatch guard
    const result = await api.getOhlcv('MISMATCH', '1d', '3mo')
    expect(result).toBeNull()
  })
})

// ===================================================================
// filterDataByRange golden-master (R6). 2-day spacing keeps every range
// cutoff strictly between samples (no ties), so the slice is stable across
// timezones. Named ranges wider than the dataset return it unchanged.
// ===================================================================
describe('OhlcvApi — filterDataByRange golden-master (R6)', () => {
  const DAY = 86400000
  const STEP = 2 * DAY
  const N = 60
  const LAST = Date.UTC(2024, 5, 15) // 2024-06-15T00:00:00Z anchor

  function dataset () {
    const timestamps = Array.from({ length: N }, (_, i) => LAST - (N - 1 - i) * STEP)
    const seq = (base) => timestamps.map((_, i) => base + i)
    return {
      symbol: 'RANGE',
      timestamps,
      open:   seq(10),
      high:   seq(11),
      low:    seq(9),
      close:  seq(10.5),
      volume: timestamps.map((_, i) => 1000 + i)
    }
  }

  it("'1w' keeps only the last 4 points (cutoff = last - 7d, 2-day spacing)", () => {
    const api = makeApi()
    const data = dataset()
    const out = api.filterDataByRange(data, '1w')

    expect(out).not.toBe(data)                        // sliced -> a new object
    expect(out.timestamps).toHaveLength(4)
    expect(out.close).toHaveLength(4)
    expect(out.volume).toHaveLength(4)
    expect(out.timestamps).toEqual(data.timestamps.slice(-4))
    expect(out.close).toEqual(data.close.slice(-4))
    expect(out.volume).toEqual(data.volume.slice(-4))
  })

  it.each([
    ['1y'],           // cutoff (~ -1yr) predates all 60 samples
    ['5y'],
    ['max'],          // switch default
    ['unknownRange']  // unknown range -> default
  ])("'%s' returns the dataset unchanged (same reference)", (range) => {
    const api = makeApi()
    const data = dataset()
    expect(api.filterDataByRange(data, range)).toBe(data)
  })

  it('returns the input untouched when timestamps is empty (early guard)', () => {
    const api = makeApi()
    const empty = { timestamps: [], open: [], high: [], low: [], close: [], volume: [] }
    expect(api.filterDataByRange(empty, '1w')).toBe(empty)
  })

  // Month-based ranges use setMonth (calendar math); pin only the tz-robust
  // invariant — every series is sliced to one consistent length — rather than
  // an exact count that would depend on the runner's timezone.
  it.each([['1m'], ['3mo'], ['6mo']])("'%s' slices every series to a single consistent length", (range) => {
    const api = makeApi()
    const data = dataset()
    const out = api.filterDataByRange(data, range)
    const len = out.timestamps.length
    expect(len).toBeGreaterThan(0)
    expect(len).toBeLessThanOrEqual(N)
    for (const k of ['open', 'high', 'low', 'close', 'volume']) {
      expect(out[k]).toHaveLength(len)
    }
  })
})

// ===================================================================
// Cache + availability helpers (R6). Small surface, exercised directly.
// ===================================================================
describe('OhlcvApi — cache & availability helpers (R6)', () => {
  it('clearCache empties the in-memory cache', () => {
    const api = makeApi()
    api.cache.set('k', { data: {}, timestamp: Date.now() })
    expect(api.cache.size).toBe(1)
    api.clearCache()
    expect(api.cache.size).toBe(0)
  })

  it('getCacheStats reports age + non-expired for a fresh entry', () => {
    const api = makeApi()
    api.cache.set('AAPL_1d_3mo', { data: {}, timestamp: Date.now() - 1000 })
    const stats = api.getCacheStats()
    expect(stats['AAPL_1d_3mo'].expired).toBe(false)       // 1s < 30min timeout
    expect(stats['AAPL_1d_3mo'].age).toBeGreaterThanOrEqual(1000)
  })

  it('isLocalAvailable resolves true for a valid file and false for a 404', async () => {
    const api = makeApi()

    global.fetch = vi.fn(async () => okJson(ohlcvOfLength(25)))
    expect(await api.isLocalAvailable('OK')).toBe(true)

    global.fetch = vi.fn(async () => ({ ok: false, status: 404, statusText: 'Not Found' }))
    expect(await api.isLocalAvailable('NOPE')).toBe(false)
  })
})
