## 為什麼不疊在 TradingView widget 上
- TradingView embed 多為 iframe / 封裝環境，無法可靠取得價格座標系做對齊
- 疊加等同做「跨 iframe 座標同步」，容易翻車
- 改成同頁並列：可靠、可控、可測

## 計算細節

### MFI（Money Flow Index）
- Typical Price: TP = (H+L+C)/3
- Money Flow: MF = TP * Volume
- Positive/Negative MF：依 TP 與前一根 TP 比較決定
- MFI = 100 - 100/(1 + sumPos/sumNeg) over mfiLen

### Volume Profile bins
- 取 lookback 根的最高/最低價
- range / rowCount 得到 step
- 每根 K 覆蓋的 bin 區間：floor((high-lowest)/step) ~ floor((low-lowest)/step)
- 將該根 volume 平均分配到覆蓋 bins
- 另累積 mfiProduct = volPerBin * mfiBar，用於 binAvgMfi

### POC / Value Area
- POC：最大 volume bin
- Value Area：以 POC 為中心向外擴，直到覆蓋總 volume 的 70%

## CORS / Proxy 原則
- Production：不使用免費 CORS proxy 當主要資料源
- 若 DEV fallback：
  - GET 不送 Content-Type（避免 preflight）
  - 失敗要回可讀錯誤，不拋 Uncaught

## 修補點（對應你目前錯誤）
- yahooFinanceApi.js 目前有 GET + Content-Type，會觸發 preflight，容易被擋（需移除）
- precomputedOhlcvApi.js 缺 symbol 直接 throw（需改回傳不可用狀態）