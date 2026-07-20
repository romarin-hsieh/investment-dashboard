/**
 * Locale-aware date guard (audit S1).
 *
 * Raw `toLocaleDateString` / `toLocaleTimeString` format against the browser
 * locale, not the app's — the exact bug that put English dates on the 繁中 UI.
 * All display-layer date formatting must go through `@/utils/dateFormat`, so
 * this guard fails if a raw date-only toLocale* call reappears in a page or
 * component. (Number `toLocaleString` is a separate concern and not matched
 * here.) Same "script the matrix" approach as style.contrast/css-negation.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, acc)
    else if (entry.endsWith('.vue')) acc.push(full)
  }
  return acc
}

describe('date formatting guard — no raw toLocale*String in the display layer', () => {
  it('pages and components format dates via @/utils/dateFormat', () => {
    const offenders = []
    for (const dir of ['src/pages', 'src/components']) {
      for (const file of walk(path.resolve(process.cwd(), dir))) {
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          if (/\.toLocale(Date|Time)String\s*\(/.test(line)) {
            offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}  ${line.trim()}`)
          }
        })
      }
    }
    expect(offenders, `Use formatDate/formatTime/formatDateTime from @/utils/dateFormat:\n${offenders.join('\n')}`).toEqual([])
  })
})
