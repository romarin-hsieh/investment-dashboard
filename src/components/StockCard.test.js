/**
 * Component test for StockCard — WS-H PR 3 (see ADR-0013).
 *
 * StockCard renders for EVERY symbol on the Stock Overview page, so a wrong
 * derived value here is repeated across the whole grid. It is pure
 * props-in/render-out (no fetching), so the only mocks are its two heavy
 * children, which import network/cache modules at load time.
 *
 * Three of these cases FAILED before the fixes in this PR — they pin genuine
 * "fabricated signal from missing data" defects:
 *   1. a MISSING stale_level rendered a wordless ⚠ banner,
 *   2. a NULL price_usd fabricated a BEARISH moving-average call,
 *   3. a flat/absent change reported "strong selling pressure" on a volume spike.
 *
 * Per ADR-0013 expected copy is resolved from i18n KEYS, never hard-coded.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Both children import network / cache / theme modules at load time — stub them
// with props-only components so prop propagation stays assertable.
vi.mock('./FastTradingViewWidget.vue', () => ({
  default: {
    name: 'FastTradingViewWidget',
    props: ['widgetType', 'symbol', 'exchange', 'priority'],
    template: '<div class="stub-ftv" />'
  }
}))
vi.mock('./TechnicalIndicators.vue', () => ({
  default: {
    name: 'TechnicalIndicators',
    props: ['symbol', 'exchange'],
    template: '<div class="stub-ti" />'
  }
}))

import StockCard from './StockCard.vue'
import { navigationService } from '@/services/NavigationService'

// ---------- fixtures ----------

function makeQuote (overrides = {}) {
  return {
    symbol: 'NVDA',
    stale_level: 'fresh',
    change_percent: 1.2,
    price_usd: 120,
    volume: 1000,
    averageDailyVolume3Month: 1000,
    ...overrides
  }
}

function mountCard (quoteOverrides = {}, props = {}) {
  return mount(StockCard, {
    // `dailyData` gates the trading-analysis section in the template.
    props: { quote: makeQuote(quoteOverrides), dailyData: {}, ...props },
    global: { mocks: { $router: { push: vi.fn().mockResolvedValue(undefined) } } }
  })
}

/** Resolve expected copy from the key, per ADR-0013 (never hard-code English). */
const t = (wrapper, key, params) => wrapper.vm.$t(key, params)

