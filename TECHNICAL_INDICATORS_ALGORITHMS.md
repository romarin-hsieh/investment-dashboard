# 技術指標算法文檔

本文檔記錄所有技術指標的計算公式和實現方法。每當修改算法時，必須更新此文檔。

## 📊 移動平均線 (Moving Averages)

### 1. 簡單移動平均線 (SMA - Simple Moving Average)

**公式：**
```
SMA(n) = (P1 + P2 + ... + Pn) / n
```

**參數：**
- n: 期間數
- P: 收盤價

**實現的 SMA 指標：**
- **SMA5**: 5日簡單移動平均線
- **SMA10**: 10日簡單移動平均線  
- **SMA30**: 30日簡單移動平均線
- **SMA50**: 50日簡單移動平均線

**信號判斷：**
- 當前價格 > SMA * 1.02 → BUY
- 當前價格 < SMA * 0.98 → SELL
- 其他 → NEUTRAL

### 2. 移動平均線 (MA - Moving Average)
**注意：** 在我們的實現中，MA 與 SMA 相同，都是簡單移動平均線。

## 📈 指數移動平均線 (EMA - Exponential Moving Average)

**公式：**
```
EMA(today) = (Price(today) × α) + (EMA(yesterday) × (1 - α))
α = 2 / (n + 1)
```

**初始值：** 使用前 n 期的 SMA 作為第一個 EMA 值

**參數：**
- n: 期間數
- α: 平滑係數

## 🌊 一目均衡表 (Ichimoku Cloud)

### 1. 轉換線 (Conversion Line / Tenkan-sen)
**公式：**
```
轉換線 = (9期最高價 + 9期最低價) / 2
```
**期間：** 9

### 2. 基準線 (Base Line / Kijun-sen)  
**公式：**
```
基準線 = (26期最高價 + 26期最低價) / 2
```
**期間：** 26

### 3. 遲行線 (Lagging Span / Chikou Span)
**公式：**
```
遲行線 = 當前收盤價，向前移動26期
```
**期間：** 26

**參考資料：** [Investopedia - Ichimoku Cloud](https://www.investopedia.com/terms/i/ichimoku-cloud.asp)

## 📊 成交量加權移動平均線 (VWMA - Volume Weighted Moving Average)

**公式：**
```
VWMA(n) = Σ(Price × Volume) / Σ(Volume)
```

**參數：**
- n: 期間數 (我們使用 20)
- Price: 收盤價
- Volume: 成交量

**實現：** VWMA20 (20日成交量加權移動平均線)

## 📉 相對強弱指數 (RSI - Relative Strength Index)

**公式：**
```
RSI = 100 - (100 / (1 + RS))
RS = 平均收益 / 平均損失
```

**計算步驟：**
1. 計算每日價格變化
2. 分離收益和損失
3. 使用 Wilder's 平滑方法計算平均收益和損失
4. 計算 RS 和 RSI

**期間：** 14
**信號判斷：**
- RSI > 70 → OVERBOUGHT
- RSI < 30 → OVERSOLD
- 其他 → NEUTRAL

## 📊 MACD (Moving Average Convergence Divergence)

**公式：**
```
MACD線 = EMA12 - EMA26
信號線 = MACD線的9日EMA
柱狀圖 = MACD線 - 信號線
```

**參數：**
- 快線：12日EMA
- 慢線：26日EMA  
- 信號線：9日EMA

**縮放係數：** 1.5 (實驗性調整，使結果更接近 TradingView)

**信號判斷：**
- MACD線 > 信號線 且 柱狀圖 > 0 → BUY
- MACD線 < 信號線 且 柱狀圖 < 0 → SELL
- 其他 → NEUTRAL

## 📈 平均趨向指數 (ADX - Average Directional Index)

**公式：**
```
真實範圍 TR = max(H-L, |H-C₁|, |L-C₁|)
+DM = H - H₁ (當 H-H₁ > L₁-L 且 H-H₁ > 0)
-DM = L₁ - L (當 L₁-L > H-H₁ 且 L₁-L > 0)

+DI = (+DM的平滑值 / ATR) × 100
-DI = (-DM的平滑值 / ATR) × 100

DX = |+DI - -DI| / (+DI + -DI) × 100
ADX = DX的平滑移動平均
```

**參數：**
- 期間：14
- 平滑方法：Wilder's 平滑

**信號判斷：**
- ADX > 25 → STRONG_TREND
- ADX < 20 → WEAK_TREND
- 其他 → NEUTRAL

## 🔄 版本歷史

### v1.2.0 (2024-12-24)
- **完成 Stock Overview 整合**
- 實現每日緩存系統 (24小時緩存，避免重複計算)
- 重構 TechnicalIndicators 組件：
  - 移除 TradingView widget 依賴
  - 採用 4行3列 網格佈局
  - 移除展開/收縮功能
  - 直接顯示計算結果
- 雙層緩存架構：
  - API 請求緩存 (5分鐘) - 避免頻繁 API 調用
  - 每日技術指標緩存 (24小時) - 避免重複計算
- 緩存統計和管理功能

### v1.1.0 (2024-12-24)
- **完成所有新技術指標實現**
- 新增 MA5, MA10, MA30 (與對應的 SMA 相同)
- 新增 Ichimoku 完整組件：轉換線(9)、基準線(26)、遲行線(26)
- 新增 VWMA20 (成交量加權移動平均線)
- 更新 Yahoo Finance API 測試頁面 UI，按類別分組顯示所有指標
- 所有指標均使用 Yahoo Finance 真實數據計算

### v1.0.0 (2024-12-24)
- 初始版本
- 實現 SMA50, RSI14, MACD, ADX14
- 建立基礎算法框架

## 📝 更新日誌

**重要：** 每次修改算法時，必須在此記錄變更內容和原因。

### 2024-12-24 v1.1.0 更新
- ✅ **完成** MA5, SMA5, MA10, SMA10, MA30, SMA30 實現
- ✅ **完成** Ichimoku 轉換線 (9期)、基準線 (26期)、遲行線 (26期) 實現
- ✅ **完成** VWMA20 (成交量加權移動平均線) 實現
- ✅ **完成** Yahoo Finance API 測試頁面 UI 重構，按指標類別分組顯示
- ✅ **驗證** 所有新指標計算邏輯和信號判斷
- ✅ **移除** 模擬數據功能，完全使用真實 API 數據

### 待實現的改進
- [ ] ADX 的完整 DX 歷史平滑計算優化
- [ ] MACD 縮放係數的進一步調整
- [ ] Ichimoku 雲帶 (Senkou Span A & B) 的實現
- [ ] 更多技術指標的加入 (如 Bollinger Bands, Stochastic 等)

---

**最後更新：** 2024-12-24  
**更新者：** System  
**版本：** v1.2.0