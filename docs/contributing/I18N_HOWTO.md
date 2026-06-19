# Contributor How-To: Bilingual UI Strings (EN / 繁中)

How to add or change translatable copy. The architecture decision is
[ADR-0011](../architecture/adr/0011-bilingual-i18n-architecture.md); the CSP
precompilation constraint is [ADR-0009](../architecture/adr/0009-i18n-message-precompilation-csp.md).

## Where strings live

- `src/locales/en.json` and `src/locales/zh-TW.json` — **one namespace per
  component/area** (e.g. `stockCard`, `marketIndices`, `nav`, `common`, `errors`).
- The two files must stay at **full key parity** (~778 keys each). `src/i18n.test.js`
  fails CI if a key exists in one locale but not the other.

## Adding a string

1. Add the key to **both** locale files under the right namespace:
   ```jsonc
   // en.json
   "stockCard": { "addToWatchlist": "Add to watchlist" }
   // zh-TW.json
   "stockCard": { "addToWatchlist": "加入觀察清單" }
   ```
2. Use it in the component:
   - **Options API** (template): `{{ $t('stockCard.addToWatchlist') }}`
     (works because `globalInjection: true`).
   - **`<script setup>`**: `const { t } = useI18n()` then `t('stockCard.addToWatchlist')`.
3. **Interpolation** — put placeholders in the message and pass params:
   ```jsonc
   "autoUpdate": { "ageHours": "{n} hours" }
   ```
   ```js
   $t('autoUpdate.ageHours', { n: 5 })   // "5 hours"
   ```
4. Prefer existing shared keys (`common.*`, `errors.*`) over duplicating copy.
5. Use the terminology in [`product/GLOSSARY.md`](../product/GLOSSARY.md) for any
   domain term (don't invent a second translation for a glossary term).

## The precompile constraint (don't break it)

Messages are **compiled at build time** so the browser never calls `new Function`
(the strict CSP forbids `'unsafe-eval'`). Practically:

- Keep all messages inside `src/locales/**` (the `@intlify/unplugin-vue-i18n`
  `include` glob). Do **not** build message strings at runtime or load locale JSON
  from outside that folder.
- Don't switch the build back to vue-i18n's full/runtime-compiled mode.

## Verify before pushing

```bash
npm test          # key parity (i18n.test.js) + precompiled render (i18n.render.test.js)
npm run build     # must succeed; messages are precompiled into the entry chunk
```

The language switcher (中/EN) lives in `Layout.vue` via
`src/composables/useLocale.js`; the chosen locale persists in `localStorage.locale`
and sets `<html lang>`.
