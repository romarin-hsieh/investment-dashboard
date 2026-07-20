/**
 * Component test for FundamentalAnalysis (WS-G PR-G2). Second Vue
 * component test in the project; mirrors the mount + module-mock pattern
 * established by PR-G1 (`MFIVolumeProfilePanel.test.js`).
 *
 * Coverage philosophy: happy + 1 failure case per public surface, with
 * dedicated coverage of the primary→fallback→failure cascade in
 * `loadData()` since that's the most non-trivial logic and would be the
 * easiest to silently break during the queued TS migration.
 *
 * Mock strategy:
 *   - `@/api/yahooFinanceApi`           → vi.mock (default export)
 *   - `@/api/precomputedIndicatorsApi`  → vi.mock (named export)
 *   - `@/composables/useTheme`          → vi.mock (returns reactive ref('light'))
 *   - `@/utils/numberFormat`            → NO MOCK (pure passthrough)
 *   - `Bar` / `Line` (vue-chartjs)      → stubbed via mount options to skip
 *                                         Chart.js canvas construction in jsdom
 *
 * Open template references (`upgradesDowngrades`, `targetPriceChartData`)
 * are populated by `loadData` but the visible template elides them via
 * `<!-- ... (rest of template) ... -->` at line 152. Treated as orphan
 * state for this PR; if a future feature renders them, fixtures will
 * need extending (per WS-G calibration: enumerate template key-access).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// ---------- module mocks (must precede component import) ----------

vi.mock('@/api/yahooFinanceApi', () => ({
  default: { getStockInfo: vi.fn() }
}))
vi.mock('@/api/precomputedIndicatorsApi', () => ({
  precomputedIndicatorsAPI: { getTechnicalIndicators: vi.fn() }
}))
vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    theme:       ref('light'),
    toggleTheme: vi.fn(),
    setTheme:    vi.fn()
  })
}))

import FundamentalAnalysis from './FundamentalAnalysis.vue'
import yahooFinanceAPI from '@/api/yahooFinanceApi'
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi'

// ---------- fixtures ----------

/**
 * Stub mirroring what `yahooFinanceAPI.getStockInfo` returns when the
 * primary path succeeds. Keys enumerated from `loadData()`'s direct
 * dereferences + the template's `metrics.*` / `priceTargets.*` reads.
 */
function makeStockInfoStub () {
  return {
    financials: {
      currentPrice:   150,
      targetMeanPrice: 175,
      targetLowPrice:  130,
      targetHighPrice: 200,
      // Strings, not numbers — production API returns these already formatted
      // as percentage strings, and `getGrowthClass(val)` calls `val.includes('-')`
      // which would throw on a raw number.
      revenueGrowth:   '18.00%',
      profitMargins:   '24.00%',
      // PR-G2.5: now safe to use a truthy value because setup() exposes
      // `formatNumber` to the template. PR-G2 left this `undefined` to dodge
      // the latent `_ctx.formatNumber is not a function` bug; the source fix
      // is in this same PR, so the truthy value here doubles as the
      // regression-net assertion (vitest would emit an unhandled rejection
      // if the template render still couldn't resolve `formatNumber`).
      forwardPE:       28.5,
      beta:            1.12
    },
    recommendationTrend: [
      { period: '0m', strongBuy: 5, buy: 12, hold: 8, sell: 1, strongSell: 0 },
      { period: '-1m', strongBuy: 4, buy: 11, hold: 9, sell: 2, strongSell: 0 }
    ],
    earnings: {
      financialsChart: {
        yearly:    [{ date: 2023, revenue: 100_000_000, earnings: 10_000_000 }],
        quarterly: [{ date: '1Q2024', revenue: 30_000_000, earnings: 3_000_000 }]
      }
    },
    upgradeDowngradeHistory: {
      history: [{
        epochGradeDate: 1_700_000_000,
        firm:           'Goldman Sachs',
        toGrade:        'Buy',
        fromGrade:      'Hold',
        action:         'up',
        currentPriceTarget: 180
      }]
    }
  }
}

/**
 * Stub for the precomputed-fallback path. Different shape — `loadData`
 * pulls `financialData` + `defaultKeyStatistics` separately and applies
 * `formatPercent` to the percentage fields.
 */
