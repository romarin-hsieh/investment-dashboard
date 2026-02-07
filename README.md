# Kiro Investment Dashboard 🚀

> **Status**: Production (Stable)
> **Version**: 2.5 (Quant Edition)
> **Architecture**: Serverless / Static-First (GitHub Pages)

**Kiro Investment Dashboard** is a high-performance, institutional-grade market analysis tool designed for the modern retail investor. It distinguishes itself by running entirely on **static infrastructure**, leveraging sophisticated pre-computation pipelines to deliver **3D Market Kinetic Analysis**, **Smart Money Tracking**, and **Real-time Technicals** without a traditional backend server.

---

## 🌟 Key Features

### 1. 🧊 Quant Kinetic State (The "Comet" Chart)
A proprietary 3D visualization engine that analyzes stock behavior across three dimensions:
*   **X: Trend Velocity** (McGinley Dynamic deviation)
*   **Y: Momentum Force** (Stochastic RSI energy)
*   **Z: Market Structure** (Volatility Squeeze compression)

This allows instantly identifying whether a stock is in a **Launchpad** (Squeeze + Uptrend), **Climax** (Overheated), or **Dip Buy** (Trend Intact + Oversold) state.

### 2. 🐋 Smart Money & Insider Tracking
Integrated transparency into "Who is buying?":
*   **Institutional Flows**: Tracks "Super Investors" (e.g., Warren Buffett, Bill Ackman) via Dataroma integration.
*   **Insider Sentiment**: Visualizes real-time C-Suite buying/selling activity.
*   **MFI Volume Profile**: Proprietary indicator separating "Retail" from "Smart Money" volume accumulation.

### 3. 📊 Macro & Technical Analysis
Comprehensive tools for top-down market analysis:
*   **Real-time Market Overview**: Live tracking of major indices (S&P 500, NASDAQ, VIX) and Sector Performance Heatmaps.
*   **Fear & Greed Index**: Daily sentiment tracking powered by browser automation (Puppeteer).
*   **Professional Charting**: Integrated TradingView Advanced Charts with custom overlay support.

### 4. 🏢 Fundamental Deep Dive
Contextualize the price action with underlying value:
*   **Financial Health**: Visual overview of Income Statements, Balance Sheets, and Cash Flow.
*   **Market Regime**: Automated classification of the broader market environment (e.g., "Volatile Uptrend").
*   **Company Profile**: Business summaries and sector classifications.

### 5. ⚡ "Static-First" High Performance
The dashboard feels instant because the math is done *before* you visit:
*   **Pre-computed Engines**: Heavy quant analysis is run daily via GitHub Actions.
*   **Tiered Rendering**: Critical data loads instantly from static JSONs; secondary data hydrates lazily.
*   **Zero-Backend**: No database latency, no API rate limits for the end user.

---

## 🏗️ Technical Architecture

This project proves that **you don't need a backend to build a Bloomberg Terminal competitor**.

### Data Pipeline (The "Static Lake")
All data is fetched, processed, and validated by Python/Node.js scripts during the CI/CD build process and stored as static JSON files in `public/data/`.

| Data Domain | Source | Processing Script | Update Freq |
| :--- | :--- | :--- | :--- |
| **Market Data** | Yahoo Finance (API) | `generate-real-ohlcv-yfinance.py` | Daily (02:00 UTC) |
| **Quant Analysis** | Internal Engine | `npm run update-daily` | Daily |
| **Institutional** | Dataroma (Holdings) | `batch_crawl_dataroma.py` | Daily |
| **Sector Rotation** | Dataroma (Managers) | `crawl_dataroma_managers.py` | Daily |
| **Sentiment** | Fear & Greed (Puppeteer) | `precompute-with-browser.js` | Daily |

*For detailed technical specifications, please refer to [REQUIREMENTS.md](REQUIREMENTS.md).*

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/romarin-hsieh/investment-dashboard.git
cd investment-dashboard
npm install
```

### 2. Local Development
```bash
# Starts development server at http://localhost:5173/investment-dashboard/
npm run dev
```

### 3. Data Generation (Critical for Local Dev)
Since there is no "live API" for the core data, you must generate the static database locally to see charts:

```bash
# 1. Fetch Market Data & Compute Indicators
npm run update-daily

# 2. Run Dataroma Scraper (Optional - Heavy)
python scripts/batch_crawl_dataroma.py
```

---

## 📂 Project Structure

```
investment-dashboard/
├── .github/workflows/       # 🤖 The "Backend" (CI/CD Pipelines)
├── public/data/             # 🧊 The "Database" (Static JSONs)
│   ├── ohlcv/               # Daily price history
│   ├── dataroma/            # Institutional holdings data
│   └── dashboard_status.json # Pre-computed Quant Signals
├── scripts/                 # ⚙️ ETL & Analysis Engines
│   ├── production/          # Core Quant Strategy Scripts
│   └── core/                # Math & Signal Libraries
├── src/
│   ├── components/          # Vue Components (Charts, Widgets)
│   ├── pages/               # Application Views
│   └── services/            # Client-side Data Fetchers
└── README.md
```

## 📜 Documentation

*   [**Technical Manual (REQUIREMENTS.md)**](REQUIREMENTS.md): Deep dive into data pipelines, caching strategies, and performance limits.
*   [**Quant Strategy Dossier**](docs/QUANT_STRATEGY_DOSSIER.md): Mathematical definition of the Kinetic State indicators.
