/**
 * Settings — the browser-local preferences page (PRD Q6 → option C, 2026-08-07).
 * Pins the honest-surface contract: real controls only, two-step clear (no native
 * confirm — audit I5), validated import, pure export payload.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Settings from './Settings.vue'

const t = (key) => key
const mountPage = () =>
  mount(Settings, { global: { mocks: { $t: t } } })

describe('Settings — preferences page', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the three real sections and no planned badges', () => {
    const wrapper = mountPage()
    const text = wrapper.text()
    expect(text).toContain('settings.privacy.title')
    expect(text).toContain('settings.importExport.title')
    expect(text).toContain('settings.clearData.title')
    expect(wrapper.find('.planned-badge').exists()).toBe(false)
  })

  it('builds an export payload carrying exactly the stored preferences', () => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('locale', 'zh-TW')
    const wrapper = mountPage()
    const payload = wrapper.vm.buildExportPayload()
    expect(payload.app).toBe('investment-dashboard-preferences')
    expect(payload.version).toBe(1)
    expect(payload.prefs).toEqual({ theme: 'dark', locale: 'zh-TW' })
  })

  it('rejects foreign or malformed import payloads without touching storage', () => {
    const wrapper = mountPage()
    expect(wrapper.vm.applyImportedPayload({ app: 'other', prefs: {} })).toBe(false)
    expect(wrapper.vm.applyImportedPayload(null)).toBe(false)
    expect(
      wrapper.vm.applyImportedPayload({
        app: 'investment-dashboard-preferences',
        prefs: { theme: 'neon' }
      })
    ).toBe(false)
    expect(localStorage.getItem('theme')).toBe(null)
  })

  it('applies a valid import payload', () => {
    const wrapper = mountPage()
    const ok = wrapper.vm.applyImportedPayload({
      app: 'investment-dashboard-preferences',
      version: 1,
      prefs: { theme: 'dark', locale: 'en' }
    })
    expect(ok).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(localStorage.getItem('locale')).toBe('en')
  })

  it('clear is two-step: first click arms, second click clears and reloads', async () => {
    localStorage.setItem('theme', 'dark')
    const wrapper = mountPage()
    const reload = vi.spyOn(wrapper.vm, 'reloadApp').mockImplementation(() => {})
    const clearBtn = wrapper.findAll('button').at(-1)

    await clearBtn.trigger('click')
    expect(wrapper.vm.clearArmed).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark') // nothing cleared yet
    expect(reload).not.toHaveBeenCalled()

    await clearBtn.trigger('click')
    expect(localStorage.getItem('theme')).toBe(null)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
