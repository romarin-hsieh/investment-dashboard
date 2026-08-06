/**
 * Binding for features/terminology.feature — GLOSSARY §D2 as an executable guard.
 *
 * @pending-fix(fix/copy-slop): the banned-register scenario is fully written but gated
 * behind pendingScenario until the copy sweep lands (audit CP-2 documents the current
 * violations). Flipping `pendingScenario` → `scenario` is the fix PR's red→green switch.
 * The other two feature scenarios are @covered-by pre-existing tests (src/i18n.test.js,
 * src/dateformat-usage.guard.test.js) and deliberately not re-bound here.
 */
import fs from 'node:fs'
import path from 'node:path'
import { expect } from 'vitest'
import { feature, pendingScenario } from './gwt'

type Leaf = [key: string, value: string]
function flatEntries(obj: Record<string, unknown>, prefix = ''): Leaf[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    return v && typeof v === 'object' && !Array.isArray(v)
      ? flatEntries(v as Record<string, unknown>, key)
      : [[key, String(v)] as Leaf]
  })
}

// GLOSSARY.md §D2 banned-variant column. 本地儲存 is matched as the two-char 本地 to also
// catch 本地快取-style compounds; extend the allowlist below if a legitimate use appears.
const BANNED: Array<[banned: string, canonical: string]> = [
  ['緩存', '快取'],
  ['元數據', '中繼資料'],
  ['調度器', '排程器'],
  ['保存', '儲存'],
  ['運行', '執行'],
  ['本地', '本機'],
  ['數據', '資料'],
]
const ALLOWLISTED_KEYS = new Set<string>([])

feature('UI copy traces to the project glossary', () => {
  pendingScenario(
    'zh-TW copy contains no banned-register vocabulary',
    'activate in fix/copy-slop once the CP-2 sweep lands',
    (s) => {
      let leaves: Leaf[] = []
      let violations: string[] = []

      s.given('the banned-variant table in docs/product/GLOSSARY.md §D2', () => {
        expect(BANNED.length).toBeGreaterThan(0)
      })
      s.when('every leaf string in src/locales/zh-TW.json is scanned', () => {
        const zh = JSON.parse(
          fs.readFileSync(path.resolve(process.cwd(), 'src/locales/zh-TW.json'), 'utf8')
        ) as Record<string, unknown>
        leaves = flatEntries(zh)
        violations = leaves
          .filter(([key]) => !ALLOWLISTED_KEYS.has(key))
          .flatMap(([key, value]) =>
            BANNED.filter(([banned]) => value.includes(banned)).map(
              ([banned, canonical]) => `${key}: "${value}" uses ${banned} (→ ${canonical})`
            )
          )
      })
      s.then('no string contains a banned variant', () => {
        expect(violations).toEqual([])
      })
    }
  )
})
