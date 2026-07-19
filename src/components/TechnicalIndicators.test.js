/**
 * Component test for TechnicalIndicators — WS-H PR 4 (see ADR-0013).
 *
 * Lowest-covered component in the repo (7.1%) and it renders inside StockCard for
 * every symbol, so a wrong reading here is repeated across the grid.
 *
 * Several cases FAILED before the fixes in this PR. They pin three defect families:
 *   1. Yahoo's getFmt() STRINGIFIES every field, so 'N/A'/'1.23' reached helpers
 *      that compared them numerically — printing "N/A" beside a confident tag,
 *      or a fabricated 'VERY LOW' / 'MICRO CAP' classification.
 *   2. Number(null) === 0 and Number('') === 0 are finite, so absent data rendered
 *      a fabricated "0" / "0.00" reading.
 *   3. No request token guarded the two-phase load, so the PREVIOUS symbol's slow
 *      enrichment landed on the newly-selected ticker.
 *
 * Mocks: both APIs are DEFAULT exports (mocking only the named export would leave
 * the real class hitting network + IndexedDB). `@/utils/numberFormat` is pure and
 * deliberately NOT mocked. Copy is asserted via i18n keys, never literals.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/hybridTechnicalIndicatorsApi.js', () => {
  const api = { getTechnicalIndicators: vi.fn() }
  return { default: api, hybridTechnicalIndicatorsAPI: api }
})
vi.mock('@/api/yahooFinanceApi.js', () => {
  const api = { getStockInfo: vi.fn() }
  return { default: api, yahooFinanceAPI: api }
})

import TechnicalIndicators from './TechnicalIndicators.vue'
import hybridApi from '@/api/hybridTechnicalIndicatorsApi.js'
import yahooApi from '@/api/yahooFinanceApi.js'

// ---------- helpers ----------

function makeData (over = {}) {
  return { lastUpdated: '2026-07-20T00:00:00Z', fullSeries: {}, yf: {}, ...over }
}

function deferred () {
  let resolve
  const promise = new Promise((res) => { resolve = res })
  return { promise, resolve }
}

function mountPanel (props = {}) {
  return mount(TechnicalIndicators, { props: { symbol: 'NVDA', ...props } })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  hybridApi.getTechnicalIndicators.mockResolvedValue(makeData())
  yahooApi.getStockInfo.mockResolvedValue(null)
})

describe('TechnicalIndicators', () => {
  describe('stringified upstream values (Yahoo getFmt)', () => {
    it('never shows a confident tag next to an N/A value', async () => {
      // REGRESSION: formatBeta('1.23') returned 'N/A' while getBetaCategory('1.23')
      // returned 'MED VOL'; and a missing beta ('N/A') produced a 'VERY LOW' tag.
      const vm = mountPanel().vm

      // A numeric STRING must format AND categorise consistently.
      expect(vm.formatBeta('1.23')).toBe('1.23')
      expect(vm.getBetaCategory('1.23')).toBe('MED VOL')

      // A missing value must produce NO tag rather than a fabricated one.
      expect(vm.formatBeta('N/A')).toBe('N/A')
      expect(vm.getBetaCategory('N/A')).toBeNull()
      expect(vm.getMarketCapCategory('N/A')).toBeNull()
    })

    it('categorises stringified market caps the same as numeric ones', async () => {
      const vm = mountPanel().vm
      expect(vm.getMarketCapCategory('250000000000')).toBe('MEGA CAP')
      expect(vm.getMarketCapCategory(250e9)).toBe('MEGA CAP')
      expect(vm.formatMarketCap('250000000000')).toBe(vm.formatMarketCap(250e9))
    })
  })

  describe('falsy-but-not-nullish input', () => {
    it('renders N/A rather than a fabricated zero', async () => {
      // REGRESSION: Number(null) === 0 and Number('') === 0 are finite, so an
      // absent volume rendered "0" and an empty string "0.00" — a meaningful
      // wrong reading on an oscillator.
      const vm = mountPanel().vm
      for (const empty of [null, undefined, '', 'N/A']) {
        expect(vm.formatVolume(empty)).toBe('N/A')
        expect(vm.formatMarketCap(empty)).toBe('N/A')
        expect(vm.formatNumber(empty)).toBe('N/A')
      }
      // A real zero is still a real reading.
      expect(vm.formatNumber(0)).toBe('0.00')
    })
  })

  describe('sparse series', () => {
    it('derives change from the last two VALID points', async () => {
      const vm = mountPanel().vm
      expect(vm.getLatestValue([50, 55, null, null])).toBe(55)
      expect(vm.getPreviousValue([50, 55, null, null])).toBe(50)
      expect(vm.getLatestValue([])).toBeNull()
      expect(vm.getPreviousValue([42])).toBeNull()
    })

    it('never emits NaN% or Infinity% from fmtChangePct', async () => {
      const vm = mountPanel().vm
      expect(vm.fmtChangePct(10)).toBe('+10.0%')
      expect(vm.fmtChangePct(-2.5)).toBe('-2.5%')
      expect(vm.fmtChangePct(NaN)).toBeNull()
      expect(vm.fmtChangePct(Infinity)).toBeNull()
    })
  })

  describe('category thresholds', () => {
    it('applies the asymmetric volume boundaries and guards a zero average', async () => {
      const vm = mountPanel().vm
      expect(vm.getVolumeCategory(2000, 1000)).toBe('HIGH VOL')   // > 1.5
      expect(vm.getVolumeCategory(1200, 1000)).toBe('ABOVE AVG')  // > 1.0
      expect(vm.getVolumeCategory(400, 1000)).toBe('LOW VOL')     // < 0.5
      expect(vm.getVolumeCategory(800, 1000)).toBe('BELOW AVG')   // the 0.5-1.0 band
      // A zero/absent average would otherwise divide to Infinity.
      expect(vm.getVolumeCategory(1000, 0)).toBeNull()
      expect(vm.getVolumeCategory(1000, null)).toBeNull()
    })
  })

  describe('two-phase load', () => {
    it('unblocks the UI after phase 1, before the slow enrichment settles', async () => {
      const slow = deferred()
      yahooApi.getStockInfo.mockReturnValue(slow.promise)

      const wrapper = mountPanel()
      expect(wrapper.vm.loading).toBe(true)

      await flushPromises()
      // Phase 1 done: the panel is usable even though enrichment is still pending.
      expect(wrapper.vm.loading).toBe(false)
      expect(wrapper.vm.rawData).not.toBeNull()

      slow.resolve(null)
      await flushPromises()
    })

    it('keeps the rendered panel when background enrichment fails or returns null', async () => {
      // The inner try/catch is the only thing stopping a Yahoo outage from
      // replacing a fully-usable indicator table with a red error box.
      yahooApi.getStockInfo.mockRejectedValue(new Error('yahoo down'))
      const wrapper = mountPanel()
      await flushPromises()

      expect(wrapper.vm.error).toBeNull()
      expect(wrapper.vm.loading).toBe(false)
      expect(wrapper.find('.error-state').exists()).toBe(false)
      expect(wrapper.vm.rawData).not.toBeNull()
    })
  })

  describe('stale-response race', () => {
    it('drops the PREVIOUS symbol\'s enrichment after the ticker changes', async () => {
      // REGRESSION: phase 2 is the slow call and nothing guarded the rawData
      // spread, so switching ticker (the app's core interaction) reliably landed
      // the old symbol's volume/market-cap/beta on the new symbol's panel.
      const slowOld = deferred()
      yahooApi.getStockInfo
        .mockReturnValueOnce(slowOld.promise)                       // AAPL — slow
        .mockResolvedValueOnce({ volume: 222, marketCap: 2e9, beta: 2 }) // MSFT — fast

      const wrapper = mountPanel({ symbol: 'AAPL' })
      await flushPromises() // AAPL phase 1 done; its phase 2 still pending

      await wrapper.setProps({ symbol: 'MSFT' })
      await flushPromises() // MSFT fully loaded and enriched

      expect(wrapper.vm.rawData.yf.extVolume).toBe(222)

      // The stale AAPL response now lands — it must be discarded.
      slowOld.resolve({ volume: 111, marketCap: 1e9, beta: 1 })
      await flushPromises()

      expect(wrapper.vm.rawData.yf.extVolume).toBe(222)
    })
  })

  describe('error + retry', () => {
    it('shows the error state, then recovers into a populated grid on retry', async () => {
      hybridApi.getTechnicalIndicators.mockRejectedValueOnce(new Error('boom'))
      const wrapper = mountPanel()
      await flushPromises()

      expect(wrapper.find('.error-state').exists()).toBe(true)
      // Assert via the interpolated i18n message, never the raw English literal.
      expect(wrapper.find('.error-message').text())
        .toBe(wrapper.vm.$t('indicators.loadFailed', { message: 'boom' }))

      hybridApi.getTechnicalIndicators.mockResolvedValue(makeData())
      await wrapper.find('.error-state button').trigger('click')
      await flushPromises()

      expect(wrapper.vm.error).toBeNull()
      expect(wrapper.find('.error-state').exists()).toBe(false)
    })
  })
})
