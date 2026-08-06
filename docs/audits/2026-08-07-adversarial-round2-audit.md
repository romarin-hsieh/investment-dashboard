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

*Status: lens results being merged — sections marked ⏳ fill in as verification completes.*

---

## Executive summary

⏳ (written after skeptic pass)

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

⏳ (lens merge: A1, V1–V6, R1 from the style lens; I1–I8, N1, N2, S2–S4 from the system lens;
S1, S5–S7 from the copy lens)

## 2. Style-consistency lens (SC)

⏳

## 3. Copy / AI-slop lens (CP)

⏳

## 4. System-design / IA lens (SD)

⏳

## 5. Skeptic pass — verification verdicts

⏳

## 6. Ranked fix plan

⏳
