// Locale-aware date/time formatting (audit S1).
//
// 39 call sites used `toLocaleDateString` / `toLocaleTimeString` /
// `toLocaleString` with either the browser default locale or a hardcoded one
// (e.g. StockOverview's `'en-US'`), so on the 繁中 UI dates rendered in English
// while other surfaces rendered in Chinese. These helpers format against the
// ACTIVE vue-i18n locale instead, so date display follows the language toggle.
//
// Reactivity: the helpers read i18n.global.locale on each call. Components that
// use them re-render when the locale changes (vue-i18n drives that via $t), so
// dates re-format on toggle without any extra wiring.
import { i18n } from '@/i18n'

export type DateInput = Date | string | number | null | undefined

/** The active UI locale as a BCP-47 tag (vue-i18n uses 'en' / 'zh-TW'), safe for Intl. */
export function activeLocale(): string {
  const loc = i18n.global.locale
  const raw = typeof loc === 'string' ? loc : (loc?.value ?? 'en')
  return raw || 'en'
}

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Locale-aware date, default medium ("Jul 20, 2026" / "2026年7月20日"). */
export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
  fallback = '-'
): string {
  const d = toDate(value)
  return d ? new Intl.DateTimeFormat(activeLocale(), options).format(d) : fallback
}

/** Locale-aware time, default hours:minutes ("08:32 PM" / "下午8:32"). */
export function formatTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
  fallback = '-'
): string {
  const d = toDate(value)
  return d ? new Intl.DateTimeFormat(activeLocale(), options).format(d) : fallback
}

/** Locale-aware date + time. */
export function formatDateTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  fallback = '-'
): string {
  const d = toDate(value)
  return d ? new Intl.DateTimeFormat(activeLocale(), options).format(d) : fallback
}
