# Investment Dashboard — Adversarial UI/UX & Accessibility Audit

> **Date:** 2026-07-20 · **Baseline commit:** `b3717a281` (post TS-migration batch 9)
> **Method:** five independent adversarial audit lenses (visual/token consistency, WCAG accessibility, interaction & states, responsive & dark mode, IA/navigation/i18n), each finding then re-verified against source by an independent skeptic pass. 18 findings confirmed; severity adjustments from verification are noted inline. A supplementary section at the end records first-hand findings from a live-browser inspection of the running app (accessibility tree + computed styles), which are evidence-cited but did not pass through the skeptic pass.
> **Companion:** [2026-07-20-test-strategy.md](2026-07-20-test-strategy.md) — the test-design half of the same audit.

*Source: 18 verified findings (false positives already removed). Severities reflect the post-verification verdicts, including the four that were adjusted down or re-scoped. Nothing here is inflated — where a finding's original impact was overstated, the corrected reading is stated inline.*

*Scope note: the brief named four illustrative systemic problems. Two — the un-virtualized stock list and the orphaned nav routes — are backed by verified findings and appear below. The other two examples (a browser-locale date leak across ~39 sites, and non-semantic sector headers) are **not** present in the verified finding set supplied, so they are out of scope for this report rather than asserted without evidence.*

---

## Executive summary — top systemic problems

1. **The monitoring pages lie.** The three pages whose entire purpose is operational trust misreport health: AutoUpdateMonitor hardcodes "Fresh / <1h / 24 symbols" so the metadata card can never go stale, and computes its TI success rate from JSON fields that don't exist so it reads a permanent 0%. SystemManager's "Clear Cache" is a plain page reload, and TechnicalIndicatorsManager's "Clear All Caches" pops a success toast with the actual clear calls commented out. Operators make go/no-go calls on fabricated signals.

2. **A design-token system that exists only on paper.** `--card-padding` / `--widget-padding` have **zero** consumers; the grey ramp (documented as fixed fill/dot positions) is used as *text* in 30+ places; status/log colors are raw hex or inline styles; buttons round at both 8px and 4px; the "same" `.widget-container` is elevated on one route and flat on another; tabs are raw Bootstrap blue instead of the brand accent; and a replicated invalid `-var(--space-1)` CSS bug silently drops declarations in 12 files. The single-source-of-truth benefit the tokens were built for is lost.

