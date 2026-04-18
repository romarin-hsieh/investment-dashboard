# Roadmap

> **Scope of this doc**: Forward-looking horizons for Kiro Investment Dashboard. *Now* lists active workstreams. *Next* lists committed-but-not-started work. *Later* lists ideas with one-line theses — design space, not commitments.
>
> **Cadence**: Review monthly. Move items between horizons as priorities change. *Now* should never have more than ~5 active workstreams.
>
> **Distinction from PRD**: The [PRD](PRD.md) describes the *current* product. This document describes *direction*. When a *Later* item moves to *Next*, write a spec for it.

---

## Now (Active — being executed)

### 📚 Documentation Foundation Complete (in flight, this PR)
The reorg of `/docs/` into `product/`, `architecture/`, `specs/`, `operations/`, `contributing/`, plus the introduction of PRD, ADRs, DATA_DICTIONARY, BUILD_SPEC, SLA, and RUNBOOK. Closes the gap where the project had 47 markdown files but no canonical PM/SA artifacts. Tracked in PR #1 (Session 1) and a follow-up PR (Sessions 2 + 3).

### 🛠️ Code Risk + UI Quality Remediation (queued for next PR cycle)
Multi-PR roadmap responding to a 70-finding three-lens audit (code risk, performance, UI/UX). Three workstreams in priority order:

- **WS-A — Design System Foundation**: extract ~465 hard-coded `#hex` colors into design tokens, add `:focus-visible` accessibility minimums, upgrade stale-data banner prominence, add tablet breakpoint
- **WS-B — Data Correctness & Test Baseline**: Vitest harness + 5–8 unit tests on quant utils, `isFinite` formatter wrapper, fix `inflightRequests` Map leaks, LRU cache eviction
- **WS-C — Performance & Bundle**: Plotly code-split, lazy routes, StockDetail tab lazy-mount, `Cache-Control` headers for the Static Lake

Detailed plan in the project plan file. Activates as soon as this docs reorg PR merges.

---

## Next (Committed but not yet started)

### 🧪 Component test coverage expansion
Once the Vitest baseline (WS-B PR-B1) is in place, expand to Vue Test Utils tests for the three largest components: `MFIVolumeProfilePanel.vue` (1024 LOC), `StockOverview.vue` (1011 LOC), `FundamentalAnalysis.vue` (932 LOC). Goal: catch UI regressions when refactoring those monoliths. Decision will live in an ADR.

### 🔄 TypeScript migration of top 5 critical `.js` files
In priority order: `yahooFinanceApi.js` (1380 LOC), `technicalIndicatorsCore.js` (1256), `mfiVolumeProfile.js` (402), `autoUpdateScheduler.js` (435), `technicalIndicatorsCache.js` (418). These are the largest sources of silent type-safety risk. Run after WS-B unit tests are in place so we have a regression net.

### 🖥️ Self-hosted CORS proxy (Cloudflare Worker)
Activate when public proxy failure rate exceeds 5% over 30 days, per [ADR-0002](../architecture/adr/0002-cors-proxy-strategy.md) follow-up. Cloudflare Workers free tier covers our scale.

### 📊 Bundle analyzer integration
Add `vite-bundle-visualizer` to the build, output a `stats.html` artifact, surface size deltas in PR descriptions. Foundation for ongoing performance budget enforcement.

---

## Later (Design space — one-line theses)

### Research-pipeline integrations (PRD §F14, F15)
- **Co-work**: collaborative research session sharing — *thesis: a session URL that captures dashboard state + chat thread, so the operator can review reasoning with a partner without re-creating context*
- **n8n**: workflow orchestration that *calls* GitHub Actions as steps rather than replacing it — *thesis: chain pre-market research → fundamental ingest → quant signal as a triggerable workflow rather than 4 independent crons*
- **NotebookLM**: research-summary ingestion into the dashboard — *thesis: feed daily Obsidian notes into NotebookLM, surface the synthesised "what changed" briefing as a widget*
- **Obsidian**: knowledge-graph sync to/from Obsidian vault — *thesis: per-stock notes in Obsidian get linked from the StockDetail page; selections from the dashboard get auto-noted*

### Product surface
- **Bilingual UI (vue-i18n)**: full EN/繁中 toggle. Glossary already exists; framework integration is the missing piece.
- **Keyboard shortcuts**: trader-grade `j`/`k` navigation, `Enter` for detail, `s` to star — Operator persona has explicitly requested this.
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

Currently: 2 *Now*, 4 *Next*, 9 *Later* + 6 *Won't*. Within limits.
