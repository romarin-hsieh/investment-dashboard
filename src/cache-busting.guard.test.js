/**
 * Structural guard: no inline wall-clock cache busting (ADR-0006, amended 2026-08-07).
 *
 * The audit (SK-D-1) found five incompatible busting conventions, including
 * per-millisecond `?t=${Date.now()}` sites that defeated the CDN on every request.
 * All busting now goes through src/utils/cacheBust.ts (version-keyed for data/*,
 * hourly for app assets). This test walks the source and fails on any new inline
 * wall-clock bust, the same pattern as style.css-negation.test.js.
 *
 * Sanctioned exceptions (excluded below):
 *  - src/utils/cacheBust.ts       — the helper itself owns the hourly bucket
 *  - src/utils/dataVersionService — the status.json version PROBE must bypass caches
 *    per call (its whole purpose), throttled by the service to one call per 5 s
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'src')
const EXCLUDED = [
  path.join('utils', 'cacheBust.ts'),
  path.join('utils', 'dataVersionService.ts'),
]

const OFFENDING = [
  // ?t=${Date.now()} / ?v=${new Date().getTime()} template forms
  /\?[tv]=\$\{\s*(Date\.now\(\)|new Date\(\)\.getTime\(\))/,
  // '?t=' + Date.now() concat forms
  /['"`]\?[tv]=['"`]\s*\+\s*(Date\.now\(\)|new Date\(\)\.getTime\(\))/,
  // bucketed wall-clock outside the helper (minute or hourly)
  /Math\.floor\(\s*Date\.now\(\)\s*\/\s*(60_?000|3_?600_?000)\s*\)/,
]

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return /\.(ts|vue|js)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : []
  })
}

describe('cache-busting guard (ADR-0006)', () => {
  it('no source file busts caches with inline wall-clock values', () => {
    const offenders = []
    for (const file of walk(ROOT)) {
      const rel = path.relative(ROOT, file)
      if (EXCLUDED.some((ex) => rel.endsWith(ex))) continue
      const lines = fs.readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        if (OFFENDING.some((re) => re.test(line))) {
          offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`)
        }
      })
    }
    expect(offenders, 'use dataCacheBust()/hourlyBust() from src/utils/cacheBust.ts').toEqual([])
  })
})
