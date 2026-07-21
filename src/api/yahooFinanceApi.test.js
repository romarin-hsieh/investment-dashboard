import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * CHARACTERIZATION (golden-master) test suite for src/api/yahooFinanceApi.js.
 *
 * This pins the CURRENT observable behaviour of the `yahooFinanceAPI` singleton
 * so the upcoming .js -> .ts migration has a regression net. Every expected
 * value below was produced by RUNNING the current implementation against fixed
 * inputs and pasting the real output — the goal is to detect DRIFT, not to
 * judge correctness. Where the current code does something surprising or buggy,
 * the test name says so and the behaviour is locked in on purpose.
 *
 * Environment note: the suite runs under jsdom, so `typeof window === 'undefined'`
 * is FALSE by default and the class takes its BROWSER branch. Tests that want the
 * Node branch stub `window` to `undefined` (see `withNodeEnv`).
 *
 * Surprising behaviours pinned here (see individual tests):
 *  - Node success path never assigns proxyIndex, so `proxy` is reported as
 *    "Proxy 0" and `this.currentProxyIndex` is left at -1 after a good fetch.
 *  - Node error path (insufficient data / network error) returns `undefined`
 *    (NOT the error-shaped object) because the `isNode && i > 0` break skips the
 *    "last proxy" error-return. The browser branch DOES return the error object.
 *  - The <50-points guard THROWS internally but the surrounding try/catch
 *    swallows it — callers never see the throw.
 *  - _processQuoteSummaryResult computes insider `transactionPrice` by dividing
 *    the {raw,fmt} wrapper OBJECTS (value / shares), which is NaN -> "N/A" for
 *    every real Yahoo payload.
 *  - The static-data path's divergent parser (ind.psar.psar / ind.obv.obv /
 *    ind.cci.cci) is only reachable when `window` is defined (browser); in Node
 *    _fetchStaticTechnicalIndicators returns null before it runs.
 */

// ---- module-under-test: fresh singleton per test (reset + dynamic import) ----
let mod
let warnSpy
beforeEach(async () => {
  vi.resetModules()
  // jsdom localStorage is process-global; clear so cache-stat reads are clean.
  try { localStorage.clear() } catch { /* ignore */ }
  vi.spyOn(console, 'log').mockImplementation(() => {})
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mod = await import('./yahooFinanceApi')
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete global.fetch
})

// ===================================================================
// Fixed OHLCV dataset + chart-payload mock (identical to the generator
// used to produce the golden values below). 60 points so the >=50 guard
// passes; small deterministic oscillation so indicators are non-degenerate.
// ===================================================================
const N = 60
const CLOSE = Array.from({ length: N }, (_, i) => 100 + i * 0.5 + ((i % 3) - 1))
const HIGH = CLOSE.map((c, i) => c + 1 + (i % 3) * 0.5)
const LOW = CLOSE.map((c, i) => c - 1 - (i % 2) * 0.5)
const OPEN = CLOSE.map((c, i) => (i === 0 ? c : CLOSE[i - 1]))
const VOLUME = CLOSE.map((_, i) => 1_000_000 + (i % 5) * 50_000)
const TIMESTAMP = Array.from({ length: N }, (_, i) => 1_700_000_000 + i * 86_400)
const REG_PRICE = CLOSE[N - 1]

/** A Yahoo v8 chart payload; `nullFrom` marks the index after which OHLCV go null. */
function chartPayload (len = N, nullFrom = Infinity) {
  const clip = (arr) => arr.slice(0, len).map((v, i) => (i >= nullFrom ? null : v))
  return {
    chart: {
      result: [{
        meta: { regularMarketPrice: REG_PRICE, symbol: 'TEST', currency: 'USD' },
        timestamp: TIMESTAMP.slice(0, len),
        indicators: { quote: [{ open: clip(OPEN), high: clip(HIGH), low: clip(LOW), close: clip(CLOSE), volume: clip(VOLUME) }] }
      }],
      error: null
    }
  }
}
const okResp = (payload) => ({ ok: true, status: 200, async json () { return payload } })
const mockFetchOnce = (payloadFactory) => { global.fetch = vi.fn(async () => okResp(payloadFactory())) }

/** Run `fn` with the Node code path forced (typeof window === 'undefined'). */
function withNodeEnv () { vi.stubGlobal('window', undefined) }

