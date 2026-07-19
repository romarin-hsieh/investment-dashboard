# ADR-0014 — Unify the Stack on TypeScript (enforced, incremental)

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: Project owner
- **Context tags**: `tooling`, `type-safety`, `quality-gate`, `frontend`

## Context & Problem

The codebase was a stalled half-migration:

- **7 `.ts` files** against **54 `.js`** and **53 `.vue`** — TypeScript was ~6% of the source.
- **`typescript` was not installed at all.** `tsconfig.json` existed with `strict: true`,
  `noUnusedLocals` and `noUnusedParameters`, but nothing could execute it.
- There was **no `typecheck` script and no CI step**, so the annotations in those 7 files
  were enforced by *nothing*. Vite/esbuild strips types without checking them.

That is worse than plain JavaScript: `src/types/index.ts` declares **52 interfaces** that
readers reasonably trust, while the compiler had never verified a single one of them.

Meanwhile [ROADMAP](../../product/ROADMAP.md) commits to migrating the top-5 critical
`.js` files to TypeScript, and explicitly names a Vitest regression net as the
prerequisite — which [ADR-0013](0013-component-test-coverage-policy.md) (WS-H) has now
delivered (global coverage 32.7% → 38.8%, 287 tests, coverage ratchet-gated).

## Decision

**TypeScript is the single target language for the stack.** Rather than a big-bang
rewrite, make TypeScript *real* first, then migrate behind the gate:

1. **Install and enforce.** `typescript` + `vue-tsc` are dev dependencies. `npm run typecheck`
   runs `vue-tsc --noEmit`, and CI runs it **before** the test suite on every push and PR.
2. **The gate passes on introduction.** The 7 existing `.ts` files were verified
   already `strict`-clean, so this lands green — exactly like the ADR-0013 coverage
   ratchet. Its job is to stop regression and to make every future migration verifiable.
3. **Migrate incrementally; never relax `strict`.** Each PR converts a bounded set of
   `.js` → `.ts` (or adds `lang="ts"` to an SFC) and must leave `npm run typecheck`
   green. A file that cannot be typed honestly stays `.js` until it can be.
4. **Do not weaken the config to make a migration pass.** Same rule as the coverage
   floors: fix the code, not the gate.

## Consequences

**Positive**
- The type annotations that already exist are finally *enforced*, and every future one will be.
- Migration is reviewable in small pieces, with a green gate at each step, straight after
  the test net that makes such refactors safe.
- No build change: Vite/esbuild already strips types; only checking is added.

**Negative / Trade-offs**
- Two languages coexist during the ramp. This is the explicit cost of avoiding a
  107-file big-bang immediately after a large refactor; the gate plus a stated
  migration order bound it.
- `vue-tsc` adds ~seconds to CI.

**Neutral**
- `.vue` SFCs currently use plain `<script>`, so their bodies are JavaScript and are not
  type-checked. Adding `lang="ts"` to an SFC is what opts it into checking — that is the
  per-file ramp, not a separate mechanism.

## Alternatives Considered

- **Consolidate on JavaScript instead** (convert the 7 `.ts` files down). Achieves
  uniformity in an afternoon, but discards 52 interfaces and contradicts the ROADMAP
  commitment. Rejected: it removes information rather than enforcing it.
- **Big-bang migration of all 107 `.js`/`.vue` files.** Unreviewable in one PR and high
  regression risk immediately after a large refactor. Rejected.
- **Leave it as-is.** This is precisely the state that produced unenforced types and a
  decorative `tsconfig`. Rejected.

## Follow-ups

Migration order: start with small, **well-tested** utilities (they now have a regression
net), then the ROADMAP's top-5 by risk. Each file is renamed, typed with no `any` and no
gate-loosening, and its type enforcement is probe-tested (inject a deliberate violation,
confirm the error code, revert to green) before the PR merges.

### Migration progress

`.ts` file count: **7 → 16** (utilities). `.vue` SFCs still use plain `<script>` and are
not yet opted in (`lang="ts"` is the per-file switch).

| Batch / PR | Files migrated to `.ts` | Notes |
|---|---|---|
| #102 | `baseUrl` | first real migration; foundational to ADR-0008 |
| #103 | `designTokens`, `mfi` | `mfi` exposed `MFISeries = (number \| null)[]` — nulls were laundered by `new Array()` |
| #104 | `dataVersionService`, `technicalIndicatorsCache` | fixed a real `isChecking` latch bug the compiler forced out (+ regression test) |
| #105 | `performanceCache`, `performanceMonitor`, `mfiVolumeProfile`, `autoUpdateScheduler` | leaves-first: the perf pair migrated to avoid throwaway `.d.ts` sidecars |

**Remaining top-5 by risk** (both large and **untested**, so each gets a characterization
test pass first, then a solo migration PR):
- `technicalIndicatorsCore.js` (~1256 LOC, pure indicator math)
- `api/yahooFinanceApi.js` (~1406 LOC, I/O-heavy API client)

After the top-5: the remaining ~26 `.js` utilities/services (migrate in dependency order,
leaves first — importing a still-`.js` module from strict `.ts` raises TS7016, and the fix
is to migrate the leaf, not to hand-write a sidecar), then the `.vue` SFCs.

### Other

- The shelved migration-strategy draft lives on the `claude/adr-ts-migration-strategy`
  branch (from closed PR #44); fold anything still useful into the migration PRs.
- Gate verified both ways on introduction: `npm run typecheck` exits 0, and a deliberate
  `const x: number = "str"` correctly fails with `error TS2322`.
- Recurring lesson from the ramp: `tsc` silently resolves a `.js` import specifier to a
  sibling `.ts`, so a stale specifier keeps **typecheck** green while breaking the Vite/
  Rollup **build** — rewrite every specifier (including dynamic `import()` and `vi.mock`
  factory paths) to extensionless form, and always re-run the build, not just typecheck.
