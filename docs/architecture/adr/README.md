# Architecture Decision Records (ADR)

> **Scope of this directory**: One file per significant architectural choice. Each ADR uses the [MADR](https://adr.github.io/madr/) short-form template below. ADRs are **append-only** — supersede rather than rewrite.

## Template (copy for new ADRs)

```markdown
# ADR-NNNN — <Short Title>

- **Status**: Proposed | Accepted | Superseded by ADR-XXXX | Deprecated
- **Date**: YYYY-MM-DD
- **Deciders**: <names>
- **Context tags**: `<tag1>`, `<tag2>`

## Context & Problem

<What forces us to make a choice? What constraints apply?>

## Decision

<The choice, stated in one paragraph.>

## Consequences

**Positive**
- <benefit>

**Negative / Trade-offs**
- <cost>

**Neutral**
- <side-effect>

## Alternatives Considered

- **Option A** — <why rejected>
- **Option B** — <why rejected>

## Follow-ups

- <link to issue or doc>
```

## Index

| # | Title | Status | Tags |
|---|---|---|---|
| [0001](0001-static-first-architecture.md) | Static-First Architecture (No Runtime Backend) | Accepted | `deployment`, `cost`, `reliability` |
| [0002](0002-cors-proxy-strategy.md) | CORS Proxy Rotation for Tier-3 Fallback | Accepted | `data`, `fallback`, `risk` |
| [0003](0003-three-tier-cache-model.md) | 3-Tier Cache (Memory → CDN → Live) | Accepted | `performance`, `data` |
| [0004](0004-github-actions-etl.md) | GitHub Actions as the ETL Runtime | Accepted | `ci-cd`, `cost`, `operations` |
| [0005](0005-technical-indicator-library-choice.md) | Four Charting Libraries (Plotly + TV Lightweight + TV iframe + Chart.js) | Accepted | `frontend`, `charting`, `performance` |
| [0006](0006-static-data-caching-on-github-pages.md) | Static-Data Caching on GitHub Pages (layered client-side strategy) | Accepted | `deployment`, `performance`, `hosting` |
| [0007](0007-bundle-size-budgets.md) | Bundle-Size Budgets and Enforcement | Accepted | `performance`, `ci-cd`, `frontend`, `quality-gate` |

## Lifecycle

- **Propose** → open a PR with a new `NNNN-slug.md` using next free number
- **Accept** → merge after review; status becomes `Accepted`
- **Supersede** → write a new ADR; set the old one's status to `Superseded by ADR-XXXX` (do **not** delete)