// ===================================================================
// fetchTechnicalIndicatorsFromAPI — Node branch, happy path
// ===================================================================
describe('fetchTechnicalIndicatorsFromAPI (Node branch, success)', () => {
  // Everything except lastUpdated (ISO now), fullSeries (huge), yf (raw floats).
  const GOLDEN = {
    ma5: { value: '128.76', signal: 'NEUTRAL', currentPrice: '130.50' },
    sma5: { value: '128.70', signal: 'NEUTRAL', currentPrice: '130.50' },
    ma10: { value: '127.38', signal: 'BUY', currentPrice: '130.50' },
    sma10: { value: '127.35', signal: 'BUY', currentPrice: '130.50' },
    ma30: { value: '122.29', signal: 'BUY', currentPrice: '130.50' },
    sma30: { value: '122.25', signal: 'BUY', currentPrice: '130.50' },
    sma50: { value: null, signal: 'N/A' },
    ichimokuBaseLine: { value: '124.25', signal: 'BUY', currentPrice: '130.50' },
    ichimokuConversionLine: { value: '127.75', signal: 'BUY', currentPrice: '130.50' },
    ichimokuLaggingSpan: { value: '115.50', signal: 'NEUTRAL', currentPrice: '130.50' },
    vwma20: { value: '124.85', signal: 'BUY', currentPrice: '130.50' },
    rsi14: { value: '69.19', signal: 'NEUTRAL', currentPrice: '130.50' },
    adx14: { value: '45.90', signal: 'STRONG_TREND', plusDI: '44.48', minusDI: '15.43' },
    macd: { value: '3.56', signal: 'BUY', signalLine: '3.51', histogram: '0.05' },
    parabolicSAR: { value: '126.00', signal: 'BUY', currentPrice: '130.50' },
    stochK: { value: '80.95', signal: 'OVERBOUGHT', currentPrice: '130.50' },
    stochD: { value: '76.98', signal: 'NEUTRAL', currentPrice: '130.50' },
    cci20: { value: '147.27', signal: 'OVERBOUGHT', currentPrice: '130.50' },
    atr14: { value: '3.11', signal: 'NEUTRAL', currentPrice: '130.50' },
    obv: { value: '24.00M', signal: 'BULLISH' },
    superTrend: { value: '121.39', signal: 'BUY', currentPrice: '130.50' },
    mfi14: { value: '71.26', signal: 'NEUTRAL', currentPrice: '130.50' },
    dataPoints: 60,
    proxy: 'Proxy 0',
    source: 'Yahoo Finance API (Fresh) - Core v1.0.0',
    priceRange: { min: '99.00', max: '130.50', latest: '130.50', first: '99.00' }
  }

  it('maps a realistic chart payload into the display indicator shape', async () => {
    withNodeEnv()
    mockFetchOnce(() => chartPayload())
    const api = mod.yahooFinanceAPI

    const ind = await api.fetchTechnicalIndicatorsFromAPI('TEST')
    const { lastUpdated, fullSeries, yf, ...rest } = ind

    expect(rest).toEqual(GOLDEN)
    expect(typeof lastUpdated).toBe('string')
  })

  it('every headline indicator value parses to a finite number', async () => {
    withNodeEnv()
    mockFetchOnce(() => chartPayload())
    const api = mod.yahooFinanceAPI

    const ind = await api.fetchTechnicalIndicatorsFromAPI('TEST')
    for (const key of ['ma5', 'rsi14', 'adx14', 'macd', 'atr14', 'stochK', 'cci20', 'superTrend', 'mfi14', 'vwma20']) {
      expect(Number.isFinite(parseFloat(ind[key].value)), `${key}.value`).toBe(true)
    }
  })

  it('attaches the yf block (beta from same-series benchmark = 1.00, 3mo N/A) and volume stats', async () => {
    withNodeEnv()
    mockFetchOnce(() => chartPayload())
    const api = mod.yahooFinanceAPI

    const { yf } = await api.fetchTechnicalIndicatorsFromAPI('TEST')
    // Benchmark fetch returns the SAME series, so rolling beta warms up to 1.00;
    // the 3-month (period 90) window can't warm up on 60 points -> 'N/A'.
    expect(yf.beta_10d).toBe('1.00')
    expect(yf.beta_3mo).toBe('N/A')
    expect(yf.extAvgVol10D).toBeCloseTo(1_100_000, 6)
    expect(yf.extAvgVol3M).toBeCloseTo(1_100_000, 6)
    expect(yf.volume_last_day_pct).toBeCloseTo(4.3478260869565215, 9)
  })

  it('exposes the full core series bundle under fullSeries (32 documented keys)', async () => {
    withNodeEnv()
    mockFetchOnce(() => chartPayload())
    const api = mod.yahooFinanceAPI

    const { fullSeries } = await api.fetchTechnicalIndicatorsFromAPI('TEST')
    expect(Object.keys(fullSeries)).toEqual([
      'MA_5', 'MA_10', 'MA_30', 'SMA_5', 'SMA_10', 'SMA_30',
      'ICHIMOKU_BASELINE_26', 'ICHIMOKU_CONVERSIONLINE_9', 'ICHIMOKU_LAGGINGSPAN_26',
      'VWMA_20', 'RSI_14', 'MACD_12_26_9', 'MACD_SIGNAL_9', 'MACD_HIST',
      'ADX_14', 'ADX_14_PLUS_DI', 'ADX_14_MINUS_DI', 'SAR', 'STOCH_K', 'STOCH_D',
      'CCI_20', 'ATR_14', 'OBV', 'SUPERTREND_10_3', 'MFI_14', 'volume', 'close',
      'BETA_10D', 'BETA_3M', 'EMA_20', 'WILLR_14', 'CMF_20'
    ])
  })

  it('SURPRISING: Node path reports "Proxy 0" and leaves currentProxyIndex at -1', async () => {
    withNodeEnv()
    mockFetchOnce(() => chartPayload())
    const api = mod.yahooFinanceAPI

    const ind = await api.fetchTechnicalIndicatorsFromAPI('TEST')
    expect(ind.proxy).toBe('Proxy 0') // proxyIndex stays -1 -> `Proxy ${-1 + 1}`
    expect(api.currentProxyIndex).toBe(-1)
  })

  it('fetches the direct Yahoo URL for the symbol plus a benchmark (^GSPC) fetch', async () => {
    withNodeEnv()
    mockFetchOnce(() => chartPayload())
    const api = mod.yahooFinanceAPI

    await api.fetchTechnicalIndicatorsFromAPI('TEST')
    const urls = global.fetch.mock.calls.map(c => c[0])
    expect(urls).toHaveLength(2)
    expect(urls[0]).toBe('https://query1.finance.yahoo.com/v8/finance/chart/TEST?interval=1d&range=5y&indicators=quote&includePrePost=false')
    expect(urls[1]).toContain('GSPC') // benchmark, via encoded proxy URL
  })

  it('deduplicates concurrent requests for the same symbol (one internal run)', async () => {
    withNodeEnv()
    mockFetchOnce(() => chartPayload())
    const api = mod.yahooFinanceAPI

    const [a, b] = await Promise.all([
      api.fetchTechnicalIndicatorsFromAPI('DEDUP'),
      api.fetchTechnicalIndicatorsFromAPI('DEDUP')
    ])
    expect(a).toBe(b) // exact same resolved object
    expect(global.fetch.mock.calls.length).toBe(2) // symbol + benchmark, once
  })
})

// ===================================================================
// fetchTechnicalIndicatorsFromAPI — edge cases (insufficient / sparse data)
// ===================================================================
describe('fetchTechnicalIndicatorsFromAPI (edge cases)', () => {
  const ERROR_SHAPE = {
    ma5: { value: null, signal: 'N/A' }, sma5: { value: null, signal: 'N/A' },
    ma10: { value: null, signal: 'N/A' }, sma10: { value: null, signal: 'N/A' },
    ma30: { value: null, signal: 'N/A' }, sma30: { value: null, signal: 'N/A' },
    sma50: { value: null, signal: 'N/A' },
    ichimokuBaseLine: { value: null, signal: 'N/A' },
    ichimokuConversionLine: { value: null, signal: 'N/A' },
    ichimokuLaggingSpan: { value: null, signal: 'N/A' },
    vwma20: { value: null, signal: 'N/A' }, rsi14: { value: null, signal: 'N/A' },
    adx14: { value: null, signal: 'N/A' }, macd: { value: null, signal: 'N/A' },
    error: 'All proxies failed: Insufficient data points (40) for technical analysis',
    source: 'Error',
    parabolicSAR: { value: null, signal: 'N/A' }, stochK: { value: null, signal: 'N/A' },
    stochD: { value: null, signal: 'N/A' }, cci20: { value: null, signal: 'N/A' },
    atr14: { value: null, signal: 'N/A' }, obv: { value: null, signal: 'N/A' },
    superTrend: { value: null, signal: 'N/A' }, mfi14: { value: null, signal: 'N/A' }
  }

  it('browser branch: <50 points returns the error-shaped object (the guard throw is swallowed)', async () => {
    // default jsdom env => browser branch
    mockFetchOnce(() => chartPayload(40))
    const api = mod.yahooFinanceAPI

    const ind = await api.fetchTechnicalIndicatorsFromAPI('SHORT')
    const { lastUpdated, ...rest } = ind
    expect(rest).toEqual(ERROR_SHAPE)
    expect(typeof lastUpdated).toBe('string')
  })

  it('SURPRISING: Node branch returns undefined (not the error object) on insufficient data', async () => {
    withNodeEnv()
    mockFetchOnce(() => chartPayload(40))
    const api = mod.yahooFinanceAPI

    const ind = await api.fetchTechnicalIndicatorsFromAPI('SHORTN')
    // i=0 throws -> caught, but not last proxy & not browser-DEV so no return;
    // i=1 hits `isNode && i > 0` -> break -> function falls through to undefined.
    expect(ind).toBeUndefined()
  })

  it('SURPRISING: Node branch returns undefined when every fetch rejects (network error)', async () => {
    withNodeEnv()
    global.fetch = vi.fn(async () => { throw new Error('Network down') })
    const api = mod.yahooFinanceAPI

    const ind = await api.fetchTechnicalIndicatorsFromAPI('NETERR')
    expect(ind).toBeUndefined()
  })

  it('warns about ADX when <28 valid points but >=50 total, and still returns a full result', async () => {
    withNodeEnv()
    // 60 total, only 22 valid OHLCV -> validDataPoints 22 (<28 warn) but length 60 (>=50 no throw)
    global.fetch = vi.fn(async () => okResp(chartPayload(N, 22)))
    const api = mod.yahooFinanceAPI

    const ind = await api.fetchTechnicalIndicatorsFromAPI('WARN')
    expect(ind).toBeTypeOf('object')
    expect(ind.dataPoints).toBe(60)
    const adxWarn = warnSpy.mock.calls.map(c => String(c[0])).some(s => s.includes('Insufficient valid data for ADX calculation: 22 < 28'))
    expect(adxWarn).toBe(true)
  })
})

