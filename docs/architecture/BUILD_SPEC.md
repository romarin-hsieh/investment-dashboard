# Build Specification

> **Scope of this doc**: Design-for-build contracts. Defines the *interfaces*, *budgets*, and *guarantees* that must hold across the SPA, the ETL pipeline, and external dependencies. Does **not** describe product behaviour (see [../product/PRD.md](../product/PRD.md)) or system topology (see [OVERVIEW.md](OVERVIEW.md)).
>
> **Audience**: Engineers planning a change that affects more than one file. If you're touching only one component, read this doc anyway — most regressions trace back to violating one of these contracts.

---

## 1. System Context (C4 Level 1)

```
                    ┌──────────────────────────────────┐
                    │   End Users (Browser, desktop)    │
                    │   Operator + ≤5 Core Partners     │
                    └────────────────┬─────────────────┘
                                     │ HTTPS
                                     ▼
   ┌────────────────────────────────────────────────────┐
   │   Kiro Investment Dashboard (Vue 3 SPA)             │
   │   Hosted on GitHub Pages — base path                │
   │   /investment-dashboard/                            │
   └─────┬──────────────────────────────┬───────────────┘
         │ reads (Tier 2)               │ falls back (Tier 3)
         ▼                              ▼
  ┌─────────────────┐          ┌──────────────────┐
  │  Static Lake    │          │  CORS Proxies    │──► Yahoo Finance
  │  public/data/*  │          │  (rotated list)  │
  └────────▲────────┘          └──────────────────┘
           │ commits nightly
  ┌────────┴───────────────────────────────────────────┐
  │   GitHub Actions ETL ("backend")                    │
  │   Python 3.11 + Node 18 — see workflows below       │
  └────────┬───────────────────────────────────────────┘
           ▼
   ┌──────────┬──────────┬──────────────┬──────────┐
   │  Yahoo   │ Dataroma │ CNN F&G      │ (future) │
   │  Finance │  13F     │ (Puppeteer)  │ Obsidian │
   └──────────┴──────────┴──────────────┴──────────┘
```

---

## 2. Container View

| Container | Runtime | Stateful? | Owner File(s) |
|---|---|---|---|
| Vue SPA | Browser (Chrome/Edge/Firefox latest) | Per-session (LocalStorage only) | `src/main.js` |
| Static Lake | GitHub Pages CDN | Yes — JSON files | `public/data/` |
| Daily ETL | GitHub Actions Ubuntu runners | Stateless (commit-based) | `.github/workflows/daily-data-update.yml` |
| Dataroma scraper | GitHub Actions | Stateless | `.github/workflows/dataroma-stock-update.yml` |
| Metadata refresh | GitHub Actions | Stateless | `.github/workflows/update-metadata.yml` |
| Frontend deploy | GitHub Actions → `gh-pages` | Stateless | `.github/workflows/deploy.yml` |
| CORS proxy pool | External, public | N/A | `src/api/corsProxyManager.ts` |

---

## 3. Interface Contracts

### 3.1 Internal (Vue components)

- **Service layer** (`src/services/`, `src/api/`) is the only authorised data ingress. Components must NOT call `fetch()` directly.
- **TypeScript contracts** in `src/types/index.ts` are authoritative for inter-component data shapes. When a `.js` file diverges from the type, the type wins.
- **Component props** must be declared with `defineProps` + types (TypeScript) or `validator` functions (JavaScript). No untyped `Object` props on shared components.

### 3.2 External (data adapters)

| Adapter | Purpose | Source | Failure mode |
|---|---|---|---|
| `src/api/yahooFinanceApi.js` | Live OHLCV + quotes via CORS proxy | Yahoo Finance | Returns `null`, surfaces `isLive: false` flag downstream |
| `src/api/precomputedOhlcvApi.js` | OHLCV from Static Lake | `public/data/ohlcv/{symbol}.json` | Returns `null` on 404; consumer must handle |
| `src/api/precomputedIndicatorsApi.js` | Indicators from Static Lake | `public/data/technical-indicators/{date}_{symbol}.json` | Returns `null`; falls back to hybrid path |
| `src/api/hybridTechnicalIndicatorsApi.js` | Stale-tolerant indicators | Above + last-known | Returns stale data with `isStale: true` flag |
| `src/api/corsProxyManager.ts` | Tier-3 proxy rotation | External public proxies | Cycles through list; widget-scoped error if all fail |

