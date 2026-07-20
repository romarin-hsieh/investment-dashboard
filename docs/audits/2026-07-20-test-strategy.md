# Adversarial Test-Design & Coverage Strategy — investment-dashboard

> **Date:** 2026-07-20 · **Baseline commit:** `b3717a281` (379 tests / 26 files, 51.5% global statements)
> **Method:** three independent adversarial analysis lenses (coverage-by-risk, test-quality, pyramid/missing-tiers), each finding re-verified against source by an independent skeptic pass; severity corrections from verification are noted inline.
> **Companion:** [2026-07-20-adversarial-uiux-audit.md](2026-07-20-adversarial-uiux-audit.md) — the UI/UX half of the same audit.

Scope: synthesized from 13 verified findings (coverage-risk-gaps + test-quality lenses), grounded against `vitest.config.js`, `docs/architecture/adr/0013-*.md`, `src/test-setup.ts`, and the `src/{api,services,lib}` / `src/pages` tree. Every claim is cited to `file:line`.

---

## 1. Executive summary — current state

The suite is **379 tests, 51.5% global statements**, but that headline number hides a structurally inverted pyramid: **coverage is concentrated exactly where risk is lowest and absent exactly where the blast radius is widest.**

**Where the suite is genuinely strong** (this is the quality bar to propagate):
- **Golden-master characterization** of the deterministic math core — `src/utils/technicalIndicatorsCore.test.js` pins surprising real behaviours with generated golden values: `undefined` holes (`:263-277`), ADX hole propagation (`:398-420`), MACD signal never warming up (`:427-437`), plus division-guard/flat-window/NaN branches (`:827-969`).
- **Defect-pinned regression tests that assert the wrong *user-visible* outcome they prevent** — `StockCard.test.js:80-104` ("does NOT fabricate a bearish MA call when price is null"), `TechnicalIndicators.test.js:164-187` (stale-response race), `FundamentalAnalysis.test.js:259-283` ("missing data looked like positive growth"), `MFIVolumeProfilePanel.test.js:323-352` (in-flight supersession).
- **Real async-concurrency tests** with genuine promise overlap — `ohlcvApi.test.js:113-151`, `fetcher.test.js:70-96` (dedup / cleanup-on-reject / TTL / failure-not-cached).
- **Structural matrix guards** — `style.contrast.test.js` scripts the WCAG 4.5:1 matrix in both themes; `i18n.test.js:22-36` asserts en/zh-TW key parity. No snapshot-only tests exist anywhere in `src/`.

**The two structural holes:**

1. **The entire external-data ingestion layer is ~4% covered.** This is the layer that consumes a **separate repository** (ADR-0008, `docs/architecture/adr/0008-separate-data-repository.md`) — the one input the app does *not* control. Per-file: `yahooFinanceApi.js` **2.9%**, `state-manager.ts` **8.6%**, `precomputedIndicatorsApi.ts` **9.6%**, `cacheWarmupService` **13%**, `fetcher.ts` **24%**, `autoUpdateScheduler.ts` **25%**, `ohlcvApi.js` **37%**. The adversary's cheapest win — renaming one field in the data repo — silently blanks an indicator with no error and no failing test. There is **no `src/api/*.test.*` contract file at all**; the only proof-point we need is already in the tree: `yahooFinanceApi.js:635/642/638` reads `psar.psar`/`obv.obv`/`cci.cci` while the real committed sample `dist/data/technical-indicators/2026-06-18_AMD.json` and the live parser `precomputedIndicatorsApi.ts:273/277/256` use `psar.sar`/`obv.value`/`cci.cci20`. **Two hand-written parsers of the same file format have already silently diverged, with zero test to catch it.**

2. **All 8 pages are 0% covered** — `src/pages/StockDetail.vue`, `MarketDashboard.vue`, `StockDashboard.vue`, `QuantDashboard.vue`, `Settings.vue`, `SystemManager.vue`, `TechnicalIndicatorsManager.vue`, `AutoUpdateMonitor.vue`. The router→page→component→api→render seam — where mocked-in-isolation units actually meet — is never exercised.

