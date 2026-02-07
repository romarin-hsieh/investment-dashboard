# Trend Scale Validation Results (Protocol 4.0)

## Executive Summary
*   **Total Trades**: 512
*   **Win Rate**: 32.6% (Target > 55%)
*   **Profit Factor**: 1.82 (Target > 1.5)
*   **Avg PnL**: 2.25%

## Hypothesis H1: "Healthy Bull" Pullback
The strategy entered when `Trend Slope > 0.2`, `R2 > 0.6`, near `MA60`, with `OBV > 0`.

### Correlation Analysis
Does higher R-Squared (Cleaner Trend) lead to better results?

| Metric | High R2 (>0.8) | Low R2 (<0.8) |
| :--- | :--- | :--- |
| **Win Rate** | 33.8% | 31.6% |
| **Avg PnL** | 1.79% | 2.64% |

## Detailed Trade Log (Sample)
  Symbol  Strategy  EntryDate   ExitDate       PnL  Days  TrendSlope   TrendR2
0   AAPL  Pullback 2020-10-02 2021-02-25  0.073932    99    0.660248  0.743918
1   AAPL  Pullback 2021-04-05 2021-05-10  0.009288    25    0.627514  0.771371
2   AAPL  Pullback 2021-09-16 2022-03-07  0.073598   118    0.255119  0.677232
3   AAPL  Pullback 2022-03-21 2022-04-14 -0.000555    18    0.344897  0.801132
4   AAPL  Pullback 2022-04-18 2022-04-21  0.008216     3    0.333885  0.788545
5   AAPL  Pullback 2023-08-31 2023-09-12 -0.061602     7    0.336866  0.675044
6   AAPL  Pullback 2023-10-09 2023-10-10 -0.003332     1    0.358034  0.737955
7   AAPL  Pullback 2023-10-11 2023-10-13 -0.005284     2    0.355417  0.733032
8   AAPL  Pullback 2025-01-10 2025-01-16 -0.036263     4    0.395203  0.793343
9   AAPL  Pullback 2025-02-12 2025-03-10 -0.039651    17    0.394795  0.792009

