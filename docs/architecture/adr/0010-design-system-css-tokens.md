# ADR-0010 — Design System & CSS Token Architecture

- **Status**: Accepted
- **Date**: 2026-06-20
- **Deciders**: Project owner
- **Context tags**: `frontend`, `design-system`, `theming`, `maintainability`

## Context & Problem

The dashboard grew ~45 components with colours, radii, shadows and spacing
hardcoded inline. An audit counted **694+ literal hex codes** plus hundreds of
ad-hoc `padding`/`margin`/`border-radius` values and no spacing, typography or
motion scale at all. Consequences: dark mode broke wherever a light colour was
fixed, "the same" card looked different across pages, and a brand change meant a
find-and-replace across dozens of files. We need one place to define the visual
language and a way for both CSS and JS (chart configs) to read it.

## Decision

Adopt a **CSS custom-property (token) design system**, split across two files
loaded in order:

1. **`src/styles/tokens.css`** (loaded first) — palette + scales that are not
   brand-specific: a 9-tier greyscale, semantic-state colours (`--success/danger/
   warning/info -bg/-fg/-solid`), an extended brand palette (blue/purple/orange),
   chart colours (`--chart-up/down/alt`, `--chart-bg*`), the quant `--signal-*`
   palette, and the global `:focus-visible` baseline.
2. **`src/style.css`** (brand theme) — the Renaissance palette (`--bg-*`,
   `--text-*`, `--border-color`, `--primary-*`, tags, skeletons) plus the
   **scales**: radius (`--radius-xs/sm/md/lg/pill`), shadow (`--shadow-sm/md/lg/
   focus`), spacing (`--space-1..12` + semantic `--page-padding`/`--card-padding`/
   `--widget-padding`/`--section-gap`, responsive via `:root` `@media`),
   typography (`--text-xs..2xl`, `--weight-normal..bold`) and motion
   (`--transition-fast/base/slow`).

**Dark mode** is a `.dark-mode` class on `<html>` (toggled by `useTheme`) that
overrides *theme* tokens. **Utility tokens stay mode-invariant** (greyscale,
chart, signal, brand palette, semantic `-solid`) — they represent fixed palette
positions; only surfaces/text/borders and semantic `-bg/-fg` flip. Components
consume `var(--token)`; JS (chart libraries) reads tokens via
`getToken()` in `src/utils/designTokens.js`. Breakpoints are a **documented
convention** (xs 480 / sm 768 / md 900 / lg 1200 / xl 1600), since CSS custom
properties cannot be used inside `@media`.

## Consequences

**Positive**
- Single source of truth for the visual language; a brand/theme change edits two files.
- Dark mode works by construction (theme tokens flip; mode-invariant tokens don't).
- Spacing/typography/motion are now composable and tunable from one place; page
  gutters and card padding are consistent and responsive.

**Negative / Trade-offs**
- Breakpoints can't be tokenised for `@media` — they remain a comment-level convention.
- A large migration was required (see Follow-ups); some decorative micro-radii
  (2/3/6/10px) and architectural gauge curves intentionally stay inline.

**Neutral**
- JS-side chart colours read tokens through `getToken()` rather than `var()`.

## Alternatives Considered

- **Tailwind / utility-class framework** — large dependency and visual idiom that
  fights the bespoke Renaissance brand; rejected.
- **SCSS/Less variables** — compile-time only, so they can't drive a runtime
  `.dark-mode` class toggle without duplicate stylesheets; rejected.
- **Status quo (inline literals)** — the problem being solved; rejected.

## Follow-ups

- Shipped across: WS-A original tokens (PRs [#6](https://github.com/romarin-hsieh/investment-dashboard/pull/6)–[#12](https://github.com/romarin-hsieh/investment-dashboard/pull/12)), AA-contrast + dark-mode sweep ([#51](https://github.com/romarin-hsieh/investment-dashboard/pull/51)–[#54](https://github.com/romarin-hsieh/investment-dashboard/pull/54)), scale foundation ([#68](https://github.com/romarin-hsieh/investment-dashboard/pull/68)), token adoption across 48 components ([#69](https://github.com/romarin-hsieh/investment-dashboard/pull/69)), dark-mode alert + radius consistency ([#70](https://github.com/romarin-hsieh/investment-dashboard/pull/70)).
- Remaining: unify the 6px radius scatter and the JS chart-colour `getToken()` adoption in a future pass.
