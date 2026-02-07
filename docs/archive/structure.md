/public
  /data
    /ohlcv
      AAPL.json
      MSFT.json
      ...（universe symbols）

/src
  /pages
    StockDetail.vue
  /components
    LazyTradingViewWidget.vue
    MFIVolumeProfilePanel.vue        # 新增/重構（DOM bins）
  /services
    ohlcvApi.js                      # 讀本地 JSON + memory cache
    yahooFinanceApi.js               # DEV fallback（已修正 headers）
    precomputedOhlcvApi.js           # 已修正缺 symbol 行為
  /utils
    mfiVolumeProfile.js              # 計算函式（可抽成純函式，方便測試）