// ===================================================================
// getOhlcv — Node branch success (also drives _getOhlcvInternal + benchmark)
// ===================================================================
describe('getOhlcv (Node branch)', () => {
  it('returns cleaned OHLCV arrays plus a metadata block', async () => {
    withNodeEnv()
    mockFetchOnce(() => chartPayload())
    const api = mod.yahooFinanceAPI

    const r = await api.getOhlcv('OHLCVSYM', '1d', '3mo')
    expect(r.close).toHaveLength(60)
    expect(r.timestamps).toHaveLength(60)
    expect(r.volume).toHaveLength(60)
    expect(r.metadata).toMatchObject({
      symbol: 'OHLCVSYM',
      period: '1d',
      range: '3mo',
      totalPoints: 60,
      validPoints: 60,
      source: 'Yahoo Finance API',
      proxy: 'Proxy 1'
    })
    expect(typeof r.metadata.fetchedAt).toBe('string')
  })
})

// ===================================================================
// _mapCoreResultsToIndicators — pure mapper (indicator series -> display)
// ===================================================================
describe('_mapCoreResultsToIndicators', () => {
  const bullishCore = {
    MA_5: [NaN, 105, 108], SMA_5: [NaN, 105, 108], MA_10: [NaN, 106, 109], SMA_10: [NaN, 106, 109],
    MA_30: [NaN, 107, 110], SMA_30: [NaN, 107, 110],
    ICHIMOKU_BASELINE_26: [NaN, 100, 111], ICHIMOKU_CONVERSIONLINE_9: [NaN, 100, 112], ICHIMOKU_LAGGINGSPAN_26: [NaN, 100, 113],
    VWMA_20: [NaN, 100, 114], RSI_14: [NaN, 50, 75],
    ADX_14: [NaN, 10, 30], ADX_14_PLUS_DI: [NaN, 20, 28], ADX_14_MINUS_DI: [NaN, 20, 12],
    MACD_12_26_9: [NaN, 1, 2.5], MACD_SIGNAL_9: [NaN, 1, 1.5], MACD_HIST: [NaN, 0, 1],
    SAR: [NaN, 90, 118], STOCH_K: [NaN, 50, 85], STOCH_D: [NaN, 50, 82],
    CCI_20: [NaN, 0, 150], ATR_14: [NaN, 3, 3.25],
    OBV: [NaN, 100, 200], SUPERTREND_10_3: [NaN, 90, 119], MFI_14: [NaN, 50, 85]
  }

  it('bullish core + high current price -> BUY / OVERBOUGHT / STRONG_TREND / BULLISH', () => {
    const api = mod.yahooFinanceAPI
    expect(api._mapCoreResultsToIndicators(bullishCore, 120, 'Test')).toEqual({
      ma5: { value: '108.00', signal: 'BUY', currentPrice: '120.00' },
      sma5: { value: '108.00', signal: 'BUY', currentPrice: '120.00' },
      ma10: { value: '109.00', signal: 'BUY', currentPrice: '120.00' },
      sma10: { value: '109.00', signal: 'BUY', currentPrice: '120.00' },
      ma30: { value: '110.00', signal: 'BUY', currentPrice: '120.00' },
      sma30: { value: '110.00', signal: 'BUY', currentPrice: '120.00' },
      sma50: { value: null, signal: 'N/A' },
      ichimokuBaseLine: { value: '111.00', signal: 'BUY', currentPrice: '120.00' },
      ichimokuConversionLine: { value: '112.00', signal: 'BUY', currentPrice: '120.00' },
      ichimokuLaggingSpan: { value: '113.00', signal: 'NEUTRAL', currentPrice: '120.00' },
      vwma20: { value: '114.00', signal: 'BUY', currentPrice: '120.00' },
      rsi14: { value: '75.00', signal: 'OVERBOUGHT', currentPrice: '120.00' },
      adx14: { value: '30.00', signal: 'STRONG_TREND', plusDI: '28.00', minusDI: '12.00' },
      macd: { value: '2.50', signal: 'BUY', signalLine: '1.50', histogram: '1.00' },
      parabolicSAR: { value: '118.00', signal: 'BUY', currentPrice: '120.00' },
      stochK: { value: '85.00', signal: 'OVERBOUGHT', currentPrice: '120.00' },
      stochD: { value: '82.00', signal: 'OVERBOUGHT', currentPrice: '120.00' },
      cci20: { value: '150.00', signal: 'OVERBOUGHT', currentPrice: '120.00' },
      atr14: { value: '3.25', signal: 'NEUTRAL', currentPrice: '120.00' },
      obv: { value: '0.00M', signal: 'BULLISH' },
      superTrend: { value: '119.00', signal: 'BUY', currentPrice: '120.00' },
      mfi14: { value: '85.00', signal: 'OVERBOUGHT', currentPrice: '120.00' }
    })
  })

  it('bearish core + low current price -> SELL / OVERSOLD / WEAK_TREND / BEARISH', () => {
    const api = mod.yahooFinanceAPI
    const bearishCore = {
      ...bullishCore,
      RSI_14: [NaN, 50, 25], ADX_14: [NaN, 10, 15], ADX_14_PLUS_DI: [NaN, 20, 12], ADX_14_MINUS_DI: [NaN, 20, 28],
      MACD_12_26_9: [NaN, 1, 1.5], MACD_SIGNAL_9: [NaN, 1, 2.5], MACD_HIST: [NaN, 0, -1],
      STOCH_K: [NaN, 50, 15], STOCH_D: [NaN, 50, 18], CCI_20: [NaN, 0, -150],
      OBV: [NaN, 200, 100], MFI_14: [NaN, 50, 15]
    }
    const out = api._mapCoreResultsToIndicators(bearishCore, 50, 'Test')
    expect(out.ma5).toEqual({ value: '108.00', signal: 'SELL', currentPrice: '50.00' })
    expect(out.rsi14).toEqual({ value: '25.00', signal: 'OVERSOLD', currentPrice: '50.00' })
    expect(out.adx14).toEqual({ value: '15.00', signal: 'WEAK_TREND', plusDI: '12.00', minusDI: '28.00' })
    expect(out.macd).toEqual({ value: '1.50', signal: 'SELL', signalLine: '2.50', histogram: '-1.00' })
    expect(out.stochK).toEqual({ value: '15.00', signal: 'OVERSOLD', currentPrice: '50.00' })
    expect(out.cci20).toEqual({ value: '-150.00', signal: 'OVERSOLD', currentPrice: '50.00' })
    expect(out.obv).toEqual({ value: '0.00M', signal: 'BEARISH' })
    expect(out.superTrend).toEqual({ value: '119.00', signal: 'SELL', currentPrice: '50.00' })
  })

  it('currentPrice null gates price-comparison signals to NEUTRAL but rsi/adx still fire', () => {
    const api = mod.yahooFinanceAPI
    const out = api._mapCoreResultsToIndicators(bullishCore, null, 'Static JSON')
    expect(out.ma5).toEqual({ value: '108.00', signal: 'NEUTRAL', currentPrice: null })
    expect(out.rsi14).toEqual({ value: '75.00', signal: 'NEUTRAL', currentPrice: null })
    // rsi-type uses lastValue only when currentPrice-gated? No: rsi/adx keep firing.
    expect(out.adx14).toEqual({ value: '30.00', signal: 'STRONG_TREND', plusDI: '28.00', minusDI: '12.00' })
    expect(out.macd).toEqual({ value: '2.50', signal: 'BUY', signalLine: '1.50', histogram: '1.00' })
    expect(out.obv).toEqual({ value: '0.00M', signal: 'BULLISH' })
  })

  it('empty coreResults ({}) -> all values null, signals NEUTRAL, obv "N/A"', () => {
    const api = mod.yahooFinanceAPI
    const out = api._mapCoreResultsToIndicators({}, 100, 'Test')
    expect(out.ma5).toEqual({ value: null, signal: 'NEUTRAL', currentPrice: '100.00' })
    expect(out.sma50).toEqual({ value: null, signal: 'N/A' })
    expect(out.adx14).toEqual({ value: null, signal: 'NEUTRAL', plusDI: null, minusDI: null })
    expect(out.macd).toEqual({ value: null, signal: 'NEUTRAL', signalLine: null, histogram: null })
    expect(out.obv).toEqual({ value: 'N/A', signal: 'NEUTRAL' })
  })
})

