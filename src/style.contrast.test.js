/**
 * Design-token contrast regression guard (Stream ⑤-1).
 *
 * Parses the REAL tokens from src/style.css (:root = light, .dark-mode = dark)
 * and asserts every AA-critical text/background pair reaches WCAG 4.5:1 in BOTH
 * themes. This is the §2.2 "script the whole matrix, don't eyeball" check; it was
 * validated in the audit against live getComputedStyle (static math matched the
 * browser exactly for these solid tokens). Any future edit that regresses a pair
 * fails CI.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const css = readFileSync(path.resolve(process.cwd(), 'src/style.css'), 'utf8')

function parseBlock(selector) {
  const re = new RegExp(selector.replace('.', '\\.') + '\\s*\\{([^}]*)\\}')
  const m = css.match(re)
  if (!m) throw new Error(`block not found: ${selector}`)
  const tokens = {}
  for (const t of m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[t[1]] = t[2].trim()
  return tokens
}

const root = parseBlock(':root')
const themes = { light: root, dark: { ...root, ...parseBlock('.dark-mode') } }

function lum(hex) {
  hex = hex.replace('#', '').trim()
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  const ch = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
function ratio(a, b) {
  const [L1, L2] = [lum(a), lum(b)]
  const [hi, lo] = [Math.max(L1, L2), Math.min(L1, L2)]
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE = '#ffffff'
const AA = 4.5

function resolve(theme, token) {
  if (token.startsWith('#')) return token
  const v = themes[theme][token]
  if (!v) throw new Error(`missing token --${token} in ${theme}`)
  if (!v.startsWith('#')) throw new Error(`token --${token} (${theme}) is not a hex literal: ${v}`)
  return v
}

// [label, foreground, background]
const PAIRS = [
  ['button text on primary-strong fill', WHITE, 'primary-strong'],
  ['brand text on card', 'primary-text', 'bg-card'],
  ['brand text on page', 'primary-text', 'bg-primary'],
  ['muted text on card', 'text-muted', 'bg-card'],
  ['muted text on page', 'text-muted', 'bg-primary'],
  ['success-strong on card', 'success-strong', 'bg-card'],
  ['danger-strong on card', 'danger-strong', 'bg-card'],
  ['warning-strong on card', 'warning-strong', 'bg-card'],
  ['tag green', 'tag-text-green', 'tag-bg-green'],
  ['tag red', 'tag-text-red', 'tag-bg-red'],
  ['tag blue', 'tag-text-blue', 'tag-bg-blue'],
  ['tag yellow', 'tag-text-yellow', 'tag-bg-yellow'],
]

describe('design-token contrast — WCAG AA 4.5:1, both themes', () => {
  for (const theme of ['light', 'dark']) {
    for (const [label, fg, bg] of PAIRS) {
      it(`[${theme}] ${label}`, () => {
        const r = ratio(resolve(theme, fg), resolve(theme, bg))
        expect(r, `${label} (${theme}) = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(AA)
      })
    }
  }
})
