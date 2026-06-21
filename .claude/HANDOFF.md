# Session Handoff — investment-dashboard (2026-06-22)

> Paste-or-point a fresh session at this. It covers the project, the current state,
> the immediate next task (off-scale typography convergence), the backlog, and the
> process constraints/gotchas that matter. Auto-memory (MEMORY.md → project_refactor_2026-06.md)
> has the deep history; this is the actionable digest.

## 1. Project at a glance
- **What**: Static-first Vue 3 + Vite investment dashboard (market/stock/quant + admin pages), GitHub Pages. Solo owner (PM+RD+SA), bilingual EN/繁中.
- **Data**: lives in a SEPARATE repo `romarin-hsieh/investment-dashboard-data` (same-origin GH Pages; ADR-0008). App repo git-ignores `public/data`; fetch via `VITE_DATA_BASE_URL` / `withDataBase()`. **Local dev needs `npm run seed-data` first.**
- **i18n**: vue-i18n@9, messages PRECOMPILED at build (ADR-0009) because the strict CSP forbids `'unsafe-eval'`. **Never add `'unsafe-eval'`; keep messages in `src/locales/{en,zh-TW}.json` at full key parity** (parity is CI-tested).
- **Design system**: `src/styles/tokens.css` (greyscale, semantic states, chart, signal — mostly mode-invariant) + `src/style.css` (Renaissance slate brand `--primary-color #6B7F82`, dark-mode via `.dark-mode` class, + scales: radius/shadow/space/text/weight/transition). ADR-0010 documents it. **App defaults to dark mode.**
- **Repo**: github.com/romarin-hsieh/investment-dashboard. `gh.exe` at `C:\Program Files\GitHub CLI\gh.exe`. CI checks per PR: `test` (vitest) + `size-delta` (bundle budgets, ADR-0007). 12 ADRs (0001–0012).

