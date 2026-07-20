/**
 * SystemManager — Clear Cache actually clears + error is surfaced (audit I3).
 *
 * Before: clearCache() = `if (confirm) window.location.reload(true)` — a
 * mislabeled reload that purged no cache; and `error` was assigned on a failed
 * status check but never rendered. These tests lock the real clears and the
 * error banner.
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/utils/technicalIndicatorsCache', () => ({
  technicalIndicatorsCache: { clearAllCache: vi.fn() }
}))
vi.mock('@/api/precomputedIndicatorsApi', () => ({
  precomputedIndicatorsAPI: { clearCache: vi.fn() }
}))

import SystemManager from './SystemManager.vue'
import { technicalIndicatorsCache } from '@/utils/technicalIndicatorsCache'
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi'

beforeEach(() => {
  vi.clearAllMocks()   // module-mock call counts don't reset on their own
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // mounted() calls refreshStatus() which fetches two files.
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [], symbols: [] }) })
  // jsdom's location.reload is non-configurable; replace location with a stub.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { reload: vi.fn(), href: 'http://localhost/' }
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('SystemManager — Clear Cache (I3)', () => {
  it('actually clears the data caches when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(SystemManager)
    await flushPromises()

    wrapper.vm.clearCache()

    expect(technicalIndicatorsCache.clearAllCache).toHaveBeenCalledTimes(1)
    expect(precomputedIndicatorsAPI.clearCache).toHaveBeenCalledTimes(1)
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('clears nothing when the confirm is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(SystemManager)
    await flushPromises()

    wrapper.vm.clearCache()

    expect(technicalIndicatorsCache.clearAllCache).not.toHaveBeenCalled()
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  it('renders the error banner (with retry) when error is set', async () => {
    const wrapper = mount(SystemManager)
    await flushPromises()
    expect(wrapper.find('.error-banner').exists()).toBe(false)

    wrapper.vm.error = 'network down'
    await wrapper.vm.$nextTick()

    const banner = wrapper.find('.error-banner')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('network down')
    expect(banner.find('button').exists()).toBe(true)
  })
})
