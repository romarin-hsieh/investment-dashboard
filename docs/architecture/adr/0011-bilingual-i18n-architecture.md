# ADR-0011 — Bilingual i18n Architecture (vue-i18n, EN / 繁中)

- **Status**: Accepted
- **Date**: 2026-06-20
- **Deciders**: Project owner
- **Context tags**: `i18n`, `frontend`, `architecture`

## Context & Problem

The operator and core partners span English and 繁體中文. The product needed a
**runtime** language toggle (not a build-per-locale) across the whole UI, with a
single locked terminology (the existing `GLOSSARY.md`). [ADR-0009](0009-i18n-message-precompilation-csp.md)
records the CSP/precompilation *incident fix*, but not the framework decision
itself — this ADR captures that.

## Decision

Adopt **`vue-i18n@9`** configured `legacy: false` + `globalInjection: true`, so
`$t()` / `this.$t()` work in Options-API templates and `useI18n()` works in
`<script setup>`. Concretely:

- **Messages** live in `src/locales/en.json` + `src/locales/zh-TW.json`, organised
  as **one namespace per component/area** (~778 keys each, full EN/繁中 parity).
- **`src/i18n.js`** builds the instance; `resolveInitialLocale()` = saved
  `localStorage.locale` → browser `zh-*` → `en`, and sets `<html lang>`.
- **`src/composables/useLocale.js`** exposes a reactive `currentLocale` +
  `toggleLocale` (persists to `localStorage`, mirrors `useTheme`); `Layout.vue`
  renders the 中/EN switcher.
- Messages are **precompiled at build** ([ADR-0009](0009-i18n-message-precompilation-csp.md))
  so no runtime `eval` is needed under the strict CSP.
- **Tests** guard it: `i18n.test.js` (EN/繁中 key parity), `i18n.render.test.js`
  (precompiled render path), and `src/test-setup.js` (registers the plugin for all
  component tests via `vitest.config.js` `setupFiles`).

## Consequences

**Positive**
- Whole-UI bilingual toggle at runtime; language persists across sessions.
- Key-parity test fails CI if a translation is missing in either locale.
- Wording lives in data (locale JSON), not scattered in templates.

**Negative / Trade-offs**
- All locale messages load in the entry chunk at boot, so it grows with
  translation volume (reclaim path: lazy-load the non-active locale — Follow-ups).
- Adds the `vue-i18n` + `@intlify/unplugin-vue-i18n` build dependency
  (see [ADR-0009](0009-i18n-message-precompilation-csp.md)).

**Neutral**
- Terminology is governed by `GLOSSARY.md`; new keys should reuse glossary terms.

## Alternatives Considered

- **Lightweight copy-swap lookup** (a hand-rolled `{key: {en, zh}}` map) — fine
  for a handful of strings, but doesn't scale to ~778 keys with pluralisation /
  interpolation and gives no parity tooling; rejected.
- **Server-side / build-per-locale rendering** — violates the Static-First model
  ([ADR-0001](0001-static-first-architecture.md)) and doubles the deploy artifact
  for a 2-locale app; rejected.

## Follow-ups

- Shipped across PRs [#60](https://github.com/romarin-hsieh/investment-dashboard/pull/60)–[#65](https://github.com/romarin-hsieh/investment-dashboard/pull/65) (+ the [#62](https://github.com/romarin-hsieh/investment-dashboard/pull/62) CSP hotfix) and [#66](https://github.com/romarin-hsieh/investment-dashboard/pull/66) (last two component gaps).
- Lazy-load the inactive locale to shrink the entry chunk.
- See the contributor guide `docs/contributing/I18N_HOWTO.md` for how to add strings.
