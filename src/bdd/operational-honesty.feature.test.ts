/**
 * Binding for features/operational-honesty.feature.
 *
 * The SLO-grading scenario is ACTIVE since fix/ops-honesty: src/utils/freshness.ts is the
 * single grading authority and both System Status and Auto-Update Monitor consume it —
 * asserted structurally below, so a page quietly reverting to private thresholds fails
 * this scenario (audit SD-1). The two @manual scenarios are browser-level and tracked in
 * the feature file.
 */
import fs from 'node:fs'
import path from 'node:path'
import { expect } from 'vitest'
import { feature, scenario, manualScenario } from './gwt'
import { gradeFreshness, FRESHNESS_SLO_HOURS } from '@/utils/freshness'

feature('Monitoring surfaces report only measured truth', () => {
  scenario('One freshness grade per feed across all pages', (s) => {
    let grade13: string

    s.given('the technical-indicator feed is 13 hours old', () => {
      grade13 = gradeFreshness(13)
    })
    s.when('System Status and Auto-Update Monitor grade its freshness', () => {
      // Both pages must consume the shared helper — private thresholds are the bug class.
      for (const page of ['src/pages/SystemManager.vue', 'src/pages/AutoUpdateMonitor.vue']) {
        const source = fs.readFileSync(path.resolve(process.cwd(), page), 'utf8')
        expect(source, `${page} must import the shared freshness helper`).toMatch(
          /from '@\/utils\/freshness'/
        )
        expect(source, `${page} must call gradeFreshness`).toMatch(/gradeFreshness\(/)
      }
    })
    s.then('both derive the grade from the shared SLO helper', () => {
      expect(FRESHNESS_SLO_HOURS).toBe(26) // docs/operations/SLA.md
    })
    s.and('a feed younger than the 26-hour SLO grades as fresh on both', () => {
      expect(grade13).toBe('fresh')
      expect(gradeFreshness(FRESHNESS_SLO_HOURS - 1)).toBe('fresh')
      expect(gradeFreshness(FRESHNESS_SLO_HOURS + 1)).not.toBe('fresh')
    })
  })

  manualScenario(
    'A failed status fetch renders Unknown, not fabricated values',
    'browser-level; needs the Unknown card states from fix package 6 (FH-8/US-SYS2)'
  )
  manualScenario(
    'SUCCESS log entries only for performed work',
    'browser-level; the log-honesty wiring (SD-3/SK-D-2) landed in fix/ops-honesty — verify by hand until a component-level binding exists'
  )
})
