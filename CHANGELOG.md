# Changelog

All notable changes to Kiro Investment Dashboard. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is semver-ish (date-anchored at this stage of the project).

---

## [Unreleased] — Documentation Foundation

### Added
- Complete `/docs/` reorganisation into `product/`, `architecture/`, `specs/`, `operations/`, `contributing/` subtrees
- **PRD** ([docs/product/PRD.md](docs/product/PRD.md)) — first formal product spec with Job Stories, MoSCoW feature inventory, Gherkin acceptance criteria
- **Bilingual GLOSSARY** ([docs/product/GLOSSARY.md](docs/product/GLOSSARY.md)) — EN / 繁中 terminology lock
- **Architecture OVERVIEW** ([docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md)) — C4 context diagram, 3-tier cache, ETL phases
- **5 ADRs** ([docs/architecture/adr/](docs/architecture/adr/)) — Static-First Architecture, CORS Proxy Strategy, 3-Tier Cache Model, GitHub Actions ETL, Charting Library Choice
- **DATA_DICTIONARY** ([docs/specs/DATA_DICTIONARY.md](docs/specs/DATA_DICTIONARY.md)) — field-level schemas for every JSON in the Static Lake
- **BUILD_SPEC** ([docs/architecture/BUILD_SPEC.md](docs/architecture/BUILD_SPEC.md)) — interface contracts, CI/CD rules, security model, performance budget
- **SLA** ([docs/operations/SLA.md](docs/operations/SLA.md)) — 10 SLOs with numeric targets and error budgets
- **RUNBOOK** ([docs/operations/RUNBOOK.md](docs/operations/RUNBOOK.md)) — 8 incident playbooks
- **ROADMAP** ([docs/product/ROADMAP.md](docs/product/ROADMAP.md)) — Now / Next / Later horizons including future Co-work / n8n / NotebookLM / Obsidian integrations
- **INDEX** ([docs/INDEX.md](docs/INDEX.md)) — single doc navigation hub
- **Annotated archive index** ([docs/archive/README.md](docs/archive/README.md)) — explains 22 superseded files

### Changed
- `README.md` slimmed from 117 lines to a navigation front-door pointing at `docs/INDEX.md`
- `REQUIREMENTS.md` retired with redirect stub to [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md) (preserves external links)
- `docs/INDICATORS.md` (Fear & Greed sub-indicators) absorbed as Appendix A of [docs/specs/TECHNICAL_INDICATORS.md](docs/specs/TECHNICAL_INDICATORS.md)
- `docs/CORS_PROXY_OPTIONS.md` + `docs/CORS_PROXY_PRODUCTION_ANALYSIS.md` merged into [docs/contributing/CORS_PROXY_NOTES.md](docs/contributing/CORS_PROXY_NOTES.md)
- `docs/PROJECT_SCOPE.md` absorbed into PRD; original moved to `docs/archive/`
- 9 canonical docs moved into appropriate `/docs/` subfolders (history preserved via `git mv`)

### Removed
- Standalone `docs/INDICATORS.md` (merged)
- Standalone `docs/CORS_PROXY_OPTIONS.md`, `docs/CORS_PROXY_PRODUCTION_ANALYSIS.md` (merged)

---

## [v2.5] — Quant Edition (current production baseline)

The state of the world before the documentation reorganisation began. Captured here as the baseline reference; not a release in the conventional sense (the project ships continuously via GitHub Pages on every `main` push).

### Notable in-production capabilities (paraphrased from prior README)

- 3D Quant Kinetic State (Comet Chart)
- Smart Money tracking via Dataroma + insider sentiment + MFI volume profile
- Real-time market overview (S&P 500, NASDAQ, VIX, sector heatmaps)
- Fear & Greed Index (CNN, scraped via Puppeteer)
- TradingView Advanced Charts integration
- Daily ETL via GitHub Actions at 02:00 UTC
- 3-tier cache (Memory → Static JSON → Live API fallback)

### Notable known issues at this baseline (per audit, will be addressed in upcoming PRs)

- ~465 hard-coded `#hex` values across components (design system fragmentation)
- Plotly.js (~1.2 MB) not isolated in its own bundle chunk
- `inflightRequests` deduplication Map can leak on rejection paths
- `.toFixed()` calls without `isFinite()` guards (silent NaN propagation)
- Zero automated test coverage
- Stale-data badge insufficiently prominent
- `outline: none` without `:focus-visible` fallback (accessibility regression)
- No tablet breakpoint (768–1024 px)

These are tracked in the [code-quality remediation roadmap](docs/product/ROADMAP.md#-code-risk--ui-quality-remediation-queued-for-next-pr-cycle) (project plan file).

---

## Earlier history

Pre-v2.5 development is captured indirectly in `docs/archive/` — strategy specs (Protocol 4.0, Protocol 5.0), validation reports, and old PRD fragments. See [docs/archive/README.md](docs/archive/README.md) for the annotated map.
