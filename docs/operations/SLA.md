# Service Level Agreement (SLA / SLO / Error Budget)

> **Scope of this doc**: Numeric commitments and the error budgets that derive from them. Captures *what we promise* (externalised SLA) and *how we measure* (SLI / SLO).
>
> **Audience**: Anyone proposing work that could affect data freshness, page speed, or system availability — they should consult this doc to know whether they're spending or replenishing the error budget.
>
> **Reality check**: This is a private, solo-operator project. The "agreement" is between the operator and themselves (and ≤5 partners). SLOs exist to make trade-offs explicit, not to satisfy a contract.

---

## 1. Service Level Indicators (what we measure)

| SLI | Definition | Where measured |
|---|---|---|
| **ETL success rate** | (Successful daily-data-update runs) / (Total scheduled daily-data-update runs) over rolling 30 days | GitHub Actions tab (manual review) |
| **Data freshness** | `now - status.json.last_updated` for the most recent successful run | `public/data/status.json` |
| **Static Lake availability** | (Successful HTTP 200 responses) / (Total requests) for `dashboard_status.json` | GitHub Pages SLA (inherited; ~99.95%) |
| **Page TTI (p75)** | Time-to-Interactive at 75th percentile of cold-cache loads | Lighthouse on demand |
| **Tier-2 cache hit rate** | (Tier 2 reads) / (Tier 1 misses) — i.e., how often Static Lake serves successfully before Tier-3 fallback | DevTools Network panel (manual sampling) |
| **`"NaN"` text incidence** | Number of UI views containing the literal string `"NaN"` per 100 page renders | Manual visual inspection |

---

## 2. Service Level Objectives

| # | SLO | Target | Window | Why this number |
|---|---|---|---|---|
| 1 | ETL success rate | **≥ 95%** | Rolling 30 d | Allows ~1.5 failures/month — Yahoo / Dataroma occasionally have transient issues; tightening past 95% would force investment in retries that don't justify themselves at this scale |
| 2 | Data freshness | **< 26 h** | Per check | The pipeline runs at 02:00 UTC; 26 h gives a 2-hour grace window before the next run is also expected to fix things |
| 3 | Static Lake availability | **≥ 99.9%** | Rolling 30 d | Inherited from GitHub Pages; we don't control it — included for visibility, not for action |
| 4 | Dashboard TTI p75 (home page) | **< 2.5 s** | Per measurement | PRD Job Story #1 ("morning scan in <2 minutes") implies sub-second perception per page; 2.5 s is the upper bound before users start tab-hopping |
| 5 | TTI p75 (Stock Detail) | **< 3.5 s** | Per measurement | StockDetail is heavier (TradingView iframe + Plotly + multiple API calls); 3.5 s is realistic |
| 6 | Tier-2 cache hit rate | **≥ 95%** | Rolling 7 d | Tier 3 (CORS proxy) is best-effort; we should never rely on it for the common path |
| 7 | LCP p75 (any page) | **< 2.5 s** | Per measurement | Web Vitals "good" threshold |
| 8 | Initial JS bundle (gzipped) | **≤ 450 KB** | Per release | Performance budget anchor — see [BUILD_SPEC §7](../architecture/BUILD_SPEC.md#7-performance-budget) |
| 9 | Lighthouse Accessibility (Market page) | **≥ 85** | Per release | Minimum-viable a11y baseline; full WCAG AA pass is a separate initiative |
| 10 | Broken-link rate (404 in Static Lake) | **0** per day | Daily | Stale data is acceptable; *missing* data is not |

---

## 3. Error Budgets

For each SLO, the error budget is `1 − target` over the SLO window.

| SLO | Budget | Spent on |
|---|---|---|
| ETL success ≥ 95% | ~1.5 failed runs / 30 d | One Yahoo outage + one Dataroma rate-limit hit = budget consumed |
| Data freshness < 26 h | 2 h slack per day | One delayed run before users notice |
| Tier-2 hit rate ≥ 95% | 5% of reads can fall through to Tier 3 | Stock pages with no static JSON yet (newly added symbols) |
| Bundle ≤ 450 KB | 0 KB — hard cap | Spend by adding heavy deps; replenish by code-splitting |

**When budget is exhausted**:

- For SLO 1 (ETL): pause feature work, investigate root cause, write a runbook entry
- For SLO 2 (freshness): same as 1
- For SLO 6 (Tier-2 hit): trigger an audit — likely a producer regression
- For SLO 8 (bundle): block release; the offending change must be split or deferred

---

## 4. Out-of-Scope (non-SLOs)

These are deliberately not tracked because they are noise at this scale:

- DAU / MAU — synthetic personas, no meaningful denominator
- Session length — not a goal
- Conversion / activation funnel — no commercial funnel exists
- Server uptime — there is no server (see [adr/0001](../architecture/adr/0001-static-first-architecture.md))
- API response time — there is no API (see [adr/0001](../architecture/adr/0001-static-first-architecture.md))
- Tier-3 (CORS proxy) availability — explicit best-effort per [adr/0002](../architecture/adr/0002-cors-proxy-strategy.md)

---

## 5. How to Spend / Replenish the Budget

**Before merging a change**, ask:

1. Does this change increase the JS bundle? — If so, is it inside SLO 8 (450 KB)?
2. Does this change touch the ETL pipeline? — If so, does it preserve "one symbol failure does not kill the run" (SLO 1)?
3. Does this change introduce a new external dependency? — If so, does it have its own SLA, or am I inheriting another point of failure?
4. Does this change make Tier-3 fallback more likely? — If so, am I willing to spend SLO 6's budget?

**To replenish budget**, prioritise PRs from the [Code/UI Remediation Roadmap](../../). Workstream B (Data Correctness) directly improves SLOs 1, 2, 6, 10. Workstream C (Performance) directly improves SLOs 4, 5, 7, 8.

---

## 6. Review Cadence

- **Monthly**: operator reviews ETL success rate (SLO 1) and freshness (SLO 2) by skimming GitHub Actions
- **Per release**: rebuild → check bundle size (SLO 8); run Lighthouse on `/` and `/stock/:symbol` (SLO 4, 5, 7, 9)
- **Quarterly**: review whether any SLO targets need revision (e.g., raising the bar after sustained over-performance)

---

## Related Documents

- Performance budget: [../architecture/BUILD_SPEC.md §7](../architecture/BUILD_SPEC.md#7-performance-budget)
- Operational playbooks (when an SLO is breached): [RUNBOOK.md](RUNBOOK.md)
- Decision records: [../architecture/adr/](../architecture/adr/)
- Code/UI remediation roadmap (where SLO improvements live): see project plan file
