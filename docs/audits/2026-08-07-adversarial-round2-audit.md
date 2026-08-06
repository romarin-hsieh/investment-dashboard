# Investment Dashboard — Adversarial UI/UX Audit, Round 2

> **Date:** 2026-08-07 · **Baseline commit:** `88311ce30` · **Companion:** [2026-08-07-progress.md](2026-08-07-progress.md)
> **Method:** three independent adversarial lenses (cross-page style consistency; bilingual copy / AI-slop; system design / IA / interaction) run against source, plus a first-hand visual pass over the committed screenshot baseline
> (`2026-08-07-screenshots/before/`). Every lens finding then passed through an independent
> skeptic pass; severities reflect post-verification verdicts. Round 2 additionally re-checks
> all 18 findings from [round 1 (2026-07-20)](2026-07-20-adversarial-uiux-audit.md).
> **Trigger:** owner-reported symptom — "the system-status pages are obviously styled
> differently from the outer pages; buttons are different heights."
>
> **Terminology authority:** [product/GLOSSARY.md](../product/GLOSSARY.md) — the project's own
> canonical zh-TW vocabulary (三層**快取**, **資料**擷取管線, **中繼資料**…). Copy findings that
> contradict it are objective defects, not taste.

---

## Executive summary

1. **The owner's symptom is now a measured fact, not an impression.** Across the seven
   routes the app renders **ten distinct button heights (16→50px)**; the outer pages are
   internally uniform (~33px primary actions) while the system pages span 29→44px — the
   tallest system button is **52% taller** than the shortest, two entries apart in the same
   Tools menu (SC-1). Card surfaces split exactly on the same boundary: outer = 12px radius
   + shadow, AUM/TIM = 8px + flat, Settings = zero padding (SC-4/SC-9). Root mechanism:
   there is no base `button { font: inherit }` (buttons render UA Arial while body text
   renders Segoe UI — the declared Inter is loaded nowhere), and five separate `.btn`
   definitions plus ten scoped `.retry-btn` copies each pick their own geometry (SC-3,
   SK-S-1).

2. **The operational surfaces still misreport — round 1's "the monitoring pages lie,"
   surviving in politer form.** Post-#118 the numbers are real, but: freshness thresholds
   contradict the documented 26 h SLO so the same feed grades green on one page and red on
   its sibling ~96% of every normal day (SD-1, compounded by five incompatible
   cache-busting conventions, SK-D-1); "next update" times are `now + interval`, re-sliding
   every 30 s poll (SD-2); **three** maintenance buttons log SUCCESS for work that never
   happens (SD-3/SK-D-2); the Configuration panel saves to a key nothing reads (SD-4); the
   warm-up card is red by construction for a service that is never started (SD-7); the
   landing route ships a deliberate 800 ms fake load (`// 模擬初始化過程`) that defers real
   widget mounting (SD-8); and the nav advertises a Settings page whose three cards are
   TODO stubs (SD-6).

3. **The copy is professionally written English wearing two different Chinese products.**
   The Tools namespaces are mainland-register (緩存/調度器/刷新/元數據/保存 — sometimes
   colliding with the Taiwan form inside one card) while the rest of the file follows the
   project's own GLOSSARY (CP-2); **zero** of the glossary's quant terms actually appear in
   zh-TW.json (CP-4); the pipeline's entire current signal/commentary vocabulary renders in
   English on the zh UI (CP-1), as do the sector group headings of the main listing
   (SK-C-1). Plus: a fabricated source attribution ("Market Data Analytics" for CNN data,
   CP-11), a false 「即時分析」 claim for a daily batch (CP-7), directive zh renderings of
   hedged EN signals (CP-13), and no investment-advice disclaimer anywhere (CP-16).

4. **Structural root cause, now closed at the spec level:** the Tools surfaces had no job
   stories, no flows, no state machines, no wireframes — nothing defined what "correct"
   looked like, so every page invented its own. The companion PM docs
   (USER_STORIES / USER_FLOWS / STATE_MACHINES / WIREFRAMES / BDD_DDD_GAP_ANALYSIS) are the
   normative layer this audit's fixes implement toward.

5. **Verification honesty.** Three independent lenses → runtime measurement
   (`scripts/audit-measure.mjs`) → three independent skeptic passes. Outcome: 34 findings
   confirmed, 15 adjusted (exact corrections recorded inline), **1 refuted and withdrawn**
   (SC-10), 10 new findings contributed by the skeptics themselves, and 3 attempted
   overturns of round-1 FIXED verdicts all failed. Post-verification totals: **2 critical ·
   26 major · ~23 minor/nit**, before de-duplication across lenses.

---

## 0. First-hand visual findings (screenshot baseline)

Observed directly on the committed before-set. Visual evidence is first-hand; the source
citations for each were confirmed in the lens merge below.

### FH-1 — Four different page-header patterns across seven routes · **major**
- **Evidence (screenshots):** market-overview: eyebrow (資料日期) + 40px-class title + subtitle
  + full-width rule, left-aligned. stock-overview: title + subtitle only (no eyebrow, no rule).
  system-manager & technical-manager: **centered** title + centered subtitle. auto-update-monitor:
  bare left title + rule, no subtitle. settings: left title + subtitle, no rule, section list
  starts nearly flush under the subtitle.
- **Impact:** every route re-invents the masthead; the app reads as five templates stitched
  together — the owner's headline complaint, structurally confirmed.
- **Fix:** one shared page-header component/pattern (eyebrow optional, title token, subtitle
  token, rule) consumed by all seven routes.

