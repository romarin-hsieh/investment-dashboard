import { describe, it, expect, beforeEach, vi } from 'vitest'
import en from './locales/en.json'
import zhTW from './locales/zh-TW.json'
import { resolveInitialLocale, SUPPORTED_LOCALES } from './i18n.js'

function flatEntries(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    return v && typeof v === 'object' && !Array.isArray(v) ? flatEntries(v, key) : [[key, v]]
  })
}

describe('locale files', () => {
  const enKeys = flatEntries(en).map(([k]) => k).sort()
  const zhKeys = flatEntries(zhTW).map(([k]) => k).sort()

  it('en and zh-TW have identical key sets (no missing translations)', () => {
    expect(enKeys.filter((k) => !zhKeys.includes(k))).toEqual([]) // missing in zh-TW
    expect(zhKeys.filter((k) => !enKeys.includes(k))).toEqual([]) // missing in en
  })

  it('every leaf value is a non-empty string in both locales', () => {
    for (const [k, v] of flatEntries(en)) {
      expect(typeof v, `en.${k}`).toBe('string')
      expect(v.trim().length, `en.${k} empty`).toBeGreaterThan(0)
    }
    for (const [k, v] of flatEntries(zhTW)) {
      expect(typeof v, `zh-TW.${k}`).toBe('string')
      expect(v.trim().length, `zh-TW.${k} empty`).toBeGreaterThan(0)
    }
  })
})

describe('resolveInitialLocale', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('prefers a valid saved locale', () => {
    localStorage.setItem('locale', 'zh-TW')
    expect(resolveInitialLocale()).toBe('zh-TW')
  })

  it('ignores an unsupported saved locale and falls through to the browser', () => {
    localStorage.setItem('locale', 'fr')
    vi.stubGlobal('navigator', { language: 'en-US' })
    expect(resolveInitialLocale()).toBe('en')
  })

  it('maps any zh-* browser language to zh-TW when nothing is saved', () => {
    vi.stubGlobal('navigator', { language: 'zh-Hant-TW' })
    expect(resolveInitialLocale()).toBe('zh-TW')
  })

  it('defaults to en for non-zh browsers', () => {
    vi.stubGlobal('navigator', { language: 'de-DE' })
    expect(resolveInitialLocale()).toBe('en')
  })

  it('exports both supported locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'zh-TW'])
  })
})
