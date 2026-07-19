/**
 * Component test baseline for MFIVolumeProfilePanel — first Vue Test Utils
 * test in the project. Establishes the mocking + mount pattern that
 * subsequent component tests (StockOverview, FundamentalAnalysis) can
 * mirror.
 *
 * Coverage philosophy (per WS-G PR-G1, derived from PR-E3):
 *   happy path + 1 failure case per public surface
 *   pure helpers exercised directly (no mount needed for assertions)
 *   integration-shaped paths (full data-fetch chain, tooltip pixel math,
 *     CSS-class-coupled DOM querying) intentionally NOT covered.
 *
 * Mock strategy:
 *   - `@/services/ohlcvApi`  → vi.mock (real impl does fetch; tested upstream)
 *   - `@/utils/mfiVolumeProfile` → vi.mock (math has its own test file)
 *   - `@/utils/numberFormat` → NO MOCK (pure passthrough; richer assertions)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Module-level mocks must declare BEFORE the component import resolves them.
vi.mock('@/services/ohlcvApi.js', () => ({
  ohlcvApi: { getOhlcv: vi.fn() }
}))
vi.mock('@/utils/mfiVolumeProfile.js', () => ({
  calculateMFIVolumeProfile: vi.fn(),
  getMFIVolumeProfileSignals: vi.fn()
}))

import MFIVolumeProfilePanel from './MFIVolumeProfilePanel.vue'
import { ohlcvApi } from '@/services/ohlcvApi.js'
import { calculateMFIVolumeProfile, getMFIVolumeProfileSignals } from '@/utils/mfiVolumeProfile.js'

// ---------- fixtures ----------

function makeOhlcvStub () {
  return {
    timestamps: [1, 2, 3, 4, 5],
    open:   [100, 101, 102, 103, 104],
    high:   [101, 102, 103, 104, 105],
    low:    [ 99, 100, 101, 102, 103],
    close:  [100.5, 101.5, 102.5, 103.5, 104.5],
    volume: [1000, 1100, 1200, 1300, 1400]
  }
}

/**
 * Minimal-but-complete profile-data shape mirroring the real
 * `calculateMFIVolumeProfile` return at `mfiVolumeProfile.js:244-273`.
 * Only the keys the component template actually reads are populated;
 * keep this in sync with the source if new keys are added downstream.
 */
function makeProfileStub () {
  return {
    volumeProfile: [
      { priceLevel: 100, minPrice:  98, maxPrice: 102, volume: 5000, positiveVolume: 3000, negativeVolume: 1500, neutralVolume: 500, mfiAverage: 65 },
      { priceLevel: 105, minPrice: 103, maxPrice: 107, volume: 3000, positiveVolume: 1000, negativeVolume: 1500, neutralVolume: 500, mfiAverage: 45 }
    ],
    mfi:           { signal: 'BULLISH', latest: 65 },
    pointOfControl: { priceLevel: 100, volume: 5000, percentage: 50 },
    valueArea:      { low: 98, high: 102, volume: 7000, percentage: 70 },
    mfiInsights:    { totalNeutralVolume: 1000, buyingPressureLevels: [], sellingPressureLevels: [], totalBuyingVolume: 4000, totalSellingVolume: 3000 },
    marketSentiment: 'BULLISH',
    statistics: {
      totalVolume:    8000,
      maxVolumeInBin: 5000,
      priceRange:     { min: 98, max: 107, range: 9 },
      bins:           50,
      buyingRatio:    0.5,
      sellingRatio:   0.375,
      neutralRatio:   0.125
    },
    metadata: { calculatedAt: '2026-04-26T00:00:00Z' }
  }
}

// ---------- per-test setup ----------

