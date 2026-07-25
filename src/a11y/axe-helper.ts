// Shared axe runner for the jsdom a11y layer (WS-I PR5, ADR-0015).
//
// jsdom implements no layout engine, so axe's `color-contrast` rule cannot read
// computed colors — worse, its canvas-backed text-detection path throws under
// jsdom. Contrast is therefore delegated to the Playwright layer (real browser,
// e2e/a11y.spec.ts); here we disable just that one rule and keep every
// structural WCAG check (labels, names, roles, ARIA, list/heading structure).
import { configureAxe } from 'vitest-axe'

export const axe = configureAxe({
  rules: {
    // jsdom has no layout engine — contrast is checked in the Playwright layer.
    'color-contrast': { enabled: false },
    // Page-scope rules that cannot be satisfied by an isolated component fragment
    // (the component lives inside the app shell's <nav>/<main>, <html lang>, and
    // <title> at runtime). Enforced in the full-page Playwright layer instead.
    'region': { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
    'document-title': { enabled: false },
    'html-has-lang': { enabled: false },
    'bypass': { enabled: false }
  }
})
