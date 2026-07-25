/**
 * Accessibility suite (WS-I PR5, ADR-0015) — jsdom layer.
 *
 * Runs axe-core against the *rendered* DOM of high-traffic components and fails
 * on any WCAG structural violation (missing labels/names, ARIA misuse, invalid
 * roles, list/heading structure, …). This is the fast layer that runs inside the
 * normal `npm test` / CI test job — no browser required.
 *
 * NOTE: color-contrast is intentionally NOT covered here — jsdom does not compute
 * layout/style, so axe cannot evaluate it. Contrast is checked in the Playwright
 * layer (e2e/a11y.spec.ts), which renders in a real browser. See ADR-0015.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { axe } from './axe-helper'

import NavigationPanel from '@/components/NavigationPanel.vue'
import StockCard from '@/components/StockCard.vue'

// StockCard's two heavy children pull network/cache/theme modules at load — stub
// them so the a11y check focuses on StockCard's own rendered markup.
vi.mock('@/components/FastTradingViewWidget.vue', () => ({
  default: { name: 'FastTradingViewWidget', props: ['widgetType', 'symbol', 'exchange', 'priority'], template: '<div />' }
}))
vi.mock('@/components/TechnicalIndicators.vue', () => ({
  default: { name: 'TechnicalIndicators', props: ['symbol', 'exchange'], template: '<div />' }
}))

function makeTocTree () {
  return [
    {
      id: 'sector-tech', type: 'sector', label: 'Technology',
      children: [
        {
          id: 'industry-semis', type: 'industry', label: 'Semiconductors',
          children: [
            { id: 'symbol-nvda', type: 'symbol', label: 'NVIDIA', symbol: 'NVDA', metadata: { sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ', marketCap: 0 } }
          ]
        }
      ]
    }
  ]
}

describe('a11y (jsdom) — NavigationPanel', () => {
  it('has no axe violations when rendered with a tree', async () => {
    const wrapper = mount(NavigationPanel, { props: { tocTree: makeTocTree() } })
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })
})

describe('a11y (jsdom) — StockCard', () => {
  it('has no axe violations for a normal quote', async () => {
    const wrapper = mount(StockCard, {
      props: {
        quote: { symbol: 'NVDA', stale_level: 'fresh', change_percent: 1.2, price_usd: 120, volume: 1000, averageDailyVolume3Month: 1000 },
        dailyData: {},
        symbol: 'NVDA',
        exchange: 'NASDAQ'
      },
      global: { mocks: { $router: { push: vi.fn().mockResolvedValue(undefined) } } }
    })
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })
})
