# Trend Scale Validation Protocol (Protocol 4.0)

## 1. 實驗目標 (Objectives)
主要目標是驗證「趨勢時鐘 (Trend Clock)」與「均線糾結 (MA Compression)」理論的有效性，並引入 OBV 作為籌碼過濾器，解決先前 Entry Logic 具有 "Toxic Alpha" 的問題。

我們期望將交易策略拆解為三個獨立狀態機：
1.  **Entry (進場)**：基於長期穩定趨勢的回調 (Pullback) 或密集成交區的突破 (Breakout)。
2.  **Hold (持有)**：基於趨勢持續性。
3.  **Exit (出場)**：基於趨勢破壞或加速趕頂 (Acceleration)。

## 2. 核心假設 (Hypotheses)

### H1: 穩定趨勢回調 (The "Healthy Bull" Hypothesis)
在符合「2:30 - 1:00 方向」的穩定趨勢中 (1年期 Log Slope > Threshold 且 R-Squared 高)，於均線 (60MA/120MA) 附近的回調進場，其期望值顯著高於隨機進場。
*   **預期結果**: Win Rate > 55%, Profit Factor > 1.5.

### H2: 均線糾結突破 (The "Coil" Hypothesis)
當均線組 (20, 60, 120) 高度壓縮 (< 2% 差異) 且持續 6 個月以上，隨後的波動擴張 (Volatility Expansion) 具有方向延續性。
*   **預期結果**: 能夠捕捉最大的一段波段 (Fat Tail)。

### H3: OBV 籌碼確認 (The "Smart Money" Filter)
量價背離或 OBV 先行指標，能有效過濾假突破。
*   **公式**: 當價格創新高但 OBV 未創新高 (背離)，或價格盤整但 OBV 向上 (吸籌)，對勝率有顯著影響。

## 3. 變數定義與公式 (Variables & Formulas)

本實驗將使用以下 Python `pandas` / `numpy` 實作定義：

### A. 趨勢時鐘 (Trend Clock) - `trend_score`
使用 1 年期 (250日) 的對數價格線性回歸斜率與擬合度。
```python
def calculate_trend_clock(series):
    # Returns (slope, r_squared)
    # Log transformation
    log_prices = np.log(series)
    x = np.arange(len(log_prices))
    slope, intercept, r_value, p_value, std_err = linregress(x, log_prices)
    return slope * 252, r_value**2 # Annualized Slope
```
*   **分類標準**:
    *   **Stable Bull**: Slope > 0.2 (20% annual) AND R^2 > 0.8
    *   **Accelerating**: Slope > 0.8 (Extreme)
    *   **Bear**: Slope < -0.1

### B. 均線糾結 (MA Compression) - `ma_compression`
```python
ma_short = close.rolling(20).mean()
ma_mid = close.rolling(60).mean()
ma_long = close.rolling(120).mean()

# Density Metric
high_ma = np.maximum.reduce([ma_short, ma_mid, ma_long])
low_ma = np.minimum.reduce([ma_short, ma_mid, ma_long])
density = (high_ma - low_ma) / low_ma
```
*   **信號**: `density < 0.02` (2%)

### C. OBV 能量潮 - `obv_strength`
```python
obv = (np.sign(close.diff()) * volume).cumsum()
# Smooth OBV to see trend
obv_ma = obv.rolling(20).mean()
obv_slope = calculate_slope(obv, window=20)
```

## 4. 實驗設計 (Experimental Design)

### 實驗組 A: 趨勢回調策略 (Trend Pullback)
*   **Condition**:
    *   Trend == Stable Bull (R^2 > 0.8)
    *   Price < 1.02 * MA60 (Near MA Support)
    *   OBV Slope > 0 (Volume supporting)
*   **Entry**: Market Buy
*   **Exit**: Close < MA120 (Trend Invalidated)

### 實驗組 B: 糾結突破策略 (Coil Breakout)
*   **Condition**:
    *   Density < 0.02 for > 60 days
    *   Price > High of last 20 days (Breakout)
    *   Volume > 2 * Average Volume (Expansion)
*   **Entry**: Market Buy
*   **Exit**: Stop Loss at structure low (-5%), Trailing Stop thereafter.

### 對照組 (Control Group)
*   **Random Entry** + Same Exit Logic (Kinetic Stop).

## 5. 輸出報告規格 (Output Requirements)
報告必須包含：
1.  **各策略勝率 (Win Rate)** 與 **盈虧比 (Profit Factor)**。
2.  **R-Squared 與績效的相關性散點圖** (驗證 "Stable" 是否真的更好)。
3.  **失敗案例分析** (False Breakouts 的 OBV 特徵)。

---
**注意**: 此實驗**不覆蓋**舊有記錄，所有結果存檔於 `docs/validation_reports/v4_trend_scale_results.md` (新路徑)。
