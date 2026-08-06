# User Flows — Investment Dashboard

> **Scope**: The expected end-to-end paths through the product, as flow diagrams. Each flow
> names its Job Story anchor (PRD §2) and its failure branches — a flow that only shows the
> happy path is a wish, not a spec. Widget-level state transitions live in
> [STATE_MACHINES.md](STATE_MACHINES.md); per-surface stories in [USER_STORIES.md](USER_STORIES.md).

## F1 · Morning scan (Job #1, #4)

```mermaid
flowchart TD
    A[Open app] --> B[/ redirects to /market-overview/]
    B --> C{Data fresh?<br/>pipeline < 26 h}
    C -- yes --> D[Scan indices · VIX · regime · news]
    C -- stale --> D2[Same scan + staleness banner<br/>『資料可能過期 — 最後更新 {ts}』]
    D --> E[Switch to /stock-overview]
    D2 --> E
    E --> F[Scan sector groups for<br/>Launchpad / Climax / Dip-Buy badges]
    F --> G{Candidate found?}
    G -- yes --> H[Open /stock-overview/symbols/:sym]
    G -- no --> I[Done — no trade today]
```

**Failure branches**: any single widget unreachable → widget-scoped error card + 重試
(page stays interactive, PRD F6); *all* data unreachable → every widget in error state,
nav/theme/locale still work.

## F2 · Single-stock triage (Job #2, #3)

```mermaid
flowchart TD
    A[/symbols/:symbol/] --> B[Header: symbol · exchange · industry<br/>from metadata]
    B --> C[Tab 總覽與技術面:<br/>price chart + indicators + quant state]
    C --> D[Tab 持股與市場情緒:<br/>super investors + insider + MFI]
    D --> E[Tab 基本面分析]
    E --> F{Thesis supported?}
    F -- yes --> G[Share URL with partner<br/>Job #5 — same view, zero friction]
    F -- no --> H[Back to 個股總覽]
    B -. metadata fetch fails .-> B2[Explicit metadata-unavailable state<br/>no guessed exchange — US-D2]
```

## F3 · Operational health check (Job #6) — Operator-as-Maintainer

```mermaid
flowchart TD
    A[Suspicion: is my data current?] --> B[工具 ▾ → 系統狀態]
    B --> C{Pipeline card}
    C -- healthy --> D[Confirm run timestamp + coverage ≈ universe]
    C -- stale --> E[Open GitHub Actions run<br/>per RUNBOOK playbook]
    C -- unknown/fetch-failed --> F[Card says 無法取得狀態 + 重試<br/>never fabricated 過期/從未/0]
    D --> G{Deeper look needed?}
    G -- freshness per feed --> H[自動更新監控]
    G -- per-source cache --> I[技術指標管理]
    H & I --> J[Same freshness grade everywhere<br/>SLO < 26 h — US-AUM1]
```

**Contract**: all three Tools pages grade the same feed identically; every control's label
states its blast radius; SUCCESS log entries only for work actually performed.

## F4 · Add a symbol (Job #7)

```mermaid
flowchart TD
    A[Operator: track new ticker] --> B[gh workflow run add-symbol.yml<br/>or npm run add-symbol]
    B --> C[Validation via yahoo-finance2<br/>auto-fill exchange/sector/industry]
    C -- valid --> D[config/stocks.json committed<br/>ETL + deploy triggered]
    C -- invalid --> E[Workflow fails with reason<br/>nothing committed]
    D --> F[Next visit: symbol appears in<br/>個股總覽 under its sector]
```

## F5 · Locale & theme (F16)

```mermaid
flowchart TD
    A[Any route] --> B[Click EN/中 toggle]
    B --> C[Lazy-load other locale messages]
    C --> D[Every user-facing string, date and<br/>number re-renders in new locale — US-X2]
    A --> E[Click 🌙/☀️ toggle]
    E --> F[data-theme + .dark-mode flip<br/>persisted to localStorage]
    F --> G[All tokens theme-aware —<br/>no fixed-color foregrounds]
```

## F6 · Stale-data degradation (Job #6, PRD F6/F9)

```mermaid
flowchart TD
    A[Widget requests data] --> B{Tier 1<br/>memory/localStorage}
    B -- hit --> Z[Render ~instant]
    B -- miss --> C{Tier 2<br/>static JSON, data repo Pages}
    C -- 200 fresh --> Z
    C -- 200 stale --> Z2[Render + staleness flag]
    C -- 404/error --> D{Tier 3<br/>CORS proxy → Yahoo}
    D -- ok --> Z3[Render + 『即時資料』 indicator]
    D -- fail --> E[Widget-scoped error card + 重試<br/>rest of page unaffected]
```

**Invariant** (PRD Job #6): stale beats broken; broken is loud; nothing renders a
fabricated value.
