# Technical Manual & Architecture Specifications

## 1. System Architecture: The "Static-First" Paradigm

The Investment Dashboard operates on a **Serverless / Static-First** architecture. This means there is no runtime API server (like Node.js/Python) handling user requests. Instead, the application relies on a **Data Lake** of pre-computed static JSON files hosted on GitHub Pages (CDN).

### 1.1 The 3-Tier Data Strategy
To ensure speed and resilience, the frontend (`src/services/`) employs a strict fallback hierarchy:

| Tier | Source | Latency | TTL | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Memory / IO Cache** | < 5ms | Session | Instant navigation between recently viewed stocks. |
| **2** | **Static JSON (CDN)** | ~50ms | 24 Hours | **The Golden Source**. 99% of data (Prices, Quant Signals, Holdings) comes from here. |
| **3** | **Live API Proxy** | ~500ms | 0 (Live) | **Fallback Only**. Used *only* if static data is missing (404) or specifically requested (Real-time). |

---

## 2. Data Pipeline (ETL & Quant Engine)

All data is generated daily at **02:00 UTC** via GitHub Actions. The pipeline consists of three distinct phases:

### Phase 1: Market Data Acquisition
Fetches raw price and fundamental data.

| Data Type | Source | Script / Engine | Output |
| :--- | :--- | :--- | :--- |
| **OHLCV** | Yahoo Finance | `scripts/generate-real-ohlcv-yfinance.py` | `public/data/ohlcv/{symbol}.json` |
| **Metadata** | YF / Internal | `scripts/fetch-fundamentals.js` | `public/data/symbols_metadata.json` |
| **Sentiment** | Fear & Greed | `scripts/precompute-with-browser.js` (Puppeteer) | `public/data/technical-indicators/fear-greed.json` |

### Phase 2: Institutional Intelligence
Scrapes and processes "Smart Money" movements.

| Data Type | Source | Script / Engine | Output |
| :--- | :--- | :--- | :--- |
| **Holdings** | Dataroma | `scripts/crawl_dataroma_stock.py` | `public/data/dataroma/{symbol}.json` |
| **Super Investors** | Dataroma | `scripts/batch_crawl_dataroma.py` | (Merged into symbol JSONs) |

### Phase 3: Quant Strategy Engine
The core differentiation. Runs complex algorithms on the raw data.

| Component | Logic / Algorithm | Script | Output |
| :--- | :--- | :--- | :--- |
| **Kinetic State** | McGinley Dynamic + StochRSI + Squeeze | `scripts/production/daily_update.py` | `public/data/dashboard_status.json` |
| **Tech Indicators** | RSI, MACD, Bollinger (Server-side calc) | `scripts/generate-daily-technical-indicators.js` | `public/data/technical-indicators/{symbol}.json` |

---

## 3. Quant Kinetic State Engine (Deep Dive)

The **3D Kinetic Market State** visualization (`ThreeDKineticChart.vue`) is not just a chart; it is the visualization of a complex pre-computed vector state.

### Coordinate System Definition
*   **X-Axis (Trend)**: Normalized logical distance from the **McGinley Dynamic** line. ($>0$ = Uptrend, $<0$ = Downtrend).
*   **Y-Axis (Momentum)**: Modified **Stochastic RSI** energy. ($>0.8$ = Overheated, $<0.2$ = Oversold).
*   **Z-Axis (Structure)**: **Volatility Squeeze** intensity (Bollinger Bandwidth / Keltner Channels). ($>1.0$ = High Compression/Explosive Potential).

### Signal Classification
The `daily_update.py` script classifies stocks into states based on these coordinates:
*   **LAUNCHPAD**: $Z > 0.8$ AND $X > 0$ (High Compression + Positive Trend).
*   **CLIMAX**: $Y > 0.9$ (EXTREME Momentum).
*   **DIP_BUY**: $X > 0$ AND $Y < 0.2$ (Uptrend + Oversold).

---

## 4. Frontend Performance & Rendering

Given the detailed charts, performance optimization is critical.

### 4.1 Priority Queue Loading
Widgets are not loaded all at once. The `WidgetLoadManager` assigns priorities:

*   **P1 (Critical)**: `ThreeDKineticChart`, `SignalCard` (Quant Dashboard). Loaded immediately.
*   **P2 (Secondary)**: `FastTradingViewWidget` (Stock Detail Main Chart). Loaded via `requestAnimationFrame`.
*   **P3 (Below Fold)**: `HoldingsAnalysis`, `FundamentalAnalysis`. Loaded via `IntersectionObserver` (Lazy).

### 4.2 Charting Libraries
*   **Plotly.js (WebGL)**: Used for `ThreeDKineticChart` to handle 3D rendering efficiently.
*   **TradingView Lightweight Charts**: Used for custom technical analysis panels (lightweight canvas).
*   **TradingView Widgets (iFrame)**: Used for complex standardized charts. Optimization: `FastTradingViewWidget.vue` performs "Warm Boot" caching to avoid re-downloading widget scripts.

### 4.3 Smart Money Volume Profile
*   **Logic**: Browser-side binning of 5Y transaction data.
*   **Optimization**: Uses a custom binning algorithm ($O(N)$) to map thousands of transactions onto price levels dynamically without blocking the UI thread.

---

## 5. Deployment

Total automation via GitHub Actions:
1.  **Trigger**: Cron schedule (daily) or Push to `main`.
2.  **Environment**: Ubuntu runner with Python 3.9 + Node 18.
3.  **Process**:
    *   Install dependencies.
    *   Run ETL Pipeline (Phase 1 -> 2 -> 3).
    *   Commit changes to `public/data/`.
    *   Deploy to GitHub Pages.