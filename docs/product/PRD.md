# Product Requirements Document — Kiro Investment Dashboard

> **Scope of this doc**: Answers *what* the product is and *why* it exists. Users, jobs, features, priorities, acceptance. Does **not** describe *how* it's built — that is in [architecture/OVERVIEW.md](../architecture/OVERVIEW.md) and [architecture/BUILD_SPEC.md](../architecture/BUILD_SPEC.md).
>
> **Owner**: Project owner (solo PM + RD + SA)
> **Status**: Live. Revision: v2.5 (Quant Edition) baseline.
> **Terminology**: Every term in bold traces to [GLOSSARY.md](GLOSSARY.md).

---

## 1. Vision

Kiro Investment Dashboard is **the Bloomberg Terminal for the Static Web** — a zero-maintenance, high-performance, deeply customized investment-analysis dashboard for a single operator and a small circle of core investment partners. It serves *specific* trading hypotheses (MFI-based capital flow, deviation strategies, 3D Quant Kinetic State) that off-the-shelf tools cannot express, and it runs on infrastructure that costs effectively nothing while achieving sub-second load times through aggressive pre-computation.

---

## 2. Target Users & Jobs-to-be-Done

**Users** — synthetic personas, since this is a private tool:

| Persona | Context | Needs |
|---|---|---|
| **The Operator** (project owner) | Taiwan-based self-directed investor; swing/position timeframe; uses Notion + Obsidian for research | Fast morning market scan; evidence for entry decisions; no ads; offline-tolerant |
| **The Core Partners** (≤ 5 people) | Trusted collaborators with aligned trading logic | Shared view of the Operator's signals; read-only; no account system |

**Job Stories** (anchor requirements — keep to 7):

1. **When** the US market is about to open, **I want** to see a prioritized scan of Launchpad/Climax/Dip-Buy candidates across my universe, **so I can** pick entry candidates in <2 minutes.
2. **When** I'm evaluating a single stock, **I want** to see price action + 3D Kinetic State + institutional holdings + insider activity in one view, **so I can** triangulate a thesis without tab-hopping.
3. **When** I'm assessing a position's exit, **I want** the MFI Volume Profile to separate Smart Money vs. Retail volume at price levels, **so I can** judge whether the current price has institutional support.
4. **When** the broad market regime shifts, **I want** an automatic classification (Volatile Uptrend / Bear Risk-Off), **so I can** adjust sizing without reading 10 charts.
5. **When** I share a signal with a partner, **I want** them to see the same data I see with zero friction, **so I can** discuss a setup via a single URL.
6. **When** the ETL pipeline silently fails overnight, **I want** the dashboard to either serve yesterday's data with a clear staleness flag OR fall back to a live API for critical views, **so I can** never make a decision on phantom data.
7. **When** I add a new symbol to my watchlist, **I want** the daily pipeline to automatically include it the next run, **so I can** expand coverage without editing 5 files.

---

## 3. Feature Inventory

