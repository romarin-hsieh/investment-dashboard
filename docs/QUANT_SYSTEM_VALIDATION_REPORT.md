# Quant System Validation (Raw vs Filtered)

**Metric**: 98% Confidence Lower Bound

## 1. Global Performance Improvement
| Metric | Raw V5/V1 | Filtered QuantSystem | Improvement |
| --- | --- | --- | --- | 
| PF (LB) | 1.13 | 1.11 | -0.02 |
| Sharpe (LB) | 0.66 | 0.59 | -0.07 |
| MaxDD (LB) | -97.7% | -98.3% | -0.6% |

## 2. The 2022 Bear Market Stress Test
| Config | Profit Factor (LB) | Max Drawdown (LB) | Trades |
| --- | --- | --- | --- |
| Raw | 0.55 | -99.6% | 355 |
| Filtered | 0.53 | -99.7% | 331 |

### 2022 Trade Breakdown (Filtered)
- **V1_Defensive (MeanRev)**: 330 trades
- **V5_Growth (Tight)**: 1 trades
