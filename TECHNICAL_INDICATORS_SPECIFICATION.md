# 📊 技術指標完整規格文檔

## 🎯 通用符號定義

### 基礎符號
- **時間索引**: `t` (第 t 根 K 線/bar)
- **週期長度**: `N` (例如 5、10、14、20、26、30)
- **價格序列**: 
  - `O_t` = Open (開盤價)
  - `H_t` = High (最高價)
  - `L_t` = Low (最低價)
  - `C_t` = Close (收盤價)
  - `V_t` = Volume (成交量)

### 回看區間極值
- `HH_t(N) = max(H_t, H_{t-1}, ..., H_{t-N+1})` (N期最高價)
- `LL_t(N) = min(L_t, L_{t-1}, ..., L_{t-N+1})` (N期最低價)

## 📈 技術指標公式定義

### 1. MA (5, 10, 30) - Exponential Moving Average

**定義**: MA 使用指數移動平均線 (EMA)，與 SMA 區分

**公式**:
```
α = 2/(N+1)  // 平滑係數
EMA_t(N) = α × C_t + (1-α) × EMA_{t-1}(N)
```

**初始化**: 使用前 N 根的 SMA 作為第一個 EMA 起點

**參數**:
- N: 週期 (5, 10, 30)
- α: EMA 權重，越大越貼近最近價格
- C_t: 收盤價

### 2. SMA (5, 10, 30) - Simple Moving Average

**公式**:
```
SMA_t(N) = (1/N) × Σ(i=0 to N-1) C_{t-i}
```

**參數**:
- N: 週期 (5, 10, 30)
- C_{t-i}: 第 (t-i) 根收盤價

### 3. Ichimoku Base Line (26) - Kijun-sen

**公式**:
```
BaseLine_t(26) = (HH_t(26) + LL_t(26)) / 2
```

**參數**:
- HH_t(26): 過去 26 根的最高價
- LL_t(26): 過去 26 根的最低價

### 4. Ichimoku Conversion Line (9) - Tenkan-sen

**公式**:
```
ConversionLine_t(9) = (HH_t(9) + LL_t(9)) / 2
```

**參數**:
- HH_t(9): 過去 9 根的最高價
- LL_t(9): 過去 9 根的最低價

### 5. Ichimoku Lagging Span (26) - Chikou Span

**公式**:
```
LaggingSpanValue_t = C_t
LaggingSpan_{t-26} = C_t  // 位移到過去 26 期
```

**參數**:
- 位移量: 26 (標準設定)
- C_t: 當前收盤價

### 6. VWMA 20 - Volume Weighted Moving Average

**公式**:
```
VWMA_t(20) = Σ(i=0 to 19)(C_{t-i} × V_{t-i}) / Σ(i=0 to 19)V_{t-i}
```

**參數**:
- N = 20
- C_{t-i}: 收盤價
- V_{t-i}: 成交量
- 邊界條件: 若分母=0，回傳 NaN

### 7. RSI 14 - Relative Strength Index (Wilder's)

**Step A: 漲跌分解**
```
Δ_t = C_t - C_{t-1}
Gain_t = max(Δ_t, 0)
Loss_t = max(-Δ_t, 0)
```

**Step B: Wilder 平滑**
```
// 初始值
AvgGain_{t0} = (1/14) × Σ(k=1 to 14) Gain_{t0-k+1}
AvgLoss_{t0} = (1/14) × Σ(k=1 to 14) Loss_{t0-k+1}

// 遞迴更新
AvgGain_t = (AvgGain_{t-1} × 13 + Gain_t) / 14
AvgLoss_t = (AvgLoss_{t-1} × 13 + Loss_t) / 14
```

**Step C: RSI 計算**
```
RS_t = AvgGain_t / AvgLoss_t
RSI_t = 100 - 100/(1 + RS_t)
```

**邊界條件**:
- 若 AvgLoss_t = 0: RSI = 100
- 若 AvgGain_t = 0: RSI = 0

### 8. ADX 14 - Average Directional Index (Wilder's)

