# ADR-0001 — Static-First Architecture (No Runtime Backend)

- **Status**: Accepted
- **Date**: 2024 (retrospective record, 2026-04 formalisation)
- **Deciders**: Project owner
- **Context tags**: `deployment`, `cost`, `reliability`

## Context & Problem

Kiro Investment Dashboard is a private tool serving one operator and a small partner circle. It needs to display dense, fresh financial data (OHLCV, technical indicators, institutional holdings, proprietary quant signals) with low latency and near-zero operating cost. A classical three-tier web stack (DB + API + SPA) would require continuously running infrastructure — database, server, cache — plus monitoring and on-call burden that a solo operator cannot absorb. External paid market-data APIs would also bleed money continuously.

## Decision

We adopt a **Static-First** architecture: all heavy computation runs during CI/CD (GitHub Actions) once per day and produces static JSON files. The frontend is a plain Vue 3 SPA that reads those JSON files directly from GitHub Pages. There is no runtime backend, no database, and no per-request server logic. Live external APIs are used **only** as a Tier-3 fallback (see [ADR-0003](0003-three-tier-cache-model.md)).

## Consequences

**Positive**
- Operating cost ≈ $0 (GitHub Pages + free compute quotas)
- Inherits GitHub Pages' high availability — nothing to page us at 3 AM
- CDN-backed delivery yields sub-second TTI without tuning
- Git history is automatically a data-lake audit log
- Data is inspectable as plain JSON without tooling

**Negative / Trade-offs**
- Data freshness capped at ~24 h (pipeline cadence)
- No personalised server-side features (accounts, cloud sync) — explicitly out of scope (PRD §4)
- Pipeline failures have no paging; stale data must degrade gracefully
- Repo size grows with historical JSON; retention policy required

**Neutral**
- Static Lake becomes the boundary between batch work and runtime — all contracts live in JSON

## Alternatives Considered

- **Full serverless (Cloudflare Workers + KV / D1)**: lower freshness floor, but non-zero cost at scale and introduces a runtime surface we'd have to maintain. Rejected for ops overhead.
- **Traditional backend (Node + Postgres on Fly.io / Railway)**: best freshness, highest cost, highest maintenance. Overkill for the audience size.
- **Client-side direct fetch from Yahoo Finance per request**: infeasible due to CORS, rate limits, and variable latency.

## Follow-ups

- Freshness and availability targets formalised in [operations/SLA.md](../../operations/SLA.md)
- Degradation behaviour codified in [ADR-0003](0003-three-tier-cache-model.md)
- Revisit if audience ever exceeds 50 users or real-time (<5 min) data becomes a hard requirement
