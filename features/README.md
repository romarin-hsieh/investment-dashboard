# Feature specs (Given-When-Then)

The executable-specification layer decided in
[docs/product/BDD_DDD_GAP_ANALYSIS.md §4](../docs/product/BDD_DDD_GAP_ANALYSIS.md). Each
`.feature` file is the spec-of-record for one behaviour cluster; automatable scenarios are
bound step-for-step in `src/bdd/*.feature.test.ts` via the tiny `src/bdd/gwt.ts` harness
(vitest — cucumber-js was evaluated and rejected as a second runner without added value here).

## Tags

| Tag | Meaning |
|---|---|
| `@bound(<test path>)` | scenario runs in CI via that binding |
| `@covered-by(<test path>)` | already asserted by a pre-existing test; no duplicate binding |
| `@e2e(<spec>)` | lives in the Playwright layer (ADR-0015) |
| `@manual` | not yet automatable; verified by hand (rendered as skipped via `manualScenario`) |
| `@pending-fix(<PR/finding>)` | binding written but skipped until the named fix lands (`pendingScenario` → flip to `scenario` in that PR) |

## Traceability

PRD Job Story → [USER_STORIES.md](../docs/product/USER_STORIES.md) (US-\*) → scenario here
→ binding / e2e test. The PRD's §6 acceptance criteria (F1/F2/F6/F11) are the origin of
this layer; `data-degradation.feature` executes the F6 half, and F1/F2/F11's
browser/pipeline-level scenarios are tagged `@e2e`/`@manual` until automation exists.
