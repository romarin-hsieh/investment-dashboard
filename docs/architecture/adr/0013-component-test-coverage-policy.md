# ADR-0013 — Component Test Coverage Policy (ratchet floors)

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: Project owner
- **Context tags**: `testing`, `quality-gate`, `frontend`

## Context & Problem

[ROADMAP](../../product/ROADMAP.md) committed to "expand to Vue Test Utils tests for the three
largest components" so refactors of those monoliths can't silently break the UI. Measuring before
writing changed the picture:

- The three named components **already have baseline tests** and are the **best-covered** `.vue`
  files in the repo: `MFIVolumeProfilePanel` 84.6%, `FundamentalAnalysis` 80.5%,
  `StockOverview` 72.3% statements.
- The real exposure is elsewhere — **`StockCard` 16.8%**, **`NavigationPanel` 14.8%**,
  **`TechnicalIndicators` 7.1%**, none of which had a test file at all. `StockCard` renders for
  every symbol on the overview page, so it is the highest-traffic untested component.
- **Statement coverage flatters.** `MFIVolumeProfilePanel` reads 84.6% statements but only
  **53.1% functions** — nearly half its functions never execute in the suite.
- **Nothing enforced coverage.** `vitest.config.js` emitted a report but declared no thresholds, so
  coverage could regress silently — unlike bundle weight, which [ADR-0007](0007-bundle-size-budgets.md)
  has gated for months. Overall project coverage had drifted to **32.7%**.

## Decision

1. **Scope by risk, not by file size.** The workstream covers **six** components: the three ROADMAP
   targets plus the three genuinely-untested ones. Following the ROADMAP literally would have spent
   the effort where risk was already lowest.

2. **Gate coverage with RATCHET floors.** `coverage.thresholds` in `vitest.config.js` declares a
   global floor plus **per-file floors** for the six components, each set at (or one point under)
   the coverage measured when the gate landed. The gate's job is to stop **regression**, not to
   impose a new bar — it passes on the commit that introduces it. Raise a floor in the same PR that
   raises its coverage. **Never lower a floor to make a build pass**; fix the test instead.

3. **Test behaviour that would produce wrong numbers or a broken render.** Priority order:
   data-shape edge cases (null / NaN / gaps / `{raw,fmt}` envelopes), sorting and filtering
   correctness, empty / error / loading branches, financial formatting, guard clauses, and races
   between a symbol change and an in-flight request.

4. **Do not test**: styling or class names that have no CSS rule, `v-for` plumbing, unreachable
   branches, or literal UI copy. The app is bilingual and copy changes often — assert **i18n keys**,
   roles, structure, or short regexes instead. (Brittle copy assertions have broken this suite
   before, during the ⑥ i18n migration.)

## Consequences

**Positive**
- Coverage can no longer regress unnoticed; the contract mirrors the bundle-size budgets the project
  already runs (ADR-0007), so the mental model is familiar.
- Per-file floors localise the guarantee: a well-covered component can no longer mask a 7% one.
- Planning against real gaps surfaced genuine defects before a single test was written (see Follow-ups).

**Negative / Trade-offs**
- Per-file floors need maintenance as components change.
- A ratchet can block a PR that legitimately deletes covered code. Resolution: adjust that floor
  deliberately **in the same PR**, with the reason stated — not as a silent convenience.

**Neutral**
- Numbers come from the v8 provider; `.vue` SFCs are instrumented and reported.

## Alternatives Considered

- **Follow the ROADMAP literally (three largest only)** — rejected: measurement showed those are the
  best-covered files; it would concentrate effort where the risk is lowest.
- **A single global threshold** — rejected: a high-coverage module masks a near-zero one, which is
  exactly the state we found.
- **No gate, rely on review** — rejected: that is what allowed coverage to drift to 32.7% while
  bundle weight stayed gated.

## Follow-ups

- Per-component test PRs land in risk order — **NavigationPanel → StockCard → TechnicalIndicators →
  MFIVolumeProfilePanel → FundamentalAnalysis → StockOverview** — each raising its own floor.
- The planning pass surfaced **real defects**, fixed alongside their regression test (separate commits):
  stale-response races in `MFIVolumeProfilePanel` and `TechnicalIndicators`; `getGrowthClass`
  crashing on a non-string and painting missing data green, plus caller-payload mutation in
  `FundamentalAnalysis`; a `BEARISH` moving-average call on a null/NaN price in `StockCard`.
- Dead code noted for cleanup: `MFIVolumeProfilePanel`'s `.no-data-state` branch is unreachable (the
  calculator throws rather than returning `null`) and its `.bullish` / `.bearish` / `.poc` classes
  have no CSS rule — the live visual encoding is `getBarFillStyle`.
- This ADR satisfies the ROADMAP note that the decision for this workstream "will live in an ADR".
