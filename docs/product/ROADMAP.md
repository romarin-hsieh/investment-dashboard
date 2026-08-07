# Roadmap

> **Scope of this doc**: Forward-looking horizons for Investment Dashboard. *Now* lists active workstreams. *Next* lists committed-but-not-started work. *Later* lists ideas with one-line theses — design space, not commitments.
>
> **Cadence**: Review monthly. Move items between horizons as priorities change. *Now* should never have more than ~5 active workstreams.
>
> **Distinction from PRD**: The [PRD](PRD.md) describes the *current* product. This document describes *direction*. When a *Later* item moves to *Next*, write a spec for it.

---

## Now (Active — being executed)

**None.** WS-F (TypeScript unification), WS-H (component test coverage), WS-I
(test-strategy execution) and WS-J (UI/UX remediation) have all shipped — see *Recently
shipped*. The project is between cycles: pick the next workstream from *Next*, or run a
fresh audit.

---

## Next (Committed but not yet started)

### 🧹 Audit round-2 residue (verified open 2026-08-08)
What the [2026-08-07 round-2 audit](../audits/2026-08-07-adversarial-round2-audit.md)
stack (#210–#222) deliberately left behind. Each was re-verified against `main`
`a568340c0`, not carried over on trust:

- **I5 — native browser dialogs.** `Settings.vue` adopted a two-step inline confirm, but
  `TechnicalIndicatorsManager.vue` still calls `alert()` ×3 + `confirm()` ×1 and
  `SystemManager.vue` `confirm()` ×1. `GenericSettingsModal` exists and is unadopted by
  the admin pages.
- **Upstream `reason_code`.** `scripts/production/daily_update.py` emits no `reason_code`;
  `src/utils/quantCopy.ts` localizes quant signals by string-matching the English payload
  as a documented fallback. Add-only field, deliberately deferred so an ETL change and a
  large UI stack never share a deploy window.
- **Vestigial analytics flags.** #222 removed Clarity + GA, but `ga_enabled` /
  `clarity_enabled` survive in `validation.ts`, `types/index.ts` and `state-manager.ts`
  (defaulted `false`, read by nothing).
- **SD-4 — configuration panel.** #218 removed the write-only panel. Reinstating it needs
  a decision on what would actually be wired first; there is no bar for that today.

### 🗂️ True stock-grid virtualization
[#121](https://github.com/romarin-hsieh/investment-dashboard/pull/121) closed the honesty
half of WS-J N2 (search filters the grid, persisted to the URL) and mitigated the cost
with `content-visibility`, but every StockCard still mounts. Real windowing/pagination
was ranked High impact / High effort and remains unbuilt.

### 🧪 Test-suite type coverage + the last Q4 anti-pattern
Two residues from the otherwise-complete testing programs: 41 `*.test.js` files sit
outside `tsconfig.json`'s `include` (production source is 100 % TypeScript; the tests that
exercise it are not type-checked), and Q4 from the test-strategy audit was the one item
[#128](https://github.com/romarin-hsieh/investment-dashboard/pull/128) did not take —
`autoUpdateScheduler.test.js` still asserts on `console.log` substrings rather than state.

### 🖥️ Self-hosted CORS proxy (Cloudflare Worker)
Activate when public proxy failure rate exceeds 5% over 30 days, per [ADR-0002](../architecture/adr/0002-cors-proxy-strategy.md) follow-up. Cloudflare Workers free tier covers our scale.

---

## Later (Design space — one-line theses)

### Research-pipeline integrations (PRD §F14, F15)
- **Co-work**: collaborative research session sharing — *thesis: a session URL that captures dashboard state + chat thread, so the operator can review reasoning with a partner without re-creating context*
- **n8n**: workflow orchestration that *calls* GitHub Actions as steps rather than replacing it — *thesis: chain pre-market research → fundamental ingest → quant signal as a triggerable workflow rather than 4 independent crons*
- **NotebookLM**: research-summary ingestion into the dashboard — *thesis: feed daily Obsidian notes into NotebookLM, surface the synthesised "what changed" briefing as a widget*
- **Obsidian**: knowledge-graph sync to/from Obsidian vault — *thesis: per-stock notes in Obsidian get linked from the StockDetail page; selections from the dashboard get auto-noted*

### Product surface
- **Right-click context menus**: copy symbol, open in TradingView, add to watchlist.
- **Customizable widget layout**: drag-to-rearrange dashboard panels (saved to LocalStorage).
- **Service worker (offline-first)**: render last-known dashboard state when offline; sync on reconnect.

### Engineering hygiene
- **Manual / assistive-tech accessibility pass**: the automated gate (ADR-0015: `@axe-core/playwright`, 7 routes × both themes, zero-violation baselines) is in CI, but axe only catches a fraction of WCAG — real keyboard-only and screen-reader verification is still unperformed
- **E2E golden-path coverage**: the Playwright harness landed with ADR-0015, but `e2e/smoke.spec.ts` only asserts boot + one route change — the Market → StockDetail → tab-switching journey is not yet covered
- **Migration to a paid market-data API** (Polygon / Alpha Vantage): only if free Yahoo path becomes structurally constrained
- **CSP via Cloudflare in front of GitHub Pages**: tightens security beyond what raw GH Pages supports
- **`.git` history purge**: ~3.6 GB of migrated-away data blobs still in history; destructive and rewrites every SHA — deliberately unscheduled

### Not Planned (explicit *Won't*)
The following are listed in [PRD §4 Non-Goals](PRD.md#4-non-goals-explicit) and will be declined:

- Live order routing / broker API integration
- User accounts / cloud sync
- Tick-level streaming
- Social features (comments, copy-trading, leaderboards)
- In-app strategy authoring / backtesting engine
- Mass-market distribution

---

## Cap on *Now* and *Later*

- **Now**: max 5 active workstreams. If a 6th is needed, something must move out.
- **Next**: no hard cap; if list grows beyond 8, prune to highest-confidence items (others fall to *Later*).
- **Later**: capped at 10 distinct items. Anything beyond is signal of indecision — kill or commit.

Currently (2026-08-08): 0 *Now*, 4 *Next*, 12 *Later* items + 6 *Won't*. Between cycles — pick the next workstream from *Next* or run a fresh audit. *Later* bucket is 2 over its 10-item cap — flag for next monthly review to either promote to *Next* or move to *Won't*.

---

## Recently shipped (git log is the record of truth)

- **Documentation Foundation** — PRD + ADRs 0001-0006, DATA_DICTIONARY, BUILD_SPEC, SLA, RUNBOOK, docs reorg. PRs [#1](https://github.com/romarin-hsieh/investment-dashboard/pull/1) – [#4](https://github.com/romarin-hsieh/investment-dashboard/pull/4).
- **WS-A — Design System + a11y** — design tokens, `:focus-visible`, aria-labels, stale-data banner, tablet breakpoint. PRs [#6](https://github.com/romarin-hsieh/investment-dashboard/pull/6) – [#12](https://github.com/romarin-hsieh/investment-dashboard/pull/12).
- **WS-B — Data Correctness + Test Baseline** — Vitest + 14 unit tests + CI gate, `isFinite` formatter, `.toFixed` sweep, inflight Map cleanup, LRU cache eviction. PRs [#13](https://github.com/romarin-hsieh/investment-dashboard/pull/13) – [#21](https://github.com/romarin-hsieh/investment-dashboard/pull/21).
- **WS-C — Performance + Bundle** — Plotly code-split, lazy routes, StockDetail tab lazy-mount, prefetch hints + [ADR-0006](../architecture/adr/0006-static-data-caching-on-github-pages.md). PRs [#17](https://github.com/romarin-hsieh/investment-dashboard/pull/17) – [#20](https://github.com/romarin-hsieh/investment-dashboard/pull/20).
- **Trader keyboard shortcuts** — `j`/`k`/`Enter`/`?` navigation on Stock Overview list. PR [#22](https://github.com/romarin-hsieh/investment-dashboard/pull/22). *(Promoted from Later after Operator request re-prioritised it.)*
- **CI Node 18 → 20 bump** — pre-emptive upgrade before June 2026 deprecation. PR [#23](https://github.com/romarin-hsieh/investment-dashboard/pull/23).
- **WS-D Bundle Analyzer Integration** — `rollup-plugin-visualizer` plugin + per-deploy `bundle-stats` artifact, per-PR delta comment workflow with marker-keyed comment upsert + 35-test `bundle-size-delta.js`, performance budget CI gate enforcing 5 budgets (per-chunk + total) calibrated against measured 2026-04-25 baseline + [ADR-0007](../architecture/adr/0007-bundle-size-budgets.md). PRs [#24](https://github.com/romarin-hsieh/investment-dashboard/pull/24) – [#27](https://github.com/romarin-hsieh/investment-dashboard/pull/27).
- **Local-dev parity sidecar** — bumped `vitest` and `@vitest/coverage-v8` `^2.1.9` → `^4` and removed the dead `#!/usr/bin/env node` shebang from `scripts/bundle-size-delta.js` that rolldown's stricter ESM parser was rejecting. Restored `npm test` 87/87 pass on `vitest 4.1.5 + Node 22 + Windows`, matching CI's existing pass on Linux Node 20. PR [#29](https://github.com/romarin-hsieh/investment-dashboard/pull/29).
- **WS-E Audit Sweep 2026-04-25** — four-PR follow-up sweep on durable findings from the post-WS-D three-lens audit. PR-E1 [#28](https://github.com/romarin-hsieh/investment-dashboard/pull/28) tablet-breakpoint completion + 9-of-11 hex-to-token migration on QuantDashboard (2 of 3 audit-flagged pages confirmed as **CSS hallucinations** via preview_eval and intentionally not touched). PR-E2 [#30](https://github.com/romarin-hsieh/investment-dashboard/pull/30) 6-widget setTimeout unmount cleanup + per-binding `preventDefault` opt-in on `useKeyboardShortcuts`. PR-E3 [#32](https://github.com/romarin-hsieh/investment-dashboard/pull/32) regression-net Vitest baseline for 5 untested services (+47 cases, total 87→134). PR-E4 [#33](https://github.com/romarin-hsieh/investment-dashboard/pull/33) `KeyboardShortcutsOverlay` focus trap + `QuantDashboard` empty-state branch.
- **README & Docs Refresh (2026-06)** — neutral README rewrite (retired Kiro/POC naming) + docs freshness sweep to the external-data model (Fear & Greed source fix, ADR amendments). PRs [#46](https://github.com/romarin-hsieh/investment-dashboard/pull/46), [#59](https://github.com/romarin-hsieh/investment-dashboard/pull/59).
- **Performance — caching (2026-06)** — removed an unsanctioned service worker + dead fetcher, memoized `fetchSystemStatus` in-memory (ADR-0003 Tier-1). PRs [#47](https://github.com/romarin-hsieh/investment-dashboard/pull/47), [#48](https://github.com/romarin-hsieh/investment-dashboard/pull/48).
- **ADR-0008 — Separate Data Repository (2026-06)** — `public/data` moved to `romarin-hsieh/investment-dashboard-data` (same-origin GitHub Pages); the app repo git-ignores data and fetches via a configurable `VITE_DATA_BASE_URL`; the nightly ETL seeds → generates → mirrors. PRs [#49](https://github.com/romarin-hsieh/investment-dashboard/pull/49), [#50](https://github.com/romarin-hsieh/investment-dashboard/pull/50), [#55](https://github.com/romarin-hsieh/investment-dashboard/pull/55), [#56](https://github.com/romarin-hsieh/investment-dashboard/pull/56) + [ADR-0008](../architecture/adr/0008-separate-data-repository.md).
- **WS-G — UI Polish + a11y (2026-06)** — AA-contrast token variants, skeleton-shimmer restore, dark-mode hardcoded-color sweep across 11 components, `--shadow-lg` token + modal/`.btn-save` polish. PRs [#51](https://github.com/romarin-hsieh/investment-dashboard/pull/51)–[#54](https://github.com/romarin-hsieh/investment-dashboard/pull/54).
- **Self-service Add-Symbol (2026-06)** — `add-symbol.yml` workflow + `scripts/add-symbol.js` validate a ticker via yahoo-finance2, auto-fill exchange/sector/industry, append to `config/stocks.json`, and trigger ETL + deploy. PRs [#57](https://github.com/romarin-hsieh/investment-dashboard/pull/57), [#58](https://github.com/romarin-hsieh/investment-dashboard/pull/58).
- **WS-F — Bilingual UI (EN/繁中) (2026-06)** — vue-i18n with build-time message precompilation for CSP compliance (no runtime `eval`), locale switcher, ~45 components migrated to bilingual copy. PRs [#60](https://github.com/romarin-hsieh/investment-dashboard/pull/60)–[#65](https://github.com/romarin-hsieh/investment-dashboard/pull/65) + [ADR-0009](../architecture/adr/0009-i18n-message-precompilation-csp.md).
- **Docs freshness + design-token adoption (2026-06-20)** — docs sweep + the last two i18n gaps (app now 100 % bilingual), the missing space/text/weight/transition/radius scales added to the token layer, one-gutter page model, lossless adoption of 223 colour/radius/shadow literals, dark-mode semantic-state fix, and [ADR-0010](../architecture/adr/0010-design-system-css-tokens.md)/[0011](../architecture/adr/0011-bilingual-i18n-architecture.md)/[0012](../architecture/adr/0012-self-service-add-symbol.md). PRs [#66](https://github.com/romarin-hsieh/investment-dashboard/pull/66)–[#71](https://github.com/romarin-hsieh/investment-dashboard/pull/71).
- **Craft program — anti-slop pass (2026-06-20)** — removed the decorative accent-border tells, typography/motion/spacing scale adoption (753 spacing swaps), Kinetic-State legend. PRs [#72](https://github.com/romarin-hsieh/investment-dashboard/pull/72)–[#78](https://github.com/romarin-hsieh/investment-dashboard/pull/78).
- **Aesthetic ceiling — Market + Quant surfaces (2026-06-21)** — off-scale typography convergence (198 literals snapped to one ramp), Market Overview masthead, Quant Strategy de-terminal light-mode fix → Verdict Plate → phantom-ticker data fix → chart de-neon, lazy-loaded non-active locale (entry 164 → 145 KB gz), gauge/plate polish. PRs [#79](https://github.com/romarin-hsieh/investment-dashboard/pull/79)–[#87](https://github.com/romarin-hsieh/investment-dashboard/pull/87).
- **Token + ETL cleanups (2026-06-22)** — border-radius literals unified onto `--radius-*`, all three chart libraries routed through colour tokens, Dataroma crawl made config-driven from `stocks.json` (de-hardcoded the ticker list). PRs [#89](https://github.com/romarin-hsieh/investment-dashboard/pull/89)–[#93](https://github.com/romarin-hsieh/investment-dashboard/pull/93).
- **WS-H — Component test coverage (2026-07)** — risk-ordered Vue Test Utils expansion behind ratchet floors per [ADR-0013](../architecture/adr/0013-component-test-coverage-policy.md); surfaced and fixed 11 real defects (stale-response races, a `getGrowthClass` crash + payload mutation, a null-price `BEARISH` call, fabricated signals). Global coverage 32.7 % → 38.8 % stmts. PRs [#94](https://github.com/romarin-hsieh/investment-dashboard/pull/94)–[#100](https://github.com/romarin-hsieh/investment-dashboard/pull/100).
- **WS-J — UI/UX remediation top-8 (2026-07)** — Tools menu for the three orphaned routes, greyscale-ramp contrast fix, truthful monitoring pages, `-var()` negation repair + guard, StockDetail tab tokens, token-layer reconnection, grid search wiring + URL persistence. PRs [#116](https://github.com/romarin-hsieh/investment-dashboard/pull/116)–[#121](https://github.com/romarin-hsieh/investment-dashboard/pull/121).
- **WS-I — Test-strategy execution (2026-07)** — all five sequenced PRs per the [test-strategy audit](../audits/2026-07-20-test-strategy.md): state-manager schema-drift resilience, cross-repo indicator contract test, ingestion guards, test-quality teeth (Q1/Q2/Q3/Q5/Q6), and the two-layer a11y + Playwright harness ([ADR-0015](../architecture/adr/0015-accessibility-and-e2e-testing.md)). PRs [#123](https://github.com/romarin-hsieh/investment-dashboard/pull/123)–[#128](https://github.com/romarin-hsieh/investment-dashboard/pull/128), [#135](https://github.com/romarin-hsieh/investment-dashboard/pull/135).
- **WS-F — TypeScript stack unification, COMPLETE (2026-07 → 2026-08)** — from 7 unenforced `.ts` files to a fully strict, fully typed source tree per [ADR-0014](../architecture/adr/0014-typescript-unification.md): the gate itself, ~40 utility/service/API migrations (incl. the two giants `technicalIndicatorsCore` and `yahooFinanceApi`, each behind a characterization suite), all 42 `.vue` SFCs on `<script lang="ts">`, then the strict-flag ratchet — `noImplicitReturns`/`noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. PRs [#101](https://github.com/romarin-hsieh/investment-dashboard/pull/101)–[#112](https://github.com/romarin-hsieh/investment-dashboard/pull/112), [#131](https://github.com/romarin-hsieh/investment-dashboard/pull/131)–[#134](https://github.com/romarin-hsieh/investment-dashboard/pull/134), [#138](https://github.com/romarin-hsieh/investment-dashboard/pull/138)–[#175](https://github.com/romarin-hsieh/investment-dashboard/pull/175), [#187](https://github.com/romarin-hsieh/investment-dashboard/pull/187)–[#192](https://github.com/romarin-hsieh/investment-dashboard/pull/192).
- **Accessibility contrast program (2026-07 → 2026-08)** — WCAG AA colour-contrast cleared route by route, then the gate extended to scan the dark theme, interaction states, and Teleported modals; every route now carries a zero-violation axe baseline in both themes. PRs [#176](https://github.com/romarin-hsieh/investment-dashboard/pull/176)–[#184](https://github.com/romarin-hsieh/investment-dashboard/pull/184), [#196](https://github.com/romarin-hsieh/investment-dashboard/pull/196).
- **Dead-code sweep (2026-08)** — 9 unused components, orphan modules, a dormant client-side fear/greed engine, a write-only smart-money score chain, unused util exports and debug scaffolding removed; CI actions bumped off deprecated Node majors. PRs [#185](https://github.com/romarin-hsieh/investment-dashboard/pull/185)–[#209](https://github.com/romarin-hsieh/investment-dashboard/pull/209).
- **Adversarial round-2 audit + PM foundation (2026-08-07)** — three-lens audit with a skeptic pass and runtime measurement, the PM doc set (user stories / flows / state machines / wireframes / BDD-DDD gap analysis), a Given-When-Then harness, then a 10-PR fix stack: zh-TW register sweep, unified button/card/header grammar, ops honesty (no fake loads, real next-run times, SLO grading), payload-value localization, nav-chrome + stale-chunk recovery, honest surfaces with Unknown states, and ARIA tabs / `th scope` / per-action busy flags. PRs [#210](https://github.com/romarin-hsieh/investment-dashboard/pull/210)–[#219](https://github.com/romarin-hsieh/investment-dashboard/pull/219).
- **Honesty follow-ups (2026-08-07)** — Settings became a real preferences page (privacy disclosure, export/import, two-step clear), cache-busting unified onto one version-keyed policy with a guard test ([ADR-0006](../architecture/adr/0006-static-data-caching-on-github-pages.md) amendment), and Microsoft Clarity + Google Analytics were removed so the privacy statement is true. PRs [#220](https://github.com/romarin-hsieh/investment-dashboard/pull/220)–[#222](https://github.com/romarin-hsieh/investment-dashboard/pull/222).
