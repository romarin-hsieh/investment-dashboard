# Architecture Overview

> **Scope of this doc**: Describes *how* the system is structured at the container / data-flow level. Does **not** cover interface contracts (see [BUILD_SPEC.md](BUILD_SPEC.md)) or specific algorithm math (see [specs/](../specs/)).
>
> **Audience**: Engineers reading the codebase for the first time, and reviewers of ADRs.

---

## 1. System Context (C4 — Level 1)

```
                    ┌─────────────────────────────────┐
                    │        End Users (Browser)       │
                    │    Operator + Core Partners      │
                    └─────────────────┬───────────────┘
                                      │ HTTPS
                                      ▼
              ┌────────────────────────────────────────┐
              │   GitHub Pages (CDN) — the Runtime     │
              │   Serves static HTML/JS/CSS + JSON     │
              └─────────┬───────────────────┬──────────┘
                        │ reads             │ (fallback only)
                        │                   ▼
                        │           ┌─────────────────┐
                        │           │  CORS Proxies   │───► Yahoo Finance
                        │           │ (rotated list)  │
                        │           └─────────────────┘
                        │
              ┌─────────▼──────────────────────────────┐
              │  Static Lake (public/data/*.json)       │
              │  Golden Source — updated nightly        │
              └─────────▲───────────────────────────────┘
                        │ commits (02:00 UTC daily)
              ┌─────────┴───────────────────────────────┐
              │   GitHub Actions — the "Backend"        │
              │   Python + Node.js ETL Pipeline          │
              └─────────┬───────────────────────────────┘
                        │ scrapes / fetches
                        ▼
           ┌─────────┬─────────┬─────────┬──────────┐
           │ Yahoo   │ Dataroma│ CNN Fear│ (future) │
           │ Finance │ 13F data│ & Greed │ Obsidian │
           └─────────┴─────────┴─────────┴──────────┘
```

**Key insight**: there is no runtime backend. The "backend" is a nightly CI job that produces JSON files. All runtime logic lives in the browser.

---

## 2. The Static-First Paradigm

The dashboard operates on a **Serverless / Static-First** architecture. There is no Node.js/Python server handling user requests. Instead, the application relies on a **Static Lake** of pre-computed JSON files hosted on GitHub Pages (CDN).

**Why this model** (see [ADR-0001](adr/0001-static-first-architecture.md)):
- Operating cost approaches $0
- Inherits GitHub Pages SLA (high)
- No DB or cache server to maintain
- Heavy compute runs once per day in CI, not per-request

**Trade-offs accepted**:
- Data freshness capped at ~24h
- No personalised server-side features
- Pipeline failures require manual observation (no paging)

---

## 3. The 3-Tier Cache Strategy

The frontend data layer (`src/services/`, `src/api/`, `src/utils/performanceCache.js`) uses a strict fallback hierarchy:

| Tier | Source | Latency | TTL | Role |
|---|---|---|---|---|
| **1** | In-memory Map + LocalStorage | < 5 ms | Session / 10 min | Instant re-navigation |
| **2** | Static JSON (GitHub Pages CDN) | ~50 ms | 24 h | **Golden Source** — 99% of reads |
| **3** | Live API via CORS Proxy (Yahoo Finance) | ~500 ms | 0 (live) | **Fallback only** — 404s or explicit real-time request |

See [ADR-0003](adr/0003-three-tier-cache-model.md) for rationale and [ADR-0002](adr/0002-cors-proxy-strategy.md) for the proxy strategy.

---

## 4. Data Pipeline (ETL) — Daily at 02:00 UTC

The `daily-data-update.yml` workflow runs three logical phases. For the operational playbook see [operations/DATA_OPERATIONS.md](../operations/DATA_OPERATIONS.md).

### Phase 1 — Market Data Acquisition

| Output | Source | Script |
|---|---|---|
| `public/data/ohlcv/{symbol}.json` | Yahoo Finance | `scripts/generate-real-ohlcv-yfinance.py` |
| `public/data/symbols_metadata.json` | yahoo-finance2 | `scripts/fetch-fundamentals.js` |
| `public/data/technical-indicators/fear-greed.json` | CNN F&G (Puppeteer) | `scripts/precompute-with-browser.js` |

### Phase 2 — Institutional Intelligence

| Output | Source | Script |
|---|---|---|
| `public/data/dataroma/{symbol}.json` | Dataroma (scrape) | `scripts/crawl_dataroma_stock.py` |
| `public/data/smart_money_sector_rotation.json` | Dataroma (aggregated) | `scripts/batch_crawl_dataroma.py` |

### Phase 3 — Quant Strategy Engine

| Output | Logic | Script |
|---|---|---|
| `public/data/dashboard_status.json` | McGinley + StochRSI + Squeeze → 3D state | `scripts/production/daily_update.py` |
| `public/data/technical-indicators/{symbol}.json` | RSI, MACD, Bollinger, ADX, Ichimoku, etc. | `scripts/generate-daily-technical-indicators.js` |