describe('StockCard', () => {
  describe('staleness banner', () => {
    it('shows no banner when data is fresh', () => {
      const wrapper = mountCard({ stale_level: 'fresh' })
      expect(wrapper.find('.stale-banner').exists()).toBe(false)
    })

    it.each(['stale', 'very_stale'])('shows a banner WITH text for %s', (level) => {
      const wrapper = mountCard({ stale_level: level })
      const banner = wrapper.find('.stale-banner')
      expect(banner.exists()).toBe(true)
      // The words carry the state for screen readers — an icon-only banner is a bug.
      expect(wrapper.find('.stale-banner-text').text().trim().length).toBeGreaterThan(0)
    })

    it('shows NO banner when stale_level is missing', () => {
      // REGRESSION: `isStale` was `!== 'fresh'`, so an absent stale_level rendered a
      // wordless ⚠ banner — an aria-live region that announces nothing.
      const wrapper = mountCard({ stale_level: undefined })
      expect(wrapper.find('.stale-banner').exists()).toBe(false)
    })
  })

  describe('trend analysis', () => {
    it('does NOT fabricate a bearish MA call when price is null', () => {
      // REGRESSION: `price_usd: null` passed the `!== undefined` guard, then
      // `null < fiftyDayAverage` coerced to `0 < x` and printed a BEARISH
      // moving-average call for a stock trading above both averages.
      const wrapper = mountCard({
        price_usd: null,
        fiftyDayAverage: 100,
        twoHundredDayAverage: 90,
        change_percent: 1.0
      })

      const points = wrapper.vm.tradingAnalysis
      const bearishMA = t(wrapper, 'stockCard.analysisTrendBearishMA')
      expect(points.map(p => p.text)).not.toContain(bearishMA)
      expect(points[0].type).not.toBe('bearish')
    })

    it('still makes the MA call when the price is usable', () => {
      const above = mountCard({ price_usd: 120, fiftyDayAverage: 100, twoHundredDayAverage: 90 })
      expect(above.vm.tradingAnalysis[0].text)
        .toBe(t(above, 'stockCard.analysisTrendBullishMA'))

      const below = mountCard({ price_usd: 50, fiftyDayAverage: 100, twoHundredDayAverage: 90 })
      expect(below.vm.tradingAnalysis[0].text)
        .toBe(t(below, 'stockCard.analysisTrendBearishMA'))
    })
  })

  describe('trend badge', () => {
    it('applies the ±0.5 thresholds strictly', () => {
      expect(mountCard({ change_percent: 0.6 }).find('.trend-badge').classes()).toContain('tag-green')
      expect(mountCard({ change_percent: -0.6 }).find('.trend-badge').classes()).toContain('tag-red')
      // Boundary is strict: exactly 0.5 is neutral, not bullish.
      expect(mountCard({ change_percent: 0.5 }).find('.trend-badge').classes()).toContain('tag-gray')
    })

    it('falls back to regularMarketChangePercent when change_percent is absent', () => {
      const wrapper = mountCard({ change_percent: undefined, regularMarketChangePercent: 0.8 })
      expect(wrapper.find('.trend-badge').classes()).toContain('tag-green')
    })
  })

  describe('volume spike', () => {
    const spike = (over) => mountCard({ volume: 1600, averageDailyVolume3Month: 1000, ...over })

    it('requires MORE than 1.5x average volume (boundary is strict)', () => {
      const wrapper = mountCard({ volume: 1500, averageDailyVolume3Month: 1000, change_percent: 1.2 })
      const texts = wrapper.vm.tradingAnalysis.map(p => p.text)
      expect(texts).not.toContain(
        t(wrapper, 'stockCard.analysisVolumeSpike', { direction: t(wrapper, 'stockCard.buyingPressure') })
      )
    })

    it('reads a spike as buying pressure when up, selling pressure when down', () => {
      const up = spike({ change_percent: 1.2 })
      expect(up.vm.tradingAnalysis.at(-1)).toMatchObject({
        text: t(up, 'stockCard.analysisVolumeSpike', { direction: t(up, 'stockCard.buyingPressure') }),
        type: 'bullish'
      })

      const down = spike({ change_percent: -1.2 })
      expect(down.vm.tradingAnalysis.at(-1)).toMatchObject({
        text: t(down, 'stockCard.analysisVolumeSpike', { direction: t(down, 'stockCard.sellingPressure') }),
        type: 'bearish'
      })
    })

    it('makes NO directional claim on a flat or unknown change', () => {
      // REGRESSION: `change > 0 ? buying : selling` reported SELLING pressure on a
      // 0% day (and whenever change data was missing, since it defaults to 0).
      const flat = spike({ change_percent: 0 })
      expect(flat.vm.tradingAnalysis.at(-1)).toMatchObject({
        text: t(flat, 'stockCard.analysisVolumeSpikeNeutral'),
        type: 'neutral'
      })

      const unknown = spike({ change_percent: undefined })
      expect(unknown.vm.tradingAnalysis.at(-1).type).toBe('neutral')
    })
  })

  describe('domId', () => {
    it('matches NavigationService.sanitizeSymbol exactly (cross-file contract)', () => {
      // StockCard re-implements the sanitiser. Drift silently breaks scrollToSymbol,
      // j/k navigation and deep-link focus — and NavigationService's own suite
      // cannot catch it.
      const symbol = 'BRK.B'
      const wrapper = mountCard({ symbol })
      expect(wrapper.attributes('id')).toBe(`sym-${navigationService.sanitizeSymbol(symbol)}`)
    })
  })

  describe('child wiring', () => {
    it('propagates the resolved exchange to both children', () => {
      const wrapper = mountCard({ symbol: 'NVDA' }, { metadata: { exchange: 'NMS', confidence: 0.9 } })
      const expected = wrapper.vm.getExchange() // 'NMS' maps to NASDAQ
      expect(expected).toBe('NASDAQ')
      expect(wrapper.findComponent({ name: 'TechnicalIndicators' }).props('exchange')).toBe(expected)
      expect(wrapper.findAllComponents({ name: 'FastTradingViewWidget' })[0].props('exchange')).toBe(expected)
    })
  })
})
