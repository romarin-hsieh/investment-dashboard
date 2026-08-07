# ADR-0014 — Unify the Stack on TypeScript (enforced, incremental)

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: Project owner
- **Context tags**: `tooling`, `type-safety`, `quality-gate`, `frontend`

> **Status update (2026-08).** The incremental migration this ADR governs is **complete**:
> zero non-test `.js` under `src/`, all 42 `.vue` SFCs on `<script lang="ts">`, and every
> deferred strict flag now enabled. The decision and its trade-offs below are recorded as
> written (append-only); where the body says SFCs "currently use plain `<script>`" or lists
> remaining files, read the **Migration progress** section at the end of this ADR for the
> finished state.

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

### Migration progress — **COMPLETE** (2026-08, verified on `main` `a568340c0`)

**Zero non-test `.js` files remain under `src/`**: 52 `.ts` modules and 42 `.vue` SFCs, all
42 of which carry `<script lang="ts">`. The strict ratchet finished too — `tsconfig.json`
now runs `strict` plus `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`noPropertyAccessFromIndexSignature`, `noUnusedLocals`, `noUnusedParameters`,
`noFallthroughCasesInSwitch`, `noImplicitReturns` and `noImplicitOverride`, and none of
them was relaxed to land a migration.

| Phase | PRs | What moved |
|---|---|---|
| Gate | #101 | `typecheck` script + CI step; the 7 pre-existing `.ts` files verified strict-clean |
| Utility batches 1–9 | #102–#112 | `baseUrl` · `designTokens`, `mfi` · `dataVersionService`, `technicalIndicatorsCache` · the perf-cache pair, `mfiVolumeProfile`, `autoUpdateScheduler` · `QuantDataService`, `NavigationService`, `useKeyboardShortcuts` · `i18n`, `useLocale`, `useTheme` · `technicalIndicatorsCore` (first giant, #110, behind characterization #109) · technical-analysis + widget utils · 6 data-access/util modules |
| Giants + data access | #123–#124, #131–#134 | `yahooFinanceApi` (characterization #123, migration #124) · `ohlcvApi` · `dynamicMetadataService` · `metadataService` · `hybridTechnicalIndicatorsApi` |
| Last services + entry | #138–#140 | `cacheWarmupService` · `stockOverviewOptimizer` · `main.js` + `axe-helper` — **0 source `.js` remained** |
| SFC batches 1–28 + core 1–6 | #141–#174 | all 42 `.vue` SFCs onto `<script lang="ts">`, leaves first, ending with the six core components (`NavigationPanel` → `TOCTree` → `StockCard` → `TechnicalIndicators` → `FundamentalAnalysis` → `StockOverview`) |
| Strict ratchet | #175, #187–#192 | `noImplicitReturns` + `noImplicitOverride` · `noPropertyAccessFromIndexSignature` (243 TS4111, codemod) · three prep PRs guarding indexed access at the API, component and util layers · `noUncheckedIndexedAccess` (341 bounded-algo assertions) · `exactOptionalPropertyTypes` (the last deferred flag) |

The migration forced out real defects along the way, each fixed with a regression test: an
`isChecking` latch (#104), `new Array()` intermediates laundering `null` out of
`MFISeries` (#103), and the degraded-data paths hardened in #114 and #130.

**Residue — the one thing this ADR does not yet cover.** `tsconfig.json`'s `include` is
`src/**/*.{ts,d.ts,tsx,vue}` plus `tests/**/*.ts`, so the **41 `*.test.js` files are outside
the type gate** (4 tests are already `.ts`). Production source is fully checked; the suite
that exercises it is not. Migrating the tests is tracked in the ROADMAP's *Next* horizon,
not here — it changes no production behaviour and needs no new decision.

### Other

- The shelved migration-strategy draft lives on the `claude/adr-ts-migration-strategy`
  branch (from closed PR #44); fold anything still useful into the migration PRs.
- Gate verified both ways on introduction: `npm run typecheck` exits 0, and a deliberate
  `const x: number = "str"` correctly fails with `error TS2322`.
- Recurring lesson from the ramp: `tsc` silently resolves a `.js` import specifier to a
  sibling `.ts`, so a stale specifier keeps **typecheck** green while breaking the Vite/
  Rollup **build** — rewrite every specifier (including dynamic `import()` and `vi.mock`
  factory paths) to extensionless form, and always re-run the build, not just typecheck.
