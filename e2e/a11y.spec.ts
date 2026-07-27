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
// Per-route baselines. The set may only SHRINK (never add an id to silence a new
// violation — fix the violation instead). Every gated route below enforces
// color-contrast (and label/select-name) with an EMPTY baseline:
//  - stock-overview: semantic up/down price colors used as text repointed to the
//    AA-as-text variants (--success-strong / --danger-strong, §2.1); --text-muted
//    darkened for the 2nd surface.
//  - market-overview: the ZeiiermanFearGreedGauge's bespoke zone palette gained
//    AA-as-text variants (--c-*-text) for labels/sentiment; history circles use
//    dark numerals on the vivid fills; label ranges dropped their alpha-blend.
//  - settings: clean as-is.
//  - technical-manager / auto-update-monitor / system-manager: page-scoped
//    Bootstrap-ish action buttons (white/grey on #007bff/#28a745/#ffc107/#17a2b8
//    /#6b7f82) repointed to darker in-palette tokens or dark --signal-ink on the
//    light fills; dark-panel log timestamps lightened; unlabeled number inputs
//    given for/id label associations.
//  - stock-detail (symbols/:symbol): the MFI Volume Profile panel's status/signal
//    text (raw #9ca3af/#f59e0b/#10b981 hexes) repointed to the AA-as-text tokens,
//    its decorative dividers marked aria-hidden, its range <select> given an
//    aria-label; the breadcrumb link moved from the --primary-color FILL token to
//    the --primary-text link token.
const BASELINE_BY_ROUTE: Record<string, Set<string>> = {
  '/#/market-overview': new Set<string>(),
  '/#/stock-overview': new Set<string>(),
  '/#/stock-overview/symbols/AAPL': new Set<string>(),
  '/#/settings': new Set<string>(),
  '/#/technical-manager': new Set<string>(),
  '/#/auto-update-monitor': new Set<string>(),
  '/#/system-manager': new Set<string>(),
}

const ROUTES = Object.keys(BASELINE_BY_ROUTE)

// Scan every route in BOTH themes. The app renders in light by default, so a
// light-only gate never sees dark-theme-only failures — theme-FIXED colors
// (--*-solid, --blue-700, raw hexes) that pass on the light card but fall below
// AA on the dark card (#2C2C2C / #242424). useTheme() reads localStorage.theme on
// mount and toggles .dark-mode on <html>; seeding it before boot renders the
// whole page in the target theme. Baselines are shared per route (all empty).
const THEMES = ['light', 'dark'] as const

for (const theme of THEMES) {
  for (const route of ROUTES) {
    test(`a11y [${theme}]: ${route} has no non-baseline violations`, async ({ page }) => {
      const baseline = BASELINE_BY_ROUTE[route] ?? new Set<string>()
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme)
      await page.goto(route)
      // Scan the settled page, not a mid-load frame: wait for a heading, then for
      // the network to go idle (best-effort — analytics can keep it busy, so a
      // timeout is fine). Deterministic scanning keeps the gate from flaking.
      await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 15_000 })
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
      // Confirm the theme actually applied, so a silent useTheme regression can't
      // turn the dark pass into a second (green) light scan.
      if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark-mode/)
      else await expect(page.locator('html')).not.toHaveClass(/dark-mode/)

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Third-party embeds render their own (un-fixable) markup into the page —
        // e.g. TradingView's legend buttons have no discernible text. Audit our
        // app, not vendor widgets. See ADR-0015.
        .exclude('.tv-mount-point')
        .exclude('.tradingview-widget-container')
        .exclude('iframe')
        .analyze()

      const unexpected = results.violations.filter((v) => !baseline.has(v.id))
      const report = unexpected
        .map((v) => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
        .join('\n')

      expect(unexpected, `Unexpected a11y violations on ${route} [${theme}]:\n${report}`).toEqual([])
    })
  }
}