function makePrecomputedStub () {
  return {
    fundamentals: {
      financialData: {
        currentPrice:   150,
        targetMeanPrice: 175,
        revenueGrowth:   0.15
      },
      defaultKeyStatistics: {
        beta:           1.05,
        forwardPE:      27.0, // PR-G2.5: now truthy; template resolves formatNumber via setup return
        profitMargins:  0.22
      },
      recommendationTrend: [
        { period: '0m', strongBuy: 3, buy: 9, hold: 6, sell: 1, strongSell: 0 }
      ],
      earnings: { financialsChart: { yearly: [] } },
      upgradeDowngradeHistory: { history: [] }
    }
  }
}

// ---------- per-test setup ----------

beforeEach(() => {
  // FundamentalAnalysis.loadData logs verbosely on every fallback path;
  // silence to keep test output readable. Same pattern as PR-G1.
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})

  // Default happy-path mock returns; individual tests override as needed.
  yahooFinanceAPI.getStockInfo.mockResolvedValue(makeStockInfoStub())
  precomputedIndicatorsAPI.getTechnicalIndicators.mockResolvedValue(makePrecomputedStub())
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

/** Common mount options — stub Chart.js components so jsdom doesn't try to render canvas. */
const mountOpts = (props) => ({
  props,
  global: { stubs: { Bar: true, Line: true } }
})

// ---------- mount + loadData cascade ----------

describe('FundamentalAnalysis — mount + loadData cascade', () => {
  it('mounts and calls getStockInfo once on watcher.immediate (happy)', async () => {
    const wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()

    expect(yahooFinanceAPI.getStockInfo).toHaveBeenCalledTimes(1)
    expect(yahooFinanceAPI.getStockInfo).toHaveBeenCalledWith('AAPL')
    expect(wrapper.vm.metrics.targetMeanPrice).toBe(175)
    expect(wrapper.vm.priceTargets).toMatchObject({ low: 130, high: 200, mean: 175, current: 150 })
    expect(wrapper.vm.error).toBeNull()
    expect(wrapper.vm.loading).toBe(false)
    // Primary path doesn't call the fallback API
    expect(precomputedIndicatorsAPI.getTechnicalIndicators).not.toHaveBeenCalled()
  })

  it('falls back to precomputed when primary throws and clears error (failure-recovery)', async () => {
    yahooFinanceAPI.getStockInfo.mockRejectedValueOnce(new Error('Network down'))
    const wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()

    expect(yahooFinanceAPI.getStockInfo).toHaveBeenCalledTimes(1)
    expect(precomputedIndicatorsAPI.getTechnicalIndicators).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.error).toBeNull()
    expect(wrapper.vm.loading).toBe(false)
    // beta + forwardPE come straight from defaultKeyStatistics; profitMargins
    // and revenueGrowth get run through formatPercent
    expect(wrapper.vm.metrics.beta).toBe(1.05)
    expect(wrapper.vm.metrics.forwardPE).toBe(27.0)
    expect(wrapper.vm.metrics.profitMargins).toMatch(/22\.\d+%/)
    expect(wrapper.vm.metrics.revenueGrowth).toMatch(/15\.\d+%/)
    // recommendationTrend processed (sliced to ≤4)
    expect(wrapper.vm.recommendationTrend.length).toBe(1)
  })

  it('sets error when both primary and fallback throw (total failure)', async () => {
    yahooFinanceAPI.getStockInfo.mockRejectedValueOnce(new Error('Primary 500'))
    precomputedIndicatorsAPI.getTechnicalIndicators.mockRejectedValueOnce(new Error('Precomputed 404'))
    const wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()

    expect(wrapper.vm.error).toBe('Could not load fundamental data. Please try again later.')
    expect(wrapper.vm.loading).toBe(false)
  })

  it('triggers a second loadData when symbol prop changes', async () => {
    const wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()
    expect(yahooFinanceAPI.getStockInfo).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ symbol: 'MSFT' })
    await flushPromises()

    expect(yahooFinanceAPI.getStockInfo).toHaveBeenCalledTimes(2)
    expect(yahooFinanceAPI.getStockInfo).toHaveBeenLastCalledWith('MSFT')
  })
})

// ---------- pure helpers ----------

