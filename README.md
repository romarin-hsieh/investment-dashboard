# Investment Dashboard

A static single-page web application for personal stock-market analysis. There is
no backend server: a nightly GitHub Actions pipeline pre-computes market data and
quantitative signals into JSON files, which the browser loads and renders. It is
deployed on GitHub Pages and is read-only — analysis only, not a trading platform.

**Live:** https://romarin-hsieh.github.io/investment-dashboard/

## Core features

- **Market overview** — A daily scan of the tracked universe. Each stock is plotted
  on a 3-axis "Kinetic State" chart (Trend / Momentum / Structure) and classified
  into states such as Launchpad, Climax, or Dip-Buy, for a quick pre-open screen.
- **Stock detail** — A per-symbol view combining price action, a TradingView chart,
  technical indicators, the stock's Kinetic State, institutional holdings, insider
  activity, and fundamentals on one page.
- **MFI Volume Profile** — Breaks down traded volume by price level and separates
  likely institutional ("smart money") from retail flow, to judge whether a price
  level has institutional support. Marks the Point of Control (highest-volume price)
  and the value area.
- **Smart Money tracking** — Tracks notable institutional investors' holdings
  (Dataroma 13F filings) and insider-trade sentiment per symbol.
- **Market regime & sector rotation** — Classifies the broad-market regime
  (e.g. Volatile Uptrend / Bear Risk-Off) and shows sector rotation, plus the
  Fear & Greed index.
- **Fundamentals** — Per-symbol fundamental metrics.

Signal definitions are in the [glossary](docs/product/GLOSSARY.md); the math behind
the quant signals is in the [quant strategy dossier](docs/specs/QUANT_STRATEGY_DOSSIER.md).

## How it works

There is no runtime backend. A nightly GitHub Actions job runs the ETL pipeline,
commits pre-computed JSON into `public/data/`, and GitHub Pages serves it. The
browser reads those files through a 3-tier cache:

1. In-browser cache (instant on repeat views)
2. Static JSON from GitHub Pages (~50 ms)
3. Live API fallback (Yahoo Finance via CORS proxy) when a file is missing

Because data is regenerated once a day, figures can be up to ~24 h old; a staleness
banner appears when the last update exceeds the freshness window.

## Run it locally

```bash
git clone https://github.com/romarin-hsieh/investment-dashboard.git
cd investment-dashboard
npm install
npm run dev          # http://localhost:3000
```

Requires Node 20+. Python 3.11+ is only needed to run the data pipeline locally.

## Regenerate data locally

```bash
npm run update-daily        # OHLCV + technical indicators + daily & quotes snapshots
npm run fetch:fundamentals  # fundamentals (separate)
npm run update:sentiment    # insider sentiment (separate)
```

`update-daily` does **not** refresh Dataroma holdings, fundamentals, or sentiment —
those are separate scripts/workflows. In production all of them run nightly via
GitHub Actions; running them locally is only for previewing before the daily job.

## Common operator tasks

- **Add a tracked symbol** → [operations/ADD_NEW_SYMBOL.md](docs/operations/ADD_NEW_SYMBOL.md)
- **What runs nightly (schedules)** → [operations/DATA_OPERATIONS.md](docs/operations/DATA_OPERATIONS.md)
- **When the pipeline breaks** → [operations/RUNBOOK.md](docs/operations/RUNBOOK.md)

## Documentation

Start at [docs/INDEX.md](docs/INDEX.md) — the documentation hub. Product scope and
non-goals (no live trading, no accounts, no streaming) are in
[PRD §4](docs/product/PRD.md#4-non-goals-explicit).
