# ADR-0002 — CORS Proxy Rotation for Tier-3 Fallback

- **Status**: Accepted
- **Date**: 2024 (retrospective), 2026-04 formalisation
- **Deciders**: Project owner
- **Context tags**: `data`, `fallback`, `risk`

## Context & Problem

When the Static Lake is missing (404) or explicitly requires fresh intraday data, the frontend must reach Yahoo Finance directly. Browsers block cross-origin requests without appropriate CORS headers. Yahoo Finance does not serve CORS, so a relay is required. We need a Tier-3 fallback that is (a) free, (b) tolerant of individual-proxy outages, and (c) rate-limit-friendly.

## Decision

We route Tier-3 live requests through a **rotated list of public CORS proxies**, managed by `src/api/corsProxyManager.ts`. The rotation logic:

1. Maintains an ordered list of proxy endpoints
2. Tries the first proxy; on `TypeError` / non-2xx / timeout, advances to the next
3. Pins a successful proxy for the duration of a session to preserve locality
4. Ceases rotation when all candidates exhausted and surfaces a widget-scoped error

Tier-3 is considered a **best-effort degradation path**, not a reliable primary source. Performance expectations live in [operations/SLA.md](../../operations/SLA.md) under "Tier-3 fallback" (no SLO is promised).

## Consequences

**Positive**
- Zero operational cost; no self-hosted infrastructure
- Resilient to single-proxy outages
- Degrades gracefully when all proxies fail (widget-scoped error, rest of app keeps working)

**Negative / Trade-offs**
- Dependency on third-party public services we don't control
- Latency is variable (~500 ms–3 s)
- Proxies can silently rewrite headers or cache aggressively
- Operator must periodically refresh the proxy list

**Neutral**
- A failure here is visible to users but not catastrophic, because Static Lake covers 99%+ of reads

## Alternatives Considered

- **Self-hosted CORS proxy** (Cloudflare Worker): reliable and cheap at low volume, but adds a moving part the operator must maintain. Revisit when public-proxy failure rate crosses an SLO threshold.
- **Server-side render of the SPA**: contradicts [ADR-0001](0001-static-first-architecture.md) and adds runtime cost.
- **Skip Tier-3 entirely**: fails Job Story #6 ("never make a decision on phantom data") — users would see empty widgets when Static Lake has gaps.

## Follow-ups

- Instrument proxy failure rate; if >5% over 30d, migrate to self-hosted Cloudflare Worker (tracked in ROADMAP.md)
- Merged operator notes: [contributing/CORS_PROXY_NOTES.md](../../contributing/CORS_PROXY_NOTES.md)
