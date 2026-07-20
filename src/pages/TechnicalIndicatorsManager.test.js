/**
 * TechnicalIndicatorsManager — "Clear All Caches" actually clears (audit I2).
 *
 * Before: the two real clear calls were commented out and the success alert
 * fired unconditionally, so the user was told the purge succeeded while nothing
 * was cleared. This test locks that the real clears run before success.
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/api/hybridTechnicalIndicatorsApi.js', () => ({
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
  vi.spyOn(window, 'alert').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('TechnicalIndicatorsManager — Clear All Caches (I2)', () => {
  it('runs the real cache clears before reporting success', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(TechnicalIndicatorsManager)
    await flushPromises()

    await wrapper.vm.clearAllCaches()

    expect(technicalIndicatorsCache.clearAllCache).toHaveBeenCalledTimes(1)
    expect(precomputedIndicatorsAPI.clearCache).toHaveBeenCalledTimes(1)
    // Success is only reported after the clears ran.
    expect(window.alert).toHaveBeenCalled()
  })

  it('does nothing when the confirm is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(TechnicalIndicatorsManager)
    await flushPromises()

    await wrapper.vm.clearAllCaches()

    expect(technicalIndicatorsCache.clearAllCache).not.toHaveBeenCalled()
    expect(precomputedIndicatorsAPI.clearCache).not.toHaveBeenCalled()
    expect(window.alert).not.toHaveBeenCalled()
  })
})
