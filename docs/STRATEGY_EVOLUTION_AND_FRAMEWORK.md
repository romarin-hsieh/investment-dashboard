# Strategy Evolution & Framework Definition

## 1. The Evolutionary Journey (V1 to V5)

This document chronicles our experimental path to designing a robust, high-performance algo-trading framework.

### **V1: The "Classic" (Mean Reversion)**
*   **Hypothesis**: Stocks oscillate within bands. We can buy oversold dips in an uptrend.
*   **Core Logic**: McGinley Dynamic Trend + Stoch RSI Oversold.
*   **Verdict**: **Stable but Average**.
    *   *Pros*: Performance is consistent across most sectors. Good for buying "value" dips.
    *   *Cons*: Exits too early in strong bull runs. Misses explicit breakout velocity.

### **V2: The "Kinetic" (Structure)**
*   **Hypothesis**: Adding "Z-Score" structure and volatility resets will filter false signals.
*   **Core Logic**: Z-Structure + Kinetic Energy (Momentum).
*   **Verdict**: **High Frequency, Low Expectancy**.
    *   *Pros*: High trade volume (3,500+ trades). Statistical significance is high.
    *   *Cons*: PF hovered around 1.20. Lower Sharpe (0.47 LB). Suffer from "over-trading" in chop.

### **V4: The "Trend/Clock" (Linear Regression)**
*   **Hypothesis**: Linear Regression Slope (Log Scale) combined with OBV (Smart Money) can predict sustained trends.
*   **Core Logic**: Log Trend Slope > 0.2 + OBV Confirmation.
*   **Verdict**: **Too Selective / Lagging**.
    *   *Pros*: High PF (1.47) when it hits.
    *   *Cons*: Extremely low trade count (136 trades in 6 years). The lag in Linear Regression caused missed entries. OBV filter was too strict.

### **V5: The "Sharpe/Squeeze" (Volatility Expansion)**
*   **Hypothesis**: Big moves start from volatility compression (Squeezes).
*   **Core Logic**: Bollinger Band Width Squeeze (<20%) + Breakout + ATR Trailing Stop.
*   **Verdict**: **The "Growth Beast" (High Reward, High Risk)**.
    *   *Pros*: Massive returns in Tech/Semis (PF > 2.0, Sharpe > 1.3). Captures the "Super Performance" stocks.
    *   *Cons*: catastrophic in Bear Markets (2022) with MaxDD > 50%. Fails in defensive sectors (Healthcare, Utilities).

---

## 2. Comparative Analysis (The Data)

We ran standardized backtests (2018-2025) with 98% Confidence Bootstrapping.

### **Overall Metrics (Global)**
| Metric | V2 (Kinetic) | V4 (Trend) | V5 (Sharpe) | **V5 (Tight Stop)** |
| :--- | :--- | :--- | :--- | :--- |
| **Profit Factor** | 1.20 | 1.47 | 1.98 | **1.48 (LB)** |
| **Sharpe Ratio** | 0.47 (LB) | -1.08 (LB) | 1.33 (LB) | **1.41 (LB)** |
| **Win Rate** | 52.7% | 36.8% | 48.2% | **56.0%** |
| **Drawdown** | Moderate | Low | **High (-70%)** | **Med (-57%)** |

### **Sector Decoupling (The "Aha!" Moment)**
The most critical finding is that **no single strategy works for all sectors**.

*   **Technology/Semis**: V5 dominates (PF 2.72 vs V1 1.29). Volatility expansion works here.
*   **Comm Services**: V1 dominates (PF 1.46 vs V5 1.11). Mean reversion works here.
*   **Healthcare**: V5 Fails (MaxDD -80%). V1 is stable (PF 0.97, barely breakeven but safe).

---

## 3. The Final Framework: "The Matrix"

We cannot use a "One Size Fits All" strategy. We must implement a **Context-Aware Strategy Matrix**.

### **Logic Flow**
1.  **Identify Asset Class**: Look up Symbol in `sector_industry.json`.
2.  **Select Strategy Engine**:
    *   **Group A (Growth/Momentum)**: Technology, Consumer Cyclical, Unknown (IPOs).
        *   **Use Strategy**: **V5 (Tight Stop Variant)**.
        *   *Why*: These assets trend hard. Squeezes predict expansion. Tight stops protect against volatility.
    *   **Group B (Value/Defensive)**: Healthcare, Utilities, Comm Services, Industrials.
        *   **Use Strategy**: **V1 (Original/Mean Reversion)** or **HOLD**.
        *   *Why*: These assets chop. Breakouts are often fake. Buying dips (V1) is safer.
    *   **Group C (Energy/Basic Materials)**:
        *   **Use Strategy**: **Avoid/HOLD**.
        *   *Why*: Commodity cycles do not fit our current logic well.

### **Risk Management Layer (Secondary Filters)**
To fix V5's 2022 failure, we apply the **"Tight Stop"** and optional **"Market Regime"**:
*   **Stop Loss**: 2.0x ATR (vs 3.0x).
*   **Time Stop**: 5 Days (vs 10 Days).
*   *Result*: Reduces MaxDD from -70% to -57% while maintaining high Sharpe.

---

## 4. Next Steps

1.  **Implement Strategy Selector**: Code a unified class `StrategySelector` that routes `get_signal()` to either V5 or V1 based on the symbol's sector.
2.  **Live Paper Trading**: Deploy the Matrix Selector to the live environment.
3.  **UI Visualization**: Update the Frontend to show *which* strategy is active for a given stock (e.g., tag: "Strategy: V5-Growth" or "Strategy: V1-Value").