3. **Dark-mode accessibility failure on a primary control.** Theme-fixed grey (`--grey-550` #6c757d) used as tab-label text computes to ~2.98:1 on the dark card (#2C2C2C) — below WCAG AA 4.5:1 for 17px semibold text — on the StockDetail Overview/Holdings/Analysis nav and 30+ other foreground sites.

4. **Broken information architecture.** Three registered routes — Settings (which holds Privacy, Diagnostics, and data Import/Export), Technical Manager, and Auto-Update Monitor — have **zero** in-app links. Half the app's controls, including privacy and data-portability, are reachable only by manually typing a URL no real user will guess.

5. **The stock universe doesn't scale, and its search misleads.** stock-overview mounts every card for all ~15 sectors at once (~8000 DOM nodes) with no virtualization or pagination, and the single search box filters the *sidebar nav tree*, not the content grid it visually appears to filter — an affordance that silently does the wrong thing.

---

## 1. Accessibility

### A1 — Theme-fixed grey used as tab/meta text fails WCAG AA in dark mode · **HIGH**
- **Evidence:** `StockDetail.vue:1351` sets `.tab-btn { color: var(--grey-550) }` (#6c757d). `tokens.css:100-106` explicitly documents the greyscale ramp as **fixed palette positions that do not lighten in dark mode**, so on `--bg-card` dark (#2C2C2C, `style.css:166`) the contrast is ~2.98:1. Tab text is 17px (`--text-md`) semibold — not WCAG "large," so 4.5:1 applies. The same grey-as-foreground pattern recurs 30+ times: `StockDashboard.vue:34-35`, `SystemManager.vue:385`, `StockNews.vue:210`, `TradingViewCompanyProfile.vue:185`, `MFIVolumeProfilePanel.vue:563/664/897/946`, `ThreeDKineticChart.vue:439/453`.
- **User impact:** On the default-available dark theme, low-vision users cannot reliably read inactive tab labels (a primary nav control) or timestamps/meta text. Passes in light mode (~4.6:1), so this is a dark-mode-only AA failure — which makes it easy to miss in review and easy for users to hit.
- **Fix:** Replace foreground uses of `--grey-4xx/5xx` with the theme-aware `--text-secondary` / `--text-muted` (which invert under `.dark-mode`). Audit all 30+ `color: var(--grey-*)` sites; reserve the greyscale ramp for borders/backgrounds/dots only, as `tokens.css` intends.

---

## 2. Visual / Token consistency

### V1 — StockDetail tabs painted in raw Bootstrap blue, not the brand accent · **MEDIUM**
- **Evidence:** `StockDetail.vue:1356/1361/1362` use `var(--blue-500)` (#007bff, fixed, `tokens.css:64`) for hover/active tabs, plus a hardcoded `rgba(0,123,255,0.05)` wash at `:1357`. The brand interactive accent is `--primary-color` (#6B7F82, `style.css:22`), used for the MarketDashboard masthead rule (`MarketDashboard.vue:406`) and StockOverview `.sector-title` (`StockOverview.vue:1049`).
- **User impact:** The most-used control on the detail page reads as generic Bootstrap, clashing with the brand accent the user just saw on the previous page. Being a fixed hex, it also doesn't adapt light/dark, and the raw rgba wash bypasses the token system.
- **Fix:** Swap `--blue-500` for `--primary-color` / `--primary-text` on tab hover+active; replace the rgba wash with a brand-derived token (`--primary-wash` or `color-mix` on `--primary-color`) so it's theme-aware.

### V2 — Semantic spacing tokens are dead code; card padding ranges 16–32px with no rule · **MEDIUM**
- **Evidence:** Grep for `var(--card-padding|--widget-padding)` returns **zero** usages; `var(--section-gap)` appears once (`style.css:343`). These were defined (`style.css:87-92`) to replace ad-hoc literals. Instead components hardcode `--space-*`: StockCard `--space-6`/24px (`StockCard.vue:344`), SystemManager `--space-6` vs `--space-8` (`:271/322`), MarketDashboard `--space-4`/16px (`MarketDashboard.vue:482`), StockDetail `--space-6` vs `--space-4` (`:738/837/1062`).
- **User impact:** Equivalent card surfaces sit at 16 / 24 / 32px across pages with no governing rule, so density visibly shifts as the user moves between Market Overview, Stock Detail, and System Manager. The responsive shrink logic on `--card-padding` (`style.css:145-151`) never fires because nothing consumes it.
- **Fix:** Adopt `--card-padding` for top-level cards and `--widget-padding` for widget interiors across the four components (pick one value, likely `--space-6`), or delete the unused tokens if per-component padding is genuinely intended.

### V3 — Same-named `.widget-container` is elevated on Market Overview but flat on Stock Detail · **MEDIUM**
- **Evidence:** `MarketDashboard.vue:486` `.widget-container` has `box-shadow: var(--shadow-md)`. `StockDetail.vue:1057-1066` defines `.widget-container` under the comment "Match Market Overview Style" but with **no** box-shadow. Within StockDetail, `.stock-header`/`.symbol-insight-block`/`.review-block` use `--shadow-sm` while the global `.card` standard (`style.css:249-260`) is `--shadow-md` — a third elevation.
- **User impact:** Conceptually identical cards sit at different elevations depending on route; the "Match…" comment shows this is accidental drift, not intent.
- **Fix:** Standardize on `--shadow-md` (the global `.card` value); add it to StockDetail's `.widget-container` or let those surfaces inherit the shared `.card` class instead of re-declaring bespoke shadows.

### V4 — Two competing button silhouettes: 8px brand vs 4px page-local, sometimes on one page · **MEDIUM**
- **Evidence:** Global `.btn` / `.btn-renaissance` use `--radius-sm` (8px, `style.css:265/299`). Page-local overrides use `--radius-xs` (4px): `SystemManager.vue:355`, `MarketDashboard.vue:458`, `StockDetail.vue:1034` (`.detail-btn`), plus `TechnicalIndicatorsManager`, `AutoUpdateMonitor`, `QuantDashboard`. On StockDetail a `.btn-renaissance` (8px) renders near controls styled at 4px.
- **User impact:** The same affordance looks different across and within pages; the UI reads as assembled from mismatched kits.
- **Fix:** Pick one radius (brand `--radius-sm` = 8px) and remove the per-page `--radius-xs` overrides on buttons, or introduce an explicit `--radius-button` token applied everywhere.

### V5 — SystemManager hardcodes status/log colors that bypass equivalent tokens · **LOW** *(adjusted down from medium)*
- **Evidence:** `SystemManager.vue:136-138` returns inline `'#28a745'`/`'#dc3545'`/`'gray'` from `statusColor`, bound to `:style` at `:12/16`; `--success-solid`/`--danger-solid` (`tokens.css:42/49`) already hold the identical values. More raw hex at `:365 (#000)`, `:371 (#1e1e1e)`, `:372 (#fff)`, `:386-389` (log colors).
- **Honest impact:** This is a **maintainability / token-bypass** issue, not a dark-mode regression: `--success-solid`/`--danger-solid` are themselves fixed in dark mode, so switching to them wouldn't change the appearance. The only genuine defect is the off-system named color `'gray'` and the fact that a future palette change silently skips this page. The log terminal is *intentionally* always-dark (`#1e1e1e`, per the `:371` comment) — do **not** route it through the alert foregrounds (`--info-fg` etc.), which invert in dark mode and would break the terminal.
- **Fix:** Return `var(--success-solid)`/`var(--danger-solid)` (and replace `'gray'` with a real token), ideally via a class so overrides can apply. Leave the terminal colors as dedicated always-dark log tokens.

### V6 — Page titles have no consistent size; one falls back to the UA default · **LOW**
- **Evidence:** `StockOverview.vue:1010-1012` styles its page `<h2>` with only `color` (no font-size → ~24px UA default). MarketDashboard's masthead title is `--text-3xl`/40px (`:420`); SystemManager's is `--text-2xl`/32px (`:249`).
- **User impact:** The three primary landing pages render their H1-equivalent title at 40 / 32 / ~24px, weakening cross-page hierarchy; the Stock Overview title is off-scale entirely.
- **Fix:** Give StockOverview's title an explicit scale token (e.g. `--text-2xl`) and codify a shared `.page-title` class so every route's top heading uses one token.

---

## 3. Interaction & states

### I1 — AutoUpdateMonitor reports fabricated freshness and a permanently-wrong success rate · **HIGH**
- **Evidence:** `AutoUpdateMonitor.vue:418-427` `loadMetadataStatus()` hardcodes `metadataLastUpdate = new Date()`, `metadataAge = 0`, `metadataSymbolCount = 24` (with a "暫時"/temporary comment), so the card is permanently green/"Fresh"/24; `startPeriodicRefresh` (`:489-496`) re-runs it every 30s so it can never age (real index has 40+ symbols, so 24 is also stale). Separately `:409-411` computes `successRate` from `data.totalSymbols`/`data.successfulSymbols`, but `latest_index.json` (per generator `scripts/generate-daily-technical-indicators.js:1123-1136`) emits only `symbols`/`totalFiles` — neither field exists, so both resolve to 0 and the rate is permanently **0%**.
- **User impact:** On a page whose sole purpose is data-freshness trust, a genuinely stale metadata feed and a healthy 100% TI run are both invisible: "Fresh" falsely reassures, "0%" falsely alarms. Operators make wrong calls.
- **Fix:** Fetch real timestamps (e.g. `symbols_metadata.json` `generatedAt`) instead of `new Date()`; compute total from `symbols.length` and read failure counts from an index that actually carries them — or drop the metric rather than fabricate it. Remove the hardcoded 24.

### I2 — "Clear All Caches" shows a success toast while the clear calls are commented out · **MEDIUM** *(adjusted down from high — no-op, not destructive)*
- **Evidence:** `TechnicalIndicatorsManager.vue:205-219`: after `confirm()`, the two real clears (`:212-213`) are commented out, then `alert(cachesCleared)` fires unconditionally (`:214`) followed by `refreshStatus()`.
- **User impact:** The user confirms a purge and is told it succeeded, but nothing is cleared. They keep debugging stale data believing they reset it. No data is destroyed (hence medium, not high), but it actively misleads and erodes trust in every other status on the page.
- **Fix:** Wire the real clear calls before showing success, or disable/remove the button until implemented. Never emit a success toast for a no-op; add a disabled/loading state and surface failures inline.

### I3 — SystemManager "Clear Cache" only reloads the page, and its error state is never rendered · **MEDIUM**
- **Evidence:** `SystemManager.vue:227-231` `clearCache()` = `if (confirm(...)) window.location.reload(true)` — touches no cache; the deprecated `true` arg is ignored by modern browsers, so it's a mislabeled reload. `error` is in data (`:104`) and assigned in the outer catch (`:205`) but appears **nowhere** in the template (`:1-93`). The warning button (`:75`) has no `:disabled` while Refresh (`:72`) does.
- **User impact:** Users expect stale app data purged; localStorage/in-memory caches survive. When both status fetches fail, the stored error is never shown — the page just displays stale/zero values.
- **Fix:** Make the button actually clear the relevant caches (or rename it "Reload"); render `this.error` as an inline banner with retry; disable the warning button while loading.

### I4 — StockDetail has no working loading/error/retry; fetch failures are swallowed to null · **MEDIUM** *(adjusted down from high)*
- **Evidence:** `initializePage()` (`:531-539`) sets `loading = false` synchronously with no real await, so the `v-if=loading` skeleton (`:11-13`) never meaningfully renders and the `catch` that sets `this.error` (`:536`) cannot fire — making the error/Retry UI (`:16-19`) dead. `loadMetadata` (`:545-554`) and `fetchDataromaData` (`:634-651`) swallow failures to `null` with only `console.warn`; `refresh()` (`:540-544`) re-runs `initializePage` but does **not** re-call either fetch.
- **User impact:** The page still renders (each embedded widget has its own states), so this is largely a robustness/maintainability defect — but the one concrete correctness risk is real: when metadata fails, the page silently falls back to a **hardcoded exchange-guess list** (`:386-398`), showing a possibly wrong exchange with no indication and no way to recover.
- **Fix:** Gate loading on the actual metadata/dataroma promises; set `this.error` when they reject; make `refresh()`/Retry re-invoke both fetches; show per-widget error+retry instead of swallowing to null.

### I5 — Destructive/utility actions use native confirm()/alert() instead of the app's dialogs · **MEDIUM**
- **Evidence:** `SystemManager.vue:228` `confirm()`; `TechnicalIndicatorsManager.vue:199` `alert()` on error, `:206` `confirm()`, `:214` `alert()` success, `:217` `alert()` on failure. All on an otherwise fully tokenized, dark-mode-aware, i18n UI.
- **User impact:** OS-native dialogs ignore the design system and dark mode, sit outside the app's keyboard/focus model, and look untrustworthy on a financial dashboard. (They block JS only transiently while open, not permanently — so the original "freezes timers" framing is trimmed.) Overlaps with I2/I3.
- **Fix:** Replace with an in-app modal/toast (`role="dialog"`, focus trap, theme tokens); route errors to inline banners/toasts.

### I6 — StockDetail declares `watch` twice; the second silently overrides the first · **MEDIUM**
- **Evidence:** `watch` is defined at `:510-520` (`symbol` + `$route`) **and** at `:653-665` (`symbol` + `activeTab`) in the same options object. Duplicate object-literal keys mean the second wins, so the first block — including its `$route()` scroll-to-top watcher — never registers. `mounted()` also calls `scrollToTop()` twice (`:523-524`).
- **User impact:** Latent, not (yet) user-visible: because `symbol` derives from `$route.params.symbol`, symbol changes still scroll; only same-symbol route/query changes lose scroll-reset. The real hazard is that a future edit to the first watch block will be silently ignored, and a reviewer reading it is misled about actual behavior.
- **Fix:** Merge into a single `watch`; keep the `$route` handler if scroll-reset on any route change is wanted; drop the duplicate `scrollToTop()` in `mounted()`.

### I7 — AutoUpdateMonitor gates every action on one shared `loading` flag that a 30s interval races · **MEDIUM** *(impact corrected)*
- **Evidence:** A single `this.loading` is set by `toggleScheduler`/`triggerUpdate`×3/`triggerWarmup` and bound to `:disabled` on the Refresh, scheduler, and all trigger buttons (`:6,:11,:73,:111,:146,:182`). `startPeriodicRefresh` (`:489-496`) reruns `refreshStatus` + 4 loaders every 30s with **no** loading guard, so it races an in-flight manual trigger and clobbers shared fields (e.g. `loadMetadataStatus`). The Refresh button renders the identical 🔄 glyph in both branches (`:7-8`) — zero busy feedback.
- **Honest impact:** Two of the originally-claimed impacts are false and corrected: **Save Config** (`:218`) is gated by `!configChanged`, *not* `loading`, so a warm-up does not disable it; and `refreshStatus` itself doesn't set `loading`, so clicking Refresh directly never locks the UI. The genuine issues remain: a manual trigger disables unrelated trigger buttons, a background tick can overwrite a just-run manual action's results, and the unchanging spinner glyph gives no in-progress feedback (so users re-click).
- **Fix:** Use per-action loading flags (or a keyed busy set), pause the interval while a manual action runs, and give Refresh a real spinning/disabled state distinct from idle.

### I8 — SystemManager flashes "Stale / Never / 0" on first paint · **LOW**
- **Evidence:** `mounted` awaits an async `refreshStatus` (`:146-148`) that resolves after initial paint; until then `isDataFresh` (`:129`) is false so the Pipeline card shows "Stale" (`:17`), `formatDate(null)` yields "Never" (`:31-34`), Coverage is `0||0` = 0 (`:45`), with no skeleton gating these three cards.
- **Honest impact:** A brief false-alarm flash on an admin page. Note the flashed "Stale" renders in **gray** (`statusColor` returns `'gray'` when `generatedAt` is null), not the red the original write-up implied — red only appears once real, actually-stale data loads. Low.
- **Fix:** Show a skeleton or "Checking…" placeholder for the three overview cards while `loading`, and only compute freshness/coverage after the first successful fetch.

---

## 4. Responsive & dark mode

### R1 — Invalid `-var(--space-1)` drops the whole margin shorthand in 12 files, all at <480px · **MEDIUM** *(borderline low)*
- **Evidence:** 12 occurrences of `margin: 0 -var(--space-1) var(--space-N) -var(--space-1)` — `MarketDashboard.vue:581`, `StockMarketInsight.vue:454`, `TradingViewVIX.vue:297`, `VIXIndicator.vue:360`, `TradingViewTopStories.vue:270`, plus seven skeleton lines (`MarketOverviewSkeleton.vue:393`, `SkeletonLoader.vue:308/313`, `StockDetailSkeleton.vue:611/619`, `StockMarketInsightSkeleton.vue:270/287`). A custom property can't be negated with a `-` prefix — it must be `calc(-1 * var(--space-1))` — so the CSS parser discards the entire `margin` declaration. All sit inside `@media (max-width:480px)`.
- **User impact:** Minor and mobile-only: the intended ~4px negative side-margin "edge-bleed" never applies at the smallest breakpoint. Where the base rule declares `margin-bottom` separately (e.g. `MarketDashboard.vue:483`), that value is preserved, so no vertical spacing is lost. It's a real, replicated correctness defect that a token migration introduced and no lint caught.
- **Fix:** Replace every `-var(--space-1)` with `calc(-1 * var(--space-1))` (or a dedicated negative token). Add a stylelint rule rejecting `-var(` so this bug class is caught in CI.

**Cross-references into this theme:** A1 (dark-mode-only AA contrast on tab nav) and I5 (native dialogs don't adopt dark mode or tokens) are primarily filed above but manifest as dark-mode defects — fix them together with any dark-mode pass.

---

## 5. IA / Navigation / i18n

### N1 — Half the app is orphaned: Settings, Technical Manager, Auto-Update Monitor have no in-app links · **HIGH**
- **Evidence:** The top nav (`Layout.vue:12-19`) exposes exactly 3 links — market-overview, stock-overview, and system-manager ("Control Panel"). A repo-wide grep for `router-link`/`href`/`$router.push` targeting `/settings`, `/technical-manager`, `/auto-update-monitor` returns nothing, yet `main.js:32/34/35` registers all three. `Settings.vue:7-19` shows the hidden page holds Privacy, Diagnostics, and Import/Export (data portability).
- **User impact:** Users cannot discover Settings at all — including privacy and data import/export controls — nor the two operational tool pages. No gear icon, overflow menu, or footer link. (The brief's "4 of 8 routes" is loose: 3 routes are truly URL-only; stock-detail is reachable from cards and quant-strategy is dev-only.) Reaching these depends on guessing a URL.
- **Fix:** Surface Settings via a persistent header affordance (gear icon); group technical-manager, auto-update-monitor, and system-manager under a "Tools" dropdown/overflow. At minimum, link Settings from header or footer so privacy/data-export controls are reachable.

### N2 — stock-overview renders the whole universe with no virtualization, and its search filters the nav, not the grid · **HIGH**
- **Evidence:** `StockOverview.vue:60-81` nests `v-for` over every sector group and every stock, mounting all StockCards for ~15 sectors with no windowing/pagination. `groupedStocks()` (`:185-504`) never references `searchQuery`. The search box lives in NavigationPanel; `onSearchChange` (`:796-798`) only stores the query and passes it to NavigationPanel, whose `filteredTocTree` (`NavigationPanel.vue:66-100`) filters the left TOC tree **only**. `searchQuery` is component-local (`:140`), reset on remount, and `beforeRouteLeave` (`:639-646`) clears the one URL-persisted param (`focus`).
- **User impact:** ~8000 DOM nodes mount on entry (slow first paint, scroll/interaction jank; the exact node count is an estimate, but "no virtualization" and "search never touches the grid" are structurally confirmed). The search affordance looks like a content filter but silently only reshapes the nav — actively misleading. Any filter/scroll position is lost on navigation because nothing persists.
- **Fix:** Virtualize or paginate the card grid; wire `searchQuery` into `groupedStocks` so it filters visible cards (or relabel the box unambiguously as sidebar navigation). Persist the active filter/search to the URL query so it survives back/forward and reload.

---

## Top 8 fixes ranked by impact / effort

Ordered best bang-for-buck first (high impact ÷ low effort at the top).

| # | Fix | Findings | Impact | Effort | Why it ranks here |
|---|-----|----------|--------|--------|-------------------|
| 1 | Add nav for the orphaned routes — gear-icon Settings + a "Tools" dropdown for the manager/monitor pages | N1 | High | Low | Restores access to privacy & data-export controls and 3 whole pages with a header affordance + dropdown; no data-layer work. |
| 2 | Replace `color: var(--grey-*)` foregrounds with `--text-secondary`/`--text-muted` across all 30+ sites | A1 | High | Low–Med | Fixes a WCAG AA dark-mode failure on primary tab nav; the change is mechanical (token swap) even at 30+ call sites. |
| 3 | Make AutoUpdateMonitor report real metadata timestamps and a real (or removed) TI success rate | I1 | High | Med | The page's entire value is trust; today it fabricates freshness and a permanent 0%. Needs correct source fields, not new UI. |
| 4 | Stop the "Clear Cache" buttons lying — wire the real clears or disable/relabel; never toast success for a no-op | I2, I3 | Med–High | Low | Small edits remove two actively-misleading success paths and one mislabeled reload. |
| 5 | Repoint StockDetail tabs from `--blue-500`/raw rgba to `--primary-color`/`--primary-wash` | V1 | Med | Low | Brings the most-used detail control on-brand and theme-aware with a localized token swap. |
| 6 | Replace `-var(--space-1)` with `calc(-1 * var(--space-1))` in all 12 files + add a stylelint `-var(` rule | R1 | Low–Med | Low | Cheap correctness fix that also installs a CI guard preventing the whole bug class from recurring. |
| 7 | Virtualize/paginate the stock grid and wire `searchQuery` into `groupedStocks` (or relabel the search box) | N2 | High | High | Biggest performance + honesty win, but virtualization is real engineering — hence lower on an impact/effort basis despite high impact. |
| 8 | Consolidate the token layer: adopt `--card-padding`/`--widget-padding`, one button radius, one card shadow | V2, V3, V4 | Med | Med | Reconnects the dead/ignored tokens so the design system is single-source-of-truth again; broad but low-risk mechanical edits. |

*Deliberately below the line (tracked, not top-8): I4 StockDetail loading/error wiring and I7 per-action loading flags (Med, Med effort); I5 in-app dialog component (Med, Med–High effort — a dependency for cleaner I2/I3/I8); I6 duplicate `watch`, V5 SystemManager hex, V6 page-title scale, I8 first-paint flash (all Low, low effort — good cleanup-sprint candidates).*

---

## Supplementary first-hand findings (live-browser inspection, 2026-07-20)

Observed directly on the running dev server via the accessibility tree and computed styles. These did not go through the skeptic verification pass above; each carries its own primary evidence.

### S1 — Mixed-locale dates on the zh-TW UI · **MEDIUM**
- **Evidence:** On the same zh-TW session, market-overview shows the data date as `資料日期 2026年7月20日` while stock-overview shows `最後更新：Jun 19, 08:32 PM` (English month/AM-PM). Root cause: 39 call sites across `src/` use `toLocaleString`/`toLocaleDateString`/`toLocaleTimeString` with either the browser default or a hardcoded locale (`StockOverview.vue:731` pins `'en-US'`), so date rendering ignores the app's selected i18n locale. Corroborated by test-strategy finding Q6.
- **Fix:** Route all date/number formatting through a locale-aware helper bound to the active `vue-i18n` locale (`Intl.DateTimeFormat(locale.value, …)`); add a zh-TW-locale assertion so the regression is caught.

### S2 — Sector/industry group headers expose no heading semantics; stock cards have no accessible names · **MEDIUM**
- **Evidence:** In the accessibility tree of stock-overview, group headers ("Technology (33)", "Semiconductors (5)", …) expose as unlabeled `generic` nodes, not headings, so a screen-reader user has no structure to navigate ~15 sector groups. Each stock card is a `button` whose accessible name is the concatenation of two `generic` spans ("ALAB NASDAQ") with no descriptive label such as "View ALAB details".
- **Fix:** Render group headers as `h3`/`h4` (or `role="heading"` + `aria-level`); give each card `aria-label` with an action-oriented name.

### S3 — StockDetail content tabs are plain buttons, not ARIA tabs · **LOW**
- **Evidence:** The 總覽/持股/分析 tab controls expose as three bare `button`s — no `role="tablist"`/`role="tab"`, no `aria-selected`, no `aria-controls` — so assistive tech announces neither the tab pattern nor the active state.
- **Fix:** Apply the WAI-ARIA tabs pattern (roving tabindex, `aria-selected`, `tabpanel` association).

### S4 — Indicator tables expose no header/cell association · **LOW**
- **Evidence:** The 趨勢/擺盪指標/市場 tables expose as `table` nodes whose cells are all `generic` — no `th` row headers are surfaced, so a screen reader cannot associate "45.34" with "RSI (14)". One row in the 市場 table also renders a value (`$5.10T`) with no visible metric label at all.
- **Fix:** Use `th scope="row"` for the metric name column; ensure every row has a visible label.

### S5 — Inconsistent empty-value vocabulary within one panel · **LOW**
- **Evidence:** The same StockDetail indicator panel shows `無資料` (Risk & Volatility → 波動度) and `N/A` (市場 → CMF (20)) for the same "no data" condition.
- **Fix:** One localized empty-value token (`common.noData`) used everywhere.

### S6 — Untranslated quant reason strings on the zh-TW UI · **LOW**
- **Evidence:** The 量化動能狀態 block renders `WAIT` with the reason `Sector Weakness (Peer Down)` in English on the zh-TW UI — signal-reason strings come from the data payload untranslated.
- **Fix:** Map reason codes (not display strings) in the payload to i18n keys client-side.

### S7 — Footer copyright year is stale · **LOW**
- **Evidence:** Footer reads `© 2025 Investment Dashboard` while the app displays 2026 data.
- **Fix:** Derive the year at build time.

### Positives observed (for balance)
- The theme toggle updates its own accessible label correctly (`切換至淺色主題` ↔ `切換至深色主題`) and flips `data-theme` on `<html>` reliably.
- StockDetail has a real breadcrumb and its external Yahoo Finance link carries a descriptive, localized `aria-label` including the new-tab warning.
- Light-theme token contrast measured live: `--text-primary` on `--bg-card` ≈ 13.8:1, `--text-muted` ≈ 5.0:1 — both pass AA (the dark-mode failure in A1 is the exception, not the rule).
- System-manager exposes proper headings and labeled buttons throughout.