// ===================================================================
// _fetchStaticTechnicalIndicators — divergent parser (browser only)
// ===================================================================
describe('_fetchStaticTechnicalIndicators (static data path)', () => {
  it('Node env short-circuits to null before any fetch', async () => {
    withNodeEnv()
    global.fetch = vi.fn(async () => okResp({}))
    const api = mod.yahooFinanceAPI
    const r = await api._fetchStaticTechnicalIndicators('TEST')
    expect(r).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('browser env: maps the nested generator JSON via the psar.psar / obv.obv / cci.cci parser', async () => {
    // default jsdom env => window defined => the divergent parser IS reachable.
    const staticData = {
      metadata: { generated: '2026-07-20T12:00:00.000Z' },
      indicators: {
        sma: { sma5: [NaN, 100, 108], sma10: [NaN, 100, 109], sma30: [NaN, 100, 110], sma50: [NaN, 100, 111] },
        ichimoku: { base: [NaN, 100, 112], conversion: [NaN, 100, 113], lagging: [NaN, 100, 114] },
        vwma: { vwma: [NaN, 100, 115] },
        rsi: { rsi14: [NaN, 50, 72] },
        adx: { adx: [NaN, 10, 30], pdi: [NaN, 20, 27], mdi: [NaN, 20, 13] },
        macd: { macd: [NaN, 1, 2.2], signal: [NaN, 1, 1.4], histogram: [NaN, 0, 0.8] },
        psar: { psar: [NaN, 90, 118] },
        stoch: { k: [NaN, 50, 88], d: [NaN, 50, 84] },
        cci: { cci: [NaN, 0, 140] },
        obv: { obv: [NaN, 100, 220] },
        supertrend: { supertrend: [NaN, 90, 119] }
      }
    }
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('latest_index.json')) return okResp({ date: '2026-07-20' })
      return okResp(staticData)
    })
    const api = mod.yahooFinanceAPI

    const mapped = await api._fetchStaticTechnicalIndicators('TEST')
    expect(mapped).toEqual({
      ma5: { value: '108.00', signal: 'NEUTRAL', currentPrice: null },
      sma5: { value: '108.00', signal: 'NEUTRAL', currentPrice: null },
      ma10: { value: '109.00', signal: 'NEUTRAL', currentPrice: null },
      sma10: { value: '109.00', signal: 'NEUTRAL', currentPrice: null },
      ma30: { value: '110.00', signal: 'NEUTRAL', currentPrice: null },
      sma30: { value: '110.00', signal: 'NEUTRAL', currentPrice: null },
      sma50: { value: null, signal: 'N/A' },
      ichimokuBaseLine: { value: '112.00', signal: 'NEUTRAL', currentPrice: null },
      ichimokuConversionLine: { value: '113.00', signal: 'NEUTRAL', currentPrice: null },
      ichimokuLaggingSpan: { value: '114.00', signal: 'NEUTRAL', currentPrice: null },
      vwma20: { value: '115.00', signal: 'NEUTRAL', currentPrice: null },
      rsi14: { value: '72.00', signal: 'NEUTRAL', currentPrice: null },
      adx14: { value: '30.00', signal: 'STRONG_TREND', plusDI: '27.00', minusDI: '13.00' },
      macd: { value: '2.20', signal: 'BUY', signalLine: '1.40', histogram: '0.80' },
      parabolicSAR: { value: '118.00', signal: 'NEUTRAL', currentPrice: null },
      stochK: { value: '88.00', signal: 'NEUTRAL', currentPrice: null },
      stochD: { value: '84.00', signal: 'NEUTRAL', currentPrice: null },
      cci20: { value: '140.00', signal: 'NEUTRAL', currentPrice: null },
      atr14: { value: null, signal: 'NEUTRAL', currentPrice: null }, // ATR not in static JSON
      obv: { value: '0.00M', signal: 'BULLISH' },
      superTrend: { value: '119.00', signal: 'NEUTRAL', currentPrice: null },
      mfi14: { value: null, signal: 'NEUTRAL', currentPrice: null }, // MFI not mapped in static
      lastUpdated: '2026-07-20T12:00:00.000Z',
      source: 'Static Pre-computed'
    })
  })

  it('browser env: missing latest_index (fetch !ok) returns null', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 404 }))
    const api = mod.yahooFinanceAPI
    expect(await api._fetchStaticTechnicalIndicators('TEST')).toBeNull()
  })
})