## 2. Current state (2026-06-22)
- **2026-06-22:** the leaked Finnhub API key was **revoked on the Finnhub dashboard** — the last outstanding user action is now DONE. No code change (the service was already gone from HEAD; the dead key sits in `.git` history but is now inert). No open PRs/issues; `main` unchanged.
- `main` @ **74df63743**, synced with origin. Local branches: only `main` + `gh-pages` (clean). `node_modules` healthy.
- A large 2026-06 program is COMPLETE and merged: the 6-goal refactor (#46–65), docs/UIUX tracks (#66/#68/#69/#70/#71), dead-code + staleness (#72/#73), the impeccable UI/UX craft program (#74–78), the typography convergence (#79), the Market Overview "bolder" masthead (#80), the full **Quant Strategy** program (#81 de-terminal · #82 Verdict Plate · #83 ticker-leak data fix · #84 chart de-neon), **lazy-load the non-active locale** (#85, ADR-0007 reclaim), and two polish PRs (#86 Fear&Greed component-value de-hack · #87 Quant plate caption). See auto-memory Progress 12–15.
- **impeccable critique score: 30/40** (was 27). Detector anti-patterns 26→18 (all 18 remaining are judgment-confirmed legit: 10 CSS spinners, 2 intentional gradient/segment width-fills, 6 Roboto-Mono-for-figures — do NOT "fix" these).
- Design-system token adoption is now **COMPLETE**, including typography sizes (#79 converged the last 198 off-scale `font-size` literals onto the re-tuned `--text-*` scale).

## 3. IMMEDIATE NEXT TASK — owner's pick (typography convergence is DONE)
The off-scale typography convergence (impeccable "A") shipped in **#79** (squash `1e556af33`): `--text-*` re-tuned to **xs 11 · sm 13 · base 15 · md 17 · lg 20 · xl 24 · 2xl 32 · 3xl 40px** (~1.13–1.2 ratio, de-muddied the old 14/15/16 cluster), all **198** off-scale `font-size` literals snapped on-scale across 45 files, live-verified light+dark / both locales (headings on-scale, zero overflow incl. CJK). **Typography is now 100% tokenized** (the last un-converged scale). Detail in auto-memory Progress 11.

**UPDATE 2026-06-21 (session complete — 8 PRs #80–87):** Market Overview masthead/bolder (#80), the full Quant Strategy program (#81 de-terminal → #82 Verdict Plate → #83 ticker-leak data fix → #84 chart de-neon via `getToken()`), lazy-load the non-active locale (#85, ADR-0007 reclaim), and two polish PRs (#86 Fear&Greed component-value de-hack, #87 Quant plate caption). Both hero surfaces now express the Renaissance brand and work in both themes; Quant charts de-neoned onto a theme-fixed `--chart-series-*` palette; entry chunk slimmed; gauge cleaned. See auto-memory Progress 12–15. Only the backlog remains.

**Remaining work — all merged except the BACKLOG; the aesthetic / perf / polish levers are all spent:**
1. **Backlog (bigger, deferred all session):** 6px radius-scatter unification; dataroma config-driven crawl (de-hardcode tickers); `.git` history purge (3.6GB, destructive).

DONE this session: gauge component-value de-hack (#86 — dropped the `mix-blend-mode`) and Quant plate caption (#87). DECLINED by judgment (would be regressions / too subjective, NOT bugs): re-toning the Fear&Greed per-state rainbow (it's meaningful fear→greed feedback) and de-duping SignalCard's header against the verdict band (the header anchors the right column with local context).

> ⚠️ An earlier handoff listed "delete `src/services/QuantDataService.js`" as a tidy — that was WRONG. It is **live code**: `ReviewCometChart.vue` imports `quantDataService.getTickerData()`, and ReviewCometChart is rendered by `StockDetail.vue`. Do **not** delete it.

See §4 for the full backlog.

## 4. Backlog / deferred (not started)
- **Aesthetic ceiling (heuristic #8)**: app is clean/trustworthy but not distinctive — a `/impeccable bolder` or `delight` pass on ONE hero surface could express the Renaissance brand more (different work than cleanup). (Two hero surfaces already done: #80 masthead, #82 Verdict Plate — this lever is largely spent.)
- JS chart-color `getToken()` adoption (some chart `<script>` colours still hardcoded — deeper, dark-mode-reactive). #84 converted the Quant kinetic chart; remainder is the deferred tail.
- 6px radius-scatter unification; dataroma config-driven crawl (de-hardcode tickers); `.git` history purge (3.6GB, destructive).
- Card-grid "monotony" was assessed and INTENTIONALLY left uniform (correct for status surfaces) — do not restructure.

## 5. Process constraints (the owner's validated workflow — follow exactly)
- **Stacked PRs, squash-merge, spec-grade PR bodies**, present green PRs with letter-choice option menus at turn end. Owner picks by letter.
- Commits end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. PR bodies end with the Claude Code generated-by line.
- **Work in the MAIN dir on a feature branch** (NOT a worktree). Reason: a `node_modules` junction + `git worktree remove` corrupts the main `node_modules` (cost an `npm ci` recovery this session). Bonus: the preview server is cwd-locked to the main dir, so working on a branch there lets it serve your changes for live verification.
- **Merge flow**: `git checkout main` → `gh pr merge <N> --squash --delete-branch` (from main dir) → `git fetch --prune` + `git merge --ff-only origin/main` → branch next off updated main.
- **Stacked-PR gotcha**: deleting a parent branch on squash-merge auto-CLOSES a child PR targeting it (don't reopen — recreate against main).
- **CSP**: never add `'unsafe-eval'`. Keep i18n messages precompiled.
- Bundle-budget changes need an ADR-0007 changelog entry. `.npmrc` has `legacy-peer-deps=true` (required by the i18n plugin).

## 6. Verification toolkit (what works here)
- **Tests/build**: `npm test` (232 passing), `npm run build`, `npm run build:analyze` then `node scripts/bundle-size-delta.js --check-budgets stats.json`.
- **Browser**: `preview_start` (name `vite-dev`, port 3000) — it's cwd-locked to the main dir. Routes are hash-based: `#/market-overview`, `#/stock-overview`, `#/stock-overview/symbols/AMZN`, `#/quant-strategy`, `#/technical-manager`, `#/auto-update-monitor`, `#/system-manager`, `#/settings`.
  - **`preview_screenshot` TIMES OUT on heavy data pages** — use `preview_inspect` / `preview_eval` (computed styles) for layout/colour proof. Headless viewport reports width 0 → use `preview_resize` to a real width (e.g. 1440) before measuring; `@media` resolves to the smallest breakpoint otherwise.
  - Dark mode = `.dark-mode` class on `<html>` + `localStorage.theme`. Locale = `localStorage.locale` (+ reload).
- **Lossless-change proof** (great for token sweeps): normalize before/after by expanding each token back to its literal value + canonicalize hex/whitespace; `normalize(HEAD:file) === normalize(working)` ⇒ provable visual no-op. Immune to agent rate-limits.
- **impeccable skill**: `impeccable:impeccable` then `critique`/`typeset`/`bolder` etc. Its detector (`scripts/detect.mjs --json <dirs>`) has known false positives (spinners as border-accents, gradient fills as layout-transitions, monospace as overused-font) — always pair with design judgment.

## 7. Suggested opening message for the new session
> Continue the investment-dashboard UI/UX work. Read `.claude/HANDOFF.md` for full context. The 2026-06-21 session shipped 8 PRs (#80–87): Market Overview masthead/bolder, the full Quant Strategy program (#81–84), lazy-load the non-active locale (#85), and two polish PRs (#86 gauge de-hack, #87 Quant plate caption); `main` @ 74df63743. The aesthetic / perf / polish levers are ALL spent — only the BACKLOG remains (see §3): 6px radius-scatter unification, dataroma config-driven crawl, `.git` history purge. Owner picks by letter; live-verify with me.
