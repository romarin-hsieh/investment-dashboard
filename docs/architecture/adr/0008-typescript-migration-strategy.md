# ADR-0008 — TypeScript Migration Strategy for Top-5 Critical `.js` Files

- **Status**: Proposed
- **Date**: 2026-04-28
- **Deciders**: Project owner
- **Context tags**: `typescript`, `migration`, `quality-gate`, `ci-cd`

## Context & Problem

The project has **8 `.ts` files** (corsProxyManager, dataTransformers, numberFormat, state-manager, validation, types/index, fetcher, fetcher-optimized) — informal incremental migration has been underway since the start of the project. The remaining `src/` is `.js`. The five largest `.js` files account for **~4,000 LOC** and concentrate the silent type-safety risk:

| File | LOC | Role | TS Dep Status |
|---|---:|---|---|
| `src/api/yahooFinanceApi.js` | 1406 | API facade — 7 import sites (5 components + 2 services) | Already imports 2 `.ts` modules (corsProxyManager, dataTransformers) |
| `src/utils/technicalIndicatorsCore.js` | 1256 | Pure-functional indicator math (RSI/MACD/BB/etc.) | No TS deps |
| `src/utils/technicalIndicatorsCache.js` | 515 | LRU + inflight-dedupe cache | No TS deps |
| `src/utils/autoUpdateScheduler.js` | 435 | Per-symbol scheduler + retry logic | No TS deps |
| `src/utils/mfiVolumeProfile.js` | 410 | Volume-profile + MFI math | Imports `numberFormat.ts` |