### FH-2 — At least eight button treatments; effective heights span ~32→48px · **critical**
- **Evidence (screenshots):** technical-manager control row: four large filled buttons
  (navy 刷新狀態, yellow 清除所有緩存, teal 測試預計算, grey 顯示設定). auto-update-monitor:
  small dense navy 清除緩存/手動更新, pale grey 手動預熱, amber 清理緩存, plus a slate 刷新狀態
  and green 啟動調度器 pair of visibly different heights in the same toolbar. system-manager:
  slate 重新整理狀態 + mustard 清除瀏覽器快取. Outer pages: red 重試, slate pill 返回股票總覽.
- **Impact:** the same affordance ("do an action") renders in ≥8 silhouettes and 4+ palettes;
  system pages don't even agree with each other, let alone with the outer pages.
- **Fix:** all buttons consume the global `.btn` system (`style.css:268`) + a new normalized
  control height token; kill page-local button CSS.

### FH-3 — zh-TW terminology contradicts the project's own GLOSSARY, sometimes inside one card · **critical**
- **Evidence (screenshots):** technical-manager card titled 「每日**緩存**」 whose first row reads
  「記憶體**快取**: 0 項」— both words for *cache* in one card. auto-update-monitor uses
  緩存/刷新/元數據/數據年齡/調度器/運行狀態 throughout; system-manager (adjacent page) uses
  快取/重新整理/中繼資料/資料. GLOSSARY.md authorizes 快取 (三層快取) and 資料 (資料擷取管線).
- **Impact:** simplified-Chinese ("translationese") vocabulary on half the system pages while
  the other half follows the glossary — the strongest "machine-generated, never reviewed"
  signal in the app, on the pages meant to signal operational trust.
- **Fix:** sweep zh-TW.json to glossary vocabulary (緩存→快取, 數據→資料, 元數據→中繼資料,
  刷新→重新整理, 調度器→排程器); add the missing ops terms to GLOSSARY.md in the same PR.

### FH-4 — The stock list has two zh names; the indices widget has two zh names · **major**
- **Evidence (screenshots):** top nav 個股總覽 vs stock-detail breadcrumb 股票總覽 and back
  button 返回股票總覽 — the same route, two names. Market page section 市場指數 vs stock page
  section 大盤指數 — the same indices concept, two names.
- **Impact:** navigation labels are the user's map; renaming a destination between the nav and
  the breadcrumb breaks the map.
- **Fix:** one name per destination/concept (個股總覽; pick 市場指數 or 大盤指數 once).

### FH-5 — Emoji as card icons on system-manager · **minor**
- **Evidence (screenshots):** 🚀 (pipeline), 🕐 (last update), 📈 (coverage) in pastel circles;
  no other route uses emoji iconography.
- **Impact:** reads as placeholder/AI-generated; also renders platform-dependently.
- **Fix:** replace with the app's SVG icon language (or none — the labels carry the meaning).

### FH-6 — One failure class, three copy variants and two visual treatments · **major**
- **Evidence (screenshots):** stock-detail price panel: 「圖表無法載入，請檢查網路連線後重試。」
  (no border) beside technical panel: 「無法載入此元件，請重新整理頁面或檢查網路連線。」 (red
  hairline border). Market/stock overview widgets: terse 「載入失敗」 + 重試.
- **Impact:** error styling and vocabulary vary per widget for the identical condition —
  weakens trust exactly where trust is being asked for.
- **Fix:** one error-state component (message token + optional detail + 重試) reused by all
  widget shells.

### FH-7 — Settings footer copy is translationese · **minor**
- **Evidence (screenshots):** 「市場數據由以下提供 TradingView」 — word-for-word "market data
  provided by the following: TradingView", and 數據 contradicts the glossary.