beforeEach(() => {
  // The component logs verbosely on every load — silence to keep test
  // output readable. Same pattern as ohlcvApi.test.js / mfiVolumeProfile.test.js.
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})

  // Default happy-path mock returns; individual tests override as needed.
  ohlcvApi.getOhlcv.mockResolvedValue(makeOhlcvStub())
  calculateMFIVolumeProfile.mockReturnValue(makeProfileStub())
  // Shape includes `recommendations` because the template at line 147
  // dereferences `.recommendations.length` even when no recommendations exist.
  getMFIVolumeProfileSignals.mockReturnValue({
    signal: 'BUY',
    confidence: 'HIGH',
    reasons: [],
    recommendations: []
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

// ---------- mount + loadData lifecycle ----------

describe('MFIVolumeProfilePanel — mount + loadData lifecycle', () => {
  it('mounts and calls loadData once on mount (happy)', async () => {
    const wrapper = mount(MFIVolumeProfilePanel, { props: { symbol: 'AAPL' } })
    await flushPromises()

    expect(ohlcvApi.getOhlcv).toHaveBeenCalledTimes(1)
    expect(ohlcvApi.getOhlcv).toHaveBeenCalledWith('AAPL', '1d', '3mo')
    expect(calculateMFIVolumeProfile).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.profileData).toBeTruthy()
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.error).toBeNull()
    expect(wrapper.vm.currentPrice).toBe(104.5) // last finite close in fixture
  })

  it('sets error and clears loading when fetch throws (failure)', async () => {
    ohlcvApi.getOhlcv.mockRejectedValueOnce(new Error('CORS blocked'))
    const wrapper = mount(MFIVolumeProfilePanel, { props: { symbol: 'AAPL' } })
    await flushPromises()

    expect(wrapper.vm.error).toMatch(/blocked by your browser's security/)
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.profileData).toBeNull()
  })

  it('triggers a second loadData when symbol prop changes (watcher)', async () => {
    const wrapper = mount(MFIVolumeProfilePanel, { props: { symbol: 'AAPL' } })
    await flushPromises()
    expect(ohlcvApi.getOhlcv).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ symbol: 'MSFT' })
    await flushPromises()

    expect(ohlcvApi.getOhlcv).toHaveBeenCalledTimes(2)
    expect(ohlcvApi.getOhlcv).toHaveBeenLastCalledWith('MSFT', '1d', '3mo')
  })

  it('supersedes an in-flight request instead of refusing to re-fetch', async () => {
    // REPLACES the old "early-returns from loadData when already loading" case.
    // That test asserted the `if (this.loading) return` re-entry guard — which was
    // itself the bug: a symbol change mid-flight was silently dropped, leaving the
    // PREVIOUS symbol's profile on screen permanently. loadData now uses a
    // generation token, so a concurrent call DOES re-fetch and the newest wins.
    const wrapper = mount(MFIVolumeProfilePanel, { props: { symbol: 'AAPL' } })
    await flushPromises()
    expect(ohlcvApi.getOhlcv).toHaveBeenCalledTimes(1)

    await wrapper.vm.loadData()

    expect(ohlcvApi.getOhlcv).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.loading).toBe(false)
  })
})

// ---------- pure helpers ----------

