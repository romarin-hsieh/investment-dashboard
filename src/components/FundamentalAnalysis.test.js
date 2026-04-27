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

vi.mock('@/api/yahooFinanceApi.js', () => ({
  default: { getStockInfo: vi.fn() }
}))
vi.mock('@/api/precomputedIndicatorsApi.js', () => ({
  precomputedIndicatorsAPI: { getTechnicalIndicators: vi.fn() }
}))
vi.mock('@/composables/useTheme.js', () => ({
  useTheme: () => ({
    theme:       ref('light'),
    toggleTheme: vi.fn(),
    setTheme:    vi.fn()
  })
}))

import FundamentalAnalysis from './FundamentalAnalysis.vue'
import yahooFinanceAPI from '@/api/yahooFinanceApi.js'
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi.js'

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

    expect(wrapper.vm.error).toBe('Failed to load fundamental data')
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
