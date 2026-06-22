# Adding a new symbol / 新增股票代號

How to add a tracked symbol to the dashboard. The universe is defined by a single
config file (`config/stocks.json`); the nightly ETL generates all data for any
enabled symbol and the frontend picks it up automatically — no code changes needed.

> Data files (OHLCV, indicators, fundamentals, …) live in the separate
> [`investment-dashboard-data`](https://github.com/romarin-hsieh/investment-dashboard-data)
> repo and are produced by the pipeline ([ADR-0008](../architecture/adr/0008-separate-data-repository.md)).
> You never edit data by hand — you only edit the config.

---

## Option A — Self-service via GitHub Actions (recommended)

No local setup required.

1. Go to the repo's **Actions** tab → **Add Symbol** → **Run workflow**.
2. Enter one or more tickers in **symbols** (comma or space separated, e.g. `ABNB, SHOP`).
3. Leave **run_etl_now** checked to generate data immediately (otherwise it waits for
   the next nightly run).
4. Click **Run workflow**.

The workflow validates each ticker against Yahoo Finance, auto-fills its
exchange / sector / industry, appends it to `config/stocks.json`, commits, and (if
requested) dispatches the daily data pipeline. Tickers that are invalid or already
present are skipped — the config is never corrupted.

## Option B — Locally with npm

If you have the repo cloned and dependencies installed:

```bash
npm run add-symbol -- "ABNB, SHOP"
```

This does the same validation + metadata lookup and updates `config/stocks.json`
(and the synced `public/config/stocks.json`). Then commit and push:

```bash
git add config/stocks.json public/config/stocks.json
git commit -m "feat(config): add symbol(s) ABNB, SHOP"
git push
```

Data appears after the next daily run, or trigger it now from the Actions tab
(**Daily Data Update** → Run workflow).

## Option C — Edit the config by hand

Add an object to the `stocks` array in `config/stocks.json` (the **root** file — *not*
`public/config/stocks.json`, which is auto-synced and will be overwritten):

```json
{
  "symbol": "ABNB",
  "exchange": "NASDAQ",
  "sector": "Consumer Cyclical",
  "industry": "Travel Services",
  "enabled": true,
  "priority": 2
}
```

Set `enabled: false` to keep a symbol in the config but skip it in the pipeline and UI.
After editing, commit/push and let the nightly run (or a manual dispatch) generate the data.

---

## What happens after a symbol is added

The nightly **Daily Data Update** workflow reads `config/stocks.json` and, for every
`enabled` symbol, generates: OHLCV history, technical indicators, fundamentals, and the
quotes / daily / dashboard-status snapshots — then mirrors them to the data repo. The
frontend reads the symbol list from `public/config/stocks.json` and the data from the
data repo, so the new symbol shows up on its own once the pipeline has run.

## Notes & limits

- **Institutional holdings (Dataroma)** are now driven by `stocks.json` too: the nightly
  Dataroma workflow runs `scripts/batch_crawl_dataroma.py`, which crawls every enabled
  symbol in `config/stocks.json`. Adding a symbol therefore picks up its Smart-Money / 13F
  data automatically — no separate list to edit. (Funds/ETFs have no Dataroma holdings page
  and are reported as skipped/failed, which is expected.)
- **Rate limits**: adding many symbols at once can hit Yahoo Finance throttling during
  the next ETL run — add in small batches if you're onboarding a lot.
- **Validation**: a symbol that doesn't resolve on Yahoo Finance is rejected at add time,
  so typos fail fast instead of silently producing an empty card.
