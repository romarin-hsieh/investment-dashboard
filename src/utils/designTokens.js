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
