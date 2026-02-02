# Protocol 5.0 (Sharpe Strategy) Specification

## 1. 核心維度定義 (X-Y-Z Axis)

本策略採用三維濾網來確保進場的高勝率與高盈虧比：

| 維度 | 代號 | 定義 (Definition) | 採用指標 (Indicator) | 作用 (Function) |
| :--- | :--- | :--- | :--- | :--- |
| **趨勢 (Trend)** | **X** | 長期市場方向 | **SMA 200** (200日均線) | 確保順勢操作，這是一切交易的基礎。只有在價格高於 X 軸時才考慮做多。 |
| **動能 (Momentum)** | **Y** | 價格突破力度 | **Bollinger Breakout** (布林通道上緣) | 作為進場的「點火器」。當價格強勢突破累積已久的區間時，確認動能爆發。 |
| **結構 (Structure)** | **Z** | 波動率狀態 | **BB Width** (帶寬) & **ATR** (真實波幅) | **核心過濾器**。<br>1. **進場前**: 必須處於「壓縮 (Squeeze)」狀態 (潛在位能最大化)。<br>2. **持倉中**: 用於計算動態停損距離。 |

---

## 2. 交易邏輯詳解 (Buy / Hold / Sell)

### A. BUY (進場條件)
必須 **同時** 滿足 X, Y, Z 三個條件：

1.  **Z-Axis (Squeeze Check)**: `BB Width Percentile < 20%`
    *   *解釋*: 布林通道寬度處於過去半年內的最低 20% 水準。代表市場極度平靜，即將變盤。
2.  **X-Axis (Trend Check)**: `Close > MA 200`
    *   *解釋*: 長期趨勢向上。我們不做空頭反彈，只做多頭續攻。
3.  **Y-Axis (Trigger)**: `Close > BB Upper`
    *   *解釋*: 價格收盤站上布林通道上緣。這是壓縮後的釋放訊號。

### B. HOLD (持倉管理)
一旦進場，不再關注 X 或 Z 的原始條件，改為關注 **「已實現波動 (Realized Volatility)」**。

*   **Logic**: 只要價格維持在 **"Chandelier Floor" (吊燈地板)** 之上，就持續持有。
*   這是讓獲利奔跑 (Let Profits Run) 的關鍵。地板會隨著價格創新高而自動上移，但不會下移。

### C. SELL (出場條件)
出場由 **Z 軸 (ATR)** 主導，分為兩種情境：

1.  **停損/停利 (Stop Out)**:
    *   **條件**: `Close < (Highest High - 3 * ATR)`
    *   *解釋*: 這是 **Chandelier Exit**。當價格從波段高點回落超過「3倍真實波幅」時，代表趨勢反轉或深度回檔，立即離場保本或鎖住獲利。
    *   *優勢*: 比固定 % 停損更靈活，會自動適應目前的市場躁動程度。

2.  **時間停損 (Time Stop)**:
    *   **條件**: `Days Held > 10` **AND** `Profit < 0.5 * ATR`
    *   *解釋*: 如果進場 10 天後，獲利連 0.5 個 ATR 都不到，代表動能失效 (Dead Money)。
    *   *優勢*: 釋放資金機會成本 (Opportunity Cost)，避免陷入漫長的盤整。

---

## 3. 與舊版 (V2/V4) 的差異

*   **X 軸**: 放棄了靈敏的 McGinley (V2) 或 Clock Slope (V4)，回歸最傳統但有效的 **MA200**。大智若愚。
*   **Z 軸**: 這是 V5 的靈魂。我們不再用 Z 軸看「乖離率 (Mean Reversion)」，而是看 **「壓縮率 (Compression)」**。
*   **指標變更**:
    *   移除: Stoch RSI, OBV, Linear Reg Slope.
    *   新增: **ATR (平均真實波幅)**, **BB Width (布林帶寬)**.
