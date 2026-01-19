# System Requirements & Specifications

## 1. Functional Specifications

### 1.1 Market Dashboard (Home)
- **Objective**: Provide a macro view of the global market status.
- **Components**:
  - **Market Indices**: S&P 500, NASDAQ, DJI, VIX (Real-time via Widget).
  - **Fear & Greed Index**:
    - *Primary Source*: Pre-computed JSON (`public/data/technical-indicators/fear-greed.json`).
    - *Update Freq*: Daily.
  - **Sector Performance**: Heatmap visualization (Real-time).

### 1.2 Stock Detail Page
- **Route**: `#/stock/:symbol`
- **Layout Logic**:
  - **Header**: Static metadata (Sector, Industry, Market Cap) loaded from `src/api/` (Cached).
  - **Main Chart**: TradingView Advanced Real-time Chart (Widget).
  - **Analysis Panel**: Custom implementation using `lightweight-charts`.
    - *Data Source*: `public/data/ohlcv/{symbol}.json`.
    - *Indicators*: MFI, Volume Profile, RSI, MACD.
    - *Rendering targets*: < 100ms render time.

## 2. Data Strategy & Architecture

### 2.1 The "3-Tier" Data Fetching Strategy
To ensure 99.9% availability without a dynamic backend, the application uses a strict fallback hierarchy implemented in `YahooFinanceAPI.js`:

1.  **Tier 1: In-Memory / LocalStorage Cache**
    -   *TTL*: 5 minutes (Intraday), 24 hours (Metadata).
    -   *Mechanism*: Rapid retrieval to prevent network requests on page navigation.

2.  **Tier 2: Static JSON (The "Golden Source")**
    -   *Path*: `https://[domain]/data/[type]/[symbol].json`
    -   *Content*: OHLCV, Fundamentals, Pre-calc Indicators.
    -   *Reliability*: Extremely High (Served typically via CDN/GitHub Pages).

3.  **Tier 3: Live API Fallback (CORS Proxy)**
    -   *Triggers*: Only if Tier 2 returns 404/Empty or data is stale (>24h).
    -   *Proxies*: Rotational list (`corsproxy.io`, `cors-anywhere`) to mitigate rate limits.
    -   *Logic*: Request throttling (2 concurrent requests max) + Deduplication.

### 2.2 Pre-computation Logic
Certain complex indicators are too heavy to calculate client-side for hundreds of symbols or require scraping.
- **Engine**: Puppeteer (Headless Chrome) running in GitHub Actions.
- **Output**: JSON files stored in `public/data/`.
- **Why**: Avoids CORS issues completely for difficult data sources (e.g., CNN Fear & Greed).

## 3. Performance Requirements

### 3.1 Widget Performance
- **Lazy Loading**: `FastTradingViewWidget.vue` must use `IntersectionObserver`.
- **Prioritization**:
  - *Priority 1*: First screen charts (Load immediately).
  - *Priority 2*: Secondary charts (300ms delay).
  - *Priority 3*: Below-fold widgets (Load only when close to viewport).
- **Goal**: Maintain 60fps scrolling and Time to Interactive (TTI) < 1.5s.

### 3.2 Bundle Size
- **Strategy**: Route-based code splitting.
- **Target**: Initial chunk size < 500kb.

## 4. Technical Constraints
1.  **NO Backend Server**: The app must remain deployable on any static file host (S3, Pages, Netlify).
2.  **CORS Handling**: Production code must assume *NO* access to 3rd party APIs directly from the browser, unless proxied or JSONP-supported.
3.  **Mobile Responsiveness**: Layouts must collapse to single-column on screens < 768px.

## 5. Security & Maintenance
- **API Keys**: No secret keys should be exposed in the frontend bundle. Public keys only.
- **Data Integrity**: `validation.ts` schema checks must pass before rendering any external JSON data.
- **Rate Limiting**: Client must respect `YahooFinanceAPI`'s internal rate limiter (800ms delay between proxy calls).