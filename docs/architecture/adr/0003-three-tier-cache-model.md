# ADR-0003 — 3-Tier Cache Model (Memory → CDN → Live)

- **Status**: Accepted
- **Date**: 2024 (retrospective), 2026-04 formalisation
- **Deciders**: Project owner
- **Context tags**: `performance`, `data`, `reliability`

## Context & Problem

The Static-First model ([ADR-0001](0001-static-first-architecture.md)) makes static JSON the Golden Source, but it leaves two gaps:

1. **Navigation performance** — re-fetching the same JSON every time a user clicks between Market → Stock Detail is wasteful (~50 ms × N).
2. **Availability under failure** — if the nightly ETL fails and a JSON is missing or corrupt, the app should still render *something* useful.

We need an explicit data-access contract that addresses both.

## Decision

The frontend data layer enforces a **strict 3-tier cache hierarchy** with fallback:

| Tier | Source | Latency | TTL | Role |
|---|---|---|---|---|
| 1 | In-memory Map (per session) + LocalStorage (10 min) | < 5 ms | session | Instant re-navigation |
| 2 | Static JSON from GitHub Pages CDN | ~50 ms | 24 h | **Golden Source**, 99% of reads |
| 3 | Live API via rotated CORS proxy | ~500 ms | 0 | Fallback only |

**Enforcement rules**:
- All data access goes through `src/services/` or `src/api/` — no component calls external URLs directly
- Tier 1 is read-through: miss falls through to Tier 2; Tier 2 miss (404 or `isStale` past TTL) falls through to Tier 3
- Stale Tier-2 data is **preferred over empty** — it's returned with an `isStale: true` flag and the UI shows a visible timestamp banner (see PRD Acceptance F1 Scenario 2)
- Tier 3 is opt-in (either by explicit "refresh live" or by Tier 2 being absent)

See `src/utils/performanceCache.js`, `src/api/corsProxyManager.ts`, and the `isStale` flag pattern in [PRD F1 / F6](../../product/PRD.md#6-acceptance-criteria-p0--must-have-features-only).

## Consequences

**Positive**
- Navigation feels instant (Tier 1)
- Bandwidth cost is low (Tier 2 CDN cache-hits dominate)
- Degrades gracefully — missing JSONs don't black-hole the page
- Invariants are centralized; a single service file defines fallback behavior

**Negative / Trade-offs**
- Users can see stale banners — must be prominent but not alarming
- Additional complexity in `performanceCache.js` (dual-layer TTL, deduplication of in-flight requests)
- Tier-3 reliability is outside our control ([ADR-0002](0002-cors-proxy-strategy.md))

**Neutral**
- The tier boundary is also a logging boundary — instrumentation happens here

## Alternatives Considered

- **Service worker with offline-first caching**: gives us Tier-1 for free but complicates debugging (hard-reload trap). Revisit when bundle serving becomes a bottleneck.
- **Always go live (skip Tier 2)**: contradicts [ADR-0001](0001-static-first-architecture.md) performance goals.
- **Always stale-only (skip Tier 3)**: fails Job Story #6.

## Follow-ups

- SLOs on Tier-2 hit rate tracked in [operations/SLA.md](../../operations/SLA.md)
- Consider adding an explicit "force live" toggle in Settings for the Operator persona (backlog)