### 3.3 Data contracts

All shapes are documented in [../specs/DATA_DICTIONARY.md](../specs/DATA_DICTIONARY.md). A breaking schema change requires:

1. Update DATA_DICTIONARY in same PR as producer change
2. Bump `meta.version` field where present (`dashboard_status.json` etc.)
3. Add a fallback in the consumer or coordinate the consumer release

---

## 4. CI/CD Contract

### 4.1 Workflows

| Workflow | Trigger | Required env | Failure policy |
|---|---|---|---|
| `daily-data-update.yml` | Cron `0 2 * * *` UTC + manual | `GITHUB_TOKEN` (write) | Per-symbol failure logged, pipeline continues; whole-workflow failure visible in Actions tab |
| `dataroma-stock-update.yml` | Cron `0 0 * * *` UTC + manual | `GITHUB_TOKEN` | Same as above |
| `update-metadata.yml` | Cron `0 2 * * 0` UTC (weekly) + manual | `GITHUB_TOKEN` | Same |
| `deploy.yml` | Push to `main` | `GITHUB_TOKEN` | Hard fail; no deploy if `npm run build` fails |

### 4.2 Required secrets

**None today.** All data sources are public; no API keys are stored. If self-hosted CORS proxy is added (see [adr/0002](adr/0002-cors-proxy-strategy.md) follow-up), `CORS_PROXY_URL` becomes a required secret.

### 4.3 Build commands (contract)

| Command | What it must do | Where defined |
|---|---|---|
| `npm run dev` | Start Vite dev server on `:3000`, open browser | [package.json:10](../../package.json:10) |
| `npm run build` | Produce `dist/` for GitHub Pages with base `/investment-dashboard/` | [package.json:11](../../package.json:11) |
| `npm run update-daily` | Run full ETL chain (Python + 4 Node scripts) | [package.json:12](../../package.json:12) |
| `npm run validate:data` | Schema-check generated JSON (must exit 0 before commit) | [package.json:13](../../package.json:13) |
| `npm run fetch:fundamentals` | Refresh `public/data/fundamentals/*.json` | [package.json:15](../../package.json:15) |
| `npm test` | Run Vitest suite (currently 0 tests; gate added when WS-B PR-B1 lands) | TBD |

### 4.4 Branch policy

- `main` is the only protected branch
- All changes via PR; PRs may be self-merged by the operator (solo project)
- Do not push to `main` directly except via the daily ETL bot (which uses `[skip ci]` in commit message)

---

## 5. SLO Summary (top 3)

Full SLOs in [../operations/SLA.md](../operations/SLA.md). The three that block a release if missed:

| # | SLO | Target | Measured by |
|---|---|---|---|
| 1 | Daily ETL success rate | ≥ 95% (rolling 30 d) | Manual review of GitHub Actions |
| 2 | Dashboard TTI p75 (home page) | < 2.5 s | Lighthouse + manual on cold cache |
| 3 | Data freshness | < 26 h | `status.json.last_updated` vs. now |

---

## 6. Security Model

### 6.1 Secrets

- **No secrets in the bundle.** Frontend code MUST NOT contain API keys, tokens, or credentials. CI grep check (TODO: add to PR-B1) catches violations.
- **No secrets in the Static Lake.** All `public/data/*.json` is publicly readable.
- LocalStorage holds only watchlist/holdings (per-user UI state), never PII or financial credentials.

### 6.2 CORS Proxy Trust

Tier-3 proxies are untrusted intermediaries. Consequences:

- **MUST NOT** send any user data through the proxy (we only `GET` from Yahoo)
- **MUST validate** the response shape before rendering — Zod-first if data is going to a chart
- Proxies can rewrite or cache responses; treat returned JSON as low-confidence

