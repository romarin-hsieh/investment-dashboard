# Deployment & Operations Guide

## ⚙️ Automated CI/CD Pipelines
The project relies heavily on GitHub Actions to maintain its "Static-First" architecture.

### 1. Daily Data Refresh (`daily-update.yml`)
- **Schedule**: `0 0 * * *` (Daily at Midnight UTC)
- **Core Script**: `scripts/generate-real-ohlcv-yfinance.py`
- **Output**: Updates `public/data/ohlcv/*.json`
- **Logic**:
  1. Fetches list of symbols from `scripts/symbols_config.py`.
  2. For each symbol, downloads 1Y historic data from Yahoo Finance.
  3. Validates data integrity (Checks for nulls/gaps).
  4. Commits changes to the repo.
- **Failure Handling**: If a symbol fails, the script logs an error but continues. The previous day's JSON remains (Stale is better than broken).

### 2. Technical Analysis Pre-compute (`precompute-indicators.yml`)
- **Schedule**: `0 22 * * 1-5` (Weekdays Post-market)
- **Core Script**: `scripts/precompute-with-browser.js` (Puppeteer)
- **Purpose**:
  - Scrapes CNN Fear & Greed Index (which has no public API).
  - Calculates complex indicators (e.g., specific MFI logic) server-side.
- **Environment**: Requires `ubuntu-latest` with Chrome installed.

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