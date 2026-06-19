import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import i18n from './i18n.js'

/**
 * Guards the CSP fix (ADR-0009): locale messages must be PRECOMPILED at build,
 * so vue-i18n never calls `new Function` at runtime (the app's CSP forbids
 * 'unsafe-eval'). This test runs through the same @intlify/unplugin-vue-i18n
 * transform as the app build (dropMessageCompiler: true) — if a message were
 * left to compile at runtime, rendering would throw or return the raw key.
 */
describe('i18n precompiled-message rendering (CSP-safe path)', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('renders a plain key to its translated value, not the key', () => {
    const Comp = defineComponent({ render() { return h('div', this.$t('nav.marketOverview')) } })
    const wrapper = mount(Comp, { global: { plugins: [i18n] } })
    expect(wrapper.text()).toBe('Market Overview')
  })

  it('interpolates {n} from a precompiled message (no runtime compiler)', () => {
    expect(i18n.global.t('autoUpdate.ageHours', { n: 5 })).toBe('5 hours')
  })

  it('switches locale and re-resolves from precompiled zh-TW messages', () => {
    i18n.global.locale.value = 'zh-TW'
    expect(i18n.global.t('nav.marketOverview')).toBe('市場總覽')
  })

  // ⑥-5: the two components missed by the bulk migration (found via live preview)
  it('resolves the coverage-gap keys (SectorRotationChart + LazyTradingViewWidget) in both locales', () => {
    i18n.global.locale.value = 'en'
    expect(i18n.global.t('sectorRotation.title')).toBe('Smart Money Sector Allocation')
    expect(i18n.global.t('sectorRotation.superinvestors', { n: 3 })).toBe('3 Superinvestors')
    expect(i18n.global.t('lazyWidget.failedToLoad')).toBe('Failed to load')
    i18n.global.locale.value = 'zh-TW'
    expect(i18n.global.t('sectorRotation.superinvestors', { n: 3 })).toBe('3 位頂尖投資人')
    expect(i18n.global.t('lazyWidget.retry')).toBe('重試')
  })
})