| # | Feature | Priority | Status | Spec Link |
|---|---|---|---|---|
| F1 | 3D Quant Kinetic State (Comet Chart) | **M** (Must) | Production | [specs/QUANT_STRATEGY_DOSSIER.md](../specs/QUANT_STRATEGY_DOSSIER.md) |
| F2 | Stock Detail View (Price + Technicals + TradingView) | **M** | Production | [specs/TECHNICAL_INDICATORS.md](../specs/TECHNICAL_INDICATORS.md) |
| F3 | Smart Money Tracking (Dataroma holdings) | **M** | Production | [specs/DATAROMA_INTEGRATION.md](../specs/DATAROMA_INTEGRATION.md) |
| F4 | MFI Volume Profile | **M** | Production | [specs/SMART_MONEY_SCORE_SPEC.md](../specs/SMART_MONEY_SCORE_SPEC.md) |
| F5 | Market Regime / Sector Rotation | **M** | Production | [specs/QUANT_STRATEGY_DOSSIER.md](../specs/QUANT_STRATEGY_DOSSIER.md) |
| F6 | Fear & Greed Index | **S** (Should) | Production | (puppeteer scrape — see DATA_OPERATIONS) |
| F7 | Insider Sentiment Visualization | **S** | Production | [specs/TRADING_MODELS.md](../specs/TRADING_MODELS.md) |
| F8 | Fundamental Analysis Panel | **S** | Production | [specs/TRADING_MODELS.md](../specs/TRADING_MODELS.md) |
| F9 | 3-Tier Cache with Staleness Flags | **M** | Production | [architecture/OVERVIEW.md](../architecture/OVERVIEW.md) |
| F10 | Watchlist / Holdings (LocalStorage) | **S** | Production | (src/types/index.ts) |
| F11 | Automated daily ETL via GitHub Actions | **M** | Production | [operations/DATA_OPERATIONS.md](../operations/DATA_OPERATIONS.md) |
| F12 | Add-new-symbol self-service workflow | **S** | Production | [operations/ADD_NEW_SYMBOL.md](../operations/ADD_NEW_SYMBOL.md) |
| F13 | Automated Test Suite | **S** | ⚠️ Missing | TBD — see ROADMAP.md |
| F14 | Research Ingestion (Obsidian / NotebookLM) | **C** (Could) | Planned | [ROADMAP.md](ROADMAP.md) |
| F15 | n8n-based ETL orchestration | **C** | Planned | [ROADMAP.md](ROADMAP.md) |
| F16 | Bilingual UI (EN / 繁中) | **C** | Partial | [GLOSSARY.md](GLOSSARY.md) |

Priority key: **M** Must-have (shipped or blocking), **S** Should-have (valuable, not blocking), **C** Could-have (nice, backlog), **W** Won't-have (see §4).

---

## 4. Non-Goals (explicit)

The following are **out of scope** and will be declined even if requested:

- **W1 — Live order routing**: No broker API integration. The dashboard is analysis-only.
- **W2 — User accounts / cloud sync**: No login, registration, or server-side profile storage. LocalStorage only.
- **W3 — Tick-level streaming**: No Socket-level real-time quotes. Intraday delay of 1–15 minutes is accepted.
- **W4 — Social / UGC**: No comment boards, copy-trading, leaderboards, or shared feeds.
- **W5 — Full backtesting engine**: No Python-equivalent strategy authoring in-app. Research happens offline; this platform displays *results*.
- **W6 — Mass-market distribution**: Not optimised for anonymous public users. UX assumes operator-level context.

---

## 5. Success Metrics

Metrics are intentionally thin; detailed numeric targets live in [operations/SLA.md](../operations/SLA.md).

| Metric | Target | Why |
|---|---|---|
| Daily ETL success rate | ≥ 95% (rolling 30d) | Data availability is Job #6 |
| Dashboard TTI p75 (home page) | < 2.5 s | Speed is a Core Value |
| Data freshness | < 26 hours | Guarantees next-session data is fresh |
| Broken-link or 404 rate in Static Lake | 0 per day | Stale is tolerable; missing is not |
| Time to add a new tracked symbol | < 10 minutes E2E | Supports Job #7 |

**Explicitly not tracked**: DAU, session length, retention — not meaningful for a private tool.

---

## 6. Acceptance Criteria (P0 / Must-have features only)

### F1 — 3D Quant Kinetic State