### 6.3 Content Security Policy

GitHub Pages does not let us set custom CSP headers without a worker. Until that changes:

- All inline scripts that *would* be CSP violations are forbidden — the build must produce no inline `<script>` (Vite handles this)
- TradingView widget scripts are loaded from their own CDN and are sandboxed in iframes

### 6.4 Rate Limits

| Source | Limit | Mitigation |
|---|---|---|
| Yahoo Finance (yfinance) | ~2k/day per IP | Concentrated to one GitHub Actions IP per run; pause between symbol fetches |
| yahoo-finance2 (JS) | ~1.5k/day | Same |
| Dataroma | Self-imposed ~10 req/s | `time.sleep(0.1)` between requests in scraper |
| CORS proxies (Tier 3) | Per-proxy, varies | Rotation via `corsProxyManager.ts` |

---

## 7. Performance Budget

| Metric | Target | Current (estimated) | Source |
|---|---|---|---|
| Initial JS chunk (gzipped) | ≤ 450 KB | ~600 KB ⚠️ | Bundle audit |
| Plotly.js in initial chunk? | No (own chunk) | Yes ⚠️ | [vite.config.js:19](../../vite.config.js:19) |
| TTI p75 (home page) | < 2.5 s | Unknown — establish baseline | Lighthouse |
| LCP p75 | < 2.5 s | Unknown | Lighthouse |
| Vite `chunkSizeWarningLimit` | 500 KB | 1000 KB ⚠️ | [vite.config.js:25](../../vite.config.js:25) |
| Static JSON `Cache-Control` | `max-age=86400, immutable` | Not set ⚠️ | Vite default |

⚠️-marked items are tracked in the Code/UI Remediation Roadmap (Workstream C). Until resolved, this section reports *targets* not *guarantees*.

---

## 8. Observability

### 8.1 What we have

- **GitHub Actions run history** — every ETL run is auditable; logs retained per GitHub policy (90 days)
- **Browser console** — `console.log` is stripped in production builds ([vite.config.js:29](../../vite.config.js:29)); `console.warn`/`error` retained for debugging
- **Static Lake `status.json`** — pipeline self-reports its last successful run

### 8.2 What we don't have (intentionally — solo-operator scope)

- No alerting / paging — operator reviews the Actions tab each morning
- No client-side error reporting service (Sentry, etc.)
- No real-user-monitoring (RUM) — Lighthouse on demand instead
- No log aggregation — GitHub Actions UI is the dashboard

### 8.3 Manual dashboards

- GitHub Actions tab: https://github.com/romarin-hsieh/investment-dashboard/actions
- Static Lake browser: https://github.com/romarin-hsieh/investment-dashboard/tree/main/public/data
- Live deploy: https://romarin-hsieh.github.io/investment-dashboard/

---

## 9. Change Management

Architectural changes are recorded in [adr/](adr/) using the MADR template (see [adr/README.md](adr/README.md)).

A change requires a new ADR if it:

1. Adds a new external dependency (npm package, CDN, API)
2. Changes a build-time invariant (e.g., adds a new `manualChunks` bucket)
3. Alters the security model (e.g., adds a service worker, introduces secrets)
4. Modifies a Tier of the cache hierarchy
5. Adds a new GitHub Actions workflow or significantly alters an existing one

Changes that **do not** need an ADR:

- Bug fixes within existing contracts
- Refactors that preserve behaviour
- Doc-only changes
- Performance tuning that doesn't change interfaces

---

## Related Documents

- Architecture overview: [OVERVIEW.md](OVERVIEW.md)
- Decision records: [adr/](adr/)
- Data contracts: [../specs/DATA_DICTIONARY.md](../specs/DATA_DICTIONARY.md)
- Operational playbooks: [../operations/RUNBOOK.md](../operations/RUNBOOK.md)
- SLOs / SLA: [../operations/SLA.md](../operations/SLA.md)
- Product spec: [../product/PRD.md](../product/PRD.md)
