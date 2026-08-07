#!/usr/bin/env node
/**
 * audit-screenshots.mjs — deterministic route screenshots for UI audits.
 *
 * Captures every gated route (the same 7 as e2e/a11y.spec.ts) in both themes
 * against the E2E preview server, so layout changes can be compared
 * before/after a fix PR. External embeds (TradingView etc.) are blocked to keep
 * captures deterministic and to avoid the renderer hangs those iframes cause —
 * the captures show OUR chrome, not vendor content.
 *
 * Usage:
 *   npm run build:e2e && npm run preview   # serve http://localhost:4173
 *   node scripts/audit-screenshots.mjs --out docs/audits/2026-08-07-screenshots/before
 *
 * Options:
 *   --out <dir>      output directory (required)
 *   --base <url>     server origin (default http://localhost:4173)
 *   --routes <csv>   override the default route list
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}

const OUT = arg('out')
if (!OUT) {
  console.error('Missing --out <dir>')
  process.exit(1)
}
const BASE = arg('base', 'http://localhost:4173')
const ROUTES = arg(
  'routes',
  [
    '/#/market-overview',
    '/#/stock-overview',
    '/#/stock-overview/symbols/AAPL',
    '/#/settings',
    '/#/technical-manager',
    '/#/auto-update-monitor',
    '/#/system-manager',
  ].join(',')
).split(',')
const THEMES = ['light', 'dark']

const slug = (route) => route.replace('/#/', '').replaceAll('/', '_') || 'root'

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
try {
  for (const theme of THEMES) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    // Block third-party hosts (TradingView iframes hang the renderer and shift
    // pixels run-to-run) but allow the data-repo Pages origin — production
    // builds read all data from VITE_DATA_BASE_URL (.env.production), so
    // blocking it would capture every route in its error state.
    const ALLOW = new Set(['localhost', '127.0.0.1', 'romarin-hsieh.github.io'])
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (!ALLOW.has(url.hostname)) return route.abort()
      return route.continue()
    })
    await context.addInitScript((t) => localStorage.setItem('theme', t), theme)
    const page = await context.newPage()

    for (const route of ROUTES) {
      const name = `${slug(route)}--${theme}.jpg`
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
      await page.locator('h1, h2, h3').first().waitFor({ state: 'visible', timeout: 15_000 })
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
      await page.waitForTimeout(1_000) // let charts/skeletons settle
      await page.screenshot({ path: join(OUT, name), type: 'jpeg', quality: 80 })
      console.log(`captured ${name}`)
    }
    await context.close()
  }
} finally {
  await browser.close()
}
console.log(`done → ${OUT}`)
