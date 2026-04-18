# Glossary (EN / 繁體中文)

> **Scope**: Canonical vocabulary for the Kiro Investment Dashboard. When a term appears in any other doc — PRD, BUILD_SPEC, ADRs, specs — it MUST match the English key here. 繁中 column is the authorized translation for user-facing UI copy. Add new terms alphabetically within each section.

---

## A. Product & Architecture Terms

| English | 繁體中文 | Definition |
|---|---|---|
| **Static-First Architecture** | 靜態優先架構 | Serverless deployment model where all heavy computation runs during CI/CD and the frontend consumes only pre-computed JSON from a CDN. No runtime backend. |
| **Static Lake** | 靜態資料湖 | The body of pre-computed JSON files under `public/data/` that acts as the project's database. |
| **Golden Source** | 黃金資料源 | The authoritative version of a data point — for this project, the nightly-refreshed Static Lake JSON. |
| **3-Tier Cache** | 三層快取 | Memory → Static JSON (CDN) → Live API Proxy fallback hierarchy used by the frontend data layer. |
| **Quant Kinetic State** | 量化動勢狀態 | The proprietary 3D stock-state vector visualised in the "Comet Chart" (X=Trend, Y=Momentum, Z=Structure). |
| **Comet Chart** | 彗星圖 | Shorthand UI name for the 3D Kinetic State scatter visualization (see `ThreeDKineticChart.vue`). |
| **ETL Pipeline** | 資料擷取管線 | The nightly Python + Node.js chain that fetches, processes, and commits data into `public/data/`. |
| **Data Freshness** | 資料新鮮度 | Age of the most recent successful pipeline run. SLA target: <26 hours. |
| **CORS Proxy** | 跨域代理 | External HTTP relay used only when falling back to Tier 3 (live Yahoo Finance). Rotated list managed by `corsProxyManager.ts`. |

## B. Quant Strategy Terms

| English | 繁體中文 | Definition |
|---|---|---|
| **Launchpad** | 發射台狀態 | Classification: Z > 0.8 ∧ X > 0 (high volatility compression + positive trend). Potential breakout candidate. |
| **Climax** | 高潮狀態 | Classification: Y > 0.9 (extreme momentum). Potential exhaustion zone. |
| **Dip Buy** | 回檔承接 | Classification: X > 0 ∧ Y < 0.2 (intact uptrend + oversold momentum). |
| **McGinley Dynamic** | 麥金利動態均線 | Adaptive moving average used as the X-axis trend reference. |
| **Stochastic RSI (StochRSI)** | 隨機 RSI | Momentum oscillator used as the Y-axis energy reference. |
| **Volatility Squeeze** | 波動率壓縮 | Bollinger Bandwidth ÷ Keltner Channel ratio; drives the Z-axis structure score. |
| **MFI Volume Profile** | 資金流量成交量輪廓 | Proprietary histogram separating Retail vs. Smart Money volume by price level. |
| **Market Regime** | 市場型態 | Macro classification (e.g., "Volatile Uptrend", "Bear Risk-Off"). Derived from SPY vs. 200-day MA. |
| **Sector Regime** | 板塊型態 | Per-sector trend classification from sector ETF vs. 20-day MA. |

## C. Data & Integration Terms

| English | 繁體中文 | Definition |
|---|---|---|
| **OHLCV** | 開高低收量 | Open / High / Low / Close / Volume — the base price time series. |
| **Symbol Universe** | 追蹤標的清單 | Master list of tracked tickers, defined in `public/config/stocks.json`. |
| **Smart Money** | 聰明錢 | Institutional capital flows tracked via Dataroma (Super Investor 13F filings). |
| **Super Investors** | 超級投資人 | The curated Dataroma list (Buffett, Ackman, etc.) whose holdings are scraped. |
| **Insider Sentiment** | 內部人情緒 | Aggregated C-Suite buy/sell activity per symbol. |
| **Fear & Greed Index** | 恐懼與貪婪指數 | CNN daily sentiment score, scraped by `precompute-with-browser.js` (Puppeteer). |
| **Dataroma** | Dataroma | Third-party aggregator of 13F institutional holdings. Source for Smart Money features. |

## D. Operations & Engineering Terms

| English | 繁體中文 | Definition |
|---|---|---|
| **SLO (Service Level Objective)** | 服務水準目標 | Internal numeric target for a system property (e.g., ETL success rate ≥95%). |
| **SLA (Service Level Agreement)** | 服務水準協議 | Externalized commitment derived from SLOs. Captured in `docs/operations/SLA.md`. |
| **Error Budget** | 錯誤預算 | 1 − SLO target; the tolerated amount of failure within a period. |
| **Runbook** | 維運手冊 | Step-by-step playbook for operational incidents. See `docs/operations/RUNBOOK.md`. |
| **ADR (Architecture Decision Record)** | 架構決策記錄 | One-page record of an architectural choice (context → decision → consequences). |
| **MoSCoW** | MoSCoW 優先順序 | Must / Should / Could / Won't prioritization framework used in the PRD feature inventory. |
| **Job Story** | 任務故事 | "When [context], I want [capability], so I can [outcome]." Preferred over personas for solo-operator tools. |
| **Pre-computation** | 預先計算 | Moving expensive work from runtime (user request) to build-time (CI/CD). |
| **Warm Boot (Widget)** | 暖啟動（元件） | Technique in `FastTradingViewWidget.vue` that caches widget scripts to bypass re-download on nav. |

## E. Project Nicknames & Codenames

| English | 繁體中文 | Definition |
|---|---|---|
| **Kiro Investment Dashboard** | Kiro 投資儀表板 | Canonical product name. |
| **v2.5 Quant Edition** | v2.5 量化版 | Current production release tag. |
| **Bloomberg Terminal for the Static Web** | 靜態網頁版彭博終端機 | Aspirational tagline used in PROJECT_SCOPE. |

---

**Maintenance rule**: When introducing a new concept in any other doc, add a row here in the same PR. If a concept lacks an agreed 繁中 translation, write the EN name in the 繁中 column and mark it with `⚠️ 待定` (pending).
