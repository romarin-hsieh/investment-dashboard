# ADR-0007 — Bundle-Size Budgets and Enforcement

- **Status**: Accepted
- **Date**: 2026-04-25
- **Deciders**: Project owner
- **Context tags**: `performance`, `ci-cd`, `frontend`, `quality-gate`

## Context & Problem

WS-D Bundle Analyzer Integration shipped in two PRs:

- [PR #24 (PR-D1)](https://github.com/romarin-hsieh/investment-dashboard/pull/24) — `rollup-plugin-visualizer` plugin + `npm run build:analyze` + per-deploy `bundle-stats` artifact.
- [PR #25 (PR-D2)](https://github.com/romarin-hsieh/investment-dashboard/pull/25) — per-PR delta comment via `bundle-size.yml` workflow + [`scripts/bundle-size-delta.js`](../../../scripts/bundle-size-delta.js).

Both surface bundle size as **observability** — they make regressions visible to the reviewer. They do **not** prevent regressions: a 200 KB accidental dep bleed could ship if the reviewer skims the comment.

WS-C delivered a 91.6 % reduction in initial JS gzipped (1,691 KB → 142 KB) at significant engineering cost (PRs #17–#20). Without a gate, that win erodes silently — every contributor who imports a too-heavy library, drops a code-split barrier, or pulls a transitive dep into the wrong chunk pushes us back toward the pre-WS-C baseline. The user-visible cost of regression is real (TTI on slow networks), but the per-PR cost is invisible at review time without explicit numeric budgets to compare against.

We need a CI gate that **fails the workflow** when a chunk grows past a calibrated threshold, so the conversation shifts from "is this growth OK?" (subjective, post-hoc) to "the budget says no — either shrink it or raise the budget with rationale" (objective, ex ante).

## Decision

We enforce **5 absolute gzip budgets** on the post-normalization chunk totals (after 8-char content hashes are stripped — see [`normalizeChunkName()`](../../../scripts/bundle-size-delta.js)):

| Chunk | Budget (gzip) | Measured 2026-04-25 | Headroom |
|---|---:|---:|---:|
| `assets/plotly.js`      | **1.80 MB** | 1.55 MB | 13 % |
| `assets/index.js`       | **160 KB**  | 139 KB  | 15 % |
| `assets/StockDetail.js` | **130 KB**  | 107 KB  | 21 % |
| `assets/vendor.js`      | **80 KB**   | 61 KB   | 31 % |
| `__total__` (all chunks)| **2.25 MB** | 1.99 MB | 11 % |

**Calibration method**: fixed-headroom over measured baseline. Each per-chunk budget is the next round number above `actual × 1.10`–`1.30`, with the chunk's volatility informing the multiplier (more volatile → more headroom). The whole-bundle `__total__` row catches "death by a thousand cuts" growth that no individual chunk budget would flag.

**Where the budgets live**: [`scripts/bundle-size-budgets.js`](../../../scripts/bundle-size-budgets.js). Single source of truth, imported by both [`bundle-size-delta.js`](../../../scripts/bundle-size-delta.js) (for the comment's budget-status section) and the `Enforce bundle budgets` step in [`bundle-size.yml`](../../../.github/workflows/bundle-size.yml).

**Adjustment policy** (the discipline this ADR enforces):

1. Budget tweaks land via PR that updates *both* `bundle-size-budgets.js` *and* this ADR's "Change log" section below.
2. The PR description must justify the change in one of three ways:
   - **Justified growth** — a deliberate feature/dep brings real user value; quantify the benefit.
   - **Recalibration** — the baseline shifted underneath us (e.g., Vue minor bump); show the new measurement.
   - **Tightening** — we found unused budget headroom; raise the bar.
3. Budgets are *not* tweaked silently or in unrelated PRs.
4. Tests in [`bundle-size-delta.test.js`](../../../scripts/bundle-size-delta.test.js) deliberately do **not** assert specific budget numbers, so a budget tweak doesn't cascade into test edits — only the change log here is the ledger.

## Consequences

**Positive**
- WS-C's 91.6 % gain becomes durable: silent regressions fail CI rather than slip into the next deploy.
- The budget-status section on every PR comment makes the gate's verdict legible to the reviewer alongside the delta — they don't need to leave the PR to understand "why is CI red?".
- Calibration method is explicit (fixed-headroom over measured), so future budget tweaks have a documented basis instead of being subjective.
- The 5-budget choice (4 named chunks + `__total__`) is small enough to keep in working memory but covers the chunks that actually matter — the per-chunk budgets catch surgical regressions, the total catches diffuse ones.

**Negative / Trade-offs**
- A legitimate feature growth that pushes a single chunk past its budget will fail CI and require a budget bump as part of the PR — adds friction, but that friction is the whole point.
- Headroom on `plotly.js` is the tightest at 13 %. A meaningful Plotly version bump, or adding a 3D-chart feature that pulls in additional Plotly modules, will force this conversation early. Considered acceptable: that's the chunk most worth being deliberate about.
- Workflow runtime grows by ~5 s for the `Enforce bundle budgets` step. Negligible.

**Neutral**
- The gate runs only on PRs touching `src/**`, `vite.config.js`, or `package*.json` (per `bundle-size.yml`'s path filter). PRs that only touch docs, ETL scripts, or other workflows are unaffected.
- This ADR does not enforce **raw** byte budgets — only gzip. Gzip is what users actually transfer; raw size is a leading indicator that gets compressed away. Considered, rejected for v1.

## Alternatives Considered

- **Rolling-window percentile budget** — e.g., budget = p95 of last 30 main builds + 10 %. Auto-calibrates as the codebase evolves; no manual tweaks needed. **Rejected for v1**: requires persistent state (a budget-history JSON checked into the repo, or a workflow that fetches the last N runs' artifacts), introduces a "what's our baseline today" question on every PR, and the calibration drift is itself something we'd need to monitor. The fixed-headroom approach makes the budget a deliberate product decision instead of a moving emergent property of recent commits. Revisit if false-positive budget failures accumulate.
- **Stricter zero-tolerance** — fail any PR that grows any chunk by even 1 byte. **Rejected**: would block trivially-justified growth (single-line bug fixes that import a util) and create reviewer fatigue with "raise the budget by 1 KB" PRs. The headroom-based approach trades a small amount of slack for sane review economics.
- **Raw byte budgets in addition to gzip** — would catch dead-code-elimination regressions earlier (raw can grow significantly even when gzip is flat). **Rejected for v1**: doubles the number of budgets to maintain, and a raw regression that doesn't show up in gzip is by definition not user-visible. Worth revisiting if we ever instrument bundle parse-time.
- **No gate at all (keep PR-D2's informational comment as-is)** — relies on reviewer discipline. **Rejected**: that's exactly what the WS-C remediation story showed degrades silently. The gate is the durable mechanism.
- **Brotli budgets instead of gzip** — Brotli is what GH Pages actually serves to modern browsers (CDN content negotiation). **Rejected for v1**: brotli is a leading indicator of gzip — they correlate ~0.95+. Adding brotli budgets adds bookkeeping for a near-zero signal gain. Revisit if mismatch becomes interesting.

## Follow-ups

- **Surface the budget table in [`bundle-stats` artifact-style report](https://github.com/romarin-hsieh/investment-dashboard/actions)** — currently the budget result lives only in the PR comment. A small README in the artifact ZIP could rerun `--check-budgets` and emit a static report, useful for offline post-deploy investigation.
- **Brotli budgets** — if we ever measure a meaningful gzip↔brotli divergence on a real PR, add a parallel set of brotli budgets to this table.
- **Per-chunk raw byte budgets** — same trigger: if a real PR ships gzip-flat but raw-bloated, instrument and add.
- **Auto-calibration helper script** — a `scripts/recalibrate-budgets.js` that reads `stats.json` and emits a budget-config diff at user-specified headroom percentages, so manual tweaks don't drift between "what we measured" and "what we wrote".

## Change log

A running ledger of every budget change since this ADR was accepted. Append a row whenever [`scripts/bundle-size-budgets.js`](../../../scripts/bundle-size-budgets.js) changes.

| Date | PR | Chunk | Old budget | New budget | Justification |
|---|---|---|---|---|---|
| 2026-04-25 | PR-D3 | (initial calibration) | — | see table above | Initial budgets calibrated against measured baseline at PR-D3 merge time |
