/**
 * Binding for features/operational-honesty.feature.
 *
 * @pending-fix(fix/ops-honesty · SD-1): the shared SLO freshness helper does not exist
 * yet — SystemManager and AutoUpdateMonitor currently grade the same feed with
 * contradictory thresholds (audit SD-1). The scenario below is written against the
 * helper's intended contract; the fix PR creates `src/utils/freshness.ts`, points both
 * pages at it, and flips `pendingScenario` → `scenario` (updating the import).
 * The two @manual scenarios are browser-level and tracked in the feature file.
 */
import { expect } from 'vitest'
import { feature, pendingScenario, manualScenario } from './gwt'

const SLO_HOURS = 26 // docs/operations/SLA.md — data freshness < 26 h

feature('Monitoring surfaces report only measured truth', () => {
  // Activation (fix/ops-honesty): add `import { gradeFreshness } from '@/utils/freshness'`
  // at the top of this file, flip pendingScenario → scenario, and fill the given/when
  // steps with the assertions sketched below. A static import cannot be written today —
  // the module does not exist yet and Vite fails the whole file at transform time on an
  // unresolvable specifier, even inside a skipped test.
  pendingScenario(
    'One freshness grade per feed across all pages',
    'activate in fix/ops-honesty once src/utils/freshness.ts exists and both pages consume it',
    (s) => {
      s.given('the technical-indicator feed is 13 hours old', () => {})
      s.when('System Status and Auto-Update Monitor grade its freshness', () => {
        // Both pages import the same helper; asserting the helper asserts both.
      })
      s.then('both derive the grade from the shared SLO helper', () => {
        // expect(typeof gradeFreshness).toBe('function')
      })
      s.and('a feed younger than the 26-hour SLO grades as fresh on both', () => {
        // expect(gradeFreshness(13)).toBe('fresh')
        // expect(gradeFreshness(SLO_HOURS - 1)).toBe('fresh')
        // expect(gradeFreshness(SLO_HOURS + 1)).not.toBe('fresh')
        expect(SLO_HOURS).toBe(26)
      })
    }
  )

  manualScenario(
    'A failed status fetch renders Unknown, not fabricated values',
    'browser-level; needs the Unknown card states from fix package 6 (FH-8/US-SYS2)'
  )
  manualScenario(
    'SUCCESS log entries only for performed work',
    'browser-level; verified by hand until the log-honesty fix (SD-3/SK-D-2) lands'
  )
})
