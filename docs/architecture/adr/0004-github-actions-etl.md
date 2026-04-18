# ADR-0004 — GitHub Actions as the ETL Runtime

- **Status**: Accepted
- **Date**: 2024 (retrospective), 2026-04 formalisation
- **Deciders**: Project owner
- **Context tags**: `ci-cd`, `cost`, `operations`

## Context & Problem

The Static-First model ([ADR-0001](0001-static-first-architecture.md)) requires a daily job that fetches ~560 symbols of OHLCV from Yahoo Finance, computes 11+ technical indicators, runs the quant engine, scrapes Dataroma + CNN Fear & Greed, and commits ~4,000+ JSON files to `public/data/`. We need a runtime that is free, scheduled, auditable, and does not require a separate deployment target.

## Decision

We use **GitHub Actions** as the ETL runtime. Four workflows are defined under `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `daily-data-update.yml` | Cron `0 2 * * *` UTC + manual | Main pipeline: OHLCV → indicators → fundamentals → sentiment → quant status |
| `dataroma-stock-update.yml` | Cron `0 0 * * *` UTC + manual | Smart Money (Dataroma) sector rotation + targeted symbols |
| `update-metadata.yml` | Cron `0 2 * * 0` UTC + manual | Weekly sector/industry metadata refresh |
| `deploy.yml` | Push to `main` | Vite build + deploy to `gh-pages` |

All workflows run on `ubuntu-latest` with Python 3.11 + Node 18. Data output is committed directly to `main` by the action (using the default `GITHUB_TOKEN`). Deploy is then triggered by the commit push.

**Failure semantics**: Per-symbol failures are logged and the pipeline continues ("stale > broken"). Whole-workflow failures surface in the GitHub Actions UI; no external alerting (solo operator reviews each morning).

## Consequences

**Positive**
- $0 infrastructure cost within free-tier minute budgets
- Run history and logs are GitHub-native and auditable
- Workflow definitions live with the code — config drift is impossible
- No separate CI/CD platform to learn or secure

**Negative / Trade-offs**
- Minute quota is a soft ceiling (~2,000 min/month on free plan) — larger universes will eventually need pruning or self-hosted runners
- No native paging/SMS alerting — operator must observe the Actions tab
- Rate-limit pressure concentrates on a single GitHub IP range (public proxies / Yahoo)
- Committing data to the same repo bloats git history; requires retention hygiene

**Neutral**
- Workflow YAML becomes a *contract document* in its own right — see [BUILD_SPEC.md](../BUILD_SPEC.md) §4

## Alternatives Considered

- **Cron on a Raspberry Pi**: free hardware, but single-home-network reliability is worse than GitHub's and requires VPN exposure to push to GitHub.
- **Cloudflare Cron Triggers + Workers**: works but adds a second deployment target; ETL time (5–8 min) is too long for Workers' 30-second ceiling without chunking.
- **Self-hosted runner on a Hetzner VPS**: €4/mo, uncapped minutes, but re-introduces ops surface (patching, monitoring) we explicitly rejected in ADR-0001.

## Follow-ups

- Monitor minutes consumption; if exceeds 70% of free tier, prune universe or move to self-hosted runner
- Track an SLO for "daily ETL success rate" in [operations/SLA.md](../../operations/SLA.md)
- Runbook for ETL failures in [operations/RUNBOOK.md](../../operations/RUNBOOK.md)
- ROADMAP.md Later: evaluate **n8n** as an orchestration layer that *calls* GitHub Actions as steps rather than replacing it
