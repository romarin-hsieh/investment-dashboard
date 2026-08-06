#!/usr/bin/env node
/**
 * audit-copy-check.mjs — runtime terminology verification.
 *
 * Renders every gated route in zh-TW against the preview server and scans the visible
 * DOM text for GLOSSARY §D2 banned-register vocabulary. Complements the JSON-level guard
 * (src/bdd/terminology.feature.test.ts): the DOM scan also catches banned terms arriving
 * from hardcoded strings or data payloads, which no locale-file check can see.
 *
 * Usage: npm run preview (serve :4173), then node scripts/audit-copy-check.mjs
 * Exits 1 if any banned term is visible on any route.
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:4173'
const ROUTES = [
  '/#/market-overview',
  '/#/stock-overview',
  '/#/stock-overview/symbols/AAPL',
  '/#/settings',
  '/#/technical-manager',
  '/#/auto-update-monitor',
  '/#/system-manager',
]
// GLOSSARY §D2. 配置 is only banned in the configuration sense — the DOM scan cannot
// disambiguate, so it flags 配置 for human review instead of failing on it.
const BANNED = ['緩存', '元數據', '調度器', '運行', '刷新', '本地儲存']
const REVIEW = ['配置', '數據', '保存']

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const ALLOW = new Set(['localhost', '127.0.0.1', 'romarin-hsieh.github.io'])
await context.route('**/*', (route) => {
  const url = new URL(route.request().url())
  return ALLOW.has(url.hostname) ? route.continue() : route.abort()
})
await context.addInitScript(() => localStorage.setItem('locale', 'zh-TW'))
const page = await context.newPage()

let failures = 0
for (const route of ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
  await page.locator('h1, h2, h3').first().waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
  await page.waitForTimeout(800)
  const text = await page.evaluate(() => document.body.innerText)

  const hits = BANNED.filter((t) => text.includes(t))
  const review = REVIEW.filter((t) => text.includes(t))
  if (hits.length) {
    failures++
    console.error(`✗ ${route}: banned terms visible: ${hits.join(', ')}`)
    for (const term of hits) {
      const i = text.indexOf(term)
      console.error(`    …${text.slice(Math.max(0, i - 20), i + 20).replaceAll('\n', ' ')}…`)
    }
  } else {
    console.log(`✓ ${route}: clean${review.length ? ` (review-only: ${review.join(', ')})` : ''}`)
  }
}
await browser.close()
process.exit(failures ? 1 : 0)