describe('MFIVolumeProfilePanel — pure helpers', () => {
  let wrapper

  beforeEach(async () => {
    wrapper = mount(MFIVolumeProfilePanel, { props: { symbol: 'AAPL' } })
    await flushPromises()
  })

  it('getErrorMessage returns user-facing copy per error class', () => {
    expect(wrapper.vm.getErrorMessage(new Error('CORS error')))
      .toMatch(/blocked by your browser's security/)
    expect(wrapper.vm.getErrorMessage(new Error('404 not found')))
      .toMatch(/may not be supported/)
    expect(wrapper.vm.getErrorMessage(new Error('Insufficient historical data')))
      .toMatch(/Not enough price history/)
    // Generic fallback echoes the underlying message
    expect(wrapper.vm.getErrorMessage(new Error('boom')))
      .toMatch(/Couldn't load data: boom/)
  })

  it('getCurrentPrice returns last finite close (skips trailing null/NaN)', () => {
    expect(wrapper.vm.getCurrentPrice({ close: [100, 101, null, NaN] })).toBe(101)
    expect(wrapper.vm.getCurrentPrice({ close: [50, 60, 70] })).toBe(70)
    expect(wrapper.vm.getCurrentPrice({ close: [null, null] })).toBeNull()
    expect(wrapper.vm.getCurrentPrice({ close: [] })).toBeNull()
  })

  it('formatVolume buckets at B / M / K boundaries; N/A for non-finite', () => {
    expect(wrapper.vm.formatVolume(5_000_000_000)).toBe('5.0B')
    expect(wrapper.vm.formatVolume(2_500_000)).toBe('2.5M')
    expect(wrapper.vm.formatVolume(7500)).toBe('7.5K')
    expect(wrapper.vm.formatVolume(42)).toBe('42')
    expect(wrapper.vm.formatVolume(NaN)).toBe('N/A')
    expect(wrapper.vm.formatVolume(undefined)).toBe('N/A')
    expect(wrapper.vm.formatVolume(Infinity)).toBe('N/A')
  })

  it('displayBins returns sorted-desc copy; empty when profileData is null', async () => {
    // Force a known three-bin profile to verify sort order. Spread the
    // full stub so template (which reads profileData.mfi / .pointOfControl /
    // .valueArea / .statistics) keeps rendering without crashing.
    wrapper.vm.profileData = {
      ...makeProfileStub(),
      volumeProfile: [
        { priceLevel: 10, minPrice: 8, maxPrice: 12, volume: 100, positiveVolume: 60, negativeVolume: 30, neutralVolume: 10, mfiAverage: 50 },
        { priceLevel: 30, minPrice: 28, maxPrice: 32, volume: 300, positiveVolume: 200, negativeVolume: 80, neutralVolume: 20, mfiAverage: 70 },
        { priceLevel: 20, minPrice: 18, maxPrice: 22, volume: 200, positiveVolume: 100, negativeVolume: 80, neutralVolume: 20, mfiAverage: 60 }
      ]
    }
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.displayBins.map(b => b.priceLevel)).toEqual([30, 20, 10])

    // Critical: source array must NOT be mutated — `displayBins` returns a copy
    expect(wrapper.vm.profileData.volumeProfile.map(b => b.priceLevel))
      .toEqual([10, 30, 20])

    // Null guard: `displayBins` returns `[]` when no profileData
    wrapper.vm.profileData = null
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.displayBins).toEqual([])
  })
})

// ---------- WS-H PR 5 additions (ADR-0013) ----------
//
// The file read 84.6% statements but only 53.1% FUNCTIONS — the bar renderer and
// the range/race paths never executed. These four blocks close that gap.

