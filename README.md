# Investment Dashboard

**English** | [繁體中文](README.zh-TW.md)

[![Tests](https://github.com/romarin-hsieh/investment-dashboard/actions/workflows/test.yml/badge.svg)](https://github.com/romarin-hsieh/investment-dashboard/actions/workflows/test.yml)
[![Deploy](https://github.com/romarin-hsieh/investment-dashboard/actions/workflows/deploy.yml/badge.svg)](https://github.com/romarin-hsieh/investment-dashboard/actions/workflows/deploy.yml)

A static, single-page web application for personal equity research. A nightly GitHub Actions
pipeline pre-computes market data and quantitative signals into JSON; the browser loads and
renders those files directly. There is no backend server, no database, and no runtime cost.

**Live:** https://romarin-hsieh.github.io/investment-dashboard/
**UI:** English / 繁體中文 · light and dark themes · desktop-first

---

## Purpose

The product compresses a daily pre-market review into a single workflow: scan a personal
universe of **138 US equities**, classify each by trend / momentum / structure, then drill
into any symbol for technical indicators, institutional positioning, and fundamentals —
all against data that was computed once, overnight, under version control.

The design constraint that shapes everything else: **operate at zero hosting cost with a
one-day data cadence.** Decisions that look unusual for a market app (no streaming quotes,
no accounts, static JSON as the data plane) follow directly from that constraint, and are
recorded as architecture decision records rather than left implicit.

This is an analysis tool. It displays descriptive signals; it does not execute trades or
produce investment recommendations.

---

## Product scope

**In scope**

- Daily-cadence analysis of a curated universe (138 symbols, self-service expansion via
  [ADR-0012](docs/architecture/adr/0012-self-service-add-symbol.md))
- Pre-computed technical indicators, market-regime and sector-rotation context,
  institutional holdings (Dataroma 13F) and insider sentiment, per-symbol fundamentals
- Bilingual UI (EN / 繁體中文), light/dark themes, keyboard navigation
- Operational visibility: pipeline status, data freshness, cache state

**Out of scope — deliberate exclusions, not gaps**

| Excluded | Rationale |
|---|---|
| Trade execution / brokerage integration | Analysis only. No credentials to hold, no order-routing risk, no regulatory surface. |
| Real-time streaming quotes | The product decision cycle is daily. Streaming would force a backend, websockets, and standing cost for no decision value; embedded TradingView widgets cover intraday charting. |
| User accounts / multi-tenancy | Single-operator product on static hosting; a static site cannot hold server-side secrets, and adding auth infrastructure contradicts the zero-cost constraint. |
| Backend services of any kind | The data is a once-daily batch product. A server would add an attack surface and a bill, and improve freshness by nothing ([ADR-0001](docs/architecture/adr/0001-static-first-architecture.md)). |
| Investment advice / recommendations | Signals are descriptive statistics with documented formulas ([specs](docs/specs/TECHNICAL_INDICATORS.md)), not prescriptions. |

Full product definition and acceptance criteria: [PRD](docs/product/PRD.md) (non-goals in §4).

---

## Core features

| Area | What it provides |
|---|---|
| **Market overview** | Market-regime classification, Fear & Greed gauge, sector rotation, index and volatility context — the top-down read before any symbol-level decision. |
| **Kinetic State screen** | Every tracked symbol plotted on three axes (trend / momentum / structure) and classified into named states (Launchpad, Climax, Dip-Buy, …). Exists so 138 symbols can be triaged in minutes instead of chart-by-chart. |
| **Stock detail** | Per-symbol page: TradingView chart, an indicator panel spanning the standard practitioner families (trend: MA/Ichimoku/SAR · momentum: RSI/Stochastic/CCI/MACD · volume: OBV/MFI/CMF · volatility: ATR/Beta), pivot points, candlestick patterns. The set was chosen for recognizability and cross-checkability against TradingView, not novelty. |
| **MFI Volume Profile** | Volume decomposed by price level, separating likely institutional from retail flow; marks the point of control and value area to judge whether a level has institutional support. |
| **Smart-money tracking** | Holdings of tracked institutional investors (Dataroma 13F) and insider-trade sentiment per symbol. |
| **Operations pages** | Pipeline status, data freshness, and cache management — a data product is only trustworthy if its staleness is observable. |

Signal definitions: [glossary](docs/product/GLOSSARY.md) · quant methodology:
[strategy dossier](docs/specs/QUANT_STRATEGY_DOSSIER.md).

---

## Architecture

```
GitHub Actions (nightly ETL)          GitHub Pages                    Browser
┌─────────────────────────┐   commit   ┌──────────────┐    HTTPS   ┌─────────────────────┐
│ Python + Node pipeline: │ ─────────▶ │ data repo    │ ─────────▶ │ Vue 3 SPA           │
│ OHLCV, indicators,      │            │ (static JSON)│            │ 3-tier cache:       │
│ snapshots, 13F, macro   │            └──────────────┘            │ memory+localStorage │
└─────────────────────────┘                                        │ → static JSON       │
                                                                   │ → live API fallback │
                                                                   └─────────────────────┘
```

Data flows one way: the pipeline writes versioned JSON into a separate data repository;
the app reads it through a three-tier cache (in-browser → static file → live Yahoo Finance
fallback through a CORS proxy). Figures can therefore be up to ~24 h old; the UI surfaces
a staleness banner when the last update exceeds the freshness window.

### Design decisions and tradeoffs

Each decision below had a credible alternative; the reasoning is recorded in an ADR.

| Decision | Alternative considered | Why this won |
|---|---|---|
| Static-first, no backend ([ADR-0001](docs/architecture/adr/0001-static-first-architecture.md)) | Node/serverless API layer | Data is a daily batch product — a server improves freshness by nothing while adding cost, ops, and attack surface. Static JSON snapshots are also reviewable in git. |
| Separate data repository ([ADR-0008](docs/architecture/adr/0008-separate-data-repository.md)) | Commit data into the app repo | Nightly data commits would bury the code history and couple app deploys to data pushes. Separation gives each repo its own cadence and retention policy. |
| Three-tier cache ([ADR-0003](docs/architecture/adr/0003-three-tier-cache-model.md)) | Always fetch static files | Repeat views resolve from memory/localStorage in ~0 ms; the live-API tier exists only as a fallback for files the pipeline has not produced. |
| Pre-compiled i18n messages ([ADR-0009](docs/architecture/adr/0009-i18n-message-precompilation-csp.md)) | Runtime message compiler | The runtime compiler requires CSP `unsafe-eval`. Build-time compilation keeps a strict CSP — a hard requirement, since the app renders third-party market data. |
| Incremental TypeScript migration ([ADR-0014](docs/architecture/adr/0014-typescript-unification.md)) | Big-bang rewrite, or staying on JS | A 100+-file rewrite is unreviewable and regression-prone. Instead: install a strict `vue-tsc` CI gate first, then migrate leaves-first in small provably behaviour-preserving batches — the 1,256-line indicator core was pinned by a 91-case characterization suite before it moved. |
| Coverage ratchet instead of a fixed threshold ([ADR-0013](docs/architecture/adr/0013-component-test-coverage-policy.md)) | Global fixed coverage bar | A fixed bar either blocks unrelated PRs on legacy gaps or sits uselessly low. Per-file floors set at measured-minus-one only ever rise, so coverage can regress nowhere without failing CI. |

All 14 ADRs: [docs/architecture/adr/](docs/architecture/adr/README.md).

---

## Engineering practice

Solo-maintained, which raises the bar for automation: CI is the reviewer of record.
Every push and pull request must pass:

1. **Type gate** — `vue-tsc --noEmit` under `strict`; the config is never loosened to make
   a change pass.
2. **Test suite with coverage ratchet** — Vitest + Vue Test Utils; global and per-file
   coverage floors that only move up. The suite includes two matrix guards: EN/繁中
   message-key parity, and a WCAG contrast check that computes every AA-critical
   token pair in both themes from the real CSS.
3. **Bundle-size budgets** — per-chunk and total gzip budgets with a per-PR delta comment
   ([ADR-0007](docs/architecture/adr/0007-bundle-size-budgets.md)).

Testing approach, in order of leverage:

- **Characterization (golden-master) suites** for deterministic math — expected values are
  generated from the real implementation, so any behavioural drift during refactoring
  fails loudly. This is what made the TypeScript migration of the indicator core provable
  rather than hopeful.
- **Defect-pinned regression tests** — every bug fix ships with a test that fails on the
  pre-fix code and names the user-visible symptom it prevents.
- **Structural matrix guards** — i18n parity and token contrast are computed properties of
  the codebase, so they are asserted wholesale rather than sampled.

### Known limitations

The project runs recurring adversarial self-audits; the current findings are published
rather than smoothed over:

- [UI/UX & accessibility audit (2026-07-20)](docs/audits/2026-07-20-adversarial-uiux-audit.md) —
  18 verified findings, led by: a dark-mode contrast failure on tab labels, three
  operations pages that misreport pipeline health, orphaned routes missing from the
  navigation, and an un-virtualized 138-card overview page.
- [Test-design & coverage strategy (2026-07-20)](docs/audits/2026-07-20-test-strategy.md) —
  the external-data ingestion layer and all route-level pages are effectively untested;
  the document sequences the next five test PRs by risk.

---

## Getting started

Requires Node 20+. Python 3.11+ is needed only to run the data pipeline locally.

```bash
git clone https://github.com/romarin-hsieh/investment-dashboard.git
cd investment-dashboard
npm install
npm run seed-data    # populate public/data/ from the data repo (data is not committed here)
npm run dev          # http://localhost:3000
```

`seed-data` is mandatory on first run — the app renders nothing without the data files
([setup guide](docs/contributing/DATA_REPO_SETUP.md)).

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | `vue-tsc --noEmit` (the CI type gate) |
| `npm test` | Full Vitest suite, single run |
| `npm run test:coverage` | Suite plus v8 coverage report |

---

## Data pipeline

Production data is regenerated nightly by GitHub Actions
([`daily-data-update.yml`](.github/workflows/daily-data-update.yml),
[`update-metadata.yml`](.github/workflows/update-metadata.yml),
[`dataroma-stock-update.yml`](.github/workflows/dataroma-stock-update.yml)) and pushed to
the data repository. Local regeneration, for previewing pipeline changes:

```bash
npm run update-daily        # OHLCV + technical indicators + daily & quotes snapshots
npm run fetch:fundamentals  # fundamentals (separate workflow in production)
npm run update:sentiment    # insider sentiment (separate workflow in production)
```

Schedules and maintenance procedures: [DATA_OPERATIONS.md](docs/operations/DATA_OPERATIONS.md) ·
incident playbooks: [RUNBOOK.md](docs/operations/RUNBOOK.md) ·
service objectives: [SLA.md](docs/operations/SLA.md).

---

## Repository layout

```
src/
  pages/         route-level views (market overview, stock overview/detail, operations pages)
  components/    reusable UI (StockCard, indicator panels, volume profile, chart widgets)
  composables/   useTheme, useLocale, useKeyboardShortcuts
  services/      navigation, scroll-spy, OHLCV and quant data access
  api/           external-data ingestion (Yahoo Finance client, precomputed-indicator readers)
  utils/         indicator math, caching, validation, metadata, design-token helpers
  locales/       en.json, zh-TW.json (compiled at build time)
  styles/        design tokens; theme, radius/shadow/spacing/type scales
scripts/         nightly ETL (Python + Node) and data tooling
docs/            PRD, 14 ADRs, specs, runbooks, audits — start at docs/INDEX.md
public/data/     pre-computed JSON, seeded from the data repo (not committed)
```

---

## Documentation

[docs/INDEX.md](docs/INDEX.md) is the navigation hub. High-traffic entries:

- [PRD](docs/product/PRD.md) — product definition, users, non-goals
- [Architecture overview](docs/architecture/OVERVIEW.md) and [ADR index](docs/architecture/adr/README.md)
- [Data dictionary](docs/specs/DATA_DICTIONARY.md) — schema of every file in `public/data/`
- [Adding a symbol](docs/operations/ADD_NEW_SYMBOL.md) — the self-service universe workflow
- [Audits](docs/audits/) — adversarial UI/UX and test-strategy reviews

## Contributing

Small, focused pull requests against `main`, squash-merged. Keep every CI gate green;
when a change fixes a bug, the regression test lands in the same PR. Gates are never
weakened to make a change pass — fix the code, not the gate.
