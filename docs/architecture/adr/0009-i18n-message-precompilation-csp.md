# ADR-0009 — Precompile i18n Messages (CSP compliance, no runtime `eval`)

- **Status**: Accepted
- **Date**: 2026-06-19
- **Deciders**: Project owner
- **Context tags**: `i18n`, `security`, `build`, `incident`

## Context & Problem

The bilingual rollout ([#60](https://github.com/romarin-hsieh/investment-dashboard/pull/60) / [#61](https://github.com/romarin-hsieh/investment-dashboard/pull/61)) shipped `vue-i18n`'s **full** build, which compiles message strings to render functions **at runtime** using `new Function(...)`.

`index.html` sets a strict Content-Security-Policy: `script-src 'self' 'unsafe-inline' https:` — **no `'unsafe-eval'`**. So the first `$t()` call (in `Layout.vue`, on mount) threw:

```
EvalError: Evaluating a string as JavaScript violates the following Content Security Policy directive
because 'unsafe-eval' is not an allowed source of script ...  at new Function (<anonymous>)
```

This crashed the SPA to a **blank page in production**. It was missed pre-merge because the CSP `<meta>` is not enforced during `vite build` or in the jsdom test environment, and a live browser check of the i18n branch was blocked by an unrelated Windows/worktree dev-server limitation.

## Decision

**Precompile locale messages at build time and ship vue-i18n's runtime-only build with the message compiler dropped**, so no message is ever compiled (no `new Function`) in the browser. The strict CSP stays as-is (we do **not** add `'unsafe-eval'`).

Implemented with `@intlify/unplugin-vue-i18n` (pinned to **v4** to match the vue-i18n 9 runtime) in `vite.config.js`:

```js
VueI18nPlugin({
  runtimeOnly: true,
  compositionOnly: true,
  jitCompilation: false,
  dropMessageCompiler: true,
  include: [resolve(__dirname, './src/locales/**')]
})
```

The plugin pulls a stale Vue 2-era **optional** peer (`vue-i18n-bridge` → `@vue/composition-api`) that conflicts with Vue 3.5; an `.npmrc` with `legacy-peer-deps=true` lets `npm install` / `npm ci` resolve past it (the bridge is unused on Vue 3).

## Consequences

**Positive**
- The CSP is preserved (no `'unsafe-eval'`); the SPA renders again.
- No runtime message compilation — slightly faster first render, and the compiler is tree-shaken out: the vendor chunk dropped **~93.7 KB → ~48.7 KB gzip**.
- A render test (`src/i18n.render.test.js`) now exercises the precompiled path so a regression fails CI instead of only showing up in production.

**Negative / Trade-offs**
- Locale messages must live under the plugin's `include` glob (`src/locales/**`) and be statically importable — no arbitrary runtime-constructed messages.
- `.npmrc legacy-peer-deps=true` relaxes peer-dependency strictness project-wide (acceptable: the conflict is a single unused optional peer).
- Build now depends on `@intlify/unplugin-vue-i18n`.

**Neutral**
- Builds on the vue-i18n decision from #60/#61; `src/i18n.js` and the locale files are unchanged — only the build pipeline and dependency set change.

## Alternatives Considered

- **Add `'unsafe-eval'` to the CSP** — one-line "fix", but a real security regression that defeats the point of the CSP. Rejected.
- **Revert the i18n feature** — restores the site fastest but throws away the bilingual work. Rejected in favour of the forward fix once precompilation was verified (compiler absent from the bundle + passing render tests).
- **Hand-rolled precompile step** (call `@intlify/message-compiler` in a tiny custom plugin) — avoids the extra dependency but reinvents what the official plugin does, with more maintenance surface. Rejected.

## Follow-ups

- If `@intlify/unplugin-vue-i18n` ever ships a release without the Vue 2 optional-peer chain, drop the `.npmrc legacy-peer-deps` line.
- Future i18n PRs: keep all messages in `src/locales/**`; the render test guards the precompiled path.
