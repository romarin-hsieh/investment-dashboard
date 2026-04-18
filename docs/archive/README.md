# Archive — Annotated Index

> **Why this folder exists**: Historical strategy specs, validation reports, and superseded design docs. Kept (not deleted) because they embed hard-won parameter tuning, backtesting evidence, and rationale that aren't captured anywhere else. Treat as **read-only historical record**.
>
> **Rule**: do not link to archive docs from active docs (`product/`, `architecture/`, `specs/`, `operations/`, `contributing/`). The index below is the only canonical entry point.
>
> **Folder name preserved as `/archive/`** (not `/history/`) to avoid breaking external links.

---

## How to read this index

| Column | Meaning |
|---|---|
| **File** | Path within `docs/archive/` |
| **What it was** | Original purpose at time of writing |
| **Why archived** | Why it's no longer authoritative |
| **Replaced by** | Where to look for the current version of this content |

---

## Strategy & Quant Specs

| File | What it was | Why archived | Replaced by |
|---|---|---|---|
| [STRATEGY_V5_SPEC.md](STRATEGY_V5_SPEC.md) | Protocol 5.0 ("Sharpe First") strategy spec | Superseded by current quant engine | [../specs/QUANT_STRATEGY_DOSSIER.md](../specs/QUANT_STRATEGY_DOSSIER.md) |
| [STRATEGY_EVOLUTION_AND_FRAMEWORK.md](STRATEGY_EVOLUTION_AND_FRAMEWORK.md) | History of strategy iterations (V1 → V5) | Historical narrative; current decisions live in ADRs | [../architecture/adr/](../architecture/adr/) + QUANT_STRATEGY_DOSSIER |
| [SECONDARY_FILTER_DESIGN.md](SECONDARY_FILTER_DESIGN.md) | V5 secondary-filter design notes (robustness optimisation) | Filter logic now in production code | `scripts/production/daily_update.py` + QUANT_STRATEGY_DOSSIER §L2 |
| [PROFIT_FACTOR_PROTOCOL.md](PROFIT_FACTOR_PROTOCOL.md) | Protocol 5.0 validation methodology ("Sharpe First") | Methodology baked into current pipeline | QUANT_STRATEGY_DOSSIER |
| [TREND_SCALE_VALIDATION_PROTOCOL.md](TREND_SCALE_VALIDATION_PROTOCOL.md) | Protocol 4.0 validation methodology | Methodology baked into current pipeline | QUANT_STRATEGY_DOSSIER |
| [STRATEGY_MATRIX_MAPPING.md](STRATEGY_MATRIX_MAPPING.md) | Sector-to-strategy mapping table | Mapping logic now in `scripts/core/strategy_selector.py` | `scripts/core/strategy_selector.py` |
| [CATEGORY_STRATEGY_MATRIX.md](CATEGORY_STRATEGY_MATRIX.md) | Multi-label strategy tagging matrix | Tagging logic now in production code | `scripts/data/` tag engine + QUANT_STRATEGY_DOSSIER |
| [OPTIMIZED_STRATEGY_MATRIX.md](OPTIMIZED_STRATEGY_MATRIX.md) | 98%-confidence strategy matrix | Tuning constants embedded in code now | `scripts/production/daily_update.py` |
| [GRAND_STRATEGY_COMPARISON.md](GRAND_STRATEGY_COMPARISON.md) | V2 vs V4 vs V5 head-to-head comparison | Historical evidence for current choice | QUANT_STRATEGY_DOSSIER (cites the winning V5) |

## Validation Reports (historical evidence)

| File | What it was | Why archived |
|---|---|---|
| [QUANT_SYSTEM_MASTER_REPORT.md](QUANT_SYSTEM_MASTER_REPORT.md) | Quant System v6.0 master validation report | Historical — captures the pivotal "this strategy works" evidence |
| [QUANT_SYSTEM_GRANULAR_REPORT.md](QUANT_SYSTEM_GRANULAR_REPORT.md) | Granular validation 2018–2025 | Historical evidence for current strategy selection |
| [QUANT_SYSTEM_VALIDATION_REPORT.md](QUANT_SYSTEM_VALIDATION_REPORT.md) | Raw vs filtered comparison | Historical evidence for filter design |
| [V5_FINAL_VALIDATION_REPORT.md](V5_FINAL_VALIDATION_REPORT.md) | Final V5 validation 2018–2025 | Historical — confirms the V5 ship decision |
| [V5_GROUPED_VALIDATION_REPORT.md](V5_GROUPED_VALIDATION_REPORT.md) | V5 validation grouped by sector/regime | Historical |
| [V5_YEARLY_GROUPED_VALIDATION_REPORT.md](V5_YEARLY_GROUPED_VALIDATION_REPORT.md) | V5 yearly slice 2018–2025 | Historical — useful for "did V5 hold up in year X?" |
| [TAG_VALIDATION_REPORT.md](TAG_VALIDATION_REPORT.md) | Tag-strategy validation, white-box edition | Historical |
| [PORTFOLIO_SIMULATION_REPORT.md](PORTFOLIO_SIMULATION_REPORT.md) | Simulated-portfolio results ("the validated fund") | Historical evidence for portfolio construction approach |
| [validation_reports/v4_trend_scale_results.md](validation_reports/v4_trend_scale_results.md) | V4 trend-scale numerical results | Historical |
| [validation_reports/v5_sharpe_results.md](validation_reports/v5_sharpe_results.md) | V5 Sharpe-strategy numerical results | Historical |

⚠️ **Before deleting any of these**, grep for embedded numeric constants (parameter tuning values, threshold floats, lookback windows). Surface anything load-bearing into ADRs or specs first. The validation work cannot be re-run without re-collecting years of data.

## Old PRD Fragments

| File | What it was | Replaced by |
|---|---|---|
| [PROJECT_SCOPE.md](PROJECT_SCOPE.md) | Original product charter ("Bloomberg Terminal for Static Web") | [../product/PRD.md §1 Vision + §4 Non-Goals](../product/PRD.md) |
| [product.md](product.md) | Early user-stories fragment | [../product/PRD.md §2 Job Stories](../product/PRD.md) |
| [design.md](design.md) | Early system-design notes | [../architecture/OVERVIEW.md](../architecture/OVERVIEW.md) + [BUILD_SPEC.md](../architecture/BUILD_SPEC.md) |
| [tech.md](tech.md) | Early tech-stack rationale ("why not just stack on TradingView widget") | [../architecture/adr/0005-technical-indicator-library-choice.md](../architecture/adr/0005-technical-indicator-library-choice.md) |
| [structure.md](structure.md) | Early `/public` folder layout | [../specs/DATA_DICTIONARY.md](../specs/DATA_DICTIONARY.md) |

## Operational Legacy

| File | What it was | Replaced by |
|---|---|---|
| [TASKS_LEGACY.md](TASKS_LEGACY.md) | Old T0/T1/T2 task list from initial reorganisation | Current task tracking happens in PRs and the project plan file |

---

## Total: 22 files (20 in root + 2 under `validation_reports/`)

Last reviewed: 2026-04. Next review: when the *Now* section of [../product/ROADMAP.md](../product/ROADMAP.md) ships, double-check no archive doc has crept back into circulation.