The [Roadmap](../../product/ROADMAP.md) lists this work in *Next* with a "regression net is now in place (WS-B + WS-G) — safe to start" precondition. WS-G ([#38](https://github.com/romarin-hsieh/investment-dashboard/pull/38), [#40](https://github.com/romarin-hsieh/investment-dashboard/pull/40), [#42](https://github.com/romarin-hsieh/investment-dashboard/pull/42)) closed the component-test prerequisite for the three monoliths consuming `yahooFinanceApi`.

Three forces shape the choice:

1. **No CI type-check gate exists.** [`tsconfig.json`](../../../tsconfig.json) sets `strict: true` and `noEmit: true`, but `npm test` only runs Vitest, and Vite/esbuild **strips types without checking them**. There is no `npm run typecheck` script and no CI step that runs `tsc` or `vue-tsc`. The IDE catches errors via tsserver, but they are not enforced at merge time. **This means the existing 8 `.ts` files have effectively zero contractual value at the merge gate** — any type bug in them is caught only when it fails at runtime.
2. **Caller-import-suffix coupling.** Components and tests import `yahooFinanceApi` with an **explicit `.js` suffix** (`from '@/api/yahooFinanceApi.js'`) at 7 sites. Renaming the source to `.ts` requires editing every caller — a flag-day approach.
3. **Strict mode is already on.** `strict: true` + `noUnusedLocals` + `noUnusedParameters` are already in the tsconfig. A migrated file must satisfy them on day one — there's no "migrate as `any`-permissive then tighten later" runway available without adding per-file `tsconfig` overrides we don't currently have.

We need a strategy that (a) installs the missing CI gate **before** investing in the migration, (b) sequences the per-file work so each PR is reviewable in isolation, and (c) defines the escape-hatch policy for cases where strict mode bites harder than the value of the rename.

## Decision

We adopt a **three-phase incremental migration**, sequenced so the CI gate exists before any heavy file is touched. Per-file PRs follow a fixed checklist.

### Phase 0 — Install the CI type-check gate (PR-H1)

Single PR, no source migration. Closes the precondition before the per-file work starts.

1. Add `vue-tsc` as a devDependency. (`vue-tsc` is the Vue-aware fork of `tsc` and the standard for Vue 3 + TS projects — handles `.vue` SFC type-checking that raw `tsc` cannot.)
2. Add `"typecheck": "vue-tsc --noEmit"` to `package.json` `scripts`.
3. Add a `typecheck` job to [`.github/workflows/test.yml`](../../../.github/workflows/test.yml) that runs in parallel with the existing `test` job. Both jobs gate PR merge.
4. Run `npm run typecheck` against the current `main` and **fix any errors discovered** as part of the same PR (or document them as known-failures in a `// @ts-expect-error` line if the fix is non-trivial — must include a follow-up issue link).

**Exit criterion**: `npm run typecheck` and `npm test` both pass on `main` and are both required PR-merge gates.

### Phase 1 — Migrate the top 5 `.js` files in dependency order (PR-H2 through PR-H6)

One file per PR. Order is chosen to migrate **leaf modules before their dependents**:

| PR | File | Why this order |
|---|---|---|
| PR-H2 | `mfiVolumeProfile.js` | Smallest (410 LOC), pure math, single TS dep already wired (`numberFormat.ts`). Lowest-risk smoke test of the migration recipe. |
| PR-H3 | `technicalIndicatorsCore.js` | Pure-functional indicator math, no I/O, no TS deps to coordinate — large but predictable. Most of the 1256 LOC is small functions that type cleanly. |
| PR-H4 | `technicalIndicatorsCache.js` | Depends on `technicalIndicatorsCore` (now `.ts` after H3) — call sites become better-typed automatically. |
| PR-H5 | `autoUpdateScheduler.js` | Depends on `technicalIndicatorsCache` (now `.ts`) for retry-key shape. Stand-alone otherwise. |
| PR-H6 | `yahooFinanceApi.js` | Largest, most callers (7 import sites), partial TS already done internally. Migrating this one last means every dep is already typed and every caller's import-suffix update happens in one place. |

**Per-PR checklist** (mandatory):
- [ ] Rename `foo.js` → `foo.ts`. Preserve existing default + named export shape so callers don't change semantically.
- [ ] Update every `import` of the migrated module to **drop the `.js` suffix**. Vite's `moduleResolution: bundler` resolves extensionless imports across `.ts` and `.js` — explicit suffixes break under rename. (For yahooFinanceApi: 7 sites listed in the PR-H6 description.)
- [ ] Add types incrementally: function signatures + exported interface shapes first, internal locals second. Use `interface`/`type` aliases over inline shapes for anything reused or exported.
- [ ] `npm run typecheck` clean (no `@ts-ignore`; `@ts-expect-error` allowed only with a follow-up link).
- [ ] `npm test` 172/172 pass (or higher — new tests welcome but not required).
- [ ] Bundle-size delta within ±2 % per chunk. (TS adds zero runtime; if the delta is larger, something other than the rename happened.)
- [ ] PR description lists every caller import that was updated.

### Phase 2 — Escape-hatch policy for the long tail

For the migrations themselves, we accept `any` only when:

1. The `any` is gating an external untyped boundary (third-party JS lib without `@types/*`).
2. A `// TODO(ts-migration): <reason>` comment annotates the line. These markers are **greppable** for future cleanup — `grep -rn 'TODO(ts-migration)' src/` will list every escape hatch.
3. The `any` does not propagate beyond the boundary — internal locals must be fully typed.

`@ts-ignore` is **forbidden**. `@ts-expect-error` is allowed only with a follow-up issue link in the same comment.

## Consequences

**Positive**
- Phase 0 closes the long-standing gap where `.ts` files were merged without contractual type-checking — converts the existing 8 TS files (and all future ones) from "compiles" to "type-checks at the merge gate". This benefit lands **on day one** of the migration, before any `.js` file is renamed.
- Phase 1's leaf-first order means each PR's diff is self-contained: the file being migrated and (only) its callers' import-suffix updates. No cross-cutting type-error cascades.
- The dependency-order sequence (math → cache → scheduler → API → callers) means each step builds on a typed foundation; types don't get rewritten as deps catch up.
- Per-PR bundle-budget assertion (PR-D3 / [ADR-0007](0007-bundle-size-budgets.md)) catches accidental runtime changes — TS migrations should be runtime-neutral, and the gate makes any deviation visible.
- 5 PRs × ~1500 LOC max each is a reviewable cadence; each PR can land within a normal review-cycle window without bundling unrelated changes.

**Negative / Trade-offs**
- Phase 0 is a real engineering investment (`vue-tsc` install + CI integration + fixing whatever errors `npm run typecheck` finds on existing `.ts` files) before any `.js` file gets touched. This delays user-visible progress on the migration roadmap item by one PR. **Considered acceptable**: without the gate, Phase 1 PRs land typed code into a CI that doesn't enforce it — the contract isn't real.
- The dependency-order sequence locks PR-H2 → PR-H6 into a single linear chain. A reviewer block on PR-H3 (technicalIndicatorsCore, the largest) blocks H4–H6. **Considered acceptable**: parallelizing risks merge conflicts on the import-suffix updates and contradicts the leaf-first design.
- Strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`) is on from day one. Some legitimate JS patterns (catch-all error handlers with unused param, conditional-throw branches) will need explicit typing or an underscore-prefix. **Considered acceptable**: these are exactly the boundaries TS is supposed to surface; relaxing the rule defeats the purpose.
- `vue-tsc` adds ~10 s to CI runtime. **Negligible.**

**Neutral**
- ADR is **strategy-only**. Specific type definitions for any one file land in that file's PR — this ADR doesn't pre-commit to a type design.
- Tests stay `.js` for now. Migrating test files is out of scope here — Vitest happily runs `.test.js` files that import `.ts` source. **Future ADR territory** if/when test-file types start carrying meaningful contracts.
- This ADR does not propose changing existing `tsconfig.json` settings. `strict` stays on, `noEmit` stays on (Vite handles emit), `allowJs` stays off. **Out of scope** for this strategy.

## Alternatives Considered

- **Flag-day all-files migration in a single PR.** Rejected: 4,022 LOC across 5 files + 7 callers = unreviewable diff. Any type error blocks the entire migration. Loss of bisect-ability on regressions.
- **Migrate without first installing the CI gate (do it last).** Rejected: every Phase 1 PR would land typed code into a CI that doesn't check it. The first time `npm run typecheck` ran would be after 4,000+ LOC of new TS, with zero leverage to back out of bad type designs.
- **`allowJs: true` + per-file `// @ts-check`.** This is Microsoft's official "JSDoc-first migration" path — type the JS files in place via JSDoc, then rename when fully typed. Rejected: the project already has 8 native `.ts` files and an unambiguous `strict: true` tsconfig — flipping to JSDoc-typed `.js` would be a regression in idiom. Useful for projects with a JS-first culture; not ours.
- **Migrate in size order, largest first (yahooFinanceApi.js → smaller).** Rejected: callers of `yahooFinanceApi` include components that consume return shapes from `technicalIndicatorsCore`. Migrating the API first means re-typing those return shapes as `any` initially, then revisiting on the subsequent PRs — busywork.
- **Migrate in caller-count order (most-imported first).** Equivalent to the dep-order chain in this case (yahooFinanceApi has the most callers and is also the natural last step); the framing is just inverted. Same outcome.
- **Adopt `tsx`/Vite's `vue-tsc --watch` as a hook instead of CI.** Rejected: pre-commit hooks degrade silently and don't gate non-local contributors (Renovate, automation PRs). CI is the durable mechanism — same logic as PR-D3 / [ADR-0007](0007-bundle-size-budgets.md).
- **Rolling deferred enforcement** — gate type-check on changed files only. Rejected: same anti-pattern as a soft test-coverage gate. Either every merge is type-clean or none is.

## Follow-ups

- **Phase 0 PR (PR-H1)**: scaffold the gate — `vue-tsc` install, `typecheck` script, CI job, fix existing-`.ts` errors discovered.
- **Phase 1 PRs (PR-H2 – PR-H6)**: one per file in dep order. Each cites this ADR and runs the per-PR checklist.
- **Tracking**: Each phase-1 PR appends its row to a "TS migration progress" subsection in [ROADMAP.md](../../product/ROADMAP.md) → *Recently shipped*, mirroring how WS-D / WS-E / WS-G entries log multi-PR planks.
- **Component `.vue` migration** is **not** scoped here. The five `.js` files are the largest silent-risk surface; converting `.vue` files' `<script>` blocks to `<script setup lang="ts">` is a separate decision worth a follow-up ADR if/when we tackle it.
- **`@types/yahoo-finance2`** — the `yahoo-finance2` devDep used by ETL scripts may already ship its own types; PR-H6 should validate this and avoid hand-rolling shapes that the upstream package provides.
