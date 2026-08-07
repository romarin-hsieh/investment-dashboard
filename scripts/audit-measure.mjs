#!/usr/bin/env node
/**
 * audit-measure.mjs — runtime ground-truth for UI-consistency audits.
 *
 * Visits the gated routes on the E2E preview server and records, per route:
 *   - every visible <button>/.btn-like control: rendered box height, computed
 *     font-size/family, padding, border, radius, background, and its class list
 *   - the first h1/h2/h3 (page title): computed font-size/weight and tag
 *   - card-like surfaces: computed radius, shadow, padding
 * Writes a single JSON report. Used to verify (or refute) style-audit claims
 * against what the browser actually renders, rather than source reasoning.
 *
 * Usage: node scripts/audit-measure.mjs [--base http://localhost:4173] [--out file.json]
 */
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}
const BASE = arg('base', 'http://localhost:4173')
const OUT = arg('out', 'audit-measurements.json')

const ROUTES = [
  '/#/market-overview',
  '/#/stock-overview',
  '/#/stock-overview/symbols/AAPL',
  '/#/settings',
  '/#/technical-manager',
  '/#/auto-update-monitor',
  '/#/system-manager',
]

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const ALLOW = new Set(['localhost', '127.0.0.1', 'romarin-hsieh.github.io'])
await context.route('**/*', (route) => {
  const url = new URL(route.request().url())
  return ALLOW.has(url.hostname) ? route.continue() : route.abort()
})
const page = await context.newPage()

const report = {}
for (const route of ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
  await page.locator('h1, h2, h3').first().waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
  await page.waitForTimeout(800)

  report[route] = await page.evaluate(() => {
    const cs = (el) => getComputedStyle(el)
    const pick = (el) => {
      const c = cs(el)
      return {
        classes: el.className && typeof el.className === 'string' ? el.className : '',
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24),
        heightPx: +el.getBoundingClientRect().height.toFixed(1),
        fontSize: c.fontSize,
        fontFamily: c.fontFamily.split(',')[0].replaceAll('"', '').trim(),
        fontWeight: c.fontWeight,
        lineHeight: c.lineHeight,
        padding: `${c.paddingTop} ${c.paddingRight} ${c.paddingBottom} ${c.paddingLeft}`,
        border: c.borderTopWidth === '0px' ? 'none' : `${c.borderTopWidth} ${c.borderTopStyle}`,
        radius: c.borderTopLeftRadius,
        background: c.backgroundColor,
      }
    }
    const visible = (el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }

    const buttons = [...document.querySelectorAll('button, a.btn, [class*="btn-"], [class*="control-btn"]')]
      .filter((el) => visible(el) && el.tagName !== 'A' ? true : visible(el))
      .filter((el, i, arr) => arr.indexOf(el) === i)
      .map(pick)

    const title = document.querySelector('main h1, main h2, main h3, h2, h3')
    const cardSelectors = [
      '.widget-container', '.widget-container-ticker', '.overview-card', '.detail-card',
      '.status-card', '.status-section', '.control-section', '.card', '.stock-header',
    ]
    const cards = {}
    for (const sel of cardSelectors) {
      const el = document.querySelector(sel)
      if (el && visible(el)) {
        const c = cs(el)
        cards[sel] = {
          radius: c.borderTopLeftRadius,
          shadow: c.boxShadow === 'none' ? 'none' : c.boxShadow.slice(0, 60),
          padding: `${c.paddingTop} ${c.paddingRight} ${c.paddingBottom} ${c.paddingLeft}`,
        }
      }
    }
    const container = document.querySelector('.main-content .container, .container')
    return {
      pageTitle: title ? pick(title) : null,
      containerWidth: container ? +container.getBoundingClientRect().width.toFixed(0) : null,
      bodyFontFamily: cs(document.body).fontFamily.split(',')[0].replaceAll('"', '').trim(),
      buttons,
      cards,
    }
  })
  console.log(`measured ${route}: ${report[route].buttons.length} buttons`)
}

await browser.close()
writeFileSync(OUT, JSON.stringify(report, null, 2))
console.log(`written → ${OUT}`)
