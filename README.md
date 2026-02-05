# Investment Dashboard 📈

> **Project Status**: Stable / Maintenance Mode
> **Architecture**: Static-First, Client-Side SPA (Vue 3)
> **Hosting**: GitHub Pages

### 6. Holdings & Smart Money Analysis
*   **Ownership Structure**: Visual breakdown of Insiders vs Institutions.
*   **Smart Money Trend**: Dual-axis chart tracking "Elite Funds" accumulation vs Stock Price.
*   **Insider Sentiment**: Vertical analysis of recent 6-month insider trading activity.
*   **Elite Funds**: Detailed tracking of top-tier investors (e.g., Warren Buffett, Bill Ackman) activity.
*   **Top Institutions**: List of top institutional holders.

## 📖 Project Overview
Investment Dashboard is a high-performance market visualization tool designed to run entirely on static hosting (GitHub Pages). It bypasses the need for a dynamic backend server by utilizing **Pre-computation** and **Client-Side Caching** strategies to deliver professional-grade charting and financial data.

## 🏗️ Architecture Design

### core Philosophy: "Static-First"
The application avoids direct runtime dependencies on external APIs where possible. Instead, it relies on a "Static Data Pipeline" where data is pre-fetched, processed, and frozen into JSON files during the CI/CD build process.

## 🧠 Quant Strategy Documentation
Detailed documentation on the algorithmic core and validation reports:
*   [**Strategy Dossier**](docs/QUANT_STRATEGY_DOSSIER.md): The mathematical core of the 3D Kinetic Market State.
*   [**Category Strategy Matrix**](docs/CATEGORY_STRATEGY_MATRIX.md): Tag-based parameter mapping (Growth vs Value logic).
*   [**Tag Validation Report**](docs/TAG_VALIDATION_REPORT.md): Evidence-based validation of the strategy parameters (2018-2025).

### Data Flow Diagram
```mermaid
graph TD
    subgraph "CI/CD (GitHub Actions)"
        A[Scheduled Cron] -->|Trigger| B(Python/Node Scripts)
        B -->|Fetch| C{External APIs}
        C -- Yahoo Finance --> B
        C -- Fear & Greed --> B
        B -->|Process & Verify| D[Generate JSON files]
        D -->|Commit| E[Repository /public/data]
    end

    subgraph "Client (Browser)"
        F[Vue App] -->|Request| G{Data Strategy Layer}
        G -->|Tier 1| H[Local Cache / Memory]
        G -->|Tier 2| I[Static JSON (GitHub Pages)]
        G -->|Tier 3 (Fallback)| J[Live API via CORS Proxy]
    end

    E -->|Deploy| I
```

## 🧩 Technical Stack (Deep Dive)

### Frontend Core
- **Framework**: Vue 3 (Composition API)
- **Build System**: Vite 5.x with advanced chunk splitting
- **Routing**: `vue-router` (Hash Mode for GitHub Pages compatibility)
- **State Management**: Reactive Composables (minimalist approach)

### Data Visualization
- **TradingView Lightweight Charts**: For high-performance, custom-drawn canvas charts (Stock Detail).
- **TradingView Widgets**: External embedded iframe/script widgets (Overview, Market Heatmap).
- **Chart.js**: Supplemental visualizations (Polar Area charts).

### Performance Optimization Modules
- **`WidgetCache`**: LRU-like caching mechanism for TradingView widgets to prevent redundant script injections.
- **`WidgetPreloader`**: Prefetches widget scripts (`intersection-observer` based) before they enter the viewport.
- **`WidgetLoadManager`**: Background priority queue that throttles widget instantiation to keep the main thread responsive (60fps target).
- **`YahooFinanceAPI`**: Smart fetcher with request deduplication, queueing, and automatic proxy rotation.

## 📂 Directory Structure (Vibe Coding Reference)