describe('FundamentalAnalysis — pure helpers', () => {
  let wrapper

  beforeEach(async () => {
    wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()
  })

  it('formatPercent handles raw number, {raw} envelope, and null/undefined', () => {
    expect(wrapper.vm.formatPercent(0.36)).toBe('36.00%')
    expect(wrapper.vm.formatPercent({ raw: 0.1234 })).toBe('12.34%')
    expect(wrapper.vm.formatPercent(null)).toBe('N/A')
    expect(wrapper.vm.formatPercent(undefined)).toBe('N/A')
  })

  it('getPricePosition clamps to [0%, 100%] with 5% buffer at endpoints', () => {
    wrapper.vm.priceTargets = { low: 100, high: 200 }
    // At low edge: 5% buffer means low maps to ~5%
    expect(wrapper.vm.getPricePosition(100)).toMatch(/^[0-9.]+%$/)
    // At high edge: ~95%
    expect(wrapper.vm.getPricePosition(200)).toMatch(/^[0-9.]+%$/)
    // Below low → clamped to '0%'
    expect(wrapper.vm.getPricePosition(50)).toBe('0%')
    // Above high → clamped to '100%'
    expect(wrapper.vm.getPricePosition(500)).toBe('100%')
    // Edge: low === high → component returns '50%' (verified via direct read)
    wrapper.vm.priceTargets = { low: 100, high: 100 }
    expect(wrapper.vm.getPricePosition(100)).toBe('50%')
  })

  it('getTotalVotes + getVotePct compute vote arithmetic with zero-divide guard', () => {
    const period = { strongBuy: 5, buy: 3, hold: 2, sell: 0, strongSell: 0 }
    expect(wrapper.vm.getTotalVotes(period)).toBe(10)
    expect(wrapper.vm.getVotePct(period, 'strongBuy')).toBe('50%')
    expect(wrapper.vm.getVotePct(period, 'buy')).toBe('30%')
    expect(wrapper.vm.getVotePct(period, 'sell')).toBe('0%')

    // Zero-total guard: empty period must return '0%' not 'NaN%'
    const empty = { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 }
    expect(wrapper.vm.getTotalVotes(empty)).toBe(0)
    expect(wrapper.vm.getVotePct(empty, 'strongBuy')).toBe('0%')
  })
})

// ---------- WS-H PR 6 additions (ADR-0013) ----------

describe('FundamentalAnalysis — getGrowthClass', () => {
  it('never throws, and never paints unknown data green', async () => {
    // REGRESSION: `val.includes('-')` THREW on a number or a {raw,fmt} envelope
    // ("includes is not a function", taking the whole panel down), and returned
    // 'text-success' for any string without a '-' — so 'N/A' rendered GREEN,
    // i.e. missing data looked like positive growth.
    const wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()
    const vm = wrapper.vm

    expect(() => vm.getGrowthClass(-0.15)).not.toThrow()
    expect(vm.getGrowthClass(-0.15)).toBe('text-danger')
    expect(vm.getGrowthClass(0.22)).toBe('text-success')
    expect(vm.getGrowthClass({ raw: -0.1, fmt: '-10%' })).toBe('text-danger')

    // Strings still behave.
    expect(vm.getGrowthClass('-12.3%')).toBe('text-danger')
    expect(vm.getGrowthClass('8.4%')).toBe('text-success')

    // Unknown must be COLOURLESS, never green.
    for (const unknown of [null, undefined, '', 'N/A']) {
      expect(vm.getGrowthClass(unknown)).toBe('')
    }
  })
})

describe('FundamentalAnalysis — Yahoo {raw, fmt} envelopes', () => {
  it('renders the real number instead of [object Object] or a silent N/A', async () => {
    // REGRESSION: an envelope is truthy, so beta rendered literally as
    // "[object Object]", while forwardPE died in parseFloat({}) -> NaN and showed
    // N/A for a value we actually had.
    const wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()
    const vm = wrapper.vm
    const NA = vm.$t('fundamentals.keyMetrics.notAvailable')

    expect(vm.displayMetric({ raw: 1.234, fmt: '1.23' }, 2)).toBe('1.23')
    expect(vm.displayMetric(1.234, 2)).toBe('1.23')
    expect(vm.displayMetric('1.234', 2)).toBe('1.23')
    expect(vm.displayMetric({ raw: 1.234 }, 2)).not.toContain('object')

    // Genuinely absent values still read as N/A.
    for (const missing of [null, undefined, '', {}]) {
      expect(vm.displayMetric(missing, 2)).toBe(NA)
    }
  })

  it('parses comma-formatted fmt strings instead of truncating at the comma', async () => {
    // REGRESSION (Gemini review on PR #99): a fmt-only envelope hands
    // displayMetric a display string like "1,250.40" — bare parseFloat stops at
    // the comma and renders 1.00. A silently wrong number is worse than N/A.
    const wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()
    const vm = wrapper.vm

    expect(vm.displayMetric({ fmt: '1,250.40' }, 2)).toBe('1250.40')
    expect(vm.displayMetric('12,345,678.9', 1)).toBe('12345678.9')
    // Percent strings keep working (same normalization as getGrowthClass).
    expect(vm.displayMetric('1.25%', 2)).toBe('1.25')
  })
})

