/**
 * dateFormat — the locale-aware date/time helpers (audit S1).
 *
 * The whole point is that output follows the ACTIVE vue-i18n locale, so we flip
 * the locale and assert the rendered string actually changes (en vs zh-TW),
 * plus the invalid-input fallback and the accepted input types.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { formatDate, formatTime, formatDateTime, activeLocale } from './dateFormat'
import { i18n as i18nInstance } from '@/i18n'

const setLocale = (l) => { i18nInstance.global.locale.value = l }
afterEach(() => setLocale('en'))

describe('dateFormat — locale-aware output', () => {
  const d = new Date('2026-07-20T13:05:00Z')

  it('formats against the active locale, so the string changes with the toggle', () => {
    setLocale('en')
    const en = formatDate(d)
    setLocale('zh-TW')
    const zh = formatDate(d)
    expect(en).not.toBe(zh)              // the locale genuinely drives the output
    expect(activeLocale()).toBe('zh-TW')
    expect(zh).toMatch(/2026/)           // still renders the year
  })

  it('formatTime and formatDateTime also follow the locale', () => {
    setLocale('en')
    const enT = formatTime(d)
    const enDT = formatDateTime(d)
    setLocale('zh-TW')
    expect(formatTime(d)).not.toBe(enT)
    expect(formatDateTime(d)).not.toBe(enDT)
  })

  it('returns the fallback for null / empty / unparseable input', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate('')).toBe('-')
    expect(formatDate('not a date')).toBe('-')
    expect(formatDate(undefined, undefined, 'n/a')).toBe('n/a')
  })

  it('accepts Date | ISO string | epoch number', () => {
    expect(formatDate('2026-07-20')).toMatch(/2026/)
    expect(formatDate(d.getTime())).toMatch(/2026/)
    expect(formatDate(d)).toMatch(/2026/)
  })
})