// ===================================================================
// _processQuoteSummaryResult — pure quoteSummary mapper
// ===================================================================
describe('_processQuoteSummaryResult', () => {
  const QS = {
    summaryProfile: { sector: 'Technology', industry: 'Consumer Electronics', country: 'United States', website: 'https://apple.com', fullTimeEmployees: 164000, longBusinessSummary: 'Apple designs and sells consumer electronics.' },
    price: { exchangeName: 'NasdaqGS', exchange: 'NMS', currency: 'USD', marketCap: { raw: 3000000000000, fmt: '3T' }, regularMarketVolume: { raw: 50000000, fmt: '50M' }, averageDailyVolume10Day: { raw: 55000000, fmt: '55M' }, averageDailyVolume3Month: { raw: 60000000, fmt: '60M' }, regularMarketChangePercent: { raw: 0.0123, fmt: '1.23%' } },
    defaultKeyStatistics: { beta: { raw: 1.25, fmt: '1.25' }, forwardPE: { raw: 28.5, fmt: '28.50' } },
    financialData: { targetMeanPrice: { raw: 200, fmt: '200.00' }, targetLowPrice: { raw: 150, fmt: '150.00' }, targetHighPrice: { raw: 250, fmt: '250.00' }, targetMedianPrice: { raw: 205, fmt: '205.00' }, currentPrice: { raw: 190, fmt: '190.00' }, recommendationKey: 'buy', revenueGrowth: { raw: 0.08, fmt: '8.00%' }, profitMargins: { raw: 0.25, fmt: '25.00%' }, totalRevenue: { raw: 400000000000, fmt: '400B' }, ebitda: { raw: 130000000000, fmt: '130B' } },
    earnings: { earningsChart: { quarterly: [{ date: '4Q2023', actual: { raw: 2.18, fmt: '2.18' }, estimate: { raw: 2.1, fmt: '2.10' } }] }, financialsChart: { yearly: [{ date: 2023, revenue: { raw: 383000000000, fmt: '383B' }, earnings: { raw: 97000000000, fmt: '97B' } }] } },
    majorHoldersBreakdown: { insidersPercentHeld: { raw: 0.0007, fmt: '0.07%' }, institutionsPercentHeld: { raw: 0.61, fmt: '61.00%' } },
    insiderTransactions: { transactions: [{ filerName: 'COOK TIMOTHY D', transactionText: 'Sale at price 190.00', moneyText: '', ownership: 'D', startDate: { raw: 1700000000, fmt: '2023-11-14' }, startEpoch: 1700000000, shares: { raw: 500000, fmt: '500,000' }, value: { raw: 95000000, fmt: '95,000,000' }, filerRelation: 'Chief Executive Officer', filerUrl: '' }] },
    institutionOwnership: { ownershipList: [{ organization: 'Vanguard Group Inc', position: { raw: 1300000000, fmt: '1,300,000,000' }, reportDate: { raw: 1690000000, fmt: '2023-07-22' }, pctHeld: { raw: 0.08, fmt: '8.00%' }, value: { raw: 250000000000, fmt: '250,000,000,000' } }] },
    recommendationTrend: { trend: [{ period: '0m', strongBuy: 11, buy: 21, hold: 6, sell: 0, strongSell: 0 }] },
    upgradeDowngradeHistory: { history: [{ epochGradeDate: 1700000000, firm: 'Morgan Stanley', toGrade: 'Overweight', fromGrade: '', action: 'main' }] },
    lastUpdated: '2026-07-21T00:00:00.000Z'
  }

  it('maps a realistic {raw,fmt} quoteSummary payload to the app structure', () => {
    const api = mod.yahooFinanceAPI
    const out = api._processQuoteSummaryResult('AAPL', QS, 'Yahoo Finance API (Live)', 'Proxy 1')
    expect(out).toEqual({
      symbol: 'AAPL',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      exchange: 'NasdaqGS',
      marketCap: 3000000000000,
      marketCapFormatted: '3T',
      currency: 'USD',
      country: 'United States',
      website: 'https://apple.com',
      employees: 164000,
      businessSummary: 'Apple designs and sells consumer electronics.',
      volume: { raw: 50000000, fmt: '50M' },
      averageVolume: { raw: 55000000, fmt: '55M' },
      averageDailyVolume10Day: 55000000,
      averageDailyVolume3Month: 60000000,
      beta: '1.25',
      financials: {
        targetPrice: 200, targetLowPrice: 150, targetHighPrice: 250, targetMeanPrice: 200,
        targetMedianPrice: 205, currentPrice: 190, recommendationKey: 'buy',
        revenueGrowth: '8.00%', profitMargins: '25.00%', forwardPE: '28.50', beta: '1.25',
        totalRevenue: '400B', ebitda: '130B', regularMarketChangePercent: 0.0123
      },
      earnings: {
        history: [{ date: '4Q2023', actual: { raw: 2.18, fmt: '2.18' }, estimate: { raw: 2.1, fmt: '2.10' } }],
        financialsChart: [{ date: 2023, revenue: { raw: 383000000000, fmt: '383B' }, earnings: { raw: 97000000000, fmt: '97B' } }]
      },
      holders: {
        insidersPercent: '0.07%',
        institutionsPercent: '61.00%',
        institutionsCount: 1,
        topInstitutions: [{
          organization: 'Vanguard Group Inc',
          position: { raw: 1300000000, fmt: '1,300,000,000' },
          reportDate: { raw: 1690000000, fmt: '2023-07-22' },
          pctHeld: { raw: 0.08, fmt: '8.00%' },
          value: { raw: 250000000000, fmt: '250,000,000,000' }
        }]
      },
      insiderTransactions: [{
        filerName: 'COOK TIMOTHY D',
        transactionText: 'Sale at price 190.00',
        moneyText: '',
        ownership: 'D',
        startDate: { raw: 1700000000, fmt: '2023-11-14' },
        startEpoch: 1700000000,
        shares: { raw: 500000, fmt: '500,000' },
        value: { raw: 95000000, fmt: '95,000,000' },
        filerRelation: 'Chief Executive Officer',
        filerUrl: '',
        // SURPRISING: value / shares divides the {raw,fmt} OBJECTS -> NaN -> 'N/A'
        transactionPrice: { raw: NaN, fmt: 'N/A' }
      }],
      recommendationTrend: [{ period: '0m', strongBuy: 11, buy: 21, hold: 6, sell: 0, strongSell: 0 }],
      upgradesDowngrades: [{ epochGradeDate: 1700000000, firm: 'Morgan Stanley', toGrade: 'Overweight', fromGrade: '', action: 'main' }],
      marketCapCategory: 'mega_cap',
      lastUpdated: '2026-07-21T00:00:00.000Z',
      source: 'Yahoo Finance API (Live)',
      proxy: 'Proxy 1',
      confidence: 0.95
    })
  })

  it('empty result ({}) falls back to Unknowns / defaults / getDefaultExchange', () => {
    const api = mod.yahooFinanceAPI
    const out = api._processQuoteSummaryResult('ZZ', { lastUpdated: '2026-07-21T00:00:00.000Z' }, 'Static Build', 'Static File')
    expect(out.sector).toBe('Unknown')
    expect(out.industry).toBe('Unknown Industry')
    expect(out.exchange).toBe('NASDAQ') // getDefaultExchange('ZZ') -> default
    expect(out.marketCapFormatted).toBe('N/A')
    expect(out.marketCapCategory).toBe('unknown')
    expect(out.currency).toBe('USD')
    expect(out.beta).toBe('N/A')
    expect(out.financials).toMatchObject({ recommendationKey: 'N/A', revenueGrowth: '0%', profitMargins: '0%', forwardPE: null })
    expect(out.holders).toEqual({ insidersPercent: '0%', institutionsPercent: '0%', institutionsCount: 0, topInstitutions: [] })
    expect(out.earnings).toEqual({ history: [], financialsChart: [] })
    expect(out.insiderTransactions).toEqual([])
    expect(out.upgradesDowngrades).toEqual([])
    expect(out.source).toBe('Static Build')
    expect(out.confidence).toBe(0.95)
  })

  it('slices upgradeDowngradeHistory to the first 50 entries', () => {
    const api = mod.yahooFinanceAPI
    const history = Array.from({ length: 80 }, (_, i) => ({ firm: `Firm ${i}` }))
    const out = api._processQuoteSummaryResult('AAPL', { upgradeDowngradeHistory: { history } }, 'src', 'p')
    expect(out.upgradesDowngrades).toHaveLength(50)
    expect(out.upgradesDowngrades[49].firm).toBe('Firm 49')
  })

  it('plain-number inputs exercise the formatNumber-based formatters (percent, B-scale, transactionPrice)', () => {
    // When values arrive as plain numbers (not {raw,fmt}), createFmt/getPercentFmt
    // run their formatter callbacks. We assert only the locale-INDEPENDENT ones
    // (formatNumber-based); the toLocaleString/toLocaleDateString outputs are
    // computed for coverage but not asserted (they vary by CI locale).
    const api = mod.yahooFinanceAPI
    const result = {
      price: { regularMarketVolume: 50000000, marketCap: 3000000000000 },
      financialData: { revenueGrowth: 0.08, profitMargins: 0.25 }, // number -> getPercentFmt number branch
      earnings: { financialsChart: { yearly: [{ date: 2023, revenue: 383000000000, earnings: 97000000000 }] } },
      institutionOwnership: { ownershipList: [{ organization: 'X', position: 1300000000, reportDate: 1690000000000, pctHeld: 0.08, value: 250000000000 }] },
      insiderTransactions: { transactions: [{ filerName: 'Y', shares: 500000, value: 95000000 }] },
      lastUpdated: '2026-07-21T00:00:00.000Z'
    }
    const out = api._processQuoteSummaryResult('AAPL', result, 'src', 'p')
    expect(out.financials.revenueGrowth).toBe('8.00%')
    expect(out.financials.profitMargins).toBe('25.00%')
    expect(out.earnings.financialsChart[0].revenue).toEqual({ raw: 383000000000, fmt: '383.0B' })
    expect(out.earnings.financialsChart[0].earnings).toEqual({ raw: 97000000000, fmt: '97.0B' })
    expect(out.holders.topInstitutions[0].pctHeld).toEqual({ raw: 0.08, fmt: '8.00%' })
    // value (95,000,000) / shares (500,000) = 190 -> formatNumber(190, 2)
    expect(out.insiderTransactions[0].transactionPrice).toEqual({ raw: 190, fmt: '190.00' })
  })
})

