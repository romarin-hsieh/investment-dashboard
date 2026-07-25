import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Full-page accessibility gate (ADR-0015) — the browser layer.
 *
 * Unlike the jsdom layer (src/a11y/*.a11y.test.js), this renders real layout, so
 * axe evaluates color-contrast and full-page landmark/structure rules.
 *
 * BASELINE-RATCHET (mirrors the ADR-0013 coverage floors): the gate fails on any
 * violation whose rule id is NOT in BASELINE_RULE_IDS. The set captures known,
 * pre-existing issues so the gate lands green; it may only SHRINK — never add an
 * id to silence a newly-introduced violation, fix the violation instead.
 */
const BASELINE_RULE_IDS = new Set<string>([
  // color-contrast — BASELINED (design decision, not a quick fix). ~93% of the
  // failing nodes are the semantic price colors on white: up-green #22ab94
  // (~2.5:1) and down-red #f7525f (~3.3:1). Meeting 4.5:1 AA means restyling the
  // brand's up/down language app-wide — deferred to a dedicated a11y pass. The
  // remainder is --text-muted on --bg-secondary (#6e6e6e/#ebe7e4 ≈ 4.15:1).
  // This PR did remove one contributor (dimmed nav-tree labels, TOCTree.vue).
  'color-contrast',
])

const ROUTES = ['/#/market-overview', '/#/stock-overview']

for (const route of ROUTES) {
  test(`a11y: ${route} has no non-baseline violations`, async ({ page }) => {
    await page.goto(route)
    // Scan the settled page, not a mid-load frame: wait for a heading, then for
    // the network to go idle (best-effort — analytics can keep it busy, so a
    // timeout is fine). Deterministic scanning keeps the gate from flaking.
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 15_000 })
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Third-party embeds render their own (un-fixable) markup into the page —
      // e.g. TradingView's legend buttons have no discernible text. Audit our
      // app, not vendor widgets. See ADR-0015.
      .exclude('.tv-mount-point')
      .exclude('.tradingview-widget-container')
      .exclude('iframe')
      .analyze()

    const unexpected = results.violations.filter((v) => !BASELINE_RULE_IDS.has(v.id))
    const report = unexpected
      .map((v) => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
      .join('\n')

    expect(unexpected, `Unexpected a11y violations on ${route}:\n${report}`).toEqual([])
  })
}