**The pyramid is 100% unit.** `package.json:13-16` defines only `vitest run`; there is **no E2E, a11y, visual, or contract tier** (`puppeteer` at `package.json:28` is an ETL-script dependency, not a test harness). The coverage ratchet (ADR-0013, `vitest.config.js:32-53`) gates only global percentages + six *component* floors; it does not touch the api/ingestion layer or pages.

**One-line risk thesis:** the deterministic, self-contained core is golden-mastered; the untrusted, cross-repo, freshness-critical boundary is untested. Testing effort must move down and outward to the ingestion seam.

---

## 2. Coverage gaps ranked by RISK

Ranked by **blast radius × trigger-likelihood**, not raw severity. Each carries one concrete example test case.

### R1 — CRITICAL: cache-schema drift silently wipes the user's watchlist + holdings
`src/utils/validation.ts:73-86` embeds the *complete* `DailySnapshotSchema`/`QuotesSnapshotSchema` inside `UserStateSchema.cache`. `state-manager.ts:39-46` `loadState()` runs `validateUserState()` over the whole object and, on **any** failure, returns `{...DEFAULT_STATE}` — empty watchlist/holdings. `importState()` (`:94-127`) does the same for user-supplied JSON. The cache *is* populated with a real full snapshot (`fetcher.ts:258`), so under active schema evolution (ADR-0013/0014) an older app version's cached snapshot that no longer satisfies a tightened rule — e.g. `macro.items.min(1)` at `validation.ts:151` — invalidates the *entire* UserState on next load. `state-manager` is **8.6%**; no test file exists. **This is silent user-data loss with a plausible trigger — the only HIGH.**

```ts
// state-manager.test.ts (new)
it('drops a corrupt cache without wiping the user portfolio', () => {
  const stored = { ...validUserState,
    watchlist: ['AMD','NVDA'], holdings: [{symbol:'AMD',shares:10}],
    cache: { last_daily_snapshot: { /* passes OLD schema, fails macro.items.min(1) */ } } }
  localStorage.setItem(KEY, JSON.stringify(stored))
  const s = loadState()
  expect(s.watchlist).toEqual(['AMD','NVDA'])      // FAILS today -> returns DEFAULT_STATE
  expect(s.holdings).toHaveLength(1)
  expect(s.cache.last_daily_snapshot).toBeUndefined() // bad cache dropped, not the portfolio
})
```
The failing assertion *documents the current all-or-nothing behaviour*, then forces the source fix (validate cache separately from user data; drop only the bad slice). Add companions: `importState(exportState())` round-trip; `importState` rejecting unknown top-level keys.

### R2 — HIGH blast radius: cross-repo indicator-key drift blanks indicators (no golden-file test)
The **live** precomputed path — `hybridTechnicalIndicatorsApi.js:50,123` → `precomputedIndicatorsAPI.getTechnicalIndicators()` — parses the separate-repo file with hand-written nested→flat key mappings (`precomputedIndicatorsApi.ts:256/273/277`) and has **no golden-file test** (`FundamentalAnalysis.test.js:34-36` and `TechnicalIndicators.test.js` mock the API entirely). A field rename in the data repo silently blanks Parabolic SAR / OBV / CCI across `StockDetail` with no error. The **already-divergent sibling** `yahooFinanceApi.js:635/642/638` is proof this class ships unnoticed (it is currently unreachable dead code, so no *live* bug today — but the same drift against the live parser would be a live bug tomorrow).

```ts
// precomputedIndicatorsApi.contract.test.ts (new tier)
it('locks every nested->flat mapping against the committed real sample', async () => {
  const raw = await readFixture('2026-06-18_AMD.json')   // committed real dist sample
  mockFetch(raw)
  const out = await precomputedIndicatorsAPI.getTechnicalIndicators('AMD')
  for (const f of ['parabolicSAR','obv','cci20','macd','adx14'])
    expect(Number.isFinite(out[f].value)).toBe(true)     // fails the moment a key is renamed upstream
  expect(out.parabolicSAR.value).toBe(getLast(raw.indicators.psar.sar))
})
```

