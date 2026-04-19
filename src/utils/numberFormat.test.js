import { describe, it, expect } from 'vitest'
import { formatNumber, formatPercent, formatLocaleNumber } from './numberFormat'

describe('formatNumber', () => {
  it('formats finite numbers to the requested precision', () => {
    expect(formatNumber(3.14159, 2)).toBe('3.14')
    expect(formatNumber(3.14159, 4)).toBe('3.1416')
    expect(formatNumber(0, 2)).toBe('0.00')
    expect(formatNumber(-1234.5, 1)).toBe('-1234.5')
  })

  it('returns "N/A" for NaN, Infinity, -Infinity', () => {
    expect(formatNumber(NaN, 2)).toBe('N/A')
    expect(formatNumber(Infinity, 2)).toBe('N/A')
    expect(formatNumber(-Infinity, 2)).toBe('N/A')
  })

  it('returns "N/A" for null and undefined', () => {
    expect(formatNumber(null, 2)).toBe('N/A')
    expect(formatNumber(undefined, 2)).toBe('N/A')
  })

  it('accepts a custom fallback string', () => {
    expect(formatNumber(NaN, 2, '-')).toBe('-')
    expect(formatNumber(null, 2, '')).toBe('')
  })

  it('returns null verbatim when fallback=null (for API shape preservation)', () => {
    // Downstream consumers in yahooFinanceApi.js rely on `value: null` to
    // mean "no data"; formatting "NaN" there would be worse than null.
    expect(formatNumber(NaN, 2, null)).toBeNull()
    expect(formatNumber(Infinity, 2, null)).toBeNull()
    expect(formatNumber(null, 2, null)).toBeNull()
    expect(formatNumber(undefined, 2, null)).toBeNull()
    // But a real finite number still formats as a string
    expect(formatNumber(3.14, 2, null)).toBe('3.14')
  })

  it('defaults to 2 decimal places when not specified', () => {
    expect(formatNumber(3.14159)).toBe('3.14')
  })

  it('rejects non-number inputs (strings, objects) with the fallback', () => {
    // Important: the whole point is that upstream code shouldn't accidentally
    // pass a string like "NaN" through and have it round-trip to "NaN".
    // @ts-expect-error — testing runtime guard
    expect(formatNumber('3.14', 2)).toBe('N/A')
    // @ts-expect-error
    expect(formatNumber({}, 2)).toBe('N/A')
  })
})

describe('formatPercent', () => {
  it('appends a % sign to finite values', () => {
    expect(formatPercent(3.14159, 2)).toBe('3.14%')
    expect(formatPercent(0, 0)).toBe('0%')
    expect(formatPercent(-1.5, 1)).toBe('-1.5%')
  })

  it('returns the fallback WITHOUT a % suffix for non-finite input', () => {
    // Regression guard: UI must never show "NaN%" or "Infinity%"
    expect(formatPercent(NaN)).toBe('N/A')
    expect(formatPercent(Infinity)).toBe('N/A')
    expect(formatPercent(null)).toBe('N/A')
    expect(formatPercent(undefined)).toBe('N/A')
  })
})

describe('formatLocaleNumber', () => {
  it('formats finite numbers with en-US grouping', () => {
    expect(formatLocaleNumber(1234567.89, 2)).toBe('1,234,567.89')
    expect(formatLocaleNumber(1000, 0)).toBe('1,000')
  })

  it('returns fallback for non-finite input', () => {
    expect(formatLocaleNumber(NaN)).toBe('N/A')
    expect(formatLocaleNumber(Infinity)).toBe('N/A')
    expect(formatLocaleNumber(null)).toBe('N/A')
  })
})
