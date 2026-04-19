/**
 * Safe number formatting helpers that never render "NaN" / "Infinity" to the UI.
 *
 * Context: the Apr 2026 audit found 117 call sites of `Number#toFixed()` across
 * src/. The native method returns the string "NaN" for `NaN` and "Infinity"
 * for non-finite input — both of which then render directly into the DOM and
 * read as data-integrity bugs to users. These helpers short-circuit non-finite
 * values to a displayable placeholder ("N/A" by default).
 *
 * Use these instead of `.toFixed()` / `.toLocaleString()` on any value that
 * comes from a calculation (division, log, sqrt, etc.) where upstream data
 * can be sparse or missing. For literal constants you typed into the code,
 * native `.toFixed()` is fine.
 *
 * Why TypeScript: forces callers to pass a numeric type (or handle undefined
 * explicitly). The existing `src/types/index.ts` and a few `.ts` files show
 * TS is wired up in the project; this util joins that set.
 */

/**
 * Format a number to a fixed number of decimal places, returning a fallback
 * string if the input is not a finite number.
 *
 * @example
 *   formatNumber(3.14159, 2)         // "3.14"
 *   formatNumber(NaN, 2)             // "N/A"
 *   formatNumber(Infinity, 2)        // "N/A"
 *   formatNumber(null, 2)            // "N/A"
 *   formatNumber(undefined, 2)       // "N/A"
 *   formatNumber(0, 2)               // "0.00"    (0 is finite)
 *   formatNumber('3.14' as any, 2)   // "N/A"    (strings are rejected)
 *
 * @param value — the value to format. Accepts number | null | undefined; rejects everything else.
 * @param decimals — number of decimal places. Clamped to [0, 20] like native toFixed.
 * @param fallback — returned when value is not a finite number. Defaults to "N/A".
 *   Pass `null` to preserve downstream "missing value" semantics — many API
 *   consumers in this codebase check `if (v === null)` to distinguish a true
 *   absence from a formatted-zero.
 */
export function formatNumber <F extends string | null = string> (
  value: number | null | undefined,
  decimals: number = 2,
  fallback: F = 'N/A' as F
): string | F {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return value.toFixed(decimals)
}

/**
 * Format a number as a percentage with a trailing `%`. Returns the fallback
 * unchanged (no `%` appended) when input is non-finite, so the UI never
 * renders "NaN%".
 *
 * @example
 *   formatPercent(3.14159, 2)   // "3.14%"
 *   formatPercent(NaN, 2)       // "N/A"     (no % suffix)
 */
export function formatPercent (
  value: number | null | undefined,
  decimals: number = 2,
  fallback: string = 'N/A'
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return value.toFixed(decimals) + '%'
}

/**
 * Format a number with locale grouping (e.g. "1,234,567.89"). Falls back to
 * the given placeholder on non-finite input. Uses 'en-US' by default to
 * match the rest of the codebase; we'll revisit once we i18n-ise.
 *
 * @example
 *   formatLocaleNumber(1234567.89, 2)   // "1,234,567.89"
 *   formatLocaleNumber(NaN)             // "N/A"
 */
export function formatLocaleNumber (
  value: number | null | undefined,
  decimals: number = 2,
  fallback: string = 'N/A',
  locale: string = 'en-US'
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}
