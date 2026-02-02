# Sharpe Strategy Validation (Protocol 5.0)

## Executive Summary
*   **Total Trades**: 744
*   **Win Rate**: 45.7%
*   **Profit Factor**: 1.78 (Target > 2.0)
*   **Sharpe Ratio**: 1.97 (Target > 1.5)
*   **98% Conf. Lower Bound Sharpe**: 1.03

## Hypothesis Status
*   **Profit Factor > 2.0**: ❌ FAIL
*   **Sharpe > 1.5**: ✅ PASS
*   **Statistical Significance**: The strategy has a 98% probability of having a Sharpe Ratio above 1.03.

## Trade Stats
*   **Avg Win**: 7.84%
*   **Avg Loss**: -3.71%
*   **Risk/Reward Ratio**: 2.11

## Detailed Log (First 10)
Symbol  EntryDate   ExitDate                 Reason       PnL  Days  R_Multiple
  AAPL 2019-05-01 2019-05-13 Time Stop (Dead Money) -0.114405    12   -4.012961
  AAPL 2019-07-31 2019-08-02        Chandelier Stop -0.042311     2   -2.065574
  AAPL 2019-10-04 2020-02-24        Chandelier Stop  0.320637   143    9.059128
  AAPL 2020-06-05 2020-09-03        Chandelier Stop  0.461251    90    8.324567
  AAPL 2020-12-02 2020-12-14 Time Stop (Dead Money) -0.010517    12   -0.477402
  AAPL 2021-01-22 2021-02-02 Time Stop (Dead Money) -0.029325    11   -0.927725
  AAPL 2021-04-07 2021-05-04 Time Stop (Dead Money) -0.000401    27   -0.018475
  AAPL 2021-06-14 2021-09-14        Chandelier Stop  0.136949    92    6.009840
  AAPL 2021-11-17 2022-01-06        Chandelier Stop  0.120593    50    5.284614
  AAPL 2023-03-20 2023-08-04        Chandelier Stop  0.157824   137    7.266836