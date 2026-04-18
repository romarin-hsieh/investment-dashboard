# Operational Runbook

> **Scope of this doc**: Step-by-step playbooks for the failure modes the operator will most plausibly encounter. Each playbook is structured *Symptom → Diagnose → Remediate → Escalate*. If you're following a playbook and the steps don't match reality, **stop and write down the divergence** before improvising — runbook drift is the #1 cause of slow incident response.
>
> **Audience**: Operator (you, future-you), and anyone you've granted write access to in an emergency.
>
> **Related**: SLOs that trigger these playbooks live in [SLA.md](SLA.md). Architecture context in [../architecture/OVERVIEW.md](../architecture/OVERVIEW.md).

---

## Index

- [Playbook 1 — Daily ETL workflow failed](#playbook-1--daily-etl-workflow-failed)
- [Playbook 2 — Data is stale (last update >26 h ago)](#playbook-2--data-is-stale-last-update-26-h-ago)
- [Playbook 3 — Yahoo Finance / yfinance rate limit hit](#playbook-3--yahoo-finance--yfinance-rate-limit-hit)
- [Playbook 4 — Dataroma scrape returns 0 entries](#playbook-4--dataroma-scrape-returns-0-entries)
- [Playbook 5 — All Tier-3 CORS proxies failing](#playbook-5--all-tier-3-cors-proxies-failing)
- [Playbook 6 — Frontend deploy succeeded but app is blank](#playbook-6--frontend-deploy-succeeded-but-app-is-blank)
- [Playbook 7 — Bad data committed and is now in main (rollback)](#playbook-7--bad-data-committed-and-is-now-in-main-rollback)
- [Playbook 8 — Adding a new symbol to the universe](#playbook-8--adding-a-new-symbol-to-the-universe)

---

## Playbook 1 — Daily ETL workflow failed

**Symptom**: Red ❌ on `daily-data-update.yml` in the GitHub Actions tab. Status badge red. No new commit on `main` from the bot.

**Diagnose** (5 min):

1. Open https://github.com/romarin-hsieh/investment-dashboard/actions/workflows/daily-data-update.yml
2. Click the most recent failed run
3. Identify which step failed:
   - **`Install dependencies`** → Node/Python version mismatch or `package.json` / `requirements.txt` drift
   - **`Generate OHLCV`** → Yahoo Finance issue (rate limit, network, or symbol delisted) — see Playbook 3
   - **`Generate technical indicators`** → likely a bug in `scripts/generate-daily-technical-indicators.js`; check the stack trace
   - **`Run quant status`** → bug in `scripts/production/daily_update.py`; check Python traceback
   - **`Commit and push`** → `GITHUB_TOKEN` permission issue or branch protection conflict

**Remediate**:

- **Transient (network, rate limit)**: re-trigger the workflow manually via "Run workflow" button. Wait one full cycle.
- **Code bug introduced today**: revert the offending PR (`git revert <SHA>`); push; the next nightly run will use restored code.
- **Symbol-specific failure**: per-symbol failures *should not* fail the whole pipeline. If one is killing the run, the error-tolerance code in the script regressed — fix `try/except` coverage and re-run.
- **Dependency lock issue**: pin Node/Python versions explicitly in the workflow YAML.

**Escalate**:

- If the workflow has been failing for **>72 h**, the data freshness SLO is breached (>26 h). Add a banner to the dashboard manually (PR a static `<div class="banner">Data is N hours stale</div>` in `App.vue` until fixed) so users see the truth.
- If the failure is in the underlying Yahoo Finance API itself (full outage on their side), see Playbook 3.

---

## Playbook 2 — Data is stale (last update >26 h ago)

**Symptom**: Dashboard shows a stale-data banner, or `public/data/status.json.last_updated` is more than 26 hours old.

**Diagnose** (3 min):

1. Check GitHub Actions tab — did the daily run succeed?
   - **No** → go to Playbook 1
   - **Yes** → check whether the commit landed on `main`
2. If the commit landed but `status.json` shows a stale timestamp, then the producer is broken: the workflow ran but `update-status.js` failed to update `status.json`
3. Check the timestamps on individual data files (`public/data/dashboard_status.json`, `public/data/ohlcv/index.json`) — are they recent?

**Remediate**:

- If the bot committed but `status.json` is stale: re-run `npm run update-daily` locally and commit `status.json`
- If individual data files are also stale: investigate why the workflow's `Commit and push` step succeeded but data didn't update — possibly only metadata changed and there was nothing to commit

**Escalate**:

- 48 h stale: prepare a manual run of `npm run update-daily` from a local Windows machine using `run_local_system.bat`, commit results, push to `main`. Deploy will trigger automatically.

---

## Playbook 3 — Yahoo Finance / yfinance rate limit hit

**Symptom**: Daily ETL log shows `429 Too Many Requests` or `yfinance.exceptions.YFRateLimitError`. The pipeline either kills itself or processes only a partial set.

**Diagnose** (2 min):

- Check Yahoo's status page (no official one — use https://downforeveryoneorjustme.com/finance.yahoo.com)
- Confirm the GitHub Actions runner IP isn't on a blocklist (very rare)
- Check whether you ran `npm run update-daily` locally in the past 24 h (your IP and the runner share the same Yahoo rate-limit pool only if you're on the same network — usually not)

**Remediate** (in this order):

1. **Wait 1 hour**, re-trigger the workflow. Yahoo's rolling window is usually short.
2. If it persists, **increase `time.sleep()`** between symbol fetches in `scripts/generate-real-ohlcv-yfinance.py` (e.g., from 0.1 s to 0.5 s)
3. If still failing, **temporarily reduce the universe** in `public/config/stocks.json` — drop the bottom 10 symbols by interest, run, restore, and run again the next day

**Escalate**:

- Persistent rate limiting (>3 days): the Static-First model has a structural cap on how many symbols the free tier can support. Time to consider a paid market-data API (Polygon, Alpha Vantage) — file an ADR proposing the change.

---

## Playbook 4 — Dataroma scrape returns 0 entries

**Symptom**: `public/data/dataroma/{SYMBOL}.json` files are empty arrays for symbols that previously had institutional holdings; or `public/data/smart_money_sector_rotation.json` shows zero managers scraped.

**Diagnose** (5 min):

1. Open https://www.dataroma.com/m/home.php in a browser — does the site load?
2. Run the scraper locally: `python scripts/crawl_dataroma_managers.py`
3. Inspect the HTML response in the script — has the page structure changed (new CSS selectors)?

**Remediate**:

- **Site structure change**: the most common cause. Update CSS selectors in `scripts/crawl_dataroma_managers.py` and `scripts/crawl_dataroma_stock.py`. This is a recurring maintenance cost of scraping.
- **Site temporarily down**: skip this run; rely on yesterday's data (the workflow does NOT delete existing files unless explicitly told to)
- **IP block from Dataroma**: very rare; would manifest as 403 across all requests. Wait 24 h, retry.

**Escalate**:

- If the site has been redesigned in a way that breaks the scraper for >1 week, file an issue and consider whether the Dataroma feature is still viable. There is no public API alternative; falling back means accepting the loss of Smart Money tracking.

---

## Playbook 5 — All Tier-3 CORS proxies failing

**Symptom**: Network panel shows red on every `/api/yahoo` or proxy URL request. Frontend shows "Data Unavailable" widgets in cases where Static Lake had a 404.

**Diagnose** (3 min):

1. Open DevTools → Network tab; filter by "Failed"
2. Are *all* proxy requests failing, or only some?
3. Check `src/api/corsProxyManager.ts` — what's the current proxy list?

**Remediate**:

- **Some proxies failing**: the rotation logic should be handling this; if it's not, that's a code bug
- **All proxies failing**: refresh the proxy list. Public CORS proxies come and go — check known public lists (avoid linking specific URLs here as they rot). Update `corsProxyManager.ts`, ship a PR.
- **Tier-2 is the actual problem (Static Lake unavailable)**: confirm GitHub Pages is up — https://www.githubstatus.com

**Escalate**:

- Persistent failure (>1 week) → time to act on the [adr/0002 follow-up](../architecture/adr/0002-cors-proxy-strategy.md): self-host a Cloudflare Worker as the CORS proxy. File the ADR, build the Worker, update env vars.

---

## Playbook 6 — Frontend deploy succeeded but app is blank

**Symptom**: GitHub Pages shows a white page or 404 at https://romarin-hsieh.github.io/investment-dashboard/. `deploy.yml` ran green.

**Diagnose** (3 min):

1. Open DevTools Console — what error?
2. Common causes:
   - **404 on JS chunks** → `vite.config.js` `base` path mismatch (see [vite.config.js:7](../../vite.config.js:7))
   - **MIME type errors** → GitHub Pages cached an old build; hard refresh
   - **Vue mount error** → JavaScript exception at boot, check the first error in the console
3. Check the Network tab — are the `assets/index-*.js` requests resolving correctly relative to `/investment-dashboard/`?

**Remediate**:

- **Wrong base path**: `vite.config.js:7` must produce `/investment-dashboard/` in production. If it doesn't, fix and re-deploy.
- **Old service worker / cache**: instruct partners to hard-refresh (`Ctrl+Shift+R`)
- **JS error at boot**: revert the offending PR; the previous deploy will be served until the next push

**Escalate**:

- Persistent 404s after correct base path: GitHub Pages routing issue — check the `gh-pages` branch contents directly to confirm what was deployed

---

## Playbook 7 — Bad data committed and is now in main (rollback)

**Symptom**: A daily ETL run committed obviously wrong data (e.g., all stocks show the same price; signals are nonsensical; UI breaks because of malformed JSON).

**Diagnose** (2 min):

1. Identify the bad commit (latest auto-commit on `main`)
2. Identify the previous *known-good* commit
3. Confirm the issue is data, not a code regression

**Remediate**:

- **Option A (preferred)**: re-run the daily workflow with corrected inputs. The next run produces a new commit overwriting the bad data — Git history retains both.
- **Option B**: if the bad data is causing UI to crash, do a `git revert` of just the bad data commit:
  ```bash
  git revert <BAD_SHA> --no-commit
  git commit -m "revert: bad daily data from <DATE> — see RUNBOOK §7"
  git push origin main
  ```
- The deploy will trigger and serve restored data within a few minutes

**Escalate**:

- If the cause is a producer-script bug introduced in a PR: revert the PR, then revert the data commit, then write a regression test in WS-B (PR-B1 or follow-up).

---

## Playbook 8 — Adding a new symbol to the universe

**Symptom**: Not a failure — a routine operation. Listed here so the steps are never lost.

Detailed steps live in [ADD_NEW_SYMBOL.md](ADD_NEW_SYMBOL.md). High-level:

1. Edit `public/config/stocks.json` — add the symbol with sector/industry placeholders
2. Open a PR with just that change
3. Merge
4. The next nightly run will fetch and populate `public/data/ohlcv/{SYMBOL}.json`, `public/data/dataroma/{SYMBOL}.json`, etc.
5. Verify the symbol appears on the dashboard the next morning

If the symbol does NOT appear after the next run: check `public/data/manifest.json.failed[]` — Yahoo may not recognise the ticker, or it might be a non-US listing.

---

## Standing Notes

- **Always check the date before acting**. A "yesterday's data" report at 09:00 Taipei means the run completed normally; it's not stale yet (next run is 10:00 Taipei).
- **The bot uses `[skip ci]`** in some commit messages to avoid triggering the deploy — this is intentional for data-only commits. Don't "fix" it.
- **No paging exists**. If you're not actively watching, you won't be told about a failure. Build the morning-coffee Actions-tab habit.
- **When in doubt, prefer manual intervention to automated retries**. Loops on rate-limited APIs make things worse.
