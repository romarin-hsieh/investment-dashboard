# Contributor How-To: Local Data Setup (Separate Data Repo)

The dashboard's data (the "Static Lake") lives in a **separate repository**,
`romarin-hsieh/investment-dashboard-data`, served from its own GitHub Pages at the
same origin as the app. The decision and rationale are in
[ADR-0008](../architecture/adr/0008-separate-data-repository.md).

## What this means

- The **app repo git-ignores `public/data`** — there is no data committed here.
- The frontend resolves data URLs against **`VITE_DATA_BASE_URL`** via
  `withDataBase()` in `src/utils/baseUrl.js` (UI/config assets still use
  `withBase()`).
- The nightly ETL **seeds → generates → mirrors**: it clones the latest data from
  the data repo, regenerates, and pushes the result back to the data repo (the app
  repo only ever receives **config-only** commits).

## First-time local setup

```bash
npm install
npm run seed-data   # clones public/data from the data repo (shallow) so the app has data
npm run dev         # Vite dev server at http://localhost:3000
```

`seed-data` runs `scripts/seed-data-from-repo.sh`. Without it, `public/data` is
empty and the dashboard will show empty/erroring widgets.

## Regenerating data locally (optional)

```bash
npm run update-daily   # runs the OHLCV + indicators + snapshot scripts
```

This writes into the **git-ignored** `public/data` for local preview only — it does
**not** commit anything, and the app repo will not pick it up. Real data updates
flow through the GitHub Actions ETL, which mirrors to the data repo. To roll back
bad published data, revert the **mirror commit in the data repo** (see
[`operations/RUNBOOK.md`](../operations/RUNBOOK.md) Playbook 7).

## Pointing at a different data source

Set `VITE_DATA_BASE_URL` at build/dev time to override where the frontend fetches
data from (e.g. a fork's Pages, or a local static server). It defaults to the
same-origin `data/` path used in production.

## Adding a symbol

Use the self-service workflow, not a manual data edit — see
[`operations/ADD_NEW_SYMBOL.md`](../operations/ADD_NEW_SYMBOL.md) and
[ADR-0012](../architecture/adr/0012-self-service-add-symbol.md).
