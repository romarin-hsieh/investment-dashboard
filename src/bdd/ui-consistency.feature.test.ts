/**
 * Binding for features/ui-consistency.feature — the button grammar as a structural guard
 * (same family as style.css-negation.test.js / dateformat-usage.guard.test.js).
 *
 * ACTIVE since fix/ui-consistency (the SC-1/SC-6 unification) — keeps page-local button
 * geometry and undefined variants from returning. Variant scan is scoped to class
 * attributes that carry the bare `btn` base class: component-private button classes that
 * opt out of the system (e.g. GenericSettingsModal's btn-cancel/btn-save) are exempt.
 */
import fs from 'node:fs'
import path from 'node:path'
import { expect } from 'vitest'
import { feature, scenario } from './gwt'

const read = (p: string) => fs.readFileSync(p, 'utf8')
const listFiles = (dir: string, ext: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((d) =>
      d.isDirectory() ? listFiles(path.join(dir, d.name), ext) : [path.join(dir, d.name)]
    )
    .filter((f) => f.endsWith(ext))

const styleBlocksOf = (vueSource: string): string =>
  [...vueSource.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1] ?? '').join('\n')

feature('One visual grammar across routes', () => {
  scenario(
    'No page redefines button geometry',
    (s) => {
      let offenders: string[] = []

      s.given('the global .btn system in src/style.css', () => {
        expect(read(path.resolve(process.cwd(), 'src/style.css'))).toMatch(/\.btn\s*\{/)
      })
      s.when('every style block under src/pages is scanned', () => {
        const pages = listFiles(path.resolve(process.cwd(), 'src/pages'), '.vue')
        offenders = pages.flatMap((file) => {
          const css = styleBlocksOf(read(file))
          const hits: string[] = []
          // A page-local `.btn { … }` block that sets geometry re-fragments the system.
          for (const m of css.matchAll(/(^|[^\w-])\.btn\s*\{([^}]*)\}/g)) {
            const body = m[2] ?? ''
            if (/\b(padding|font-size|min-height|height|line-height)\s*:/.test(body)) {
              hits.push(`${path.basename(file)}: .btn redefines geometry`)
            }
          }
          if (/\.control-btn\s*\{/.test(css)) {
            hits.push(`${path.basename(file)}: private .control-btn family`)
          }
          return hits
        })
      })
      s.then('no page-local rule sets .btn geometry (padding, font-size, height)', () => {
        expect(offenders).toEqual([])
      })
    }
  )

  scenario(
    'Every btn-* variant used in markup is defined in the global layer',
    (s) => {
      const defined = new Set<string>()
      let undefinedUses: string[] = []

      s.given('the set of .btn-* variants defined in src/style.css', () => {
        const css = read(path.resolve(process.cwd(), 'src/style.css'))
        for (const m of css.matchAll(/\.btn-([a-z-]+)/g)) defined.add(m[1] ?? '')
        expect(defined.size).toBeGreaterThan(0)
      })
      s.when('every class attribute under src/pages and src/components is scanned', () => {
        const files = [
          ...listFiles(path.resolve(process.cwd(), 'src/pages'), '.vue'),
          ...listFiles(path.resolve(process.cwd(), 'src/components'), '.vue'),
        ]
        undefinedUses = files.flatMap((file) => {
          const source = read(file)
          const template = source.split(/<style/)[0] ?? source
          const used = new Set<string>()
          // Only class attributes that opt INTO the system (carry bare `btn`) are held
          // to the defined-variant contract; private families (btn-cancel…) are exempt.
          for (const attr of template.matchAll(/class="([^"]*)"/g)) {
            const classes = (attr[1] ?? '').split(/\s+/)
            if (!classes.includes('btn')) continue
            for (const c of classes) {
              const m = /^btn-([a-z-]+)$/.exec(c)
              if (m) used.add(m[1] ?? '')
            }
          }
          return [...used]
            .filter((v) => !defined.has(v))
            .map((v) => `${path.basename(file)}: btn-${v} used but not defined globally`)
        })
      })
      s.then('every used btn-* variant is a member of the defined set', () => {
        expect(undefinedUses).toEqual([])
      })
    }
  )
})
