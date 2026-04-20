# ADR-0006 — Static-Data Caching on GitHub Pages

- **Status**: Accepted
- **Date**: 2026-04-20
- **Deciders**: Project owner
- **Context tags**: `deployment`, `performance`, `hosting`

## Context & Problem

The Code / UI Remediation Roadmap (tracked in the project plan file) scoped a PR to "add `Cache-Control: max-age=86400, immutable` for `public/data/*.json` via a Vite plugin" so that repeat visits serve those files from the browser's disk cache instead of re-downloading them. The goal: make the dashboard feel instant on the second visit.

**The reality on GitHub Pages**: Pages serves static files with a fixed
`Cache-Control: max-age=600` (10 minutes) plus an `ETag` and
`Last-Modified`. There is **no way to override these headers** from the repository — `_headers` files (Netlify / Cloudflare Pages convention) are ignored, and Pages does not expose any per-path header configuration. A Vite plugin can influence the build output (`dist/`), but the headers are injected by GitHub's serving layer, downstream of what we control.

Confirmed by a direct HEAD request against the live site:

```
$ curl -sI https://romarin-hsieh.github.io/investment-dashboard/data/technical-indicators/latest_index.json
Cache-Control: max-age=600
ETag: "69e6285c-1679"
Last-Modified: Mon, 20 Apr 2026 13:21:32 GMT
Age: 0
```

So PR-C4 as originally scoped is **infeasible on the current hosting**. We need a different approach to achieve the same user-visible outcome.

## Decision

We adopt a **layered client-side caching strategy** on top of GitHub Pages' fixed `max-age=600`:

1. **Browser HTTP cache (10 min)** — inherited from GH Pages, handled automatically. Covers rapid in-session navigation.
2. **`<link rel="prefetch">` hints in [index.html](../../../index.html)** — the browser fetches the 2–3 data files that every page-load needs (`latest_index.json`, `latest_all.json`, `dashboard_status.json`) during idle, populating the HTTP cache *before* the SPA's `fetch()` runs. On first paint the data appears instantly.
3. **Hourly URL cache-busting** (`?t=${Math.floor(Date.now() / 3_600_000)}`) — used by `precomputedIndicatorsApi.js`, `precomputedOhlcvApi.js`, etc. The URL is stable within an hour, so browser HTTP + CDN caches serve the file for ~1 h before the timestamp bucket rolls over.
4. **In-memory cache** — `src/utils/performanceCache.js`, `QuantDataService.js` in-memory Maps avoid even cache-hit round-trips within a session.
5. **LocalStorage cache with LRU** — `src/utils/technicalIndicatorsCache.js` (rewritten in WS-B PR-B4) persists processed indicator data across sessions, with a 24 h TTL, 3 MB cap, and access-time eviction.

**Layers 1 + 2 are new in WS-C PR-C4.** Layers 3–5 pre-date this decision.

## Consequences

**Positive**
- Repeat visitors get near-instant paint on the landing route even though we can't set server `Cache-Control` directly
- No hosting migration required; preserves the $0 operating cost in [ADR-0001](0001-static-first-architecture.md)
- Each layer degrades independently: if prefetch is blocked by a privacy extension, layer 1 still works; if layer 1 expires, layer 3 kicks in

**Negative / Trade-offs**
- Prefetch list is static — new data files that become critical on the landing route need a manual entry in `index.html`. Not a lot of files; not a heavy maintenance burden.
- Prefetch hints that reference dev-build paths (`/src/...`) don't work in production — for data URLs under `/investment-dashboard/data/`, the base path in `vite.config.js` is fixed so the hardcoded prefix is safe.
- Aggressive client-side caching can hide data-pipeline bugs. Mitigation: existing staleness UI (StockCard stale banner, PRD F6 acceptance) surfaces stale states.

**Neutral**
- Layer 2 (prefetch) has no effect in development (Vite dev server serves data files on-demand via a different path). Production-only optimisation.

## Alternatives Considered

- **Migrate hosting to Cloudflare Pages** — supports `_headers`; we could set `Cache-Control: max-age=86400, immutable` for JSON files directly. **Rejected for now**: adds a hosting dependency outside the ADR-0001 "GitHub-only" stance, and current client-side strategy achieves the same user-visible effect. Revisit if we outgrow GH Pages limits.
- **Service Worker with a custom cache policy** — gives us full control, can shadow the HTTP cache entirely. **Rejected**: adds complexity (SW lifecycle, update choreography, SKIP_WAITING semantics) for a marginal win over HTTP prefetch + URL versioning.
- **Cloudflare Worker in front of GH Pages** — injects Cache-Control in flight. **Rejected**: same as the Cloudflare Pages option, plus an extra moving part.
- **Accept the plan's original Vite plugin approach** — would produce a plugin that does nothing on GH Pages but wastes a build step. **Rejected**: theater, not substance.

## Follow-ups

- **Prefetch list maintenance**: when a new data file becomes critical on the landing route, add a `<link rel="prefetch">` entry to `index.html`. Grep for existing entries to find the pattern.
- **Migration re-evaluation trigger**: if SLA shows repeat-visit TTI > 1.5 s p75 (currently unmeasured — target to instrument), reconsider Cloudflare Pages migration.
- **Observability**: document in `docs/operations/RUNBOOK.md` a new playbook for "data file not appearing in prefetch" — typical fix is the base-path prefix (`/investment-dashboard/`) mismatch.
