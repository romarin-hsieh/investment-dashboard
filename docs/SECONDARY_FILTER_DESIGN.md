# Secondary Filter Design: Optimizing V5 for Robustness

## 1. Problem Definition
The V5 (Sharpe/Squeeze) strategy demonstrates extreme cyclicality.
*   **Bull Markets (2020, 2024, 2025)**: Exceptional performance (PF > 1.3, Sharpe > 1.3).
*   **Bear/Chop Markets (2019, 2022)**: Catastrophic failure (PF ~0.0, MaxDD > 50%).
*   **Root Cause**: V5 is a "Breakout" strategy. In bear markets, breakouts are often "bull traps" that reverse immediately.

## 2. Objective
Design a **Secondary Filter** (Gatekeeper) that:
1.  **Blocks V5 entries** during unfavorable conditions (Bear/Chop).
2.  **Preserves V5 entries** during favorable conditions (Bull).
3.  Target: Raise 2022 PF from ~0.0 to > 1.0 (or at least reduce MaxDD by 50%).

## 3. Candidate Filters

### A. Market Regime Filter ("The Traffic Light")
*   **Logic**: Uses a broad market index (SPY or QQQ) to determine the "Global State".
*   **Rule**:
    *   **GREEN**: SPY > MA200 (Daily). Allow New Buys.
    *   **RED**: SPY < MA200. Block New Buys. Close existing strictly.
*   **Rationale**: Most stocks follow the index. Buying breakouts below the MA200 is statistically lower probability.
*   **Data Requirement**: `SPY.json` or `QQQ.json`.

### B. Volatility Regime Filter ("The Storm Shelter")
*   **Logic**: High volatility implies fear and instability.
*   **Rule**:
    *   **Safe**: VIX < 25. Allow Buys.
    *   **Danger**: VIX > 25. Block Buys.
*   **Rationale**: Breakouts fail more often in high-volatility regimes.
*   **Data Requirement**: `^VIX.json`.

### C. Relative Strength Filter ("The Alpha Check")
*   **Logic**: Only buy stocks that are *stronger* than the market.
*   **Rule**: (Stock % Change 20d) > (SPY % Change 20d).
*   **Rationale**: In a correction, leaders resist the drop. This naturally filters out weak stocks.

## 4. Proposed Matrix Design (V6)
Instead of just a filter, we implement a **Dynamic Switch**:

| Market State (SPY > MA200?) | Volatility (VIX < 25?) | Strategy |
| :--- | :--- | :--- |
| **YES** | **YES** | **V5 (Aggressive Squeeze)** |
| **YES** | **NO** | **V5 (Reduced Size / Tight Stop)** |
| **NO** | **ANY** | **V1 (Mean Reversion) or CASH** |

## 5. Experiment Plan
1.  **Baseline**: V5 Yearly Results (Reference 2022).
2.  **Test A**: Apply **SPY > MA200** Filter. Re-run 2022.
3.  **Test B**: Apply **VIX < 25** Filter. Re-run 2022.
4.  **Test C**: Apply **Relative Strength**. Re-run 2022.
5.  **Validation**: Run the winner on full 2018-2025 to ensure it doesn't kill 2025 gains.

## 6. Implementation
Create `scripts/research/test_filters.py`:
*   Load `SPY` and `^VIX`.
*   Inject `market_context` into `Strategy.get_signal`.
*   Measure Impact on PF and MaxDD.
