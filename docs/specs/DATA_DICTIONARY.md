# Data Dictionary — Static Lake (`public/data/`)

> **Scope of this doc**: Field-level schemas for every JSON file the frontend consumes from the Static Lake. Each entry is the *contract* between the ETL pipeline (Python + Node.js) and the frontend (`src/services/`, `src/api/`). A breaking change here requires version bumps in both producers and consumers.
>
> **Source of truth for type shapes**: see `src/types/index.ts`. This doc is the human-readable surface; types in code are authoritative when they disagree.
>
> **Conventions**:
> - All timestamps are ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`) unless explicitly marked Unix-ms (epoch milliseconds, integer).
> - All prices are USD floats unless otherwise noted.
> - Optional fields are marked `?`. Nullable fields use `T | null`.
> - "Cardinality" indicates one-file-per-symbol vs one-file-globally vs many.

---

## Index of Files

| Path | Cardinality | Producer | Frontend Consumer |
|---|---|---|---|
| [`dashboard_status.json`](#dashboard_statusjson) | 1 (global) | `scripts/production/daily_update.py` | `QuantDataService`, Comet Chart, SignalCard |
| [`status.json`](#statusjson) | 1 (global) | `scripts/update-status.js` | System health widget |
| [`manifest.json`](#manifestjson) | 1 (global) | `scripts/generate-real-ohlcv-yfinance.py` | Sanity-check displays |
| [`analysis_results.json`](#analysis_resultsjson) | 1 (global) | `scripts/production/daily_update.py` | Strategy view |
| [`symbols_metadata.json`](#symbols_metadatajson) | 1 (global) | `scripts/fetch-fundamentals.js` | Stock cards, sector heatmap |
| [`sector_industry.json`](#sector_industryjson) | 1 (global) | derived from `symbols_metadata` | Sector navigation |
| [`stock_sector_map.json`](#stock_sector_mapjson) | 1 (global) | `scripts/utils/*` | Quick sector lookup |
| [`smart_money_sector_rotation.json`](#smart_money_sector_rotationjson) | 1 (global) | `scripts/crawl_dataroma_managers.py` | Smart Money rotation widget |
| [`ohlcv/{SYMBOL}.json`](#ohlcvsymboljson) | N per symbol | `scripts/generate-real-ohlcv-yfinance.py` | TradingView widgets, charts |
| [`ohlcv/index.json`](#ohlcvindexjson) | 1 (global) | same | Symbol-list lookup |
| [`technical-indicators/{YYYY-MM-DD}_{SYMBOL}.json`](#technical-indicatorsdate_symboljson) | N per (date, symbol) | `scripts/generate-daily-technical-indicators.js` | Technical-indicators panel |
| [`dataroma/{SYMBOL}.json`](#dataromasymboljson) | N per symbol | `scripts/crawl_dataroma_stock.py` | HoldingsAnalysis |
| [`quotes/latest.json`](#quoteslatestjson) | 1 (global) | `scripts/generate-quotes-snapshot.js` | Header price ticker |
| [`fundamentals/{SYMBOL}.json`](#fundamentalssymboljson) | N per symbol | `scripts/fetch-fundamentals.js` | FundamentalAnalysis panel |
| [`daily/{YYYY-MM-DD}.json`](#dailydatejson) | N per date | `scripts/generate-daily-snapshot.js` | Universe snapshot |
| [`{SYMBOL}.json` (root)](#legacy-symboljson-at-root) | N (legacy) | various pre-reorg scripts | Legacy fallback path |

---

## `dashboard_status.json`

The single most important file. Holds the daily Quant Kinetic State for every tracked symbol — what powers the Comet Chart and the home-page SignalCards.

```jsonc
{
  "meta": {
    "description": "Quant Kinetic State & Dashboard Status",
    "version": "2.5",                       // string — bump on breaking change
    "generated_by": "daily_update.py"
  },
  "updated_at": "2026-02-25 04:25:25",      // string — UTC, NOT ISO-8601 (space, no Z)
  "global_regime": "BULL_RISK_ON",          // enum — see Regime values below
  "data": [
    {
      "ticker": "APP",                      // string — uppercase symbol
      "sector": "Communication Services",   // string — see Sectors below
      "strategy": "V1_Defensive (MeanRev)", // string — see Strategy labels below
      "signal": "WAIT",                     // enum — Signal values below
      "reason": "Sector Weakness (Peer Down)",      // string — short tag
      "commentary": "Sector Weakness (Peer Down)",  // string — long form (often equal to reason)
      "price": 393.22,                      // float — last close USD
      "change_percent": 3.31,               // float — % change vs previous close
      "date": "2026-02-24",                 // YYYY-MM-DD — last trading day used
      "coordinates": {                      // 3D Kinetic State point
        "x_trend": -0.41,                   // float — McGinley distance, signed
        "y_momentum": 0.918,                // float [0..1+] — StochRSI energy
        "z_structure": 0.204                // float [0..1+] — squeeze intensity
      },
      "trace": [                            // recent trail (~30 points), oldest first
        { "x_trend": ..., "y_momentum": ..., "z_structure": ... }
      ]
    }
  ]
}
```

**Enums**

- `global_regime`: `BULL_RISK_ON | BEAR_RISK_OFF | NEUTRAL` (derived from SPY vs. 200-day MA)
- `signal`: `BUY | DIP_BUY | HOLD | TRIM | WAIT | EXIT | LAUNCHPAD | CLIMAX | MOMENTUM_RUN`
- `strategy`: free-form label like `V1_Defensive (MeanRev)`, `V2_Trend_Continuation`, `V3_Sharpe_Score`, `V4_Growth`. Treat as opaque on the frontend.

**Invariants** (consumers should validate):
- `coordinates.x_trend` is unbounded (sign matters)
- `coordinates.y_momentum` should be in `[0, ~1.5]`; values > 1 are intentional (overshoot)
- `coordinates.z_structure` should be in `[0, ~1.5]`
- `trace` arrays are aligned in time across all symbols (same length, same dates)
- `data[]` ticker uniqueness — duplicates are a producer bug

**Frontend consumers**: `src/services/QuantDataService.js`, `src/components/ThreeDKineticChart.vue`, `src/components/SignalCard.vue`

---

## `status.json`

Pipeline health snapshot — what the SystemManager page reads to show "data freshness".

```jsonc
{
  "generated": "2026-02-25T04:25:27.735Z",       // ISO-8601 UTC
  "last_updated": "2026-02-25T04:25:27.735Z",    // alias for `generated`
  "date": "2026-02-25",                          // YYYY-MM-DD
  "status": "updated",                           // enum: "updated" | "stale" | "failed"
  "data_sources": {
    "ohlcv": {
      "exists": true,
      "size": 57670,                             // bytes — index.json size
      "modified": "2026-02-25T04:20:48.544Z",
      "fileCount": 560,
      "directory": "data/ohlcv/"
    },
    "technical_indicators": {                    // same shape as ohlcv
      "exists": true, "size": 5753, "modified": "...", "fileCount": 4131, "directory": "..."
    },
    "quotes": {
      "exists": true, "size": 59076, "modified": "...", "file": "data/quotes/latest.json"
    },
    "metadata": { "exists": true, "size": 234469, "modified": "...", "file": "data/symbols_metadata.json" }
  }
}
```

**Frontend consumers**: System status widget, debug overlay.

---

## `manifest.json`

Per-pipeline-run manifest of which symbols succeeded/failed. Diagnostic only — no UI consumes it directly today.

```jsonc
{
  "success": ["JNJ", "NVDA", "HD", ...],   // string[] — uppercase symbols
  "failed":  ["D-WAVE"],                   // string[] — symbols that errored this run
  "last_updated": "2026-02-07T02:42:42.148Z"
}
```

---

## `analysis_results.json`

Output of the deep-analysis pass: per-symbol entries with the same coordinate/signal shape as `dashboard_status.json` but enriched with a longer `trace` and editorial `commentary`.

```jsonc
[
  {
    "ticker": "JNJ",
    "date": "2026-02-06",                  // YYYY-MM-DD
    "price": 239.99,
    "change_percent": 0.93,
    "coordinates": { "x_trend": ..., "y_momentum": ..., "z_structure": ... },
    "signal": "MOMENTUM_RUN",
    "commentary": "Trend is accelerating (X=2.03). Do NOT sell yet. ...",
    "trace": [ /* ... ~60 prior coordinate points ... */ ]
  }
]
```

This file is a **flat array**, not an object — root type is `Entry[]`.

---

## `symbols_metadata.json`

Per-symbol sector/industry/market-cap/profile data scraped from yahoo-finance2.

```jsonc
{
  "ttl_days": 7,                                            // refresh cadence hint
  "as_of": "2026-02-22T04:27:53.672089+00:00",
  "next_refresh": "2026-02-22T04:27:53.672111+00:00",
  "items": [
    {
      "symbol": "ASTS",                                     // string
      "sector": "Technology",                               // string
      "industry": "Communication Equipment",                // string
      "confidence": 1.0,                                    // 0 | 0.5 | 0.75 | 0.9 | 1
      "sources": ["yfinance_python"],                       // string[] — provenance
      "last_verified_at": "2026-02-22T04:26:16.821Z",       // ISO-8601
      "market_cap_category": "large_cap",                   // enum: nano|micro|small|mid|large|mega
      "exchange": "NASDAQ",                                 // string — see Exchanges
      "country": "United States",                           // string
      "website": "https://...",                             // string
      "employee_count": 578,                                // integer
      "business_summary": "..."                             // string — long-form description
    }
  ]
}
```

**Confidence values**: `1.0` = primary source verified; `0.9` = cross-checked secondary; `0.75` = single secondary; `0.5` = stale/uncertain; `0` = unknown.

**Frontend consumers**: `src/utils/metadataService.js`, StockCard, sector pages.

---

## `sector_industry.json`

**Same schema as `symbols_metadata.json` above.** Maintained as a separate file for legacy compatibility — both are produced by the same script. Treat as a duplicate; consumer code should pick one and stick.

⚠️ Open question: which one is canonical? Until clarified, the frontend SHOULD prefer `symbols_metadata.json`. (Tracked in the Code/UI Remediation roadmap.)

---

## `stock_sector_map.json`

Flat lookup `Symbol → Sector` for fast O(1) access without parsing the full metadata file.

```jsonc
{
  "AAPL": "Technology",
  "AXP":  "Financials",
  "BAC":  "Financials",
  "KO":   "Consumer Staples"
}
```

Type: `Record<string, string>`. ~37 KB, ~600 entries.

---

## `smart_money_sector_rotation.json`

Output of the Dataroma manager scrape — which sectors institutional money is rotating into/out of.

```jsonc
{
  "updated_at": "2026-02-25T02:29:55.482Z",
  "managers_scraped": ["AKO", "AIM", "AP", ...],  // string[] — Dataroma manager codes
  "sector_flows": { /* schema TBD — sample on disk truncated; see source script */ }
}
```

⚠️ Schema-completeness gap: the `sector_flows` field shape is not fully documented here because the sample on disk has the producer in flux. Confirm against `scripts/crawl_dataroma_managers.py` output before relying on field names.

---

## `ohlcv/{SYMBOL}.json`

The base price time series for one symbol. Columnar layout (parallel arrays) for compactness.

```jsonc
{
  "timestamps": [1759416316158, 1759502716158, ...],   // Unix-ms (integer)
  "open":       [180,    181.5,  ...],                 // number[]
  "high":       [185.85, 184.0,  ...],
  "low":        [173.15, 178.0,  ...],
  "close":      [178.96, 182.0,  ...],
  "volume":     [6962061, 4_500_000, ...],             // integer[]
  "metadata": {
    "symbol": "AAPL",
    "interval": "1d",                                  // string — bar period
    "data_points": 90,                                 // integer
    "last_updated": "2026-02-25T04:20:48.544Z"
  }
}
```

**Invariants**:
- All five arrays (`timestamps`, `open`, `high`, `low`, `close`, `volume`) MUST have equal length
- `timestamps` MUST be strictly ascending
- `low[i] ≤ open[i], close[i] ≤ high[i]` per bar
- `volume[i] ≥ 0`

⚠️ **Producer bug to watch**: when source data has gaps, lengths can drift apart. Frontend code should `Math.min(arr.length)` before iterating.

**Frontend consumers**: `src/services/ohlcvApi.js`, `src/api/precomputedOhlcvApi.js`, all chart components.

---

## `ohlcv/index.json`

Symbol manifest for the OHLCV directory — used by the frontend to know which symbols are queryable without enumerating the directory.

```jsonc
{
  "generated": "2026-02-25T04:19:15Z",
  "symbols": ["ASTS", "RIVN", "PL", ...]   // string[] — uppercase
}
```

---

## `technical-indicators/{YYYY-MM-DD}_{SYMBOL}.json`

Daily snapshot of computed technical indicators. **Filename pattern is significant**: the frontend constructs URLs from a date + symbol pair.

```jsonc
{
  "symbol": "ADBE",
  "timestamps": [1756180800000, 1756267200000, ...],  // Unix-ms
  "indicators": {
    "sma":  { "sma5": [...], "sma10": [...], "sma20": [...], "sma50": [...] },
    "rsi":  { "rsi14": [number, ...] },
    "macd": { "macd": [...], "signal": [...], "histogram": [...] },
    "yf":   {
      "symbol": "ADBE",
      "exchange_timezone": "America/New_York",
      "benchmark": "...",
      "as_of_exchange": "...",
      "as_of_taipei": "...",
      "last_completed_trading_day": "YYYY-MM-DD",
      "prev_completed_trading_day": "YYYY-MM-DD",
      "volume_last_day": 12345678
    }
  },
  "metadata": {
    "generated":    "2026-01-04T03:48:28.594Z",
    "source":       "GitHub Actions Daily Update",
    "dataPoints":   90,
    "indicators":   ["SMA5", "SMA10", "SMA20", "SMA50", "RSI14", "MACD", "Volume",
                     "5D Avg Volume", "Market Cap", "Beta 3mo", "Beta 1y", "Beta 5y"],
    "yf_updated":   "2026-01-04T03:49:46.878Z"
  }
}
```

**Invariants**:
- All indicator arrays (sma5, sma10, ..., rsi14, macd.*) MUST be the same length as `timestamps`.
- The first N entries of derived indicators are typically `null` (warmup period, e.g., RSI14 needs 14 bars).
- `metadata.indicators[]` is the human-readable list of what's computed; not a contract for which fields exist.

**Cardinality**: ~4,131 files at any moment (560 symbols × 7-day rolling retention; cleaned up by `daily-data-update.yml`).

**Frontend consumers**: `src/api/precomputedIndicatorsApi.js`, `src/api/hybridTechnicalIndicatorsApi.js`.

---

## `dataroma/{SYMBOL}.json`

Per-symbol institutional holdings, scraped from Dataroma 13F data.

```jsonc
{
  "ticker": "ABBV",
  "updated_at": "2026-02-05T03:33:05.077Z",
  "stats": {
    "sector": "Health Care",
    "ownership_count": 4,                       // integer — # of tracked Super Investors holding
    "ownership_rank": 149,                      // integer — rank across universe
    "percent_of_portfolios": "0.05%"            // string — percentage as text
  },
  "superinvestors": [
    {
      "manager": "Torray Funds",
      "percent_portfolio": 3.25,                // number — % of this manager's portfolio
      "recent_activity": "Reduce 8.80%",        // string — human-readable change
      "shares": 92687,                          // integer
      "value": 21178000,                        // integer USD
      "history": [
        {
          "period": "2025   Q4",                // string — note multiple spaces (producer quirk)
          "shares": 92687,
          "percent_portfolio": "3.25",          // string in history (number in parent)
          "activity": "Reduce 8.80%",
          "percent_change_portfolio": "0.31",
          "reported_price": "$228.49"           // string with currency prefix
        }
      ]
    }
  ]
}
```

⚠️ **Type inconsistency** worth fixing: `percent_portfolio` is `number` at the manager level but `string` inside `history`. `reported_price` is a string with `$` prefix that the frontend must parse. These should be normalized in a future PR.

**Frontend consumers**: `src/components/HoldingsAnalysis.vue`.

---

## `quotes/latest.json`

The latest-known intraday quote snapshot — refreshed by a separate scheduler, used to power the header price ticker.

```jsonc
{
  "as_of": "2026-02-25T04:25:16.309Z",
  "provider": "mock_generator",                 // string — "yahoo_finance" | "mock_generator" | ...
  "market_session": "after_hours",              // enum: pre | regular | after_hours | closed
  "items": [
    {
      "symbol": "AAPL",
      "price_usd": 235.42,                      // number
      "price_type": "delayed_quote",            // enum: realtime | delayed_quote | last_close
      "market_state": "POSTPOST",               // string — Yahoo's market state code
      "is_delayed": true                        // boolean
    }
  ],
  "metadata": {
    "total_symbols": 137,
    "successful_updates": 137,
    "failed_updates": 0,
    "average_delay_minutes": 15,
    "next_update": "2026-02-25T05:00:00.000Z"
  }
}
```

**Note**: `provider: "mock_generator"` indicates synthetic data — handle the case in dev/test environments. Production should always show a real provider name.

**Frontend consumers**: `src/services/QuantDataService.js`, header ticker.

---

## `fundamentals/{SYMBOL}.json`

Analyst recommendations + earnings + upgrades scraped from yahoo-finance2.

```jsonc
{
  "recommendationTrend": {
    "trend": [
      {
        "period": "0m",                         // string — "0m" = current month, "-1m" = 1 month ago
        "strongBuy": 7,
        "buy": 13,
        "hold": 9,
        "sell": 0,
        "strongSell": 1
      }
    ]
  },
  "earningsHistory":   { /* schema TBD — see fetch-fundamentals.js */ },
  "earningsChart":     { /* schema TBD */ },
  "upgradeDowngrade":  { /* schema TBD */ }
}
```

⚠️ Schema-completeness gap: only `recommendationTrend` is documented here from sampling. Full shape needs to be filled in from `scripts/fetch-fundamentals.js` output schema or yahoo-finance2 documentation.

**Frontend consumers**: `src/components/FundamentalAnalysis.vue`.

---

## `daily/{YYYY-MM-DD}.json`

Per-day universe snapshot — capture of which symbols were tracked and the macro context on that date.

```jsonc
{
  "as_of_date_taipei": "2026-02-02",
  "generated_at_utc": "2026-02-02T15:49:47.571Z",
  "universe": ["ASTS", "RIVN", "PL", ...],     // string[] — symbols in scope that day
  "macro": { /* macro indicators array — see src/types/index.ts */ },
  "news": { /* per-symbol news arrays — top 10 — see src/types/index.ts */ }
}
```

Refer to `src/types/index.ts` for `DailySnapshot`, `MacroIndicator`, and `SymbolNews` shape definitions — those are authoritative.

---

## Legacy `{SYMBOL}.json` at root

161 historical files at `public/data/{SYMBOL}.json` (e.g., `AAPL.json`). These predate the `ohlcv/` reorganisation. The frontend should NOT read these; they're retained for git-history continuity and may be removed in a future cleanup PR.

⚠️ Roadmap action: confirm zero readers in `src/`, then schedule deletion in a separate PR (cite this entry in the PR description).

---

## Versioning & Breaking Changes

- This document follows the project's semver: bumping `dashboard_status.json.meta.version` is a **breaking change** and requires a coordinated frontend release.
- Adding optional fields is backwards-compatible. Renaming or removing fields is breaking.
- For schema changes, update this doc in the same PR as the producer change. Frontend changes follow within the same PR or the PR immediately after.

## Related Documents

- Architecture overview: [../architecture/OVERVIEW.md](../architecture/OVERVIEW.md)
- Build contracts (CI/CD, performance budget, security model): [../architecture/BUILD_SPEC.md](../architecture/BUILD_SPEC.md)
- Operational playbooks (data failure, recovery): [../operations/RUNBOOK.md](../operations/RUNBOOK.md)
- TypeScript types (authoritative source): `src/types/index.ts`