// ===================================================================
// getStockInfo / _getStockInfoInternal — static-hit, live, fallback
// ===================================================================
describe('getStockInfo', () => {
  it('static-hit path: processes fundamentals JSON and tags isStatic + "Static Build"', async () => {
    global.fetch = vi.fn(async () => okResp({
      price: { exchangeName: 'NasdaqGS', marketCap: { raw: 3000000000000, fmt: '3T' }, currency: 'USD' },
      lastUpdated: '2026-07-21T00:00:00.000Z'
    }))
    const api = mod.yahooFinanceAPI

    const info = await api.getStockInfo('TEST')
    expect(info.isStatic).toBe(true)
    expect(info.source).toBe('Static Build')
    expect(info.exchange).toBe('NasdaqGS')
    expect(info.marketCapCategory).toBe('mega_cap')
  })

  it('live path: static 404 then quoteSummary success -> "Yahoo Finance API (Live)"', async () => {
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('data/fundamentals/')) return { ok: false, status: 404 }
      return okResp({ quoteSummary: { result: [{ price: { exchangeName: 'NasdaqGS', marketCap: { raw: 3000000000000, fmt: '3T' } }, lastUpdated: '2026-07-21T00:00:00.000Z' }] } })
    })
    const api = mod.yahooFinanceAPI

    const info = await api.getStockInfo('TEST')
    expect(info.source).toBe('Yahoo Finance API (Live)')
    expect(info.isStatic).toBeUndefined()
    expect(info.exchange).toBe('NasdaqGS')
  })

  it('browser fallback: all fetches fail -> _getFallbackStockInfo shape', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500 }))
    const api = mod.yahooFinanceAPI

    const info = await api.getStockInfo('TSM')
    expect(info.source).toBe('Default (API Failed)')
    expect(info.confidence).toBe(0)
    expect(info.exchange).toBe('NYSE') // getDefaultExchange('TSM')
    expect(info.error).toContain('All proxies failed')
  })
})

