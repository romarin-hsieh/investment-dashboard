/**
 * AutoUpdateMonitor — reports REAL metadata + a REAL success rate (audit I1).
 *
 * Before: loadMetadataStatus hardcoded now()/age 0/24 symbols, so the metadata
 * card was permanently "Fresh"; and the TI success rate read data.totalSymbols/
 * successfulSymbols — fields latest_index.json never emits — so it was a
 * permanent 0%. These tests drive both loaders against real-shaped payloads.
 */
import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/utils/autoUpdateScheduler', () => ({
  autoUpdateScheduler: {
    getStatus: () => ({ isRunning: false, activeIntervals: [], nextUpdates: {} }),
    start: vi.fn(), stop: vi.fn(), triggerManualUpdate: vi.fn()
  }
}))
vi.mock('@/utils/performanceCache', () => ({
  performanceCache: { getStats: () => ({ memoryCache: 0, localStorage: 0, totalSize: 0 }), clear: vi.fn() }
}))
vi.mock('@/utils/cacheWarmupService.js', () => ({
  cacheWarmupService: {
    getWarmupStatus: () => ({ isWarming: false, progress: 0, trackedSymbols: [], lastWarmupTime: null }),
    triggerManualWarmup: vi.fn()
  }
}))

import AutoUpdateMonitor from './AutoUpdateMonitor.vue'

const INDEX = { generatedAt: '2026-06-19T12:26:54.051Z', symbols: Array.from({ length: 138 }, (_, i) => `S${i}`), totalFiles: 130 }
const META = { as_of: '2026-06-19T12:28:23.508Z', items: Array.from({ length: 138 }, (_, i) => ({ symbol: `S${i}` })), refresh_metadata: { symbols_updated: 138 } }

function mockFetchByUrl () {
  global.fetch = vi.fn((url) => {
    const body = String(url).includes('symbols_metadata') ? META : INDEX
    return Promise.resolve({ ok: true, json: async () => body })
  })
}

beforeEach(() => {
  vi.useFakeTimers()          // hold the 30s startPeriodicRefresh interval
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockFetchByUrl()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('AutoUpdateMonitor — honest status (I1)', () => {
  it('computes the TI success rate as coverage from real index fields', async () => {
    const wrapper = mount(AutoUpdateMonitor)
    await wrapper.vm.loadTechnicalIndicatorsStatus()
    // 130 files / 138 symbols = 94%, NOT a permanent 0.
    expect(wrapper.vm.technicalIndicatorsSuccessRate).toBe(94)
  })

  it('reads real metadata timestamp + count instead of now()/24', async () => {
    const wrapper = mount(AutoUpdateMonitor)
    await wrapper.vm.loadMetadataStatus()
    expect(wrapper.vm.metadataSymbolCount).toBe(138)                       // was hardcoded 24
    expect(wrapper.vm.metadataLastUpdate.toISOString()).toBe(new Date(META.as_of).toISOString())
    expect(wrapper.vm.metadataAge).toBeGreaterThan(0)                     // real age, not 0
  })

  it('reads metadata as stale (not Fresh) when the fetch fails', async () => {
    const wrapper = mount(AutoUpdateMonitor)
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    await wrapper.vm.loadMetadataStatus()
    expect(wrapper.vm.metadataLastUpdate).toBeNull()
    expect(wrapper.vm.metadataAge).toBeGreaterThan(24)                    // never "Fresh"
  })
})
