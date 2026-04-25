# Roadmap

> **Scope of this doc**: Forward-looking horizons for Kiro Investment Dashboard. *Now* lists active workstreams. *Next* lists committed-but-not-started work. *Later* lists ideas with one-line theses — design space, not commitments.
>
> **Cadence**: Review monthly. Move items between horizons as priorities change. *Now* should never have more than ~5 active workstreams.
>
> **Distinction from PRD**: The [PRD](PRD.md) describes the *current* product. This document describes *direction*. When a *Later* item moves to *Next*, write a spec for it.

---

## Now (Active — being executed)

*No active workstream this cycle.* WS-D Bundle Analyzer Integration shipped 2026-04-25 (see *Recently shipped*). Next pickable items are in *Next*.

---

## Next (Committed but not yet started)

### 🧪 Component test coverage expansion
Once the Vitest baseline (WS-B PR-B1) is in place, expand to Vue Test Utils tests for the three largest components: `MFIVolumeProfilePanel.vue` (1024 LOC), `StockOverview.vue` (1011 LOC), `FundamentalAnalysis.vue` (932 LOC). Goal: catch UI regressions when refactoring those monoliths. Decision will live in an ADR.

### 🔄 TypeScript migration of top 5 critical `.js` files
In priority order: `yahooFinanceApi.js` (1380 LOC), `technicalIndicatorsCore.js` (1256), `mfiVolumeProfile.js` (402), `autoUpdateScheduler.js` (435), `technicalIndicatorsCache.js` (418). These are the largest sources of silent type-safety risk. Run after WS-B unit tests are in place so we have a regression net.

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
- **Bilingual UI (vue-i18n)**: full EN/繁中 toggle. Glossary already exists; framework integration is the missing piece.
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

Currently: 0 *Now*, 3 *Next*, 12 *Later* items + 6 *Won't*. Between cycles — pick the next workstream from *Next* or run a fresh audit. *Later* bucket is 2 over its 10-item cap — flag for next monthly review to either promote to *Next* or move to *Won't*.

---

## Recently shipped (git log is the record of truth)

- **Documentation Foundation** — PRD + ADRs 0001-0006, DATA_DICTIONARY, BUILD_SPEC, SLA, RUNBOOK, docs reorg. PRs [#1](https://github.com/romarin-hsieh/investment-dashboard/pull/1) – [#4](https://github.com/romarin-hsieh/investment-dashboard/pull/4).
- **WS-A — Design System + a11y** — design tokens, `:focus-visible`, aria-labels, stale-data banner, tablet breakpoint. PRs [#6](https://github.com/romarin-hsieh/investment-dashboard/pull/6) – [#12](https://github.com/romarin-hsieh/investment-dashboard/pull/12).
- **WS-B — Data Correctness + Test Baseline** — Vitest + 14 unit tests + CI gate, `isFinite` formatter, `.toFixed` sweep, inflight Map cleanup, LRU cache eviction. PRs [#13](https://github.com/romarin-hsieh/investment-dashboard/pull/13) – [#21](https://github.com/romarin-hsieh/investment-dashboard/pull/21).
- **WS-C — Performance + Bundle** — Plotly code-split, lazy routes, StockDetail tab lazy-mount, prefetch hints + [ADR-0006](../architecture/adr/0006-static-data-caching-on-github-pages.md). PRs [#17](https://github.com/romarin-hsieh/investment-dashboard/pull/17) – [#20](https://github.com/romarin-hsieh/investment-dashboard/pull/20).
- **Trader keyboard shortcuts** — `j`/`k`/`Enter`/`?` navigation on Stock Overview list. PR [#22](https://github.com/romarin-hsieh/investment-dashboard/pull/22). *(Promoted from Later after Operator request re-prioritised it.)*
- **CI Node 18 → 20 bump** — pre-emptive upgrade before June 2026 deprecation. PR [#23](https://github.com/romarin-hsieh/investment-dashboard/pull/23).
- **WS-D Bundle Analyzer Integration** — `rollup-plugin-visualizer` plugin + per-deploy `bundle-stats` artifact, per-PR delta comment workflow with marker-keyed comment upsert + 35-test `bundle-size-delta.js`, performance budget CI gate enforcing 5 budgets (per-chunk + total) calibrated against measured 2026-04-25 baseline + [ADR-0007](../architecture/adr/0007-bundle-size-budgets.md). PRs [#24](https://github.com/romarin-hsieh/investment-dashboard/pull/24) – [#27](https://github.com/romarin-hsieh/investment-dashboard/pull/27).