describe('FundamentalAnalysis — degraded earnings payloads', () => {
  it('treats truthy non-array financialsChart members as empty instead of throwing', async () => {
    // REGRESSION (Gemini review on PR #99): `[...earnings.financialsChart.yearly]`
    // threw a TypeError when the API returned {} (or a string) for yearly/quarterly,
    // killing the entire earnings section.
    const wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()
    const vm = wrapper.vm

    expect(() => vm.processEarningsHistory({
      financialsChart: { yearly: {}, quarterly: 'oops' }
    })).not.toThrow()
    expect(vm.yearlyEarningsData).toEqual([])
    expect(vm.quarterlyEarningsData).toEqual([])
  })
})

describe('FundamentalAnalysis — getPricePosition', () => {
  it('never emits NaN% into inline CSS when a target is missing', async () => {
    // REGRESSION: a missing high/low made `range` NaN, which propagated out as the
    // literal CSS string 'NaN%' on the marker left/right offsets.
    const wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()
    const vm = wrapper.vm

    vm.priceTargets = { low: 100, high: 200, mean: 150, current: 150 }
    expect(vm.getPricePosition(150)).toMatch(/^\d+(\.\d+)?%$/)

    vm.priceTargets = { low: 100, high: undefined, mean: 150, current: 150 }
    expect(vm.getPricePosition(150)).not.toContain('NaN')

    vm.priceTargets = { low: undefined, high: undefined, mean: null, current: 150 }
    expect(vm.getPricePosition(150)).not.toContain('NaN')
  })
})

describe('FundamentalAnalysis — quarterly synthesis', () => {
  function payload (quarters) {
    return {
      financialsChart: {
        yearly: [
          { date: 2023, revenue: 100, earnings: 10 },
          { date: 2024, revenue: 120, earnings: 12 }
        ],
        quarterly: quarters
      }
    }
  }

  it('does NOT mutate the caller\'s (cached) payload', async () => {
    // REGRESSION: `yearlyEarningsData` aliased the API array and synthesis pushed
    // onto it — mutating the CACHED response, so re-entering the view appended
    // duplicate synthesized years every time.
    const wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()

    const data = payload([
      { date: '1Q2025', revenue: 30, earnings: 3 },
      { date: '2Q2025', revenue: 30, earnings: 3 },
      { date: '3Q2025', revenue: 30, earnings: 3 },
      { date: '4Q2025', revenue: 30, earnings: 3 }
    ])

    wrapper.vm.processEarningsHistory(data)
    wrapper.vm.processEarningsHistory(data) // re-entry must be idempotent

    expect(data.financialsChart.yearly).toHaveLength(2)
  })

  it('synthesizes a COMPLETE year but never a partial one', async () => {
    const wrapper = mount(FundamentalAnalysis, mountOpts({ symbol: 'AAPL' }))
    await flushPromises()

    // Only 2 of 4 quarters: charting that beside full years reads as a collapse.
    wrapper.vm.processEarningsHistory(payload([
      { date: '1Q2025', revenue: 30, earnings: 3 },
      { date: '2Q2025', revenue: 30, earnings: 3 }
    ]))
    expect(wrapper.vm.yearlyEarningsData.map(y => y.date)).toEqual([2023, 2024])

    // All four quarters: safe to aggregate.
    wrapper.vm.processEarningsHistory(payload([
      { date: '1Q2025', revenue: 30, earnings: 3 },
      { date: '2Q2025', revenue: 30, earnings: 3 },
      { date: '3Q2025', revenue: 30, earnings: 3 },
      { date: '4Q2025', revenue: 30, earnings: 3 }
    ]))
    const synth = wrapper.vm.yearlyEarningsData.find(y => y.date === 2025)
    expect(synth).toMatchObject({ revenue: 120, earnings: 12, synthesized: true })
  })
})
