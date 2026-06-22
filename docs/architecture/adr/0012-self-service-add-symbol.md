# ADR-0012 — Self-Service Symbol Addition Workflow

- **Status**: Accepted
- **Date**: 2026-06-20
- **Deciders**: Project owner
- **Context tags**: `operations`, `ci-cd`, `data`

## Context & Problem

Adding a tracked symbol used to require a manual edit to `config/stocks.json`
(exchange/sector/industry filled by hand), a local ETL run, and a commit. That is
error-prone (typo'd tickers, wrong metadata) and tied to the operator's machine.
We want to add a symbol from the GitHub UI, with validation, on any device.

## Decision

Ship a **`workflow_dispatch` GitHub Action** (`.github/workflows/add-symbol.yml`,
inputs `symbols` + `run_etl_now`) that runs **`scripts/add-symbol.js`**:

1. Validates each ticker's shape, then **verifies it is real** via
   `yahoo-finance2` `quoteSummary([summaryProfile, price])`.
2. **Auto-fills** exchange / sector / industry from the quote.
3. **Idempotently appends** to `config/stocks.json` (skips existing), recomputes
   the metadata block, and syncs `public/config/stocks.json`.
4. Commits the config change, then **dispatches `daily-data-update.yml`** (ETL for
   the new symbol) **and `deploy.yml`**.

The explicit `deploy.yml` dispatch exists because a push made with the default
`GITHUB_TOKEN` **does not trigger** other workflows (GitHub's anti-recursion
rule), so without it a new symbol's config would sit un-deployed until the next
unrelated push (the [#58](https://github.com/romarin-hsieh/investment-dashboard/pull/58) fix).
`npm run add-symbol` runs the same script locally.

## Consequences

**Positive**
- No-code, validated symbol addition from the GitHub Actions UI.
- Real-ticker + metadata checks prevent bad entries reaching the universe.

**Negative / Trade-offs**
- ~~Dataroma institutional-holdings tracking is **separate** — it follows a small
  hardcoded crawler list, not `stocks.json`.~~ **Resolved:** the nightly Dataroma
  workflow now runs `scripts/batch_crawl_dataroma.py`, which crawls the enabled
  `config/stocks.json` universe, so added symbols are picked up automatically.
- Two extra workflow dispatches per add (ETL + deploy) consume Actions minutes.

**Neutral**
- Builds on [ADR-0004](0004-github-actions-etl.md) (GitHub Actions as ETL runtime)
  and the [ADR-0008](0008-separate-data-repository.md) seed→generate→mirror flow.

## Alternatives Considered

- **Manual edit + PR** (status quo) — friction and metadata errors; rejected.
- **Small admin web UI** — needs a backend/auth, violating Static-First
  ([ADR-0001](0001-static-first-architecture.md)); rejected.
- **GitHub Issue-form automation** — more moving parts than a `workflow_dispatch`
  for a single operator; rejected.

## Follow-ups

- Shipped in PRs [#57](https://github.com/romarin-hsieh/investment-dashboard/pull/57) (workflow + script) and [#58](https://github.com/romarin-hsieh/investment-dashboard/pull/58) (deploy dispatch).
- Operator guide: `docs/operations/ADD_NEW_SYMBOL.md`. If Dataroma should track a
  new symbol, extend `dataroma-stock-update.yml`'s ticker list.
