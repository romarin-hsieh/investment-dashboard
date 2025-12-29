## 目標
在單一股票 Symbol 的詳情頁中，同時呈現：
1) TradingView K 線（官方 embed widget）
2) 自繪的 MFI Volume Profile（不疊在 widget 上，而是同頁並列/上下排列）

## 核心原則（避免翻車）
- Production 不依賴免費 CORS proxy
- OHLCV 資料以站內 JSON 供應（GitHub Pages 同源載入）
- 所有第三方載入失敗（TradingView / analytics / dev proxy）必須 graceful fallback，不可讓整頁崩潰

## 功能需求

### R1. Stock Detail 頁（單一 symbol）
- 路由為 hash router（#/...）
- 同頁只顯示一檔 symbol
- 顯示：
  - TradingView Advanced Chart widget
  - MFI Volume Profile panel（自繪）

### R2. 資料來源策略
- Production：
  - 由 /data/ohlcv/{symbol}.json 讀取 OHLCV（約 60kb）
  - 前端計算 MFI(預設 14) + Volume Profile bins(預設 50) + lookback(預設 200)
- Dev / Debug（可選）：
  - 若本地 OHLCV 不存在，可嘗試用 Yahoo API 抓（經 CORS proxy）
  - 僅限 DEV 或 querystring debug 模式
  - GET request 不得送 Content-Type，避免 preflight

### R3. 互動
- 使用者可切換 time range / interval（例如 3M / 6M / 1Y 或 D / W）
- 切換後：
  - 若本地資料足夠：recompute（不重新 fetch）
  - 若本地資料不足：提示「資料範圍不足」或在 DEV 模式下嘗試遠端抓取

### R4. 錯誤/降級
- TradingView widget 載入失敗或被外掛阻擋：
  - 顯示可讀訊息 +「Open in TradingView」連結 + Retry
- OHLCV 讀取失敗：
  - 顯示訊息 + Retry
- precomputed 指標缺 symbol：
  - 不得 throw 造成整頁崩潰；顯示「未支援」或 fallback

## 非功能需求
- 首次進頁：MFI Volume Profile 計算 + render 期望在 100ms 內完成（一般桌機）
- 不得在 console 產生未捕捉例外（Uncaught）
- 不因任何第三方服務失敗影響主要內容（K 線與自繪 panel 兩者互不拖累）