# ADR-0015 — Two-Layer Accessibility & End-to-End Testing

- **Status**: Accepted
- **Date**: 2026-07-25
- **Deciders**: Project owner
- **Context tags**: `accessibility`, `testing`, `quality-gate`, `frontend`, `ci`

## Context & Problem

The test suite ([ADR-0013](0013-component-test-coverage-policy.md)) proves component
*behaviour* in jsdom, and the type gate ([ADR-0014](0014-typescript-unification.md))
proves the types. Neither proves the app is **accessible** or that it even **boots**:

- The [2026-07-20 UI/UX audit](../../audits/2026-07-20-adversarial-uiux-audit.md) raised
  accessibility concerns (contrast, labels, structure) that no automated gate protects.
- jsdom cannot compute layout or style, so it can never evaluate `color-contrast` or
  render a real page — the exact things an accessibility check needs.
- There was **no** end-to-end smoke: a build that renders a blank page, or throws on
  boot, would pass every existing gate.

## Decision

Add accessibility and E2E coverage as **two complementary layers**, each gated in CI.

### Layer 1 — jsdom axe (fast, structural)

`src/a11y/*.a11y.test.js`, run by the normal Vitest job. Mounts high-traffic components
with `@vue/test-utils` and runs **axe-core** against the rendered DOM via a shared runner
(`src/a11y/axe-helper.js`).

- Catches **structural** WCAG issues: missing labels/names, ARIA misuse, invalid roles,
  list/heading structure.
- Disables rules jsdom cannot honour for an isolated component fragment:
  `color-contrast` (no layout) and the **page-scope** family (`region`,
  `landmark-one-main`, `page-has-heading-one`, `document-title`, `html-has-lang`,
  `bypass`) — those are Layer 2's job. Every other rule stays on.
- Zero new infrastructure: it *is* a Vitest test. The `toHaveNoViolations` matcher is
  registered once in `src/test-setup.ts`.

### Layer 2 — Playwright + axe (real browser, full page)

`e2e/*.spec.ts`, run by a new **`E2E & A11y`** CI job (`.github/workflows/e2e.yml`).
Headless Chromium drives a production build served by `vite preview`.

- `smoke.spec.ts` — the app boots at the default route, routes render real content
  (a visible heading), and **no uncaught exception** fires. Deliberately data-agnostic
  (asserts the shell, not any symbol), so it does not depend on the remote data repo.
- `a11y.spec.ts` — `@axe-core/playwright` scans the primary routes across
  `wcag2a/2aa/21a/21aa`. Because it renders real layout, **`color-contrast` is checked
  for real** here.

**E2E base override.** Production builds use the GitHub-Pages subpath
`/investment-dashboard/`; Playwright previews at the server root. `E2E=1` forces
`base: '/'` in `vite.config.js` (and flows to `BASE_URL`, so data paths resolve under
`/` too). `npm run build:e2e` / `npm run preview` set it.

### The a11y gate is a baseline-ratchet

`a11y.spec.ts` fails on any violation whose rule id is **not** in `BASELINE_RULE_IDS` —
the same shape as the ADR-0013 coverage floors. Today the two primary routes are
**axe-clean** (contrast included), so the baseline is **empty** and the gate asserts
zero violations. The set is a documented escape hatch: to intentionally defer a specific
known issue, add its rule id **with a tracking note**. It may only shrink — never add an
id to silence a *new* violation; fix the violation.

## Consequences

- **New dev dependencies**: `axe-core`, `vitest-axe` (Layer 1); `@playwright/test`,
  `@axe-core/playwright` (Layer 2). `npm run test:e2e` runs Layer 2 locally after a
  one-time `npx playwright install chromium`.
- **Vitest scope**: `e2e/**` is excluded from Vitest (`vitest.config.js`) — the Playwright
  specs are `*.spec.ts` too but import `@playwright/test`. `vue-tsc` already ignores
  `e2e/` (outside `tsconfig` `include`).
- **A real bug surfaced immediately**: `App.vue`'s root reuses the mount-point
  `id="app"`, so the DOM nests two `id="app"` elements. Modern axe no longer flags a
  generic duplicate id, but it is a genuine defect — tracked for the follow-up polish
  batch (rename to a unique id + update the single `#app` style selector).
- **CI cost**: one extra job (~2–3 min: install browser, build, run). Isolated from the
  fast Vitest/type gate so it never slows the inner loop.

## Alternatives considered

- **Cypress instead of Playwright** — Playwright's first-party `@axe-core/playwright`
  integration, headless-shell footprint, and `webServer` orchestration fit better.
- **A single browser layer (drop jsdom axe)** — rejected: the jsdom layer runs in the
  existing fast job with no browser, catching structural regressions on every push at
  near-zero marginal cost. The two layers catch different classes of defect.
- **Fail the a11y gate on the first raw violation set (no baseline)** — unnecessary today
  (the routes are clean) but the ratchet mechanism is retained so a future intentional
  deferral is explicit and tracked rather than a silently-loosened assertion.
