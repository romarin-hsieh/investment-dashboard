# Docs Index

> One-page navigation hub. Use this to find the canonical doc for any topic.
>
> **Rule of thumb**: if you're about to create a new `.md` somewhere, check this index first — there's almost certainly already a home for it.

---

## By role / question

### "What is this project? Who is it for?"
- **[product/PRD.md](product/PRD.md)** — vision, target users, Job Stories, feature inventory, non-goals, acceptance criteria

### "What's coming next?"
- **[product/ROADMAP.md](product/ROADMAP.md)** — Now / Next / Later horizons, including future Co-work / n8n / NotebookLM / Obsidian integrations
- **[../CHANGELOG.md](../CHANGELOG.md)** — versioned release history

### "How is the system structured?"
- **[architecture/OVERVIEW.md](architecture/OVERVIEW.md)** — C4 context, 3-tier cache, ETL phases, frontend layout
- **[architecture/BUILD_SPEC.md](architecture/BUILD_SPEC.md)** — interface contracts, CI/CD rules, security model, performance budget
- **[architecture/COMPONENT_DEPENDENCIES.md](architecture/COMPONENT_DEPENDENCIES.md)** — Vue component dependency graph
- **[architecture/adr/](architecture/adr/)** — Architecture Decision Records (5 ADRs covering Static-First, CORS proxy, 3-tier cache, GitHub Actions ETL, charting libraries)

### "How does the math / strategy work?"
- **[specs/QUANT_STRATEGY_DOSSIER.md](specs/QUANT_STRATEGY_DOSSIER.md)** — quant engine: regime → sector → signal selection logic
- **[specs/TECHNICAL_INDICATORS.md](specs/TECHNICAL_INDICATORS.md)** — 30 technical indicators wiki + Fear & Greed sub-indicators (Appendix A)
- **[specs/TRADING_MODELS.md](specs/TRADING_MODELS.md)** — custom trading model definitions
- **[specs/SMART_MONEY_SCORE_SPEC.md](specs/SMART_MONEY_SCORE_SPEC.md)** — Smart Money signal algorithm
- **[specs/DATAROMA_INTEGRATION.md](specs/DATAROMA_INTEGRATION.md)** — Dataroma scraping integration
- **[specs/DATA_DICTIONARY.md](specs/DATA_DICTIONARY.md)** — JSON schemas for every file in `public/data/`

### "How do I run / deploy / debug it?"
- **[operations/DEPLOYMENT.md](operations/DEPLOYMENT.md)** — CI/CD pipelines, deploy procedures, manual operations
- **[operations/DATA_OPERATIONS.md](operations/DATA_OPERATIONS.md)** — ETL data-maintenance SSOT
- **[operations/RUNBOOK.md](operations/RUNBOOK.md)** — 8 incident playbooks (ETL failure, stale data, rate limits, proxy outage, rollback, etc.)
- **[operations/SLA.md](operations/SLA.md)** — 10 SLOs with numeric targets and error budgets
- **[operations/ADD_NEW_SYMBOL.md](operations/ADD_NEW_SYMBOL.md)** — step-by-step procedure to extend the universe

### "How do I contribute? What conventions apply?"
- **[contributing/CODING_STANDARDS.md](contributing/CODING_STANDARDS.md)** — code style, comment format (EN/繁中)
- **[contributing/CORS_PROXY_NOTES.md](contributing/CORS_PROXY_NOTES.md)** — CORS proxy maintenance notes (decision lives in ADR-0002)

### "What does this term mean?"
- **[product/GLOSSARY.md](product/GLOSSARY.md)** — bilingual EN/繁中 vocabulary

### "Where did this old idea go?"
- **[archive/README.md](archive/README.md)** — annotated index of 22 superseded docs (strategy specs, validation reports, old PRD fragments)

---

## By doc type

### Product (`product/`)
- [PRD.md](product/PRD.md)
- [ROADMAP.md](product/ROADMAP.md)
- [GLOSSARY.md](product/GLOSSARY.md)

### Architecture (`architecture/`)
- [OVERVIEW.md](architecture/OVERVIEW.md)
- [BUILD_SPEC.md](architecture/BUILD_SPEC.md)
- [COMPONENT_DEPENDENCIES.md](architecture/COMPONENT_DEPENDENCIES.md)
- [adr/README.md](architecture/adr/README.md) — ADR template + index
  - [0001 Static-First Architecture](architecture/adr/0001-static-first-architecture.md)
  - [0002 CORS Proxy Strategy](architecture/adr/0002-cors-proxy-strategy.md)
  - [0003 3-Tier Cache Model](architecture/adr/0003-three-tier-cache-model.md)
  - [0004 GitHub Actions ETL](architecture/adr/0004-github-actions-etl.md)
  - [0005 Charting Library Choice](architecture/adr/0005-technical-indicator-library-choice.md)

### Specs (`specs/` — algorithms, schemas, integrations)
- [DATA_DICTIONARY.md](specs/DATA_DICTIONARY.md)
- [QUANT_STRATEGY_DOSSIER.md](specs/QUANT_STRATEGY_DOSSIER.md)
- [TECHNICAL_INDICATORS.md](specs/TECHNICAL_INDICATORS.md)
- [TRADING_MODELS.md](specs/TRADING_MODELS.md)
- [SMART_MONEY_SCORE_SPEC.md](specs/SMART_MONEY_SCORE_SPEC.md)
- [DATAROMA_INTEGRATION.md](specs/DATAROMA_INTEGRATION.md)

### Operations (`operations/`)
- [DEPLOYMENT.md](operations/DEPLOYMENT.md)
- [DATA_OPERATIONS.md](operations/DATA_OPERATIONS.md)
- [RUNBOOK.md](operations/RUNBOOK.md)
- [SLA.md](operations/SLA.md)
- [ADD_NEW_SYMBOL.md](operations/ADD_NEW_SYMBOL.md)

### Contributing (`contributing/`)
- [CODING_STANDARDS.md](contributing/CODING_STANDARDS.md)
- [CORS_PROXY_NOTES.md](contributing/CORS_PROXY_NOTES.md)

### Archive (`archive/` — read-only history)
- [README.md](archive/README.md) — annotated index

---

## Code-adjacent READMEs (not in `/docs/`)

These live with the code they describe. Don't move them.

- `public/config/README.md` — configuration files guide
- `public/data/README.md` — Static Lake directory structure
- `src/types/README.md` — TypeScript type contracts

---

## Maintenance rules

1. **One topic, one canonical doc.** If two docs cover the same topic, one of them is wrong; consolidate.
2. **Cross-link, don't copy.** When doc A needs context from doc B, link to B — don't paraphrase B's content.
3. **Update this index in the same PR** that adds, moves, or retires a doc.
4. **No archive links from active docs.** If you find yourself wanting to cite an archive doc, the content needs to be promoted into an ADR or spec first.