- **Fix:** 「市場資料由 TradingView 提供」. (Round-1 S7's stale © year now shows 2026 — fixed.)

### FH-8 — On fetch failure, system-manager asserts definite states it cannot know · **major**
- **Evidence (screenshots, error-state set):** with the data origin blocked, the three overview
  cards render 過期 (stale) / 從未 (never) / **0** symbols as definite claims; the only failure
  signal is inside the log panel (無法載入標的中繼資料…).
- **Impact:** an operator glancing at the cards reads "pipeline stale, never updated, zero
  coverage" — three confident falsehoods — when the truth is "status unknown (fetch failed)".
- **Fix:** cards need an explicit unknown/error visual state distinct from stale; never render
  a definite value from a failed fetch. (Round-1 I3/I8 family, still unresolved in this form.)

### FH-9 — Inline note admits an adjacent control is not real · **major**
- **Evidence (screenshots):** auto-update-monitor 技術指標 card: button 清除緩存 with note
  「註：實際預計算需要在伺服器端執行。」("actual precomputation must run server-side").
- **Impact:** the page offers a control, then disclaims it in a footnote — the round-1 theme
  ("the monitoring pages lie") surviving in politer form. On a static-first architecture
  (ADR-0001: no runtime backend) the honest design is to say what *is* client-side (clear
  local caches) and link the GitHub Actions run for the rest.
- **Fix:** relabel to what it does (清除本機快取), move pipeline-side actions to links to the
  Actions workflow, drop the disclaimer.

### FH-10 — Two unexplained "tracked" universes side-by-side (24 vs 140) · **minor**
- **Evidence (screenshots):** auto-update-monitor 緩存預熱 card 追蹤股票: **24**
  (= `VITE_STOCK_SYMBOLS` count) while 元數據 card 股票數量: **140** (universe size).
- **Impact:** not fabrication (the numbers measure different things) but nothing tells the
  operator that; side-by-side they read as a contradiction.
- **Fix:** label the warmup list as such (預熱清單 24 檔) or unify on the universe.

### Capture caveat (for after-comparisons)
Third-party hosts are blocked by `scripts/audit-screenshots.mjs` for determinism, so
market-overview's indices widget and stock-detail's TradingView panels are captured in their
(real) error states; `before-error-states/` additionally preserves the all-hosts-blocked run.
After-sets must use the same blocklist so diffs are attributable.

---

## 1. Round-1 findings — current status

All 18 verified round-1 findings plus its 7 supplementary items, re-checked against
`88311ce30`; the skeptics additionally attempted (and failed) to overturn I1, I2, N2, V1,
V6, R1. Fix credits: PR #116 (nav), #118 (monitor honesty), #121 (grid search/perf),
#176–#184 (contrast sweep).

| ID | Round-1 finding | Status | Note |
|---|---|---|---|
| A1 | grey-as-foreground AA failure (dark) | **FIXED** | one documented, defensible residual on the always-dark log panel |
| V1 | StockDetail tabs in Bootstrap blue | **FIXED** | now `--primary-text`/`--primary-color` |
| V2 | dead semantic spacing tokens | **PARTIAL** | tokens now consumed at 8 sites; TIM/AUM/StockOverview still on raw `--space-*`; 16/24/32px range remains |
| V3 | `.widget-container` elevation drift | **FIXED** | both routes `--shadow-md` |
| V4 | two button radii (8 vs 4px) | **PARTIAL** | radius unified; divergence moved to **height** → SC-1 |
| V5 | SystemManager raw status colors | **PARTIAL** | `'gray'` **still live** (`SystemManager.vue:158`, corrected by skeptic) + hex pair at `:159`; terminal hexes sanctioned |
| V6 | page-title sizes inconsistent | **OPEN** | now 3 sizes with 4 routes on undeclared UA defaults → SC-7 |
| R1 | invalid `-var(--space-1)` ×12 | **FIXED + guarded** | `style.css-negation.test.js` structural gate |
| I1 | AUM fabricated freshness / 0% rate | **FIXED** | real fields verified against generator + artifact; residuals filed as SD-1/SD-2/SD-9 |
| I2 | "Clear All Caches" success over no-op | **FIXED** | clears live before the alert |
| I3 | SystemManager clear=reload; error never rendered | **PARTIAL** | clear is real now; **error banner still unreachable** (inner catches swallow) |
| I4 | StockDetail dead loading/error/retry | **OPEN** | unchanged incl. hardcoded exchange-guess fallback |
| I5 | native `confirm()`/`alert()` | **OPEN** | 5 sites; GenericSettingsModal exists but unadopted by admin pages |
| I6 | duplicate `watch` key | **PARTIAL** | merge done; double `scrollToTop()` remains |
| I7 | shared `loading` flag raced by 30 s poll | **OPEN** | unchanged |
| I8 | first-paint "Stale/Never/0" flash | **OPEN** | unchanged → generalized as FH-8 |
| N1 | Settings/TIM/AUM orphaned from nav | **FIXED** | Tools menu (#116); consequence: SD-6 (empty Settings now advertised) |
| N2 | no grid filtering / virtualization | **FIXED** | search filters grid + URL-persisted; perf via `content-visibility` (nodes still mounted — honest caveat) |
| S1 | mixed-locale dates | **PARTIAL** | guard covers pages/components; one true leak: `yahooFinanceApi.ts:1218` reportDate.fmt under 申報日期 |
| S2 | sector headers / card names not semantic | **FIXED** | real `h4` headers + labeled controls |
| S3 | tabs not ARIA tabs | **OPEN** | unchanged |
| S4 | tables without `th scope` | **OPEN** | unchanged |
| S5 | 無資料 vs N/A | **OPEN** | = CP-9 |
| S6 | untranslated quant reasons | **OPEN** | wider than reported → CP-1 (100% of current payload) |
| S7 | stale footer year | **FIXED** | build-time year + regression test |

**Tally: 10 FIXED · 6 PARTIAL · 9 OPEN.**

## 2. Style-consistency lens (SC) — skeptic-verified

*Skeptic result: 12 CONFIRMED, 4 ADJUSTED, 1 REFUTED, 4 new findings. All rendered-output
claims were re-verified against the running app (`scripts/audit-measure.mjs`), which also
explained the lens's systematic 2-3px height understatement: the UI renders in Traditional
Chinese, so Chrome's line box is driven by the CJK fallback font's strut (≈1.28-1.35), not
Arial's 1.15 — conclusions unchanged, exact pixels corrected below.*

### SC-1 — One class name, five definitions, ten rendered button heights (16→50px) · **critical**
Runtime heights across the 7 routes: 16 · 20 · 29 · 31 · 33 · 34 · 36 · 36.2 · 44 · 50px
(65 rendered `<button>` instances). `.btn` is defined in `style.css:268` AND re-defined in
`MarketDashboard.vue:450`, `SystemManager.vue:404`, `AutoUpdateMonitor.vue:727` (+`.btn-sm:789`),
`FundamentalAnalysis.vue:888` (dead — its usage is inside an HTML comment), while
`TechnicalIndicatorsManager` abandons it for its own `.control-btn:393` (44px). Primary
actions: outer routes ~33px (uniform); system routes 29→44px — **the tallest system button
is 52% taller than the shortest, two clicks apart in the same Tools menu.** No `.btn` sets
font-size/line-height/min-height, so geometry is UA-derived. **Fix:** single `.btn` spec
(font inherit + `--text-base` + min-height 36px; `.btn-sm` 30px) per WIREFRAMES §2; delete
all page-local geometry.

### SK-S-1 — The app's largest button family was invisible to source-level review: `.retry-btn` ×10 independent scoped definitions · **major** *(new, found by skeptic)*
Ten components each define their own `.retry-btn` (FastTradingViewWidget:398,
AdvancedChartWidget:206, VixWidget:237, TradingViewFundamentalData:224,
TradingViewCompanyProfile:221, TradingStrategyWidget:288, TechnicalIndicators:720,
MFIVolumeProfilePanel:556 — this one in `--blue-700` while the rest use `--danger-solid`,
MarketRegimeWidget:287, LazyTradingViewWidget:307) — divergent padding/font-size/weight;
runtime shows weight 500 vs 400 in one viewport. Also resolves a lens misattribution:
`MarketDashboard.vue:450`'s local `.btn` styles only the error-path retry that doesn't render
on the happy path. **Fix:** one shared error-state component (FH-6) owns the retry button;
delete the ten copies.

### SC-3 — Buttons don't inherit the app's font; the declared 'Inter' is loaded nowhere · **major (critical-adjacent)**
No `button { font: inherit }` reset exists; button text renders UA Arial 13.333px while body
text renders **Segoe UI** (skeptic width-probes proved Inter absent: `Inter,serif` ≡
`ZZNotARealFont,serif` ≡ serif at 736.45px; `document.fonts` is empty — note
`document.fonts.check()` returns a false positive here and is unusable as evidence).
`font-family: inherit` exists at exactly 3 sites (`Layout.vue:232`,
`SuperInvestorStats.vue:348,379`). **Fix:** `button, input, select, textarea { font: inherit }`
in the base layer + explicit `.btn` font-size; decide Inter's fate (load it or remove it
from the stack) — separate decision item.

### SC-4 — Card surfaces split exactly along the outer/system boundary · **major**
Runtime: all four outer surfaces 12px radius + shadow-md; SystemManager 12px + **shadow-sm**
(24/32px padding); AutoUpdateMonitor + TechnicalIndicatorsManager **8px + no shadow**;
Settings global `.card` **0px padding** (SC-9). This — more than buttons — is why the system
pages read as a different app. **Fix:** every card = `--radius-md` + `--shadow-md` +
`--card-padding`/`--widget-padding` per WIREFRAMES §3.

### SC-5 — Two system pages paint controls exclusively from the Bootstrap palette · **major**
Runtime: TechnicalIndicatorsManager ships `#0056b3/#ffc107/#17a2b8/#6c757d`; AutoUpdateMonitor
`--blue-700/--grey-550/...`; SystemManager correctly uses `--primary-strong` (#5E7174) —
proving the divergence is drift, not an "admin theme". **Fix:** primary actions on
`--primary-strong`; semantic solids only for genuine success/danger/warning.

### SC-7 — Page titles: 40 / 32 / 24px with four routes silently depending on UA defaults · **minor-major boundary** *(adjusted down)*
Three rendered sizes, not four — the four undeclared `h2`s (stock-overview, settings,
technical-manager, auto-update-monitor) land on 24px/700, which *accidentally* equals
`--text-xl`+`--weight-bold`. Real defects: undeclared UA dependence, the 40/32/24 spread,
and StockDetail's title being an `h3`. **Fix:** two-tier `.page-title` system per
WIREFRAMES §1.

### SC-8 — SystemManager re-margins itself: content 1136px vs 1536px everywhere else · **major**
Runtime at 1600px viewport: `.system-manager` maxWidth 1200 + 32px own padding → 1136px
content, 26% narrower than siblings (1536px), plus doubled top padding (64px). The three
sibling pages carry explicit comments declining exactly this. **Fix:** delete the local
padding/max-width/margin.

### SC-9 — Settings cards render with zero padding and zero gap · **major**
Runtime: `.card` padding 0px, three cards exactly flush (`bottom 219.5 === next top 219.5`),
`.mb-3` computes to 0 (defined only inside StockDashboard's scoped block — SC-13). The most
visibly broken surface in the app, reachable from the nav. **Fix:** give global `.card` its
`--card-padding`; real `.mb-3` utility or explicit stack gap.

### SK-S-2 — Icon buttons below the 24px tap-target floor · **major** *(new, found by skeptic)*
`header-info-btn` 20×20 (×7 on stock-overview, ×1 detail), `inline-info-btn` 16×20 (×2) —
below WCAG 2.2 §2.5.8's 24×24 minimum; sources `TechnicalIndicators.vue:732`,
`StockDetail.vue:1385`, `MFIVolumeProfilePanel.vue:892` (which also applies a
`header-info-btn` class it never defines). **Fix:** 24px minimum hit area on the shared
info-button pattern.

### SC-2 / SC-6 / SK-S-3 / SK-S-4 / SC-11..14 — verified detail findings
- **SC-2 major** `.btn-secondary` = bordered chip (global; StockOverview/StockDetail) vs
  borderless chip (MarketDashboard override) vs solid grey+white (AutoUpdateMonitor) — one
  name, three renderings.
- **SC-6 minor** *(downgraded — same 29px box as siblings; colour-only)*: `btn-info` used at
  `AutoUpdateMonitor.vue:146`, defined nowhere → UA buttonface grey among coloured siblings.
- **SK-S-3 minor** *(new)*: floating ⚙️ emoji button duplicated verbatim in `CisdWidget:437-450`
  + `TrendlinesSRWidget:484-497`; its `rgba(255,255,255,.1)` fill composites to invisible on
  the light theme. Emoji-as-icon is NOT confined to system pages.
- **SK-S-4 minor** *(new)*: `TOCTree.vue` tree/symbol nodes = 21 more 34px buttons,
  uninventoried by the lens.
- **SC-11 minor**: modal footer Cancel ~35px vs Save ~33px (border asymmetry) + a third
  height (41px tabs) inside one 400px modal (source-verified; modal not runtime-opened).
- **SC-12 minor**: `.detail-btn` (incl. its @media shrink) is dead CSS; the real back button
  `.btn-renaissance` consequently has no mobile shrink on StockDetail (StockCard's does).
  Extension: `FundamentalAnalysis.vue:888-897`'s `.btn` block is likewise dead (usage
  commented out).
- **SC-13 minor**: scoped utilities (`.mb-3`, `.text-muted`) in StockDashboard can never
  reach their targets; `.mb-3` has no global definition → inert on 2 pages.
- **SC-14 minor**: live token bypasses — `SystemManager.vue:158-159` returns `'gray'` /
  `'#28a745'`/`'#dc3545'` (tokens exist verbatim; **the `'gray'` keyword is still live**,
  correcting the lens's round-1 note), `:418 #000` → `--signal-ink`, `TIM:443 #545b62`
  untokened, StockDetail inline `margin-left:8px` + ~5 raw-px, `style.css:273`
  `transition: all .2s`. Sanctioned always-dark terminal hexes stay.

### REFUTED
- ~~SC-10 nav `<a>` 40px vs Tools `<button>` 36px~~ — **refuted by measurement**: both
  render exactly 36.00px (the `<a>` is inline; line-height doesn't grow its border box).
  Residual observation (different, unfiled): the pill paints 12px taller than its 24px line
  box — cosmetic only.

## 3. Copy / AI-slop lens (CP) — skeptic-verified

*Skeptic result: 11 CONFIRMED, 9 ADJUSTED, 0 fully refuted; every "clean" claim survived
attack (zero hype adjectives, zero exclamation marks, 777/777 key parity, no hardcoded
strings in route pages, no 簡體 character-level leakage, register 您-consistent). Severities
below are post-skeptic.*

### CP-1 — Every quant signal and commentary the pipeline currently produces renders in English on the 繁中 UI · **critical**
`dashboard_status.json` (560 rows) emits only `WAIT`(479)/`NO_DATA`(76)/`NO_TRADE`(5) with
commentary "Sector Weakness (Peer Down)"/"Insufficient Data"/"Sector Avoidance" — none
covered by the translation switches (`SignalCard.vue:52-56`, `QuantDashboard.vue:91-98`),
and `ReviewCometChart.vue:81` returns raw payload prose whenever it exceeds 5 chars, making
the i18n fallbacks dead. The badge and verdict — the two elements that matter — are the only
English on a localized card. **Fix (corrected by skeptic):** the payload's `reason` field is
byte-identical prose, *not* a code — so either map the three known strings client-side to
i18n keys with a raw-string fallback, or (better) emit a real `reason_code` from
`scripts/production/daily_update.py` and map that.

### SK-C-1 — Sector/industry group headings render raw English payload values on the zh UI · **major** *(new, found by skeptic)*
`StockOverview.vue:67` renders `{{ sector }}` ("Technology", "Consumer Cyclical", …,
`'Unknown'` literal at `:229`) as the `<h4>` group headings of the app's highest-traffic
listing; `StockCard.vue:188-207` same for card-level sector/industry. Same class as CP-1:
payload values used as display strings. **Fix:** localization map for the finite sector set
(config/stocks.json vocabulary) + 未知 for Unknown.

### CP-2 — `techIndicators.*` + `autoUpdate.*` translated in mainland register, contradicted by the same file · **major**
緩存×12 vs 快取×8 (both in one card: 每日緩存 title over 記憶體快取 row), 刷新 vs 重新整理,
元數據 vs 中繼資料(:805), 保存配置 vs 儲存(:841), 調度器×6 (while `:818` already says
資料排程), 運行/本地/回退 vs 執行/本機/備援, 數據×11 vs 資料×55. GLOSSARY §A 三層快取 is
in-repo authority for 快取. Plus translationese: 數據年齡 ("age" for data), 活動任務 calque.
**Fix:** register sweep of the two namespaces per the table in the fix PR; add the missing
ops rows to GLOSSARY.md.

### CP-4 — Quant vocabulary: zero GLOSSARY terms actually appear in zh-TW.json · **major** *(strengthened by skeptic)*
發射台狀態/量化動勢狀態/市場型態/資金流量成交量輪廓/超級投資人/彗星圖: **0 occurrences**
each; the UI uses 2-3 competing coinages per term (起漲點 vs 發射台; 回檔買點 vs 回檔買進 vs
回檔承接; 量化動能狀態 vs 量化動勢狀態; 市場狀態 vs 市場型態) — the legend and the badge it
explains disagree. I18N_HOWTO §5 mandates glossary terms. Subsumes CP-5 ("Elite Funds"/頂尖基金
for Super Investors — hype rename, demoted to a sub-item). **Fix:** align to GLOSSARY (updating
its Climax row to 動能高潮 in the same PR per its own maintenance rule).

### CP-3 — One destination, three names; 控制面板 doubles as a section heading elsewhere · **major**
Control Panel/控制面板 (nav) → `/system-manager` → System Status/系統狀態 (page) → System
Manager/系統管理 (`quant.emptyHintLink`); `techIndicators.controls` zh = 控制面板 renders as a
section head on the *other* tools page. **Fix:** canonical 系統狀態 everywhere (naming map in
WIREFRAMES §6); rename the section to 操作.

### CP-6 — 產業 labels both taxonomy levels (sector and industry) · **major**
sector rendered as 產業類別/產業/類股 depending on key; industry as 行業/產業 — while the
listing nests industry *inside* sector, so a zh reader cannot tell levels apart. **Fix:**
sector=類股, industry=產業 (TW brokerage convention; `kineticChart.*` already complies).

### CP-7 — 「即時分析」 claimed for a once-daily batch, contradicted four keys later · **major**
`quant.subtitle` says Live analysis/即時分析; `quant.emptyHintBefore` on the same page says
signals come from the 02:00 UTC daily run (cron verified). On a finance surface, "live" is a
recency claim a reader may act on. **Fix:** 每日分析 / Daily analysis.

### CP-8 — Raw English payload values under 繁中 labels (holdings/insider/super-investor tables) · **major**
`transaction_type` (Buy/Sale) interpolated into 「{type}，價格 ${price}」; SEC `relationship`
titles under 關係; Dataroma `recent_activity` (Buy/Add 12.5%/Reduce) under 近期動向.
**Fix:** finite-vocabulary maps with raw fallback (buy 買進 / sale 賣出 / add 加碼 / reduce
減碼 / hold 持有; CEO 執行長 / CFO 財務長 / Director 董事…).

### CP-9 — Literal `'N/A'` ×5 in the largest indicator panel; sibling panel says 無資料 · **major** *(= round-1 S5)*
`TechnicalIndicators.vue:229/230/455/474/483` vs `TechnicalSignals.vue:74`; `common.na`
exists and is used correctly elsewhere. Six duplicate `notAvailable` keys to consolidate.
**Fix:** `$t('common.na')` at the five sites; retire the duplicates.

### CP-10 — Same-concept drift, incl. one true mistranslation · **major for the 市值 item, rest minor**
市場指數 vs 大盤指數 (same EN "Market Index"); 個股總覽 vs 股票總覽 (nav vs breadcrumb/back);
MFI 量能分佈 vs MFI 成交量分佈; and `superInvestor.ownership.colValue` EN "Value" → **市值**
(= market cap — a mistranslation for position value; `holdings.value` renders the same concept
as 金額). **Fix:** naming map + 持股市值→持股價值/金額 correction.

### CP-11 — Fabricated data-source attribution on the Fear & Greed gauge · **major** *(upgraded)*
「資料來源：市場數據分析」/"Source: Market Data Analytics" — not an organization; the real
source is CNN (fetched from `production.dataviz.cnn.io` by `update_sentiment.py:16`; the
seven sub-indices are CNN's methodology verbatim). Fabricated provenance on the widget whose
credibility *is* provenance. **Fix:** 資料來源：CNN 恐懼與貪婪指數.

### CP-16 — No risk/"not investment advice" notice anywhere · **major** *(upgraded)*
Broadened grep (免責/聲明/僅供參考/informational/not financial advice/…) = 0 hits across
src/, index.html, READMEs, PRD — while the UI renders 買進/賣出/強力買進 badges and quant
verdicts. The single most standard piece of finance-UI copy, absent. **Fix:** footer
disclaimer both locales (「本網站內容僅供參考，不構成投資建議。」).

### CP-13 — zh renders neutral EN as directives (3 of 4 claims survive) · **minor**
不宜進場 for "favour staying out" (prohibition vs preference), 起漲點 for opaque "LAUNCHPAD"
(asserts a rise), 回檔買點 for "Pullback opportunity" (mild tightening). The
`analysisTrendMixed` 請… claim was **refuted** — EN is already imperative; 請 only adds
politeness. **Fix:** re-hedge the three: 傾向觀望 / 發射台 / 回檔機會.

### CP-12 — 59 orphaned locale keys (8%), incl. a dead block mislabeling a VIX gauge as the Fear & Greed Index · **minor** *(counts corrected)*
vixIndicator(11)/marketsOverview(14)/marketInsight(8)/marketIndices(10)/topStories(4)/tvVix(5)
+ 7 singles — zero references incl. dynamic-key patterns (independently re-verified).
**Fix:** delete symmetrically; if vixIndicator is kept for a future widget, correct its title first.

### CP-14 / CP-15 / SK-C-2 / SK-C-3 — nits
🚀🕒📈 as card icons on the ops page (→ FH-5 fix); `smartMoney.rangeShort` unspaced (possibly
deliberate compact variant — align or annotate); `FundamentalAnalysis.vue:142-143` hardcoded
"Yearly"/"Quarterly" buttons (untranslated on zh UI — fix with keys); `TradingStrategyWidget.vue:20`
hardcoded " by TradingView" while the sibling widget uses the i18n key.

### Round-1 copy items
S1 **PARTIAL** — the date-format guard covers pages/components only; one true leak remains
(`yahooFinanceApi.ts:1218` reportDate.fmt rendered under 申報日期; the `:1243` startDate.fmt
is computed but never rendered). S5 **OPEN** (= CP-9). S6 **OPEN** (= CP-1, wider). S7 **FIXED**.

## 4. System-design / IA lens (SD) — skeptic-verified

*Lens findings adversarially re-verified by an independent skeptic: 11 CONFIRMED, 2 ADJUSTED,
0 refuted; the skeptic also attempted to overturn the three round-1 FIXED verdicts (I1, I2,
N2) and failed — all three stand on line-exact evidence. Line cites below are current as of
`88311ce30`.*

### SD-1 — Freshness thresholds contradict the documented SLO; the same feed grades green and red simultaneously · **major**
`AutoUpdateMonitor.vue:347-357` grades the TI feed red (`status-error`) from ≥12 h while
`SystemManager.vue:150-156` grades the *identical file and field* (`latest_index.json →
generatedAt`) fresh to <25 h; the documented SLO is <26 h (`SLA.md:29`, ADR-0001 ~24 h
cadence). With a 02:00 UTC daily run the monitor card is red 50% and non-green ~96% of every
normal day. **Fix:** one shared freshness helper derived from the 26 h SLO, consumed by both pages.

### SD-2 — "Next update" timestamps are fabricated (`now + interval`, re-slides every 30 s poll) · **major**
`autoUpdateScheduler.ts:421-428` returns `new Date(now + interval)` ×3; `scheduleUpdates()`
(`:127-157`) records no arm timestamp; the 30 s poll (`AutoUpdateMonitor.vue:527-534`)
re-renders it forever-sliding. **Fix:** record `armedAt`, render `armedAt + interval`, or drop the fields.

### SD-3 — Maintenance buttons log SUCCESS for no work — three of them, not one · **major** *(scope widened by skeptic, SK-D-2)*
`performCacheCleanup()` (`autoUpdateScheduler.ts:368-386`) contains no eviction path at all —
`performanceCache` has no cleanup/prune method; the body reads stats twice and logs "✅
completed" (self-admitting comment `:376`). `triggerUpdate()` (`AutoUpdateMonitor.vue:507-525`)
then logs level=SUCCESS for *any* non-throwing type — which also covers `technicalIndicators`
(no-op on the unchanged-version path + 5 s throttle, `dataVersionService.ts:82-85`) and
`metadata`. The log pane can only ever say SUCCESS (`:520-521` unreachable). **Fix:** report
what actually happened per action; never SUCCESS for a no-op.

### SD-4 — The Configuration panel is write-only; one field has no implementation · **major**
`saveConfig` writes `localStorage['autoUpdateConfig']` (`AutoUpdateMonitor.vue:562`) — the
repo's only reference; the scheduler never reads localStorage. Panel default `intervalHours: 1`
contradicts the real 24 h (`autoUpdateScheduler.ts:41`); the input's `max="24"` can't even
express the live value except as its extreme. `marketHoursOnly` has zero consumers. **Fix:**
wire it into the scheduler (+hydrate on mount) or delete the panel.

### SD-5 — Three same-named cache controls, three behaviours — and the common path clears nothing while confirming success · **major**
"Clear cache" (AutoUpdateMonitor) runs a throttled version *check* that clears only on a
version change (`autoUpdateScheduler.ts:160-177`, `dataVersionService.ts:82-85,129-133`);
"Clear all caches" (TechnicalIndicatorsManager `:228-244`) clears two caches; "Clear Cache"
(SystemManager `:253-268`) clears the same two *then reloads*. On every ordinary click the
first button clears nothing and still logs SUCCESS. **Fix:** one cache surface, verbs that
state blast radius (見 WIREFRAMES §2/§4), dedupe the rest.

### SD-6 — The nav advertises a Settings page that contains no controls · **major**
`Settings.vue:6-22`: three cards of heading + promise-copy + TODO comment (7.1/7.2/7.3);
zero interactive elements; last functional change: never (verified via git log). The N1 fix
(PR #116) made it discoverable (`Layout.vue:44`), so the privacy card now promises a choice
it cannot make. **Fix:** implement or mark 規劃中 / remove from nav (US-SET1).

### SD-7 — Cache Warm-up card: hardcoded 24-symbol list; service never started; red by construction · **major**
`cacheWarmupService.ts:82-86` hardcodes 24 tickers (real universe: 138) rendered as "Tracked
symbols" (`AutoUpdateMonitor.vue:138`); the only `cacheWarmupService.start()` in the repo is
the commented-out `main.ts:73`, so `lastWarmupTime` stays null and the card shows
`notWarmed`/red until the manual button is pressed. **Fix:** source the list from config;
present the service as 手動/未啟用, not as an error.

### SD-8 — The landing route pads every visit with a hardcoded 800 ms fake load that defers widget mounting · **major**
`MarketDashboard.vue:167-169`: `// 模擬初始化過程` + `await setTimeout(800)` — the method's
only await, so the catch/error/retry UI (`:15-18`) is dead (and `refresh()` `:175-180` is
unreachable dead code — SK-D-3). All widgets live inside the `v-else`, so the delay defers
mounting and burns ~32% of the 2.5 s TTI SLO (`SLA.md:31`) on the default route. **Fix:**
delete the timeout; gate on real readiness or drop page-level loading.

### SD-9 — "Total size" is ~2× an entry count rendered as a size, thresholded as MB · **minor** *(adjusted)*
`performanceCache.ts:137-155` counts memory + localStorage entries (each live entry counts
twice per `set()` `:52,:56`); rendered raw under "Total size" (`AutoUpdateMonitor.vue:173-174`)
with `>100/>50` grades. **Fix:** rename to 快取項目數 and drop or re-base the derived status.

### SD-10 — Two competing scheduler bootstraps with contradictory environment gates · **minor**
`main.ts:64-67` (unconditional, 10 s) + module self-start (`autoUpdateScheduler.ts:460-465`,
30 s, `hostname !== 'localhost'`, defeated by 127.0.0.1). A Stop within the first 30 s is
silently restarted. **Fix:** delete the module self-start; single bootstrap in main.ts with
the env check.

### SD-11 — Dead scheduled no-op + never-started service dragged into the entry chunk · **minor**
`main.ts:71-74` live `setTimeout` with comment-only body; `main.ts:18` side-effect import
pulls `hybridTechnicalIndicatorsApi`→`yahooFinanceApi`+caches into the entry bundle against
the file's own lazy-chunk goal (ADR-0007 budget 160 KB vs 139 KB actual). **Fix:** delete both.

### SD-12 — Tools toggle claims a menu it doesn't implement · **minor** *(half refuted by skeptic)*
`Layout.vue:27-28` `aria-haspopup` + `aria-controls` on a plain link list (no `role="menu"`,
no arrow keys). The lens's claim that collapsed links stay tab-focusable was **false** —
`v-show`'s `display:none` removes them from tab order. Remaining defect is the ARIA-promise
mismatch only. **Fix:** drop `aria-haspopup` (disclosure semantics) or complete the menu pattern.

### SD-13 — Nav label / route / page title disagree; the one computed status field is never rendered · **minor**
"Control Panel" (`Layout.vue:35`) → `/system-manager` → "System Status" (`SystemManager.vue:4`).
`pipelineStatus.status` (`'Active'`/`'Unreachable'`) is written (`:201,:206`) and never read —
the unreachable-index signal exists and is discarded. **Fix:** one name (系統狀態); render the field.

### SD-14 — Two independent resolvers for the data base URL · **minor**
`baseUrl.ts:33-47` vs `lib/fetcher.ts:410-415` (+ latent: fetcher omits the `|| '/'`
fallback). Not currently divergent; pure drift hazard on the ADR-0008 boundary. **Fix:**
fetcher consumes `withDataBase()`.

### SK-D-1 — Five mutually incompatible cache-busting conventions on one static lake · **major** *(new, found by skeptic)*
ADR-0006 (`:36`) decides hourly bucketing; in practice: `?v=` version-driven
(`baseUrl.ts:59-83`, `dataVersionService.ts`), hourly (only `ohlcvApi.ts:135-146`),
minute-level (`precomputedIndicatorsApi.ts:176,415`, `yahooFinanceApi.ts:1420`),
**per-millisecond** (`SystemManager.vue:186`, `yahooFinanceApi.ts:730,991`,
`StockDetail.vue:641`, `stocksConfigService.ts:63`, `ZeiiermanFearGreedGauge.vue:255` — the
last two on the landing route, defeating CDN + browser cache against the TTI SLO), and
**none** (`AutoUpdateMonitor.vue:424,449`). `latest_index.json` alone is fetched under three
policies — so sibling Tools pages can report different ages for the same file at the same
moment, compounding SD-1. **Fix:** one busting helper implementing the ADR-0006 policy,
consumed everywhere.

## 5. Skeptic pass — verification verdicts

Three independent skeptics, one per lens, instructed to *refute*; rendered-output claims
checked against the running app rather than source reasoning.

| Lens | Confirmed | Adjusted | Refuted | New findings by skeptic |
|---|---|---|---|---|
| Style (SC) | 12 | 4 (SC-1 roster/heights, SC-6 ↓minor, SC-7 ↓boundary, SC-11 numbers) | **1 (SC-10 withdrawn)** | SK-S-1 retry-btn ×10 · SK-S-2 tap targets · SK-S-3 floating ⚙️ · SK-S-4 TOCTree |
| Copy (CP) | 11 | 9 (CP-1 fix premise, CP-4 ↑, CP-5 ↓fold, CP-10 市值 ↑, CP-11 ↑, CP-12 counts→59, CP-13 1-of-4 refuted, CP-15 ↓nit, CP-16 ↑) | 0 full | SK-C-1 EN sector headings · SK-C-2 Yearly/Quarterly · SK-C-3 attribution nit |
| System (SD) | 11 | 2 (SD-9 ~2× count, SD-12 focus-claim half false) | 0 | SK-D-1 cache-busting ×5 · SK-D-2 SUCCESS ×3 buttons · SK-D-3 dead refresh |

Notable skeptic catches beyond the tables: the CJK-strut explanation for every height
number; `document.fonts.check()` false-positive (evidence method rejected, width probes
used instead); `'gray'` still live (correcting this round's own style lens); CP-1's
proposed fix depending on a `reason` field that turns out to be duplicate prose, not a
code. Round-1 overturn attempts (I1, I2, N2, V1, V6, R1): **0 of 6 succeeded** — the
round-1 statuses stand.

## 6. Ranked fix plan (impact ÷ effort, best first)

| # | Fix package | Findings closed | Effort |
|---|---|---|---|
| 1 | **zh-TW register & naming sweep** — locale JSONs only: 緩存→快取 family, glossary quant terms, one-name-per-destination, 市值 mistranslation, CNN attribution, 即時→每日, de-directive 3 strings, spacing nit; + add missing GLOSSARY ops rows; + terminology guard test (features/terminology.feature) | CP-2 3 4(+5) 6 7 10 11 13 15, FH-3 4 7 | Low (strings) |
| 2 | **Payload-value localization maps** — signal/commentary map (3 known strings + fallback), sector/industry map, tx/activity/relationship maps, `common.na` consolidation, Yearly/Quarterly keys, disclaimer in footer | CP-1 8 9 16, SK-C-1 2, S5 S6 | Low-Med |
| 3 | **Button & typography base** — `button{font:inherit}` reset, one `.btn` spec (36px / `.btn-sm` 30px, brand fills), delete 4 page-local `.btn` blocks + `.control-btn`, define/replace `btn-info`, shared error-state component absorbing the 10 `.retry-btn` copies, ≥24px info buttons, kill dead `.detail-btn`/FundamentalAnalysis blocks | SC-1 2 3 5 6 12, SK-S-1 2, V4-residue, FH-2 6 | Med |
| 4 | **Surface & header unification** — `.card` padding + one radius/shadow, Settings padding, SystemManager container fix, two-tier `.page-title`, h3→h2, real `.mb-3`, emoji→SVG/none | SC-4 7 8 9 13, FH-1 5, CP-14, V2 V6, SK-S-3 | Med |
| 5 | **Ops honesty quick wins** — delete 800 ms fake load + dead refresh, single scheduler bootstrap, remove dead warmup import/timeout, shared SLO freshness helper, `armedAt`-based next-run, per-action log honesty (no SUCCESS for no-ops), render `pipelineStatus.status`, 24→config-driven warmup list or 手動 label, rename "Total size" | SD-1 2 3 8 9 10 11 13, SK-D-2 3, FH-9 10 | Med |
| 6 | **Owner decisions needed** (each reversible, flagged not assumed): Settings implement-vs-remove (SD-6/US-SET1) · config panel wire-vs-delete (SD-4) · cache-busting policy unification (SK-D-1, ADR-0006 amendment) · GenericSettingsModal adoption for admin confirms (I5) · ARIA tabs + `th scope` (S3/S4) · StockDetail loading/error wiring (I4) · per-action loading flags (I7) · unknown-state cards (FH-8/I3/I8/US-SYS2) | SD-4 5 6 7 14, I3 4 5 7 8, S3 4, SK-D-1 | Med-High |

Packages 1–5 are executed in this audit cycle (fix segments with before/after screenshots +
re-verification); package 6 items are specced in the PM docs and left as explicit owner
choices.
