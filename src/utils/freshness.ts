/**
 * Shared data-freshness grading (audit SD-1).
 *
 * One helper, derived from the documented SLO, consumed by every surface that grades the
 * daily pipeline feed — System Status and Auto-Update Monitor previously used
 * contradictory thresholds (<25 h green vs ≥12 h red) for the same file, so a healthy
 * 13-hour-old feed read green on one page and red on its sibling.
 *
 * Grades (mapped to the existing autoUpdate.* i18n keys):
 *  - fresh    — within the 26 h SLO (docs/operations/SLA.md): on schedule.
 *  - stale    — past SLO but under 48 h: likely one missed nightly run.
 *  - outdated — 48 h or older: multiple missed runs, act per RUNBOOK.
 */
export const FRESHNESS_SLO_HOURS = 26

/** symbols_metadata refreshes weekly (update-metadata.yml, Sundays 02:00 UTC) — its SLO
 *  is one cadence plus a day of skew, not the daily pipeline's 26 h. */
export const METADATA_SLO_HOURS = 8 * 24

export type FreshnessGrade = 'fresh' | 'stale' | 'outdated'

/** stale = under two missed cadences; outdated = beyond. Default SLO is the daily feed's. */
export function gradeFreshness(ageHours: number, sloHours: number = FRESHNESS_SLO_HOURS): FreshnessGrade {
  if (ageHours < sloHours) return 'fresh'
  if (ageHours < 2 * sloHours) return 'stale'
  return 'outdated'
}