function deferred () {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

describe('MFIVolumeProfilePanel — getBarFillStyle (the only live visual encoding)', () => {
  // NOTE: `.bullish` / `.bearish` / `.poc` classes have NO CSS rule anywhere, so
  // the inline style from getBarFillStyle is the sole support/resistance signal.
  // An inverted comparison here flips support and resistance for every user with
  // no other symptom.
  const SUPPORT = '#10b981' // bin fully BELOW price  -> profit/support
  const RESIST  = '#ef4444' // bin fully ABOVE price  -> trapped/resistance
  const AT_PX   = '#f59e0b' // bin straddles price

  async function mountLoaded () {
    const wrapper = mount(MFIVolumeProfilePanel, { props: { symbol: 'AAPL' } })
    await flushPromises()
    return wrapper
  }

  it('colours bins by position relative to currentPrice', async () => {
    const wrapper = await mountLoaded()
    const [low, high] = wrapper.vm.profileData.volumeProfile // 98-102 and 103-107

    wrapper.vm.currentPrice = 110 // both bins below price
    expect(wrapper.vm.getBarFillStyle(low).backgroundColor).toBe(SUPPORT)
    expect(wrapper.vm.getBarFillStyle(high).backgroundColor).toBe(SUPPORT)

    wrapper.vm.currentPrice = 95 // both bins above price
    expect(wrapper.vm.getBarFillStyle(low).backgroundColor).toBe(RESIST)

    wrapper.vm.currentPrice = 100 // straddles the low bin, below the high bin
    expect(wrapper.vm.getBarFillStyle(low).backgroundColor).toBe(AT_PX)
    expect(wrapper.vm.getBarFillStyle(high).backgroundColor).toBe(RESIST)
  })

  it('scales bar width against maxVolumeInBin, with a floor and a zero-divisor guard', async () => {
    const wrapper = await mountLoaded()
    const [poc] = wrapper.vm.profileData.volumeProfile // volume 5000 === maxVolumeInBin

    expect(wrapper.vm.getBarFillStyle(poc).width).toBe('100%')
    expect(wrapper.vm.getBarFillStyle({ ...poc, volume: 2500 }).width).toBe('50%')

    // Zero divisor must not produce 'NaN%' — the floor keeps the bar visible.
    wrapper.vm.profileData.statistics.maxVolumeInBin = 0
    expect(wrapper.vm.getBarFillStyle(poc).width).toBe('1%')

    // No data at all -> collapsed bar, not a crash.
    wrapper.vm.profileData = null
    expect(wrapper.vm.getBarFillStyle(poc)).toEqual({ width: '0%' })
  })

  it('falls back to neutral grey and emits no signals when currentPrice is null', async () => {
    // A close series of all-nulls makes getCurrentPrice return null. The chart still
    // renders perfectly normally — every bar just silently loses its support /
    // resistance meaning, so this needs pinning.
    ohlcvApi.getOhlcv.mockResolvedValue({ ...makeOhlcvStub(), close: [null, null, null, null, null] })

    const wrapper = mount(MFIVolumeProfilePanel, { props: { symbol: 'AAPL' } })
    await flushPromises()

    expect(wrapper.vm.currentPrice).toBeNull()
    expect(wrapper.vm.tradingSignals).toBeNull()
    expect(getMFIVolumeProfileSignals).not.toHaveBeenCalled()

    const [bin] = wrapper.vm.profileData.volumeProfile
    expect(wrapper.vm.getBarFillStyle(bin).backgroundColor).toBe('#6b7280') // neutral
  })
})

describe('MFIVolumeProfilePanel — range selector', () => {
  it('re-fetches with the newly selected range', async () => {
    const wrapper = mount(MFIVolumeProfilePanel, { props: { symbol: 'AAPL' } })
    await flushPromises()
    ohlcvApi.getOhlcv.mockClear()

    await wrapper.find('select.range-selector').setValue('1y')
    await flushPromises()

    expect(ohlcvApi.getOhlcv).toHaveBeenCalledWith('AAPL', '1d', '1y')
  })

  it('offers exactly the ranges the API accepts', async () => {
    // These are API contract values (not UI copy), so asserting them is safe.
    const wrapper = mount(MFIVolumeProfilePanel, { props: { symbol: 'AAPL' } })
    await flushPromises()

    const values = wrapper.findAll('select.range-selector option').map(o => o.element.value)
    expect(values).toEqual(['3mo', '6mo', '1y'])
  })
})

describe('MFIVolumeProfilePanel — in-flight request supersession', () => {
  it('loads the NEW symbol when it changes mid-flight, and discards the stale response', async () => {
    // REGRESSION: `loadData` opened with `if (this.loading) return`, so a symbol
    // change while a request was in flight early-returned — the new symbol never
    // loaded and the panel kept showing the PREVIOUS symbol's profile under the
    // new symbol's header, permanently, with no refetch.
    const slowOld = deferred()
    ohlcvApi.getOhlcv
      .mockReturnValueOnce(slowOld.promise)      // AAPL — still in flight
      .mockResolvedValueOnce(makeOhlcvStub())    // MSFT — resolves promptly
    calculateMFIVolumeProfile.mockReturnValue({ ...makeProfileStub(), marketSentiment: 'MSFT_RESULT' })

    const wrapper = mount(MFIVolumeProfilePanel, { props: { symbol: 'AAPL' } })
    await wrapper.setProps({ symbol: 'MSFT' })
    await flushPromises()

    // The new symbol must actually have been requested (no starvation).
    expect(ohlcvApi.getOhlcv).toHaveBeenCalledTimes(2)
    expect(ohlcvApi.getOhlcv).toHaveBeenLastCalledWith('MSFT', '1d', '3mo')
    expect(wrapper.vm.profileData.marketSentiment).toBe('MSFT_RESULT')

    // The stale AAPL response now lands — it must be dropped, not rendered.
    calculateMFIVolumeProfile.mockReturnValue({ ...makeProfileStub(), marketSentiment: 'AAPL_RESULT' })
    slowOld.resolve(makeOhlcvStub())
    await flushPromises()

    expect(wrapper.vm.profileData.marketSentiment).toBe('MSFT_RESULT')
    expect(wrapper.vm.loading).toBe(false)
  })
})
