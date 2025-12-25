# 技術指標公式參考手冊

## 文件位置
主要公式實現：`src/utils/technicalIndicatorsCore.js`

## 各指標公式位置和實現

### 1. 移動平均線類

#### MA (EMA) - 指數移動平均線
- **位置**：第 295 行 `calculateMA()`
- **公式**：使用 EMA 實現，alpha = 2/(period+1)
- **實現**：第 120-240 行 `ema()` 函數

#### SMA - 簡單移動平均線  
- **位置**：第 300 行 `calculateSMA()`
- **公式**：SMA = (P1 + P2 + ... + Pn) / n
- **實現**：第 50-90 行 `sma()` 函數

### 2. 一目均衡表 (Ichimoku)

#### Ichimoku Base Line (基準線)
- **位置**：第 305 行 `calculateIchimokuBaseLine()`
- **公式**：(最高價 + 最低價) / 2 (26期)
- **實現**：使用 `rollingMax()` 和 `rollingMin()`

#### Ichimoku Conversion Line (轉換線)
- **位置**：第 320 行 `calculateIchimokuConversionLine()`
- **公式**：(最高價 + 最低價) / 2 (9期)

#### Ichimoku Lagging Span (遲行線)
- **位置**：第 325 行 `calculateIchimokuLaggingSpan()`
- **公式**：當前收盤價向前移動26期

### 3. 成交量指標

#### VWMA - 成交量加權移動平均線
- **位置**：第 340 行 `calculateVWMA()`
- **公式**：VWMA = Σ(Price × Volume) / Σ(Volume)

### 4. 動量指標

#### RSI - 相對強弱指數
- **位置**：第 365 行 `calculateRSI()`
- **公式**：
  ```
  RS = 平均上漲幅度 / 平均下跌幅度
  RSI = 100 - (100 / (1 + RS))
  ```
- **平滑方法**：Wilder 平滑 (第 250-290 行)

#### ADX - 平均趨向指數 ⭐ (剛修正)
- **位置**：第 420 行 `calculateADX()`
- **公式步驟**：
  1. **True Range (TR)**：max(H-L, |H-C₋₁|, |L-C₋₁|)
  2. **+DM**：max(H-H₋₁, 0) if H-H₋₁ > L₋₁-L, else 0
  3. **-DM**：max(L₋₁-L, 0) if L₋₁-L > H-H₋₁, else 0
  4. **Wilder 平滑**：TR, +DM, -DM (14期)
  5. **+DI**：100 × (平滑+DM / 平滑TR)
  6. **-DI**：100 × (平滑-DM / 平滑TR)
  7. **DX**：100 × |+DI - -DI| / (+DI + -DI)
  8. **ADX**：DX 的 Wilder 平滑 (14期)

#### MACD - 移動平均收斂發散
- **位置**：第 550 行 `calculateMACD()`
- **公式**：
  ```
  MACD Line = EMA(12) - EMA(26)
  Signal Line = EMA(MACD, 9)
  Histogram = MACD - Signal
  ```

### 5. 輔助函數

#### Wilder 平滑 ⭐ (剛修正)
- **位置**：第 250 行 `wilderSmoothing()`
- **公式**：
  ```
  第一個值：SMA(n)
  後續值：(前值 × (n-1) + 當前值) / n
  ```

#### 滾動極值
- **rollingMax**：第 30 行
- **rollingMin**：第 45 行

## 最近修正的問題

### ADX 計算修正 (2024/12/25)
1. **數據驗證**：增加 OHLC 數據有效性檢查
2. **數據範圍**：API 數據從 3 個月增加到 6 個月
3. **錯誤處理**：改善 NaN 值處理和調試日誌
4. **Wilder 平滑**：增強初始化邏輯和數據稀疏處理

### 修正前的問題
- ADX 顯示 "N/A" 因為：
  - 數據不足（需要 28+ 個有效數據點）
  - NaN 值破壞 Wilder 平滑初始化
  - 缺乏適當的錯誤處理

## 使用建議

### 檢查公式實現
1. 打開 `src/utils/technicalIndicatorsCore.js`
2. 搜尋對應的函數名稱（如 `calculateADX`）
3. 查看具體的數學實現

### 調試技術指標
1. 使用 `clear-technical-cache.html` 清除快取
2. 打開瀏覽器開發者工具查看 console 日誌
3. 檢查數據質量和計算步驟

### 驗證公式正確性
1. 對照標準技術分析教材
2. 使用 `debug-adx-calculation.html` 進行測試
3. 比較其他金融平台的計算結果

## 技術規格

- **基於**：YAML 規格 indicator_algorithms v2.0.0
- **NaN 處理**：strict, skipna, hold_last 等策略
- **數據對齊**：所有輸出序列與輸入長度一致
- **初始化**：前 (period-1) 個值為 NaN