// ===================================================================
// _getFallbackStockInfo — pure fallback shape
// ===================================================================
describe('_getFallbackStockInfo', () => {
  it('returns the documented fallback object (exchange via getDefaultExchange)', () => {
    const api = mod.yahooFinanceAPI
    const { lastUpdated, ...rest } = api._getFallbackStockInfo('TSM', 'boom')
    expect(rest).toEqual({
      symbol: 'TSM',
      sector: 'Unknown',
      industry: 'Unknown Industry',
      exchange: 'NYSE',
      marketCap: null,
      marketCapFormatted: 'N/A',
      currency: 'USD',
      country: 'Unknown',
      website: null,
      employees: null,
      businessSummary: null,
      marketCapCategory: 'unknown',
      financials: {},
      earnings: { history: [], financialsChart: [] },
      holders: { topInstitutions: [], insidersPercent: 'N/A', institutionsPercent: 'N/A' },
      insiderTransactions: [],
      recommendationTrend: [],
      source: 'Default (API Failed)',
      error: 'All proxies failed: boom',
      confidence: 0.0
    })
    expect(typeof lastUpdated).toBe('string')
  })
})

// ===================================================================
// getDefaultExchange — pure classification (class method)
// ===================================================================
describe('getDefaultExchange', () => {
  it.each([
    ['AAPL', 'NASDAQ'],
    ['MSFT', 'NASDAQ'],
    ['CSCO', 'NASDAQ'],
    ['TSM', 'NYSE'],
    ['ORCL', 'NYSE'],
    ['RDW', 'NYSE'],
    ['GLW', 'NYSE'],
    ['ZZZZ', 'NASDAQ'],   // unknown -> default NASDAQ
    ['', 'NASDAQ'],       // empty -> default
    ['aapl', 'NASDAQ']    // case-sensitive: lowercase not in list -> default
  ])('getDefaultExchange(%j) === %j', (sym, exp) => {
    expect(mod.yahooFinanceAPI.getDefaultExchange(sym)).toBe(exp)
  })
})

// ===================================================================
// getMarketCapCategory — pure classification with boundaries
// ===================================================================
describe('getMarketCapCategory', () => {
  it.each([
    [-5, 'unknown'],
    [0, 'unknown'],
    [null, 'unknown'],
    [undefined, 'unknown'],
    [250e9, 'mega_cap'],
    [200e9, 'mega_cap'],       // boundary (>=)
    [199.9e9, 'large_cap'],
    [50e9, 'large_cap'],
    [10e9, 'large_cap'],       // boundary
    [9.9e9, 'mid_cap'],
    [2e9, 'mid_cap'],          // boundary
    [1.9e9, 'small_cap'],
    [300e6, 'small_cap'],      // boundary
    [299e6, 'micro_cap'],
    [1, 'micro_cap']
  ])('getMarketCapCategory(%p) === %j', (cap, exp) => {
    expect(mod.yahooFinanceAPI.getMarketCapCategory(cap)).toBe(exp)
  })
})

// ===================================================================
// buildProxyUrl — pure URL construction (encodes target, prepends proxy)
// ===================================================================
describe('buildProxyUrl', () => {
  it('uses proxy[currentProxyIndex] and percent-encodes the target URL', () => {
    const api = mod.yahooFinanceAPI
    expect(api.buildProxyUrl('https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d'))
      .toBe('https://yfinance-proxy.romarinhsieh.workers.dev/?https%3A%2F%2Fquery1.finance.yahoo.com%2Fv8%2Ffinance%2Fchart%2FAAPL%3Finterval%3D1d')
  })

  it('follows currentProxyIndex when it changes', () => {
    const api = mod.yahooFinanceAPI
    api.currentProxyIndex = 1
    expect(api.buildProxyUrl('https://query1.finance.yahoo.com/x?a=1&b=2'))
      .toBe('https://api.allorigins.win/raw?url=https%3A%2F%2Fquery1.finance.yahoo.com%2Fx%3Fa%3D1%26b%3D2')
  })
})