```gherkin
Feature: Comet Chart renders kinetic state for the tracked universe

  Scenario: Pre-computed data is fresh (< 24h)
    Given the daily ETL succeeded in the last 24 hours
    When the user navigates to the Market page
    Then the 3D Comet Chart renders within 2 seconds
    And each symbol's position matches (X, Y, Z) from dashboard_status.json
    And symbols in Launchpad / Climax / Dip-Buy states are colour-coded

  Scenario: Pre-computed data is stale
    Given the daily ETL has not succeeded for >24 hours
    When the user navigates to the Market page
    Then the chart still renders using the stale data
    And a "Data may be stale — last updated {timestamp}" banner is shown

  Scenario: Data file is missing
    Given dashboard_status.json returns 404
    When the user navigates to the Market page
    Then a non-destructive error state is shown on that widget only
    And the rest of the page remains interactive
```

### F2 — Stock Detail View

```gherkin
Feature: Stock detail page composes all analytical lenses

  Scenario: User opens a tracked symbol
    Given a valid symbol in the universe
    When the user navigates to /stock/:symbol
    Then price, TradingView chart, technicals, holdings, insider, fundamentals all load
    And P1 widgets (Signal Card, 3D chart) render within 1 second
    And P3 widgets (Holdings, Fundamentals) lazy-load as they scroll into view
```

### F6 — Stale-but-not-Broken Fallback

```gherkin
Feature: 3-Tier cache degradation

  Scenario: Tier 2 data is available and fresh
    Then data is served from static JSON in ~50ms

  Scenario: Tier 2 data is 404
    Then system transparently falls back to Tier 3 (CORS proxy to Yahoo Finance)
    And user sees a "Live data" indicator

  Scenario: Tier 3 also fails
    Then user sees a widget-scoped error state with Retry
    And the rest of the app remains functional
```

### F11 — Automated Daily ETL

```gherkin
Feature: Nightly pipeline maintains the Static Lake

  Scenario: Happy path
    Given it is 02:00 UTC
    When the daily-data-update GitHub Action triggers
    Then OHLCV, indicators, fundamentals, sentiment, and quant status all update
    And a single commit is pushed to main with the new data
    And the total run time is under 15 minutes

  Scenario: One symbol fails
    Given symbol XYZ throws during fetch
    When the pipeline continues
    Then the error is logged but other symbols proceed
    And yesterday's XYZ data remains in place (stale > broken)
```

---

## 7. Open Questions / Decisions Needed

1. **Testing strategy**: F13 is Should-have but currently missing (zero test coverage). Does the next iteration prioritise (a) Vitest component tests for critical widgets, (b) Python integration tests for the quant pipeline, or (c) Playwright E2E for the user-facing golden paths? → Needs ADR.
2. **Research-to-site integration path** (F14/F15): Which platform owns the daily note — Obsidian (local, Markdown) or NotebookLM (cloud, summarization)? What JSON contract does the frontend consume? → Needs a dedicated ADR in the next cycle.
3. **Bilingual UI (F16)**: Full i18n framework (vue-i18n), or just swap copy via a lightweight lookup? Glossary is locked; implementation strategy is not. → Defer to ROADMAP v3.1.
4. **CORS proxy SLA**: Tier-3 fallback depends on free third-party proxies. At what failure rate do we invest in a self-hosted proxy? → Track in SLA.md after one quarter of data.
5. **Universe cap**: Currently ~50 active symbols in quant engine but `public/data/ohlcv/` hosts ~560. What's the upper bound before CI time becomes a bottleneck? → Monitor, revisit at 100 symbols.

---

## 8. Related Documents

- **Architecture**: [architecture/OVERVIEW.md](../architecture/OVERVIEW.md), [architecture/BUILD_SPEC.md](../architecture/BUILD_SPEC.md)
- **Decision records**: [architecture/adr/](../architecture/adr/)
- **Algorithm specs**: [specs/](../specs/)
- **Operations**: [operations/DATA_OPERATIONS.md](../operations/DATA_OPERATIONS.md), [operations/RUNBOOK.md](../operations/RUNBOOK.md), [operations/SLA.md](../operations/SLA.md)
- **Roadmap**: [ROADMAP.md](ROADMAP.md)
- **Vocabulary**: [GLOSSARY.md](GLOSSARY.md)
