# Roadmap

> **Scope of this doc**: Forward-looking horizons for Investment Dashboard. *Now* lists active workstreams. *Next* lists committed-but-not-started work. *Later* lists ideas with one-line theses — design space, not commitments.
>
> **Cadence**: Review monthly. Move items between horizons as priorities change. *Now* should never have more than ~5 active workstreams.
>
> **Distinction from PRD**: The [PRD](PRD.md) describes the *current* product. This document describes *direction*. When a *Later* item moves to *Next*, write a spec for it.

---

## Now (Active — being executed)

### 🔤 WS-F — TypeScript stack unification (started 2026-07-20)
Making TypeScript real and then migrating `.js` → `.ts` incrementally behind a strict
typecheck gate, governed by [ADR-0014](../architecture/adr/0014-typescript-unification.md).
The gate (`vue-tsc --noEmit`) runs in CI before the tests; `strict` is never relaxed to make
a migration pass. **16 `.ts` files so far** (was 7): the type gate itself, then `baseUrl`,
`designTokens`, `mfi`, `dataVersionService`, `technicalIndicatorsCache`, `performanceCache`,
`performanceMonitor`, `mfiVolumeProfile`, `autoUpdateScheduler`. See the ADR-0014 progress
table for the per-batch log and what remains. The migration has also forced out real bugs
(an `isChecking` latch, null-laundering `new Array()` intermediates), each fixed with a
regression test.

### 🧪 WS-H — Component test coverage (2026-07-20, shipped)
Risk-weighted expansion of Vue Test Utils coverage, governed by [ADR-0013](../architecture/adr/0013-component-test-coverage-policy.md). Coverage is gated by **ratchet floors** in `vitest.config.js` (global + per-file), mirroring the ADR-0007 bundle-size contract. Six components migrated in risk order: `NavigationPanel` → `StockCard` → `TechnicalIndicators` → `MFIVolumeProfilePanel` → `FundamentalAnalysis` → `StockOverview`, each PR raising its own floor. The planning pass also surfaced 11 real defects (stale-response races, `getGrowthClass` crash + payload mutation, null-price `BEARISH` call, fabricated signals) which were fixed alongside their regression tests. Global coverage 32.7% → 38.8% stmts.

---

## Next (Committed but not yet started)

### 🧪 WS-I — Test-strategy execution
Five sequenced test PRs per the [2026-07-20 test-strategy audit](../audits/2026-07-20-test-strategy.md): state-manager resilience (stops silent portfolio loss) → data-repo contract/golden-file tier → ingestion guards (fetcher/Yahoo/ohlcv) → test-quality anti-pattern fixes → first page-integration + a11y/E2E harness. Each PR raises its coverage floors per ADR-0013.

### 🎨 WS-J — UI/UX remediation (top-8)
Ranked fixes per the [2026-07-20 adversarial UI/UX audit](../audits/2026-07-20-adversarial-uiux-audit.md): navigation for the three orphaned routes, dark-mode grey-token contrast (WCAG AA), truthful monitoring pages (AutoUpdateMonitor / clear-cache no-ops), StockDetail tab tokens, `-var()` CSS fix + stylelint guard, stock-grid virtualization + search wiring, token-layer consolidation.

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
- **Full WCAG 2.1 AA pass**: beyond the *minimums* WS-A delivers
- **E2E (Playwright) golden-path coverage**: Market → StockDetail → tab switching, gated in CI
- **Migration to a paid market-data API** (Polygon / Alpha Vantage): only if free Yahoo path becomes structurally constrained
- **CSP via Cloudflare in front of GitHub Pages**: tightens security beyond what raw GH Pages supports

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

Currently: 0 *Now*, 3 *Next*, 11 *Later* items + 6 *Won't*. Between cycles — pick the next workstream from *Next* or run a fresh audit. *Later* bucket is 1 over its 10-item cap — flag for next monthly review to either promote to *Next* or move to *Won't*.

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
