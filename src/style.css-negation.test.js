/**
 * CSS custom-property negation guard (audit R1).
 *
 * A custom property cannot be negated with a bare `-` prefix — `-var(--space-1)`
 * is invalid and the CSS parser silently DROPS the whole declaration. It must be
 * `calc(-1 * var(--space-1))`. This bug was replicated across 12 files (a token
 * migration introduced it and nothing caught it). This structural guard scans
 * every component/style source and fails if the pattern reappears — the same
 * "script the matrix" approach as style.contrast.test.js, standing in for a
 * stylelint rule the project does not yet run.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, acc)
    else if (/\.(vue|css)$/.test(entry)) acc.push(full)
  }
  return acc
}

describe('CSS negation guard — no bare -var() negation', () => {
  it('never negates a custom property with a bare "-" prefix', () => {
    const root = path.resolve(process.cwd(), 'src')
    const offenders = []
    for (const file of walk(root)) {
      const src = readFileSync(file, 'utf8')
      src.split('\n').forEach((line, i) => {
        // Match `-var(` not preceded by a word char (excludes e.g. `border-var`,
        // which doesn't exist, and avoids matching inside `calc(-1 * var(...))`).
        if (/(^|[^\w-])-var\(/.test(line)) {
          offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}  ${line.trim()}`)
        }
      })
    }
    expect(offenders, `Use calc(-1 * var(--x)) instead of -var(--x):\n${offenders.join('\n')}`).toEqual([])
  })
})
