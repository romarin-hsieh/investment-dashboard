# Protocol 5.0: "Sharpe First" Strategy Validation

## 1. Objective
Shift focus from "High Win Rate" to **"Risk-Adjusted Stability"**.
**Primary Goals:**
1.  **Profit Factor (PF) > 2.0**
2.  **Profit Factor > Max Drawdown** (Absolute Value Ratio)
3.  **Sharpe Ratio > 1.5** (Annualized)
4.  **Confidence Level**: 98% (Alpha = 0.02) via Bootstrapping.

## 2. Theoretical Basis
*   **Volatility cost**: High volatility drags down compounding efficiency ("Variance Drain").
*   **The "Wiggles"**: Reducing equity curve variance allows for safer leverage application.
*   **Philosophy**: "Snipe the calm, trailing the storm."

## 3. The Framework Shift
To achieve PF > 2.0 with moderate win rates, we prioritize **Entry Precision** (Low Risk) and **Exit Efficiency** (Preserving Gains).

### A. BUY Framework (Entry)
*   **Concept**: Volatility Compression (The "Squeeze").
*   **Logic**:
    1.  **Trend**: Long-term trend is Up (MA200 Up).
    2.  **Compression**: Bollinger Band Width is near historical lows (z-score < -1.0).
    3.  **Trigger**: Price closes above Upper Bollinger Band or Key Resistance.
*   **Why**: Entering during compression means the stop loss (ATR) is small. Small risk = larger position size allowed = higher R:R potential.

### B. SELL Framework (Exit)
*   **Stop Loss (Risk control)**:
    *   **Vol-Based Stop**: 2x ATR from Entry. (Dynamic to current noise).
    *   **Time Stop**: If price doesn't move > 1 ATR in 10 days, EXIT. (Dead money = Opportunity Cost).
*   **Take Profit (Profit Capture)**:
    *   **No Fixed Target**: Use a **Chandelier Exit** (Highest High - 3x ATR) to trail the trend.
    *   **Volatility Blowout**: If price moves 4sd in one day (Climax), trim 50%.

### C. HOLD Framework (Management)
*   **Portfolio Balance**: Ideally, trade non-correlated assets.
*   **Optimization**: Do not hold through earnings if history shows >10% gaps (Binary Risk).

## 4. Hypothesis Testing
*   **H1**: `Mean(Returns_Squeeze) > Mean(Returns_Random)` at 98% Confidence.
*   **H2**: `Sharpe_Squeeze > 2.0`.
*   **H3**: `Drawdown < 15%` maximum.

## 5. Industrial Validation Plan
*   **Script**: `scripts/research/validate_sharpe_strategy.py`
*   **Method**:
    1.  Backtest on AAPL, NVDA, TSLA, SPY (High & Low Beta Mix).
    2.  Run 10,000 bootstrap simulations of the trade curve.
    3.  Calculate VaR (Value at Risk) at 98%.
*   **Criteria**: The 2nd percentile of the Bootstrapped Sharpe Ratio distribution must be > 1.0.

## 6. Code Architecture Changes
*   **New Indicator**: `BollingerBandWidth`, `KeltnerChannels`, `ATR`.
*   **New Exit**: `ChandelierExit`.
*   **Optimizer**: `scipy.optimize` or Grid Search for ATR Multipliers to maximize `PF`.
