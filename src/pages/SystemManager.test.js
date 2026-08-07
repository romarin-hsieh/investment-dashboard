/**
 * SystemManager — Clear Cache actually clears + error is surfaced (audit I3),
 * behind a two-step inline confirm (audit I5).
 *
 * I3: clearCache() was once `if (confirm) window.location.reload(true)` — a
 * mislabeled reload that purged no cache; and `error` was assigned on a failed
 * status check but never rendered. These tests lock the real clears and the
 * error banner.
 *
 * I5: the native confirm() was replaced by arm-then-act. The first click only
 * arms and logs the warning; the second clears and reloads. Nothing here stubs
 * window.confirm any more.
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

describe('SystemManager — Clear Cache (I3 + I5)', () => {
  it('actually clears the data caches on the confirming click', async () => {
    const wrapper = mount(SystemManager)
    await flushPromises()

    wrapper.vm.clearCache()   // arms
    wrapper.vm.clearCache()   // confirms

    expect(technicalIndicatorsCache.clearAllCache).toHaveBeenCalledTimes(1)
    expect(precomputedIndicatorsAPI.clearCache).toHaveBeenCalledTimes(1)
    expect(window.location.reload).toHaveBeenCalled()
    expect(wrapper.vm.clearArmed).toBe(false)
  })

  it('the first click only arms — it clears nothing and does not reload', async () => {
    const wrapper = mount(SystemManager)
    await flushPromises()

    wrapper.vm.clearCache()

    expect(technicalIndicatorsCache.clearAllCache).not.toHaveBeenCalled()
    expect(window.location.reload).not.toHaveBeenCalled()
    expect(wrapper.vm.clearArmed).toBe(true)
    // The pending destructive action is announced in the log, not a dialog.
    expect(wrapper.vm.systemLogs[0]).toMatchObject({
      level: 'warning',
      message: wrapper.vm.$t('systemManager.clearCacheConfirm')
    })
  })

  it('disarms after 5 s so a stale arm cannot be confirmed later', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SystemManager)
      await flushPromises()

      wrapper.vm.clearCache()
      expect(wrapper.vm.clearArmed).toBe(true)

      vi.advanceTimersByTime(5000)
      expect(wrapper.vm.clearArmed).toBe(false)

      wrapper.vm.clearCache()   // re-arms rather than clearing
      expect(technicalIndicatorsCache.clearAllCache).not.toHaveBeenCalled()
      expect(window.location.reload).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
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
