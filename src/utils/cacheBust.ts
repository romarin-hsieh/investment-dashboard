/**
 * The one cache-busting policy (ADR-0006, amended 2026-08-07 — audit SK-D-1).
 *
 * Before this module, five incompatible conventions coexisted (?v=version, hourly,
 * minute, per-millisecond, none) — the same file was fetched under three different
 * policies, sibling monitoring pages could disagree about one file's age, and the
 * per-millisecond sites defeated the CDN on every request.
 *
 * Layered rules:
 *  1. `status.json` version PROBE (dataVersionService only): per-call bust + no-cache —
 *     its entire purpose is to see the origin freshly. Sanctioned exception, throttled
 *     to one call per 5 s by the service itself.
 *  2. Every other `data/*` fetch: `dataCacheBust()` — keyed to the CURRENT data version,
 *     so a URL changes exactly when a deploy publishes new data. Falls back to the
 *     hourly bucket until the version is first known.
 *  3. App-repo assets that change only on app deploys (config/*): `hourlyBust()`.
 *  4. Wall-clock busting inline at call sites is BANNED — enforced by
 *     src/cache-busting.guard.test.js.
 *
 * (src/lib/fetcher.ts derives its bust from the payload's own last_updated timestamp —
 * data-derived like rule 2, and therefore compliant as-is.)
 */
import { dataVersionService } from './dataVersionService'

/** Hourly bucket — for app-repo assets and as the pre-version fallback. */
export function hourlyBust(): string {
  return `?t=${Math.floor(Date.now() / 3_600_000)}`
}

/** Version-keyed bust for data/* fetches; hourly fallback until a version is known. */
export function dataCacheBust(): string {
  const version = dataVersionService.getCurrentVersion()
  return version ? `?v=${encodeURIComponent(version)}` : hourlyBust()
}
