# Data Operations & Workflow

> [!IMPORTANT]
> This document serves as the **Single Source of Truth** for maintaining the data integrity of the Investment Dashboard. All future agents and developers must follow these procedures.

## 1. Golden Rule: The Master Config
There is ONE and ONLY ONE source of truth for the list of stocks (symbols) in this project.

*   **File**: `public/config/stocks.json`
*   **Format**: JSON Object with a `stocks` array.
*   **Schema**:
    ```json
    {
      "version": "2.0.0",
      "stocks": [
        {
          "symbol": "ASTS",
          "exchange": "NASDAQ",
          "sector": "Technology",
          "industry": "Communication Equipment",
          "enabled": true,
          "priority": 1
        }
      ]
    }
    ```

**Legacy Terminology Alert**: You may encounter the term "universe" in older code/docs. This refers to the collection of stocks. Do NOT create `universe.json`. Always use `stocks.json`.

## 2. Adding/Removing Stocks
To change the list of tracked stocks, edit ONLY `public/config/stocks.json`.

1.  Add the new object to the `stocks` array.
2.  Ensure `enabled` is `true`.
3.  Commit the change.
4.  **Action**: This will trigger the GitHub Action (`daily-data-update.yml`).

## 3. Data Update Pipelines

### A. Fundamentals (Static Build)
*   **Script**: `scripts/fetch-fundamentals.js`
*   **Trigger**: Updates basic info (Market Cap, P/E, Description) into `public/data/fundamentals/*.json`.
*   **Command**: `npm run fetch:fundamentals`
*   **Dependency**: Reads directly from `public/config/stocks.json`.

### B. Market Data (OHLCV)
*   **Script**: `scripts/generate-real-ohlcv-yfinance.py`
*   **Trigger**: Runs daily via GitHub Actions (`daily-data-update.yml`).
*   **Command**: `npm run update:market` (if alias exists) or `python scripts/generate-real-ohlcv-yfinance.py`
*   **Dependency**: Reads directly from `public/config/stocks.json`.

### C. Market Sentiment (Fear & Greed)
*   **Script**: `scripts/update_sentiment.py`
*   **Command**: `npm run update:sentiment`
*   **Source**: Official CNN API (with Z-Score fallback).
*   **Output**: `public/data/technical-indicators/market-sentiment.json`

### D. Technical Indicators Precomputation
*   **Script**: `scripts/generate-daily-technical-indicators.js`
*   **Trigger**: Runs after Market Data update via GitHub Actions.
*   **Command**: `npm run generate:indicators`
*   **Dependencies**: 
    *   `public/config/stocks.json` (Source list)
    *   `public/data/ohlcv/FOREXCOM_SPXUSD.json` (Benchmark for Beta calc)
*   **Output**: 
    *   Individual files: `public/data/technical-indicators/YYYY-MM-DD_{SYMBOL}.json`
    *   Index: `public/data/technical-indicators/latest_index.json`
*   **Key Features**:
    *   Calculates 30+ indicators including Custom Beta (10D/3M).
    *   Pre-computes full history for sparklines and percentage changes.
    *   Frontend `precomputedIndicatorsApi.js` caches this data for instant loading.

## 4. GitHub Actions Architecture
The project follows a **Static-First** approach with two unified workflows.

*   **`daily-data-update.yml`** (UTC 02:00 Daily):
    *   **OHLCV**: `scripts/generate-real-ohlcv-yfinance.py`
    *   **Technical Indicators**: `scripts/generate-daily-technical-indicators.js`
    *   **Fundamentals**: `scripts/fetch-fundamentals.js`
    *   **Quant Engine**: `scripts/production/daily_update.py`
    *   **Sentiment**: `scripts/update_sentiment.py`
    *   Auto-commits all changes to `public/data/`.

*   **`update-metadata.yml`** (UTC 02:00 Weekly - Sunday):
    *   **Sector/Industry**: `scripts/update-sector-industry.py`
    *   **Metadata**: `scripts/update-metadata-python.py`
    *   Updates `symbols_metadata.json` and `sector_industry.json`.

## 5. Data Validation
Run `npm run validate:data` to verify all generated data files:
*   **OHLCV**: Checks for valid symbol, ohlcv array, and data point structure.
*   **Fundamentals**: Validates Yahoo Finance API format (earnings, recommendationTrend).
*   **Technical Indicators**: Checks for required indicators (rsi, macd, sma, ema).
*   **Metadata**: Validates symbols_metadata.json and sector_industry.json.
*   **Smart Money Sector Rotation**: Validates updated_at timestamp and managers_scraped array.
*   **Quant Engine (MFI/Analysis Results)**: Validates ticker, date, coordinates (x_trend, y_momentum, z_structure), and signal fields.

```bash
npm run validate:data           # Basic validation
npm run validate:data --verbose # Detailed output
```

## 6. Troubleshooting Discrepancies
If the number of stocks in the dashboard != number of stocks in config:

1.  **Check Config**: Verify `public/config/stocks.json` count.
2.  **Check Generated Files**: Look at `public/data/fundamentals/` count.
    *   If low, run `npm run fetch:fundamentals`.
3.  **Check Pipeline Logs**: Look at GitHub Actions logs for `generate-real-ohlcv-yfinance.py`.
    *   Did it load the correct config file?
    *   Did some downloads fail? (Script is designed to skip failures but report them).

## 6. Vibe Coding Guidelines
*   **Be Deterministic**: Do not hardcode lists of symbols in scripts. Always read from the config file.
*   **Be Transparent**: Logs should explicitly state *which* config file is being loaded (e.g., "Loaded 70 symbols from public/config/stocks.json").
*   **Clean Up**: If you modify the architecture, remove the old artifacts immediately. Don't leave `universe.json` lying around.
