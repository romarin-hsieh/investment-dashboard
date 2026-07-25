import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Full-page accessibility gate (ADR-0015) — the browser layer.
 *
 * Unlike the jsdom layer (src/a11y/*.a11y.test.js), this renders real layout, so
 * axe evaluates color-contrast and full-page landmark/structure rules.
 *
 * These two primary routes are currently axe-CLEAN across wcag2a/2aa/21a/21aa
 * (color-contrast included) — so the baseline is EMPTY and the gate asserts
 * zero violations. The set exists as a documented escape hatch (mirroring the
 * ADR-0013 coverage floors): to intentionally defer a specific known issue, add
 * its rule id here WITH a tracking note. The set may only shrink — never add an
 * id to silence a newly-introduced violation; fix the violation instead.
 */
const BASELINE_RULE_IDS = new Set<string>([])

const ROUTES = ['/#/market-overview', '/#/stock-overview']

for (const route of ROUTES) {
  test(`a11y: ${route} has no non-baseline violations`, async ({ page }) => {
    await page.goto(route)
    // Wait for real content before scanning (a heading — #app is not unique).
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 15_000 })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const unexpected = results.violations.filter((v) => !BASELINE_RULE_IDS.has(v.id))
    const report = unexpected
      .map((v) => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
      .join('\n')

    expect(unexpected, `Unexpected a11y violations on ${route}:\n${report}`).toEqual([])
  })
}