The quant engine applies 3 filter layers (see [specs/QUANT_STRATEGY_DOSSIER.md](../specs/QUANT_STRATEGY_DOSSIER.md)):
1. **L1 Regime**: SPY vs. 200-day MA (Bull Risk-On / Bear Risk-Off)
2. **L2 Sector**: Sector ETF vs. 20-day MA
3. **L3 Signal**: Trend Continuation / Sharpe Score / Growth strategies

---

## 5. Frontend Architecture

Single-page Vue 3 application built with Vite. No Pinia/Vuex — state is held in per-service closures and a lightweight reactive `state-manager.ts`.

**Directory layout** (under `src/`):

| Dir | Role |
|---|---|
| `pages/` | 8 route-level views (Market, StockDetail, Settings, SystemManager, etc.) |
| `components/` | 44 widgets (ThreeDKineticChart, FastTradingViewWidget, SignalCard, MFIVolumeProfilePanel, …) |
| `services/` | App-level orchestrators (ohlcvApi, NavigationService, QuantDataService, ScrollSpyService) |
| `api/` | External adapters (yahooFinanceApi, hybridTechnicalIndicatorsApi, corsProxyManager) |
| `utils/` | performanceCache (Tier 1), autoUpdateScheduler, cacheWarmupService, technical-analysis helpers |
| `composables/` | Vue 3 composition helpers (currently just `useTheme`) |
| `types/` | **Authoritative TypeScript contracts** (`types/index.ts`) — single source for data shapes |
| `lib/` | Fetchers (`fetcher.ts`, `fetcher-optimized.ts`) |

For inter-component dependencies see [COMPONENT_DEPENDENCIES.md](COMPONENT_DEPENDENCIES.md).

---

## 6. Priority-Queue Widget Loading

Widgets are not loaded all at once. `WidgetLoadManager` assigns priorities:

| Priority | Examples | Load Strategy |
|---|---|---|
| **P1 — Critical** | `ThreeDKineticChart`, `SignalCard` | Immediate on mount |
| **P2 — Secondary** | `FastTradingViewWidget` (main chart) | `requestAnimationFrame` |
| **P3 — Below-fold** | `HoldingsAnalysis`, `FundamentalAnalysis` | `IntersectionObserver` lazy-load |

This keeps the critical-path bundle small and the TTI goal (<2.5 s p75) achievable.

---

## 7. Charting Stack

Four charting systems coexist, each chosen for a specific strength:

| Library | Used For | Why |
|---|---|---|
| **Plotly.js (WebGL)** | `ThreeDKineticChart` (3D scatter) | 3D GPU rendering that TradingView can't do |
| **TradingView Lightweight Charts** | Custom technical-analysis panels | Canvas, very fast, low bundle cost |
| **TradingView Widgets (iframe)** | Full-featured price chart | Reuses TV's drawing tools and studies; "Warm Boot" caches iframe scripts |
| **Chart.js + vue-chartjs** | Simple bar/line summaries (fundamentals, sentiment history) | Low effort for stock visualizations |

This mix is a conscious trade-off (see [ADR-0005](adr/0005-technical-indicator-library-choice.md)).

---

## 8. Deployment Topology

| Component | Runs On | Trigger |
|---|---|---|
| Daily ETL pipeline | `ubuntu-latest` + Python 3.11 + Node 18 | Cron `0 2 * * *` UTC |
| Indicator precompute (Puppeteer scrape) | `ubuntu-latest` + headless Chrome | Cron `0 22 * * 1-5` UTC |
| Dataroma scraper | `ubuntu-latest` + Python + BeautifulSoup | Cron `0 0 * * *` UTC |
| Metadata refresh | `ubuntu-latest` | Weekly (Sunday 02:00 UTC) |
| Frontend build + publish | `ubuntu-latest` | Push to `main` |

See [operations/DEPLOYMENT.md](../operations/DEPLOYMENT.md) for the operational detail.

---

## 9. External Dependencies & Data Sources

| Source | Method | Rate Limit | Auth |
|---|---|---|---|
| Yahoo Finance (OHLCV) | `yfinance` Python lib | ~2k req/day | None (public) |
| yahoo-finance2 (fundamentals) | JS lib | ~1.5k req/day | None (auto crumb/cookie) |
| CNN Fear & Greed | HTTP scrape (Puppeteer) | N/A | User-Agent only |
| Dataroma | HTTP scrape (BeautifulSoup) | Self-imposed ~10 req/s | None (public) |
| CORS Proxies (Tier 3) | Rotated list | Per-proxy | None |

No API keys, no secrets stored in the repo. If a source breaks, see [operations/RUNBOOK.md](../operations/RUNBOOK.md).

---

## 10. Related Documents

- Decision records: [adr/](adr/)
- Interface contracts, SLOs, CI/CD contract, performance budget: [BUILD_SPEC.md](BUILD_SPEC.md)
- Operational playbooks: [operations/DATA_OPERATIONS.md](../operations/DATA_OPERATIONS.md), [operations/RUNBOOK.md](../operations/RUNBOOK.md)
- Algorithm specs: [specs/QUANT_STRATEGY_DOSSIER.md](../specs/QUANT_STRATEGY_DOSSIER.md), [specs/TECHNICAL_INDICATORS.md](../specs/TECHNICAL_INDICATORS.md)
