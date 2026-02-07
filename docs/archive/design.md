## 系統設計概觀
- StockDetail.vue 作為頁面容器
  - 左/上：TradingView widget（LazyTradingViewWidget.vue）
  - 右/下：MFIVolumeProfilePanel.vue（新增/重構元件，用 DOM 畫 bins）

## 資料流
1) 解析路由取得 symbol
2) 載入本地 OHLCV JSON
   - GET /data/ohlcv/{symbol}.json
3) 計算：
   - MFI series（mfiLen=14）
   - Volume Profile bins（rowCount=50, lookback=200）
   - bin 統計：volume、(volume*mfi) 用於 avgMfi
   - POC（最大 volume bin）
   - Value Area（預設 70% volume，從 POC 往外擴）
4) Render：
   - 50 rows 水平 bars（長度依 bin.volume/maxVolume）
   - bar 色彩依 avgMfi 做 gradient（綠->紅）
   - 標記 POC / VAH / VAL

## UI Layout 建議
- Desktop：左右兩欄（K 線 2/3 寬、Profile 1/3 寬）
- Mobile：上下堆疊

## 降級策略
- TradingView：
  - script onerror / render healthcheck（容器中無 iframe 則視為失敗）
  - 顯示替代卡片：原因（可能被擋）+ Open link + Retry
- OHLCV：
  - 本地 JSON 404：顯示「此 symbol 無資料」
  - DEV 模式：允許 fallback 到 Yahoo（可選）
- Indicators：
  - precomputed 不可用：回傳 null，不 throw；UI 顯示「未支援」

## 重要實作注意
- 禁止在 production 使用免費 CORS proxy 當主要資料源
- Chart/DOM container 不可用 v-if 整個拔掉後又在同 tick init（避免 insertBefore/null）
- 所有資料需先 sanitize（過濾 null/NaN，確保排序）再 render