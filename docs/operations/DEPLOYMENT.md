# Deployment & Operations Guide

## ⚙️ Automated CI/CD Pipelines
The project relies heavily on GitHub Actions to maintain its "Static-First" architecture.

### 1. Daily Data Refresh (`daily-data-update.yml`)
- **Schedule**: `0 2 * * *` (Daily at 02:00 UTC / 10:00 Taipei)
- **Core Scripts**:
  - OHLCV: `scripts/generate-real-ohlcv-yfinance.py`
  - Technical Indicators: `scripts/generate-daily-technical-indicators.js`
  - Fundamentals: `scripts/fetch-fundamentals.js`
  - Quant Engine: `scripts/production/daily_update.py`
  - Sentiment: `scripts/update_sentiment.py`
- **Output**: Regenerates the Static Lake and mirrors it to the **separate data repo** (`investment-dashboard-data`); the app repo receives **config-only** commits (see [ADR-0008](../architecture/adr/0008-separate-data-repository.md)).
- **Logic**:
  1. **Seed**: clones the latest `public/data` from the data repo (`npm run seed-data`).
  2. Fetches the list of symbols from `public/config/stocks.json`.
  3. For each symbol, downloads 5Y historic data from Yahoo Finance, computes indicators, and validates integrity (nulls/gaps).
  4. **Mirror**: pushes the regenerated `public/data` back to the data repo (via a `DATA_REPO_TOKEN` PAT). The app repo's `public/data` is git-ignored.
- **Failure Handling**: If a symbol fails, the script logs an error but continues. The previous day's JSON remains (Stale is better than broken).

### 2. Market Sentiment (Fear & Greed)
- **Where**: a step in the daily pipeline (`daily-data-update.yml`), **not** a separate workflow.
- **Core Script**: `scripts/update_sentiment.py`
- **Purpose**: produces the CNN Fear & Greed Index → `public/data/technical-indicators/market-sentiment.json` (CNN API, with a Z-Score model fallback). No browser/Puppeteer scrape.
- **Note**: the technical indicators themselves are generated in the same daily pipeline by `scripts/generate-daily-technical-indicators.js`.

### 3. Production Deployment (`deploy.yml`)
- **Trigger**: Push to `main` branch.
- **Steps**:
  1. `npm ci` (Clean install)
  2. `npm run build` (Vite production build)
  3. Deploy `dist/` folder to `gh-pages` branch.

## �️ Data Redundancy & Fallback Logic

### Data Availability Hierarchy
When the CI/CD pipelines run, they create a "Golden Source" of static data. If this pipeline fails or GitHub Pages is down, the app degrades gracefully:

| Scenario | System Behavior | User Impact |
|:--- |:--- |:--- |
| **Normal Operation** | Loads cached/static JSON. | ⚡ Instant load, 0 API calls. |
| **Static Data Stale/Missing** | `YahooFinanceAPI.js` detects 404/Stale. Switches to **Tier 3 (Proxy Fallback)**. | ⚠️ Slower load (2-3s delay), Loading spinners visible. |
| **Proxy Failure** | `YahooFinanceAPI` rotates through proxy list. | ⏳ Significant delay. |
| **Total Outage** | Displays "Data Unavailable" error state with Retry button. | ❌ Widget specific error (whole app does not crash). |

## �️ Manual Operations

### Emergency Cache Flush
IF users report seeing old data despite a successful deployment:
1.  Instruct users to Hard Refresh (`Ctrl+F5`).
2.  (Dev) Bump the version in `package.json` or `src/utils/cacheWarmupService.js`.
3.  (Dev) `widgetCache` timestamp logic will invalidate entries older than 24h automatically.

### Manual Deployment (Windows)
If GitHub Actions is down, you can deploy from a local machine:
```batch
cd investment-dashboard
./deploy-production.bat
```
*Note: This script performs a safety check on your git status before building.*

## 📈 Performance Monitoring
- **Build Size**: Monitor the `npm run build` output. Warning if `index.js` exceeds 500kB.
- **Rate Limits**: If "Too Many Requests" errors spike in Proxy Fallback mode, increase `REQUEST_DELAY` in `YahooFinanceAPI.js`.