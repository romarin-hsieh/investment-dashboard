import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Overlay/modal accessibility gate (ADR-0015) — companion to a11y.spec.ts.
 *
 * The full-page gate scans only the INITIAL settled DOM, so it is structurally
 * blind to content that mounts on a user action. Every "how this works" info
 * modal renders behind `v-if="showInfo"`, so its body — including the
 * `.modal-body h6` sub-headings — never enters that scan. Those headings were a
 * latent color-contrast landmine: `--primary-color` (#6B7F82) is a FILL token at
 * only 4.21:1 as text on the white modal card, below the AA 4.5:1 floor. PRs
 * #179/#181 repointed all three to the theme-aware `--primary-text` token; this
 * gate keeps them that way.
 *
 * Two things must be true for axe to actually SEE these modals:
 *  1. The test OPENS the modal — via each modal's real trigger, selected by
 *     accessible NAME so it survives markup churn.
 *  2. The overlay is `position: fixed` inside a host with `overflow: hidden`. axe
 *     clips text rects to overflow-hidden ancestors (ignoring that `fixed` escapes
 *     the clip visually) and would skip the ENTIRE modal, emitting zero
 *     color-contrast nodes — a false green. Each modal is therefore wrapped in
 *     `<Teleport to="body">` so it lives outside that clip. The `scanned > 0`
 *     assertion below fails loudly if that Teleport is ever dropped.
 *
 * Scanned in BOTH themes. The dark theme can't distinguish THIS regression
 * (`--primary-text` and `--primary-color` are both #8A9A9C in dark), but is kept
 * so any OTHER dark-only modal contrast regression is still caught.
 *
 * The cases are the COMPLETE set of `.modal-body h6`-bearing modals:
 *   - TechnicalSignals      → stock-detail; StockDetail owns the trigger and drives
 *                             the child via `$refs.technicalSignals.openModal()`.
 *   - MFIVolumeProfilePanel → stock-detail; its own inline info button.
 *   - TechnicalIndicators   → stock-overview. StockDetail renders it with
 *                             `:showTitle="false"` (trigger hidden), so its guide
 *                             modal is only reachable from the StockCard grid.
 */

type ModalCase = { route: string; routeLabel: string; owner: string; trigger: string }

const MODAL_CASES: ModalCase[] = [
  {
    route: '/#/stock-overview/symbols/AAPL',
    routeLabel: 'stock-detail',
    owner: 'TechnicalSignals',
    trigger: 'Open the signal calculation reference',
  },
  {
    route: '/#/stock-overview/symbols/AAPL',
    routeLabel: 'stock-detail',
    owner: 'MFIVolumeProfilePanel',
    trigger: 'View how the MFI Volume Profile analysis works',
  },
  {
    route: '/#/stock-overview',
    routeLabel: 'stock-overview',
    owner: 'TechnicalIndicators',
    trigger: 'Open the indicator guide',
  },
]

const THEMES = ['light', 'dark'] as const

// Scan ONLY the opened overlay. The underlying routes are already covered green by
// the full-page gate (a11y.spec.ts); scoping here keeps the "axe saw the modal"
// guard below unambiguous and the scan fast.
function scanModal(page: Page) {
  return new AxeBuilder({ page })
    .include('.modal-overlay')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
}

// Total color-contrast nodes axe actually evaluated in the modal (pass OR fail OR
// needs-review). Zero means axe never saw the modal — see the Teleport note above.
const ccNodeCount = (results: Awaited<ReturnType<typeof scanModal>>) =>
  (['passes', 'violations', 'incomplete'] as const)
    .flatMap((bucket) => results[bucket])
    .filter((r) => r.id === 'color-contrast')
    .reduce((sum, r) => sum + r.nodes.length, 0)

for (const theme of THEMES) {
  for (const { route, routeLabel, owner, trigger } of MODAL_CASES) {
    test(`a11y-modal [${theme}]: ${routeLabel} · ${owner}`, async ({ page }) => {
      // Seed BOTH theme and locale before boot: theme drives the color-contrast
      // surface under test; locale pins the accessible names we select by (the app
      // resolves locale from localStorage.locale, else navigator.language).
      await page.addInitScript(({ t, l }) => {
        localStorage.setItem('theme', t)
        localStorage.setItem('locale', l)
      }, { t: theme, l: 'en' })

      await page.goto(route)
      // Wait for the settled page, not a mid-load frame (mirrors the full-page gate).
      await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 15_000 })
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
      // Confirm the theme actually applied, so a silent useTheme regression can't
      // turn the dark pass into a second (green) light scan.
      if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark-mode/)
      else await expect(page.locator('html')).not.toHaveClass(/dark-mode/)

      // Open the modal through its real trigger. List routes render one trigger per
      // card; any opens an identical modal, so take the first.
      await page.getByRole('button', { name: trigger }).first().click()

      // The overlay + a heading must be mounted before we scan.
      const modalBody = page.locator('.modal-overlay .modal-body').first()
      await expect(modalBody).toBeVisible()
      await expect(modalBody.locator('h6').first()).toBeVisible()

      const results = await scanModal(page)

      // Honest-gate guard: prove axe actually EVALUATED the modal's text. If a future
      // change drops the <Teleport> and the overlay is re-nested under an
      // overflow:hidden host, axe silently scans zero nodes and every check "passes"
      // — a false green. Requiring a non-vacuous scan makes that regression fail here.
      expect(
        ccNodeCount(results),
        `axe evaluated 0 color-contrast nodes in the ${owner} modal — is it still <Teleport>ed out of its host's overflow:hidden clip?`,
      ).toBeGreaterThan(0)

      const report = results.violations
        .map((v) => `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
        .join('\n')
      expect(
        results.violations,
        `Modal a11y violations — ${routeLabel} · ${owner} [${theme}]:\n${report}`,
      ).toEqual([])
    })
  }
}
