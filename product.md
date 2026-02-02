## 使用者故事
- 作為使用者，我想在單一股票頁面同時看到：
  - TradingView 的價格走勢（熟悉、可互動）
  - 一個直觀的 MFI Volume Profile（知道哪些價位成交密集、偏多/偏空）

## 主要畫面元素
1) TradingView K 線區
2) MFI Volume Profile 區
   - 顯示 bins（價格由高到低）
   - 每一列顯示：Volume [Avg MFI]
   - POC（最大量）突出顯示
   - Value Area（70%）用上下界標記

## 互動
- Range/Interval 切換：
  - 立即更新 Profile（recompute）
- Hover：
  - 顯示 price bin range、volume、avgMfi

## 失敗體驗
- TradingView 被擋：
  - 顯示：「TradingView 可能被隱私外掛阻擋」+ Open link + Retry
- Profile 資料缺失：
  - 顯示：「此股票暫無可用 OHLCV」+ Retry（DEV 可嘗試遠端抓）