# ADR-0005 — Four Charting Libraries (Plotly + TradingView Lightweight + TradingView Widget + Chart.js)

- **Status**: Accepted
- **Date**: 2024 (retrospective), 2026-04 formalisation
- **Deciders**: Project owner
- **Context tags**: `frontend`, `charting`, `performance`

## Context & Problem

The dashboard needs four visually and functionally distinct chart types:

1. **3D scatter** for the Quant Kinetic State (Comet Chart) — X/Y/Z with smooth GPU rendering
2. **Pro-grade candlestick with drawing tools** for stock-detail main chart
3. **Custom technical-analysis panels** (MFI volume profile, trendlines, S/R) with tight bundle cost
4. **Simple bar/line summaries** for fundamentals and sentiment history

No single library covers all four gracefully. Bundling one "do-it-all" library (e.g., Highcharts + extensions) would bloat the bundle beyond our performance budget and still fall short on 3D or TradingView-level drawing tools.

## Decision

We deliberately use **four charting libraries**, each chosen for a specific strength:

| Library | Used For | Why |
|---|---|---|
| **Plotly.js (WebGL)** | `ThreeDKineticChart` | Best-in-class 3D scatter with GPU rendering; no alternative delivers this at reasonable bundle cost |
| **TradingView Widgets (iframe)** | `FastTradingViewWidget` main chart | Reuses TV's mature drawing tools, studies, and user-familiar UI without licensing their charting library directly |
| **TradingView Lightweight Charts** | Custom technical panels (trendlines, MFI, etc.) | Canvas-based, very fast, ~35 KB gzipped; we own every pixel |
| **Chart.js + vue-chartjs** | Fundamentals bars, sentiment history | Low-effort for bespoke non-price visualizations; already widely known |

**Containment rules**:
- Each library is imported only in components that need it — no shared "charting abstraction" layer. Over-abstracting would recreate the "do-it-all" bloat we're avoiding.
- TradingView iframe widgets use a "Warm Boot" caching pattern (`FastTradingViewWidget.vue`) to avoid re-downloading the widget script between navigations.
- The 3D chart is P1 (critical-path) — Plotly is therefore bundled in the initial chunk. The other three are lazy-loaded (P2/P3) via dynamic `import()`.

## Consequences

**Positive**
- Each use-case gets the best available fit
- Total initial bundle stays within budget (~500 KB) because only Plotly is P1
- Teams/contributors can work on different chart areas without stepping on each other
- Easy to swap one library independently if a better option appears

**Negative / Trade-offs**
- Four API surfaces to learn
- No unified theming — each library has its own config style
- Bundle analyser shows visible duplication of utility code (e.g., d3-scale used by Plotly)
- Upgrade cadence is four-fold

**Neutral**
- Encourages component-level ownership of charting details — each widget encapsulates its library choice

## Alternatives Considered

- **Single library (ECharts / Highcharts)**: covers most needs but weak on 3D and lacks TradingView's drawing UX. Would still need TV widgets for the main chart.
- **D3 everywhere (custom rendering)**: maximum control, prohibitive implementation cost for a solo team.
- **AG Charts / Apex**: competitive general-purpose, but not compelling enough to force consolidation.

## Follow-ups

- Revisit if bundle duplication exceeds 15% of initial chunk
- Track charting library CVEs in dependency-update cadence
- Cross-reference: [architecture/OVERVIEW.md §7](../OVERVIEW.md#7-charting-stack)
