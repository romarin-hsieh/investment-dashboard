/**
 * Read CSS custom properties (design tokens) from JavaScript.
 *
 * Why this exists:
 *   Some component code needs colour values as raw hex strings to pass into
 *   external libraries (TradingView widgets, Plotly, Chart.js). Those libs
 *   can't read CSS variables themselves. This helper bridges the gap so we
 *   keep one source of truth — CSS variables in src/styles/tokens.css and
 *   src/style.css — and never hardcode hex in component scripts.
 *
 * Usage:
 *   import { getToken } from '@/utils/designTokens'
 *   const upColor = getToken('--chart-up')          // '#22ab94'
 *   const cardBg  = getToken('--bg-card')           // theme-adaptive
 *
 * Theme reactivity:
 *   When useTheme toggles the dark-mode class on <html>, CSS variables that
 *   have a .dark-mode override (semantic states, brand bg/text) return new
 *   values on the NEXT call to getToken(). Existing chart instances keep
 *   their old colours until re-rendered with a fresh config — that is by
 *   design (TradingView iframes do not hot-reload colours).
 *
 *   For instant theme reactivity, components should call getToken() inside
 *   the chart-config build function, then re-build the config when the
 *   theme changes. This module deliberately does NOT cache values; the
 *   getComputedStyle call is cheap enough at config-build cadence.
 */

const ROOT = typeof document !== 'undefined' ? document.documentElement : null

/**
 * Read a CSS custom property from :root. Returns the trimmed value as a
 * string, or an empty string if not defined / not in a browser context.
 *
 * @param {string} name — token name, including the leading '--' (e.g. '--chart-up')
 * @returns {string} hex colour or empty string
 */
export function getToken (name) {
  if (!ROOT) return ''
  return getComputedStyle(ROOT).getPropertyValue(name).trim()
}

/**
 * Read a hex colour token and return it as an `rgba()` string at the given
 * alpha. Charting libs that draw translucent fills (zone overlays, area
 * shading) need rgba, but our colour tokens are stored as solid hex — this
 * bridges the two without hardcoding the rgb triplet in component scripts.
 *
 * Falls back to returning the raw token value untouched when it is not a
 * #rgb / #rrggbb hex (e.g. already an rgb()/rgba() string, or empty).
 *
 * @param {string} name — token name including the leading '--'
 * @param {number} alpha — 0..1 opacity
 * @returns {string} e.g. 'rgba(8, 153, 129, 0.3)'
 */
export function getTokenRgba (name, alpha) {
  const value = getToken(name)
  const hex = value.replace('#', '')
  const full = hex.length === 3
    ? hex.split('').map((c) => c + c).join('')
    : hex
  if (full.length !== 6 || /[^0-9a-f]/i.test(full)) return value
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Convenience: read several tokens at once. Returns an object keyed by the
 * token name without the leading '--' (so '--chart-up' becomes `chartUp`).
 *
 * @param {string[]} names
 * @returns {Record<string, string>}
 */
export function getTokens (names) {
  const out = {}
  for (const name of names) {
    const key = name.replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    out[key] = getToken(name)
  }
  return out
}

/**
 * Returns true if the dark-mode class is currently active on <html>. Used by
 * components that still need the boolean for non-token decisions (e.g. picking
 * between two TradingView preset themes).
 *
 * @returns {boolean}
 */
export function isDarkMode () {
  if (!ROOT) return false
  return ROOT.classList.contains('dark-mode')
}
