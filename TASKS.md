## T0 - 基礎整理
- [x] 確認 StockDetail.vue 版面：加入 MFI Volume Profile 區塊（不疊在 TradingView 上）

## T1 - OHLCV 本地資料管線（Production 最穩）
- [ ] GitHub Actions：每日拉取 universe symbols 的 OHLCV（例如 1Y 日線）
- [ ] 輸出到 repo：/public/data/ohlcv/{symbol}.json
- [ ] JSON schema（建議）：
  - timestamps: number[]（秒）
  - open/high/low/close/volume: number[]

## T2 - 前端資料存取
- [ ] 新增 ohlcvApi.js：優先 fetch 本地 /data/ohlcv/{symbol}.json
- [ ] 快取策略：memory cache keyed by (symbol)
- [ ] DEV fallback（可選）：
  - 若本地不存在且 DEV：呼叫 yahooFinanceApi（注意：GET 不加 Content-Type）

## T3 - 修正 yahooFinanceApi.js（止血）
- [x] 移除 GET fetch 的 Content-Type header，避免 CORS preflight（production 仍不依賴）
- [x] 若 proxy 失敗：回傳可讀錯誤，不 throw Uncaught

## T4 - 修正 precomputedOhlcvApi.js（止血）
- [x] symbol 不在 index：不得 throw，回傳 null/available:false
- [x] catch 區塊不得 rethrow 讓 UI 崩潰（改回傳 null + console.warn）

## T5 - 新增/重構 MFIVolumeProfilePanel.vue（核心）
- [ ] 計算 MFI series（mfiLen）
- [ ] 計算 Volume Profile bins（lookback, rowCount）
- [ ] 計算 POC / Value Area
- [ ] DOM render 50 rows bars + 標記線
- [ ] 切換 range/interval 時：slice + recompute（不 refetch）

## T6 - TradingView widget 強韌化
- [ ] LazyTradingViewWidget：載入後做 healthcheck（iframe 是否出現）
- [ ] 失敗顯示 fallback card + Retry + Open in TradingView
- [ ] beforeUnmount 清理 timer/observer，避免 setState after unmount

## T7 - QA / 驗收
- [ ] 開啟 AdBlock 測試：頁面不可崩潰，顯示 fallback
- [ ] 本地缺 symbol 測試：顯示「無資料」
- [ ] 切換 range 反覆測試：無 Uncaught、無 null 資料渲染錯誤