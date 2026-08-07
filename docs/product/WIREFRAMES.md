# Wireframes & UI Grammar — Investment Dashboard

> **Scope**: Low-fi wireframes per route plus the shared UI grammar (page header, buttons,
> cards, status vocabulary). This is the **normative** reference the 2026-08 consistency
> fixes implement toward; before it existed, every page invented its own grammar (audit
> FH-1/SC-1/SC-4/SC-7). Tokens live in `src/styles/tokens.css` + `src/style.css`
> (ADR-0010); this doc says which token *combination* each pattern uses.

## 0. Shell (all routes)

```
┌────────────────────────────────────────────────────────────────────┐
│ Investment Dashboard        市場總覽  個股總覽  工具▾   ☾  EN      │  ← topbar 64px
├────────────────────────────────────────────────────────────────────┤
│                    .container  max-width 1600 · pad 0 32px         │
│                    (route content — no page re-margins)            │
├────────────────────────────────────────────────────────────────────┤
│  © {year} Investment Dashboard · 市場資料由 TradingView 提供        │
│  本網站內容僅供參考，不構成投資建議。                                │  ← footer + disclaimer
└────────────────────────────────────────────────────────────────────┘
```

- Nav pills: 40px box for `<a>` AND `<button>` alike (shared line-height — audit SC-10).
- No route sets its own horizontal gutter or max-width (audit SC-8).

## 1. Page-header grammar — two tiers

**Tier D (display)** — the two analytical landing pages (market-overview, stock-overview):

```
資料日期 2026年8月7日            ← eyebrow, --text-xs uppercase muted (optional)
市場總覽                         ← h2.page-title--display, --text-3xl/40 extrabold
全球市場指數、波動率指標與熱門市場新聞   ← subtitle, --text-md muted
────────────────────────────────  ← brand hairline rule
```

**Tier S (standard)** — all Tools pages + settings + detail headers:

```
系統狀態                          ← h2.page-title, --text-2xl/32 bold, LEFT-aligned
部署與資料管線監控                 ← subtitle, --text-md muted
```

Rules: always `h2`, always left-aligned (no centered mastheads — audit FH-1), page title
is the only `--text-2xl+` element on the page; StockDetail's symbol header stays its own
compact pattern but promotes the symbol to `h2` (audit SC-7).

## 2. Button grammar — one system, two sizes

| Variant | Fill / border | Use |
|---|---|---|
| `.btn.btn-primary` | `--primary-strong` fill, white text | the route's main action |
| `.btn.btn-secondary` | `--bg-secondary` + 1px `--border-color` | neutral actions |
| `.btn.btn-danger / -warning / -success` | semantic solids (+`--signal-ink` on light fills) | genuinely destructive / caution / go |
| `.btn.btn-sm` | any of the above | dense card/toolbars |

Geometry (all variants): `font: inherit` + `font-size: var(--text-base)` (13 for `.btn-sm`),
`min-height: 36px` (30px for `.btn-sm`), padding `--space-2 --space-4` (`--space-1
--space-3` for sm), radius `--radius-sm`, border-box so bordered and borderless variants
land the same height (audit SC-11). **No page-local `.btn`/`.control-btn` overrides. No
Bootstrap blues (`--blue-*`) as button fills (audit SC-5). No undefined variants (audit
SC-6).** Icon-only controls (theme/lang, 36px circles) are the sanctioned exception.

```
┌──────────────┐ ┌──────────────┐ ┌────────────┐    ┌─────────┐
│ 重新整理狀態  │ │ 清除快取並重載 │ │  測試預計算 │    │ 手動更新 │ .btn-sm
└──────────────┘ └──────────────┘ └────────────┘    └─────────┘
   36px primary      36px warning      36px secondary    30px
```

## 3. Card grammar

One surface: `--bg-card` + `--radius-md` (12) + `--shadow-md` + 1px `--border-color`,
padding `--card-padding` (24) for page-level cards, `--widget-padding` (16) for widget
interiors (audit SC-4/SC-9/V2). Status accents = 4px left border in the semantic solid,
never a different radius/shadow per page. Emoji are not icons (audit FH-5/CP-14).

## 4. Status & error vocabulary (all widgets/cards)

| State | Visual | Copy (zh / en) |
|---|---|---|
| Loading | skeleton | — |
| Success | normal render | — |
| Stale | normal render + amber flag | 資料可能過期 — 最後更新 {ts} / Data may be stale |
| Error | shared error card | 載入失敗 + 重試 / Failed to load + Retry |
| Unknown | shared unknown card | 無法取得狀態 + 重試 / Status unavailable |

One error component, one vocabulary (audit FH-6); a failed fetch renders **Unknown**,
never fabricated values (audit FH-8); pills: 正常 / 過期 / 未知 / 錯誤 from semantic tokens.

## 5. Route wireframes (target state)

### /market-overview (Tier D)
```
[eyebrow 資料日期] [title 市場總覽] [subtitle] [rule]
┌ 市場指數 ────────────────────────────────┐
│ [index chips / error-card w/ 重試]        │
└──────────────────────────────────────────┘
┌ 恐懼與貪婪 ┐ ┌ VIX ┐ ┌ 市場型態 ┐        ← widget grid, shared card grammar
┌ 頭條新聞 ───────────────────────────────┐
```

### /stock-overview (Tier D)
```
[title 個股總覽] [subtitle] [rule]
┌ 快速導覽 sidebar ┐ ┌ 市場指數 strip ────────────┐
│ [search 搜尋…]   │ │ 類股 ▸ 產業 ▸ cards grid   │
│ [TOC tree]       │ │ [StockCard …] [StockCard …] │
└──────────────────┘ └────────────────────────────┘
```

### /stock-overview/symbols/:symbol
```
[breadcrumb 個股總覽 › AAPL 分析]
┌ header card: AAPL↗ · NASDAQ · 產業 · [返回個股總覽 .btn-secondary] ┐
[tabs 總覽與技術面 | 持股與市場情緒 | 基本面分析]  ← ARIA tabs (audit S3)
┌ 價格走勢圖 ┐ ┌ 技術分析 ┐  … widgets, shared card+error grammar
```

### /settings (Tier S)
```
[title 設定] [subtitle]
┌ 隱私與追蹤 ── controls or 「規劃中」 ┐   ← no empty promise cards (audit SD-6)
┌ 匯入與匯出 ── controls or 「規劃中」 ┐
```

### /system-manager (Tier S) · /auto-update-monitor (Tier S) · /technical-manager (Tier S)
```
[title 系統狀態] [subtitle 部署與資料管線監控]        [重新整理狀態 .btn-secondary]
┌ 管線狀態 pill 正常 ┐ ┌ 上次資料更新 {ts} ┐ ┌ 標的涵蓋 140 ┐   ← status cards, no emoji
┌ 資料管線資訊 …  [清除快取並重新載入 .btn-warning] ┐ ┌ 系統紀錄 (terminal) ┐
```
All three Tools pages share: Tier-S header, standard cards, standard buttons, glossary
vocabulary (快取/資料/中繼資料/重新整理/排程器), identical freshness grading (SLO 26 h).

## 6. Naming map (one name per destination)

| Route | zh | en |
|---|---|---|
| /market-overview | 市場總覽 | Market Overview |
| /stock-overview | 個股總覽 (nav = breadcrumb = back-button) | Stock Overview |
| /system-manager | 系統狀態 | System Status |
| /auto-update-monitor | 自動更新監控 | Auto-Update Monitor |
| /technical-manager | 技術指標管理 | Technical Indicators Manager |
| /settings | 設定 | Settings |
| indices widget (everywhere) | 市場指數 | Market Index |