### R3 — HIGH blast radius: over-strict daily-snapshot validation poisons the whole day → `very_stale`
`validation.ts:126` requires every news `url` to pass `z.string().url()`, `:128` a `DateTimeString` `published_at`, `:151` `macro.items.min(1)`, `:170` `macro` required. `fetcher.ts:251-273` validates in the backtrack loop and rethrows at `i===maxBacktrackDays`, falling to cache/`very_stale`. **One malformed field nukes all per-symbol briefs for the day.** The *live* trigger is macro scraping producing 0 items (macro is inherently flaky; the news path is currently dormant because committed snapshots have empty `news_top10`). No partial-corruption resilience test exists.

```ts
it('empty macro.items currently nukes the whole day (document, then decide contract)', () => {
  const snap = { ...validDaily, macro: { items: [] } }   // min(1) fails
  expect(() => validateDailySnapshot(snap)).toThrow()    // lock current all-or-nothing gate
})
// Then decide: make macro/news_top10 tolerant (drop a bad item) rather than discarding the day.
```

### R4 — MEDIUM: `fetchDailySnapshot` 404-backtrack loop + cache short-circuit untested
`fetcher.test.js` covers only `fetchSystemStatus`; `fetcher` is **24%**. The 404-backtrack loop (`fetcher.ts:228-273`) and cache short-circuit (`:205-216`) have zero tests, and are consumed in production by `MarketsOverview.vue:79` and `stockOverviewOptimizer.js:60`. (Note: the cache-hit path *does* fire on same-day reloads — the "compares UTC to Taipei date" claim only bites in a UTC-evening generation window the pipeline doesn't currently produce; still worth locking, and worth migrating the comparison to `as_of_date_taipei` at `validation.ts:166`.)

```ts
it('backtracks on 404 then returns yesterday from network', async () => {
  mockFetchSeq({ [today]: 404, [yesterday]: valid })
  const r = await fetchDailySnapshot()
  expect(r.source).toBe('network'); expect(r.data.as_of_date_taipei).toBe(yesterday)
})
it('all-404 with no cache -> data:null, very_stale', async () => { /* ... */ })
```

### R5 — MEDIUM: live Yahoo ingestion has no length/alignment guard
`yahooFinanceApi.js:207-262` (reachable via `hybridTechnicalIndicatorsApi.js:50` realtime fallback) sizes all arrays to `close.length` (`:229`), fills `null→NaN` positionally (`:240-244`), warns `<28` (`:256`), throws `<50` (`:260`), then feeds `calculateAllIndicators`. **There is no array-length-equality guard** — a shorter `high/volume` array from a thin/halted symbol yields NaN-tail-padded series flowing into ADX/OBV/Beta. **2.9%**, untested.

```ts
it('rejects/truncates unequal-length quote arrays', async () => {
  mockFetch(chartWith({ close: len(60), high: len(55), volume: len(50) }))
  const out = await fetchTechnicalIndicatorsFromAPI('THIN')  // Node branch, window undefined
  expect(out.adx14.value).not.toBeNaN()   // add a length-equality guard in source to satisfy this
})
it('exactly 49 points throws Insufficient data', async () => { /* :260 */ })
```

### R6 — MEDIUM: `ohlcvApi` unwrap/alias/<20-point branches blank charts silently
`ohlcvApi.js:127-139` unwraps nested `{ohlcv:{...}}` and aliases `timestamp→timestamps`; `validateOhlcvData` (`:172-202`) rejects on missing arrays / length mismatch / **<20 points**; on false, `getOhlcv` returns `null` (`:72`) → `TechnicalSignals.vue:163` and chart widgets render empty with only a `console.warn`. `ohlcvApi.test.js` exists but tests *only* the inflight-dedup invariant on a flat 25-point fixture — the unwrap, the alias, the `<20` rejection, and `filterDataByRange` are all unexercised. A **newly-added symbol with <20 days of history silently blanks its chart** (directly relevant given self-service add-symbol, ADR-0012). **37%**.

```ts
it('a 19-point file returns null (new symbol, thin history)', async () => {
  mockFetch(nestedOhlcv(19)); expect(await getOhlcv('NEW','1m')).toBeNull() })
it('nested {ohlcv:{...}} unwraps and timestamp->timestamps aliases', async () => { /* :127-139 */ })
```

### R7 — MEDIUM: `autoUpdateScheduler` version-refresh path untested + a dead no-op branch
`autoUpdateScheduler.ts:465-470` auto-`start()`s as a module side-effect when `hostname!=='localhost'`. The version-driven `checkAndUpdateTechnicalIndicators/Metadata` (`:160-235`) + age fallback (`:238-264`, >24h) are untested; `clearTechnicalIndicatorsCache` (`:347-356`) has a branch that logs "Cleared performance cache items" but **never clears anything** (the comment admits it). If `dataVersionService` regresses to always-false, users pin to stale data while logs claim success. **25%**; the test file's own header says this work is "intentionally NOT covered."

```ts
it('version check throwing triggers the age fallback + real cache clear', async () => {
  mockVersionService(() => { throw new Error() }); mockAge(25 /*h*/)
  await checkAndUpdateTechnicalIndicators()
  expect(performanceCache.clear).toHaveBeenCalled()   // exposes the :347-356 dead no-op
})
it('does NOT auto-start under test/localhost', () => { /* assert no interval on import */ })
```

### R8 — MEDIUM (breadth): all 8 pages at 0%
`src/pages/*.vue` — the router→api→render integration seam — has no coverage. `StockDetail.vue` (the destination of j/k navigation and the consumer of every parser above) and `MarketDashboard.vue` are the two highest-traffic. Covered in §4/§5 as the page-integration tier.

---

## 3. Test-quality findings on the existing suite

### 3a. Anti-patterns to fix (tests that mislead)

| # | Location | Defect | Fix |
|---|----------|--------|-----|
| Q1 **(highest)** | `StockOverview.test.js:81-83` | `createKeyHandler` is mocked to a no-op `vi.fn(() => () => {})`, so the "keyboard navigation" block (`:388-496`) calls `moveSelection()/openSelectedDetail()` **directly** and never dispatches a keydown. The real bindings (`StockOverview.vue:620-627`: j→`moveSelection(1)`, k→`moveSelection(-1)`, Enter→`openSelectedDetail`, with `preventDefault`), wired at `:632`, and the "registers handler" test (`:632-646`) only asserts `addEventListener` was called with the **no-op mock**. Swapping j/k, mis-binding Enter, or dropping `preventDefault` passes every test. The unit-under-test is mocked away. | Add one integration test that does **not** mock `createKeyHandler`: mount, dispatch a real `keydown` for `j`/`k`/`Enter` on window, assert `selectedIndex` changes / route pushed / `preventDefault` fired. |
| Q2 | `mfiVolumeProfile.test.js:80-95` | The "honours legacy `mfiAvgMode`" test computes both modes but asserts only each bin in `[0,100]` — the same invariant as `:71-73` — and **never compares the two**. Deleting the `if (mfiAvgMode==='legacy')` branch (`mfiVolumeProfile.ts:271-298`) would pass. (Correction to the original finding: the existing constant-volume fixture *already* distinguishes the modes because `volumeAllocation` is overlap-proportional at `ts:252`, so **no new fixture is needed**.) | Add `expect(weighted[i].mfiAverage).not.toBe(legacy[i].mfiAverage)` for one bin on the existing fixture, plus a pinned golden per mode. |
| Q3 | `FundamentalAnalysis.test.js:194` | Asserts the raw English literal `'Could not load fundamental data...'` while the source sets it via i18n (`FundamentalAnalysis.vue:382`, `$t('fundamentals.errors.loadFailed')`). Brittle to copy edits; still passes if the source regresses to a hard-coded literal — defeating the bilingual guarantee. Violates the file's own ADR-0013 convention (other assertions resolve via `$t(...)` at `:293/:295-298`). | `expect(wrapper.vm.error).toBe(wrapper.vm.$t('fundamentals.errors.loadFailed'))`. |
| Q4 | `autoUpdateScheduler.test.js:68-70` / `cacheWarmupService.test.js` header | Core side-effecting work stubbed to no-ops in *both* start (`:68-70`) and stop (`:104-106`) blocks; `performWarmup/start/schedulePeriodicWarmup` "intentionally NOT tested." Assertions couple to `console.log` substrings (`:96-98`, `:125-127`) — breaks on log-wording changes, proves nothing about behaviour. | Add ≥1 real update-path test (per R7); replace log-substring assertions with state assertions (e.g. a second `start()` created no new interval ids). |
| Q5 | `technicalIndicatorsCache.test.js:128-141` | `expect(elapsed).toBeLessThan(100)` over 200 entries via `performance.now()` — a wall-clock **upper bound**, flaky under CI load, asserts nothing about correctness (pruneCache correctness is already covered at `:123-125`). | Move the budget to a dedicated non-blocking benchmark; keep only the correctness assertion. *(Note: `cacheWarmupService.test.js:65-69`'s `sleep(20)` assertion is a **lower** bound — a slow runner can't make it fail spuriously; leave it or convert to fake timers for speed, not flakiness.)* |
| Q6 (low) | `StockOverview.test.js:512-519` | Names a test "returns localised string" but asserts `/Apr/` against a source that hard-codes `toLocaleString('en-US')` (`StockOverview.vue:731`); the helper is never verified in zh-TW (there are ~39 `toLocale*` sites on a fixed locale). It does **not** actively guard against the fix (the harness pins `'en'` at `test-setup.ts:15`), so this is a mislabel + missing locale-verification, not a trap. | Rename; add a zh-TW-locale assertion (mount under `zh-TW`, assert output differs from `en`); route the source through the active i18n locale. |

### 3b. Patterns to propagate (the template for new tests)
Make these the model for the untested surface:
1. **Golden-master with generated values, not re-derived formulas** — `technicalIndicatorsCore.test.js`. Apply to every parser in §2 (contract fixtures).
2. **Defect-pinned regressions asserting the wrong user-visible outcome** — `StockCard.test.js:80-104`, `FundamentalAnalysis.test.js:259-283`. Every source fix in the action plan lands with one.
3. **Real promise-overlap concurrency** — `ohlcvApi.test.js:113-151`, `fetcher.test.js:70-96`. Reuse for the fetcher backtrack + scheduler races.
4. **Matrix-driven structural guards** — `i18n.test.js:22-36`, `style.contrast.test.js`. Two caveats when propagating: the contrast test covers only **hand-listed solid-hex pairs** (`:54-67`) — it cannot catch a new/unlisted token pair or alpha/overlay contrast (that gap is the case for the a11y tier in §4); and golden-master guards **drift, not mathematical correctness** by design.

---

## 4. Target pyramid + test types, mapped to this architecture

The app is **static-first** (ADR-0001) with a **separate data repo** (ADR-0008) and three-tier caching (ADR-0003). That shape dictates *which* tiers matter: there is no backend to integration-test, but there is an untrusted cross-repo data contract that is currently unguarded. The single highest-value addition is therefore **contract/golden-file tests at the ingestion boundary**, not E2E.

```
        Current (379 tests)                    Target
        ───────────────────                    ──────
                                                  ◱  E2E + a11y      ~5%   (NEW)
                                              ◲◲◲  page integration  ~10%  (NEW)
                                          ◲◲◲◲◲◲◲  contract/golden   ~15%  (NEW)
   ████████████████████████  unit 100%   ████████ unit             ~70%
```

| Tier | What it locks | Where it plugs into this architecture | Priority |
|------|---------------|----------------------------------------|----------|
| **Contract / golden-file** *(new, most important)* | The separate-data-repo schema at the app boundary — every nested→flat key mapping, every zod rule (R2/R3). Committed real samples (`dist/data/technical-indicators/2026-06-18_AMD.json`, daily/quotes snapshots) run through the **real** parsers with `fetch` mocked. | This is the ADR-0008 cross-repo seam that has **zero** coverage. Files: `src/api/*.contract.test.ts`, fixtures under `tests/fixtures/` copied from real `dist/data`. Gate = "fixture must parse to finite values," a *presence* gate like bundle-size (ADR-0007), not a % ratchet. | P0 |
| **Unit** *(existing, keep growing)* | Parser guard clauses, cache/state logic, indicator math, component data-shape edges. | Existing vitest + jsdom; extend into `api/`, `services/`, `lib/`, `utils/state-manager`. | P0/P1 |
| **Page integration** *(new)* | router→page→component→api→render seam (R8). Mount a page with the router and a **mocked fetch of committed fixtures**, assert it renders indicators/holdings rather than an empty/stale state. | Pure jsdom + `@vue/test-utils` + `vue-router` — no new dependency. Files: `src/pages/*.test.ts`. Start with `StockDetail` and `MarketDashboard`. | P1 |
| **a11y (axe)** *(new)* | Keyboard/focus/ARIA and *computed* contrast — covers the gap `style.contrast.test.js` cannot (unlisted token pairs, alpha/overlay). Matrix over light/dark × en/zh-TW. | Runs against mounted pages in jsdom (`@axe-core/vue` or `vitest-axe`), or against the built static site under Playwright. | P2 |
| **E2E (Playwright)** *(new, thin top)* | A handful of smoke journeys against the **built** static site with a fixtured `dist/data/`: overview loads → j/k navigates → StockDetail renders indicators; corrupt-cache load keeps the watchlist (R1 end-to-end). | `vite build` output served statically; Playwright with a committed fixture data set (no live network — matches static-first). New dev-dep + CI job. | P2 |
| **Visual regression** *(defer)* | Chart-widget pixel drift. | Explicitly **deprioritized** — no snapshot tests exist by design (ADR-0013 §4 warns against brittle assertions). Scope later to a few chart widgets only if churn justifies it. | P3 |

---

## 5. Sequenced action plan — next 5 test PRs, with ratchet extensions

Ordered by the R-ranking in §2. Each PR follows the ADR-0013 discipline: **raise the floor in the same PR, set at measured-minus-1, never lower to pass** (`0013:32-36`).

### PR 1 — StateManager + validation resilience *(R1 — stops silent portfolio loss)*
- **Tests** (`src/utils/state-manager.test.ts`, new): corrupt-cache load preserves watchlist/holdings; `importState(exportState())` round-trip; `importState` rejects unknown top-level keys; each per §2-R1.
- **Source fix**: validate `cache` independently of user data in `loadState()`/`importState()` (`state-manager.ts:39-46/94-127`) so a bad snapshot drops only the cache slice.
- **Coverage target**: `state-manager.ts` 8.6% → **≥75%** stmts.
- **Ratchet**: add per-file floors `'src/utils/state-manager.ts': { statements: 74, branches: 70, functions: 70 }`; nudge global `statements 38→40`.

### PR 2 — Data-repo contract/golden-file suite *(R2 — establishes the P0 tier)*
- **Tests** (`src/api/precomputedIndicatorsApi.contract.test.ts` + fixtures): lock every mapping per §2-R2; add contract tests for `dailySnapshot` (R3 boundary) and `ohlcv` shape. Commit real samples to `tests/fixtures/`.
- **Cleanup**: delete or quarantine the divergent dead parser `yahooFinanceApi.js:635/642/638` (unreachable, wrong keys) — it is the proof-of-concept for this whole tier.
- **Coverage target**: `precomputedIndicatorsApi.ts` 9.6% → **≥70%**.
- **Ratchet**: add `'src/api/precomputedIndicatorsApi.ts'` floor; **extend ADR-0013** with a new clause — contract/golden tests are gated by *"fixture parses to finite values"* (presence gate, ADR-0007 style), separate from the % ratchet, so a schema break fails CI even if line-% is unaffected.

### PR 3 — Ingestion guards: fetcher + Yahoo + ohlcv *(R4 + R5 + R6)*
- **Tests**: extend `fetcher.test.js` (backtrack loop, cache short-circuit, all-404 paths — §2-R4); new `yahooFinanceApi.test.js` (Node branch: unequal-length rejection, 49-point throw — §2-R5); extend `ohlcvApi.test.js` (unwrap, alias, <20-point null, `filterDataByRange` — §2-R6).
- **Source fix**: add an **array-length-equality guard** in `yahooFinanceApi.js` before `calculateAllIndicators` (`:229/:240-244`); migrate the fetcher cache comparison to `as_of_date_taipei` (`validation.ts:166`).
- **Coverage targets**: `fetcher.ts` 24% → **≥70%**, `yahooFinanceApi.js` 2.9% → **≥40%**, `ohlcvApi.js` 37% → **≥70%**.
- **Ratchet**: per-file floors for all three; global `branches 35→40`.

### PR 4 — Fix the test-quality anti-patterns *(Q1–Q6 — real regression protection, little new %)*
- **Tests**: un-mock `createKeyHandler` in a dedicated `StockOverview` keydown integration test (Q1); `!==` assertion for `mfiAvgMode` (Q2); i18n-key assertion in `FundamentalAnalysis` (Q3); one real scheduler update-path test (Q4, also closes R7); move the pruneCache perf budget to a benchmark (Q5); rename + add zh-TW locale assertion for `formatTime` (Q6, also fix the `en-US` literal at `StockOverview.vue:731`).
- **Coverage effect**: `StockOverview.vue` **functions** floor rises (real bindings `:620-627` now execute) — bump `'src/components/StockOverview.vue'.functions 69→` measured; add an `autoUpdateScheduler.ts` floor once R7 paths run.

### PR 5 — First page integration + a11y/E2E harness bootstrap *(R8 — new tiers)*
- **Tests**: `src/pages/StockDetail.test.ts` — mount with router + mocked-fixture fetch, assert indicators render (not empty/stale); one Playwright smoke (overview → j/k → StockDetail; corrupt-cache keeps watchlist end-to-end, R1); axe scan over `StockDetail` + `MarketDashboard` in light/dark × en/zh-TW.
- **Coverage targets**: pages 0% → **StockDetail ≥50%, MarketDashboard ≥40%**.
- **Ratchet / policy**: add `src/pages/*` per-file floors; **author a sibling ADR-0015** ("Integration, a11y & E2E test tiers") — E2E and a11y start as **required-green smoke gates** (not %-ratcheted), the contract tier as a presence gate (from PR 2), and the unit ratchet continues under ADR-0013. This keeps the "never lower a floor" contract intact while adding gate *kinds* that percentage floors can't express.

**Global ratchet trajectory across the five PRs** (mirroring the WS-H progression recorded at `vitest.config.js:33-37`): statements **38→45**, branches **35→42**, functions **41→48**, lines **38→45**, with new per-file floors for `state-manager.ts`, `precomputedIndicatorsApi.ts`, `fetcher.ts`, `yahooFinanceApi.js`, `ohlcvApi.js`, `autoUpdateScheduler.ts`, and the two pages — each set at measured-minus-1 in the PR that earns it.

---

### Key source references
- Ratchet config & floors: `vitest.config.js:32-53`
- Ratchet policy & follow-up order: `docs/architecture/adr/0013-component-test-coverage-policy.md:32-36,73-83`
- Test harness / locale pin: `src/test-setup.ts:13-16`; test scripts: `package.json:13-16`
- Cross-repo data contract: `docs/architecture/adr/0008-separate-data-repository.md`; static-first: `docs/architecture/adr/0001-static-first-architecture.md`
- Highest-risk untested source: `src/utils/state-manager.ts:39-46,94-127`; `src/utils/validation.ts:73-86,126,128,151,170`; `src/api/precomputedIndicatorsApi.ts:256,273,277`; `src/api/yahooFinanceApi.js:207-262,635,642,638`; `src/lib/fetcher.ts:205-273`; `src/services/ohlcvApi.js:127-202`; `src/utils/autoUpdateScheduler.ts:160-235,347-356,465-470`