**Step A: Directional Movement**
```
UpMove_t = H_t - H_{t-1}
DownMove_t = L_{t-1} - L_t

+DM_t = {UpMove_t if UpMove_t > DownMove_t and UpMove_t > 0, else 0}
-DM_t = {DownMove_t if DownMove_t > UpMove_t and DownMove_t > 0, else 0}
```

**Step B: True Range**
```
TR_t = max(H_t - L_t, |H_t - C_{t-1}|, |L_t - C_{t-1}|)
```

**Step C: Wilder 平滑 (N=14)**
```
SmTR_t = (SmTR_{t-1} × 13 + TR_t) / 14
Sm+DM_t = (Sm+DM_{t-1} × 13 + +DM_t) / 14
Sm-DM_t = (Sm-DM_{t-1} × 13 + -DM_t) / 14
```

**Step D: DI 計算**
```
+DI_t = 100 × Sm+DM_t / SmTR_t
-DI_t = 100 × Sm-DM_t / SmTR_t
```

**Step E: DX 和 ADX**
```
DX_t = 100 × |+DI_t - (-DI_t)| / |+DI_t + (-DI_t)|
ADX_t = (ADX_{t-1} × 13 + DX_t) / 14
```

**邊界條件**:
- 若 SmTR_t = 0 或 (+DI_t + -DI_t) = 0: 避免除以 0

### 9. MACD (12, 26, 9) - Moving Average Convergence Divergence

**公式**:
```
EMA_fast_t = EMA_t(12)
EMA_slow_t = EMA_t(26)
MACD_t = EMA_t(12) - EMA_t(26)
Signal_t = EMA(MACD, 9)
Histogram_t = MACD_t - Signal_t
```

**參數**:
- fast = 12, slow = 26, signal = 9 (標準預設)
- EMA 的 α 與初始化同 MA/EMA 段落

## 🔍 權威參考來源

### 文檔參考
- **Investopedia**: RSI, MACD, EMA 標準定義
- **TradingView**: Ichimoku, ADX 公式整理
- **TA-Lib Documentation**: 業界標準實現參考

### GitHub 高星 Repository
- **TA-Lib/ta-lib-python** (11.6k★): 業界經典，適合對照標準答案
- **bukosabino/ta** (4.8k★): 純 Python + pandas，文件完整
- **anandanand84/technicalindicators** (2.4k★): TypeScript/JavaScript 實現
- **TulipCharts/tulipindicators** (936★): C 實現，效能導向

## ⚠️ 實現注意事項

### 1. MA vs SMA 區分
- **MA**: 使用 EMA (指數移動平均)
- **SMA**: 使用 SMA (簡單移動平均)
- 避免兩者使用相同計算方法

### 2. Ichimoku 命名正確性
- **ichimokuBaseLine(26)**: Kijun-sen (基準線)
- **ichimokuConversionLine(9)**: Tenkan-sen (轉換線)
- **ichimokuLaggingSpan(26)**: Chikou Span (遲行線)

### 3. 位移方向
- **LaggingSpan**: 今天收盤價畫在 26 根前 (shift(-26))
- 實現時最常錯成 shift(+26)

### 4. 平滑方法
- **RSI/ADX**: 必須使用 Wilder's 遞迴平滑
- 不可用一般 SMA 取代，否則值會不一致

### 5. 邊界條件處理
- **除以 0**: VWMA 分母、RSI AvgLoss、ADX 分母
- **Warm-up**: 前 N-1 根通常輸出 NaN
- **初始化**: EMA 使用前 N 根 SMA 作為起點

## 🧪 測試驗證策略

### 1. 單元測試
- 每個指標獨立測試
- 邊界條件測試 (除以 0、數據不足)
- 已知數據集驗證

### 2. 對照驗證
- 與 TA-Lib 輸出對比
- 與 TradingView 數值對比
- 與 bukosabino/ta 結果對比

### 3. 效能測試
- 大數據集處理速度
- 記憶體使用量
- 快取命中率

---

**結論**: 此規格提供完整的技術指標實現標準，確保與主流平台一致性，避免常見實現錯誤。