// ===================================================================
// getCacheStats / clearCache / clearDailyCache
// ===================================================================
describe('cache management', () => {
  it('getCacheStats reports per-entry age/expired plus the daily cache block', () => {
    const api = mod.yahooFinanceAPI
    api.cache.set('technical_AAPL', { data: { x: 1 }, timestamp: Date.now() - 1000 })

    const stats = api.getCacheStats()
    expect(Object.keys(stats)).toEqual(['apiCache', 'dailyCache'])
    expect('technical_AAPL' in stats.apiCache).toBe(true)
    expect(stats.apiCache.technical_AAPL.expired).toBe(false) // 1s < 5min timeout
    expect(stats.apiCache.technical_AAPL.age).toBeGreaterThanOrEqual(1000)
    expect(stats.dailyCache).toEqual({ memoryCache: 0, localStorageCache: 0, totalSize: 0 })
  })

  it('getCacheStats marks entries older than cacheTimeout (5min) as expired', () => {
    const api = mod.yahooFinanceAPI
    api.cache.set('technical_OLD', { data: {}, timestamp: Date.now() - 6 * 60 * 1000 })
    expect(api.getCacheStats().apiCache.technical_OLD.expired).toBe(true)
  })

  it('clearCache empties the API cache Map', () => {
    const api = mod.yahooFinanceAPI
    api.cache.set('k', { data: {}, timestamp: Date.now() })
    expect(api.cache.size).toBe(1)
    api.clearCache()
    expect(api.cache.size).toBe(0)
  })

  it('clearDailyCache delegates to technicalIndicatorsCache.clearAllCache', async () => {
    const cacheMod = await import('../utils/technicalIndicatorsCache')
    const spy = vi.spyOn(cacheMod.default, 'clearAllCache').mockImplementation(() => {})
    mod.yahooFinanceAPI.clearDailyCache()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

// ===================================================================
// In-memory cache fast-paths + OHLCV static / failure branches
// ===================================================================
describe('cache fast-paths and OHLCV static/failure branches', () => {
  it('_fetchTechnicalIndicatorsFromAPIInternal: second call hits the in-memory cache (no re-fetch)', async () => {
    withNodeEnv()
    mockFetchOnce(() => chartPayload())
    const api = mod.yahooFinanceAPI

    const first = await api.fetchTechnicalIndicatorsFromAPI('TEST')
    const second = await api.fetchTechnicalIndicatorsFromAPI('TEST')
    expect(second).toBe(first)                     // same cached object
    expect(global.fetch.mock.calls.length).toBe(2) // symbol + benchmark, only once
  })

  it('getOhlcv (browser): serves a wrapped static JSON and caches it', async () => {
    // default jsdom env => browser => _getOhlcvInternal tries static local JSON first.
    const staticOhlcv = {
      symbol: 'OHV',
      ohlcv: {
        timestamps: TIMESTAMP.slice(0, 30),
        open: OPEN.slice(0, 30), high: HIGH.slice(0, 30), low: LOW.slice(0, 30),
        close: CLOSE.slice(0, 30), volume: VOLUME.slice(0, 30)
      }
    }
    global.fetch = vi.fn(async () => okResp(staticOhlcv))
    const api = mod.yahooFinanceAPI

    const r1 = await api.getOhlcv('OHV', '1d', '3mo')
    expect(r1.metadata.source).toBe('Static Local JSON')
    expect(r1.close).toHaveLength(30)

    const r2 = await api.getOhlcv('OHV', '1d', '3mo') // cache-hit
    expect(r2).toBe(r1)
    expect(global.fetch.mock.calls.length).toBe(1) // only the first static fetch
  })

  it('getOhlcv (browser): static 404 + short proxy data rejects with "Failed to fetch OHLCV data"', async () => {
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('data/ohlcv/')) return { ok: false, status: 404 }
      return okResp(chartPayload(10)) // 10 points < 14 -> throws in the proxy loop
    })
    const api = mod.yahooFinanceAPI

    await expect(api.getOhlcv('SHORTO', '1d', '3mo')).rejects.toThrow(/Failed to fetch OHLCV data/)
  })
})

// ===================================================================
// getTechnicalIndicators — orchestration (memory/static miss -> live)
// ===================================================================
describe('getTechnicalIndicators (orchestration)', () => {
  it('cache miss + Node (static null) -> live fetch, then writes the daily cache', async () => {
    withNodeEnv()
    const cacheMod = await import('../utils/technicalIndicatorsCache')
    vi.spyOn(cacheMod.default, 'getTechnicalIndicators').mockResolvedValue(null)
    const setSpy = vi.spyOn(cacheMod.default, 'setTechnicalIndicators').mockResolvedValue(undefined)
    mockFetchOnce(() => chartPayload())
    const api = mod.yahooFinanceAPI

    const result = await api.getTechnicalIndicators('TEST')
    expect(result.dataPoints).toBe(60)
    expect(result.source).toContain('Fresh')
    expect(setSpy).toHaveBeenCalledWith('TEST', result)
  })

  it('returns memory-cached data without hitting the network', async () => {
    const cacheMod = await import('../utils/technicalIndicatorsCache')
    const cached = { source: 'Daily Cache (Memory)', dataPoints: 42 }
    vi.spyOn(cacheMod.default, 'getTechnicalIndicators').mockResolvedValue(cached)
    global.fetch = vi.fn()
    const api = mod.yahooFinanceAPI

    const result = await api.getTechnicalIndicators('TEST')
    expect(result).toBe(cached)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('browser: a static-indicators hit short-circuits before the live API', async () => {
    const cacheMod = await import('../utils/technicalIndicatorsCache')
    vi.spyOn(cacheMod.default, 'getTechnicalIndicators').mockResolvedValue(null)
    vi.spyOn(cacheMod.default, 'setTechnicalIndicators').mockResolvedValue(undefined)
    const staticData = {
      metadata: { generated: '2026-07-20T12:00:00.000Z' },
      indicators: {
        sma: { sma5: [NaN, 100, 108], sma10: [NaN, 100, 109], sma30: [NaN, 100, 110], sma50: [NaN, 100, 111] },
        rsi: { rsi14: [NaN, 50, 72] },
        obv: { obv: [NaN, 100, 220] }
      }
    }
    global.fetch = vi.fn(async (url) =>
      String(url).includes('latest_index.json') ? okResp({ date: '2026-07-20' }) : okResp(staticData))
    const api = mod.yahooFinanceAPI

    const r = await api.getTechnicalIndicators('TEST')
    expect(r.source).toBe('Static Pre-computed')
    expect(r.lastUpdated).toBe('2026-07-20T12:00:00.000Z')
  })
})

// ===================================================================
// R5 guard: unequal-length quote arrays. A thin/halted symbol can return
// OHLCV series of DIFFERENT lengths. The guard sizes `length` to the MIN of
// the five series (not close.length) before building the aligned arrays, so
// no undefined/NaN tail leaks into ADX/OBV/etc; and the <50 "Insufficient
// data" throw fires on that MIN length.
// ===================================================================
describe('fetchTechnicalIndicatorsFromAPI — unequal-length quote arrays (R5 guard)', () => {
  /** Chart payload whose OHLCV series have DIFFERENT lengths (per `lens`). */
  function unequalPayload (lens) {
    const maxLen = Math.max(lens.open, lens.high, lens.low, lens.close, lens.volume)
    return {
      chart: {
        result: [{
          meta: { regularMarketPrice: REG_PRICE, symbol: 'UNEQ', currency: 'USD' },
          timestamp: TIMESTAMP.slice(0, maxLen),
          indicators: {
            quote: [{
              open: OPEN.slice(0, lens.open),
              high: HIGH.slice(0, lens.high),
              low: LOW.slice(0, lens.low),
              close: CLOSE.slice(0, lens.close),
              volume: VOLUME.slice(0, lens.volume)
            }]
          }
        }],
        error: null
      }
    }
  }

  it('truncates to the shortest series (min 50) → FINITE indicators, no NaN tail', async () => {
    withNodeEnv()
    // close=60, high=55, volume=50, open/low=60 → min = 50 (>=50, no throw)
    global.fetch = vi.fn(async () => okResp(unequalPayload({ open: 60, high: 55, low: 60, close: 60, volume: 50 })))
    const api = mod.yahooFinanceAPI

    const ind = await api.fetchTechnicalIndicatorsFromAPI('UNEQ50')
    expect(ind).toBeTypeOf('object')
    expect(ind.error).toBeUndefined()   // did NOT fall into the error-shaped object
    expect(ind.dataPoints).toBe(50)     // sized to the MIN, not close.length (60)
    // Every headline value is a real finite number — the shorter high/volume
    // series did NOT leak undefined→NaN into the tail the indicators read.
    for (const key of ['adx14', 'rsi14', 'ma5', 'atr14', 'macd', 'obv']) {
      expect(Number.isFinite(parseFloat(ind[key].value)), `${key}.value finite`).toBe(true)
    }
  })

  it('still throws "Insufficient data" when the MIN length is 49 (guard measures the min, not close.length)', async () => {
    withNodeEnv()
    // close=60 but volume=49 → min = 49 (<50) → internal throw; Node branch
    // swallows it and returns undefined (see the pinned SURPRISING tests).
    global.fetch = vi.fn(async () => okResp(unequalPayload({ open: 60, high: 55, low: 60, close: 60, volume: 49 })))
    const api = mod.yahooFinanceAPI

    const ind = await api.fetchTechnicalIndicatorsFromAPI('UNEQ49')
    expect(ind).toBeUndefined()
    // Smoking gun: the guard reported 49 (the min), proving it did NOT size on
    // close.length (60) — which would have passed the >=50 check and returned data.
    const threw49 = warnSpy.mock.calls
      .map(c => String(c[1] ?? c[0]))
      .some(s => s.includes('Insufficient data points (49)'))
    expect(threw49).toBe(true)
  })
})