```
investment-dashboard/
├── .github/workflows/   # 🤖 CI/CD Automation
│   ├── daily-update.yml       # OHLCV Data Sync (Daily)
│   ├── precompute-indicators.yml # Technical Analysis Sync
│   └── deploy.yml             # Build & Deploy pipeline
├── public/data/         # 🧊 STATIC DATABASE (Do not edit manually)
│   ├── ohlcv/                 # {symbol}.json (Daily Candles)
│   ├── fundamentals/          # {symbol}.json (Profile/Stats)
│   └── technical-indicators/  # JSONs for heavy indicators
├── scripts/             # ⚙️ Backend Logic (Runs in CI)
│   ├── fetch-fundamentals.js  # Yahoo Finance scraper
│   ├── precompute-with-browser.js # Puppeteer (Fear&Greed)
│   └── cleanup_executor.js    # Maintenance utility
├── src/
│   ├── api/             # 🔌 Data Layer (YahooFinanceAPI.js)
│   ├── components/      # 🧱 Vue Components
│   │   └── FastTradingViewWidget.vue # Optimized Widget Wrapper
│   ├── utils/           # 🛠️ Core Logic
│   │   ├── technicalIndicatorsCore.js # Math logic (RSI, MACD...)
│   │   └── widgetCache.js     # Performance Utilities
│   └── views/           # 📱 Page Layouts
└── ...
```

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Local Development
```bash
# Starts Dev Server at http://localhost:5173/investment-dashboard/
npm run dev
```

### 3. Data Generation (Crucial for Local Dev)
Since the app relies on static JSONs, you must generate them if they don't exist:
```bash
# Fetch OHLCV data for test symbols
python scripts/generate-real-ohlcv-yfinance.py --days=365

# Fetch Metadata
node scripts/fetch-fundamentals.js
```

- **Stock Details**: Deep dive into individual symbols using TradingView widgets and custom technical analysis charts.

> 🧠 **Deep Dive**: See [Fear & Greed Indicators Wiki](docs/INDICATORS.md) for detailed definitions of the market sentiment metrics.

- **Performance**: Use `<FastTradingViewWidget>` instead of direct embeddings.

> 🧠 **Deep Dive**: See [Fear & Greed Indicators Wiki](docs/INDICATORS.md) for detailed definitions of the market sentiment metrics.

- **Adding Symbols**: Update `public/data/symbols_metadata.json` or the relevant `scripts/` config.
- **Styling**: Maintain the "Glassmorphism" aesthetic. Use `var(--bg-card)` and `var(--text-primary)`.
- **Performance**: Use `<FastTradingViewWidget>` instead of direct embeddings.

## 🔄 Deployment & Operations

### Automated Data Pipeline
This dashboard relies on **Daily Automated Updates** powered by GitHub Actions. The data pipeline is defined in `.github/workflows/daily-data-update.yml` and performs the following tasks every day at 02:00 UTC (10:00 Taipei Time):

1.  **Market Data Sync**: Fetches latest OHLCV data via `yfinance`.
2.  **Indicator Pre-computation**: Calculates heavy technical indicators (RSI, Bollinger Bands, etc.) server-side using Node.js and Python.
3.  **Quant Strategy Analysis**:
    *   Executes `scripts/production/daily_update.py`.
    *   Generates `public/data/dashboard_status.json` which drives the **Comet Chart (Trend Continuation)** and **Market Status** components.
    *   Applies the 3D Kinetic Market State algorithm (Trend, Momentum, Structure) to classify stocks (e.g., "Trend Continuation", "Launchpad").
4.  **Auto-Deployment**: Pushes the fresh data to the `main` branch, which automatically triggers a **GitHub Pages** deployment to update the live site.

### Manual Data Update
To force a data update immediately:
1.  Go to the [Actions](https://github.com/romarin-hsieh/investment-dashboard/actions) tab in the GitHub repository.
2.  Select **"Daily Data Update"** workflow.
3.  Click **"Run workflow"**.
4.  Wait for the process to complete (approx. 5-10 mins). The site will re-deploy automatically afterward.

