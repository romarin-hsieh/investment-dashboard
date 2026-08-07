/**
 * TechnicalIndicatorsManager — "Clear All Caches" actually clears (audit I2),
 * behind a two-step inline confirm (audit I5).
 *
 * I2: the two real clear calls were once commented out while the success alert
 * fired unconditionally, so the user was told the purge succeeded while nothing
 * was cleared. These tests lock that the real clears run before success.
 *
 * I5: the native confirm()/alert() pair was replaced by the same arm-then-act
 * grammar Settings uses — the first click only arms (and says so), the second
 * does the work. Outcomes are reported in an inline status line, not a modal
 * dialog, so nothing here stubs window.confirm/window.alert any more.
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/api/hybridTechnicalIndicatorsApi', () => ({
  default: { getDataSourceStatus: vi.fn().mockResolvedValue({}), getTechnicalIndicators: vi.fn() }
}))
vi.mock('@/utils/technicalIndicatorsCache', () => ({
  technicalIndicatorsCache: { clearAllCache: vi.fn() }
}))
vi.mock('@/api/precomputedIndicatorsApi', () => ({
  precomputedIndicatorsAPI: { clearCache: vi.fn() }
}))

import TechnicalIndicatorsManager from './TechnicalIndicatorsManager.vue'
import { technicalIndicatorsCache } from '@/utils/technicalIndicatorsCache'
import { precomputedIndicatorsAPI } from '@/api/precomputedIndicatorsApi'

beforeEach(() => {
  vi.clearAllMocks()   // module-mock call counts don't reset on their own
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('TechnicalIndicatorsManager — Clear All Caches (I2 + I5)', () => {
  it('runs the real cache clears before reporting success, on the confirming click', async () => {
    const wrapper = mount(TechnicalIndicatorsManager)
    await flushPromises()

    await wrapper.vm.clearAllCaches()   // arms
    await wrapper.vm.clearAllCaches()   // confirms

    expect(technicalIndicatorsCache.clearAllCache).toHaveBeenCalledTimes(1)
    expect(precomputedIndicatorsAPI.clearCache).toHaveBeenCalledTimes(1)
    // Success is only reported after the clears ran, and inline rather than in a dialog.
    expect(wrapper.vm.actionStatus).toEqual({
      kind: 'ok',
      message: wrapper.vm.$t('techIndicators.cachesCleared')
    })
    expect(wrapper.vm.clearArmed).toBe(false)   // disarmed again after acting
  })

  it('the first click only arms — it clears nothing', async () => {
    const wrapper = mount(TechnicalIndicatorsManager)
    await flushPromises()

    await wrapper.vm.clearAllCaches()

    expect(technicalIndicatorsCache.clearAllCache).not.toHaveBeenCalled()
    expect(precomputedIndicatorsAPI.clearCache).not.toHaveBeenCalled()
    expect(wrapper.vm.clearArmed).toBe(true)
    // The user is told what the next click will do.
    expect(wrapper.vm.actionStatus).toEqual({
      kind: 'ok',
      message: wrapper.vm.$t('techIndicators.confirmClear')
    })
  })

  it('disarms after 5 s so a stale arm cannot be confirmed by an unrelated click', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(TechnicalIndicatorsManager)
      await flushPromises()

      await wrapper.vm.clearAllCaches()
      expect(wrapper.vm.clearArmed).toBe(true)

      vi.advanceTimersByTime(5000)
      expect(wrapper.vm.clearArmed).toBe(false)

      // A click after the window re-arms instead of clearing.
      await wrapper.vm.clearAllCaches()
      expect(technicalIndicatorsCache.clearAllCache).not.toHaveBeenCalled()
      expect(wrapper.vm.clearArmed).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
