# Fear & Greed Index Indicators

This document details the 7 key indicators used to calculate the Fear & Greed Index, mirroring the methodology used by CNN Money.

## 1. Stock Price Momentum
**Market Momentum**
- **Definition**: The S&P 500 Index versus its 125-day Moving Average (MA).
- **Logic**: 
  - **Greed**: S&P 500 > 125-day MA (Positive momentum).
  - **Fear**: S&P 500 < 125-day MA (Slowing momentum).
- **Interpretation**: Measures the long-term trend of the market. Persistent trading above the moving average signals bullish sentiment.

## 2. Stock Price Strength
**Net New Highs vs. Lows**
- **Definition**: The number of stocks on the NYSE hitting 52-week highs minus those hitting 52-week lows.
- **Logic**:
  - **Greed**: More Highs than Lows (Positive breadth).
  - **Fear**: More Lows than Highs (Negative breadth).
- **Interpretation**: A healthy market rally is supported by many stocks making new highs.

## 3. Stock Price Breadth
**McClellan Volume Summation Index**
- **Definition**: A cumulative measure of advancing volume minus declining volume on the NYSE.
- **Logic**:
  - **Greed**: Rising summation index (Buying volume dominates).
  - **Fear**: Falling/Low summation index (Selling volume dominates).
- **Interpretation**: Measures the liquidity flowing into or out of the market.

## 4. Put and Call Options
**Put/Call Ratio**
- **Definition**: The 5-day moving average of the Put/Call Ratio (CBOE).
- **Logic**:
  - **Fear**: Ratio > 1 (Investors buying more puts/insurance).
  - **Greed**: Ratio < 1 (Investors buying more calls/bets on upside).
- **Interpretation**: High put buying indicates nervousness; high call buying indicates speculation.

## 5. Market Volatility
**VIX Volatility**
- **Definition**: The VIX Index (50-day MA) compared to the current VIX.
- **Logic**:
  - **Fear**: VIX is rising or above its 50-day average.
  - **Greed**: VIX is low or falling below its 50-day average.
- **Interpretation**: VIX measures "implied volatility" or expected fear. Lower VIX usually correlates with Bull markets.

## 6. Safe Haven Demand
**Stock vs. Bond Returns**
- **Definition**: Difference between Stock returns (S&P 500) and Treasury Bond returns over the past 20 trading days.
- **Logic**:
  - **Fear**: Bonds outperforming Stocks (Investors fleeing to safety).
  - **Greed**: Stocks outperforming Bonds (Investors taking risk).
- **Interpretation**: Shows preference for risk-assets vs. risk-free assets.

## 7. Junk Bond Demand
**Junk Bond vs. Investment Grade Spread**
- **Definition**: The yield spread between Junk Bonds (High Yield) and Safer Bonds (Treasuries/Investment Grade).
- **Logic**:
  - **Fear**: Spread widening (Investors demand higher premium for risk).
  - **Greed**: Spread narrowing (Investors accepting lower yields for risk).
- **Interpretation**: A tight spread indicates investors are comfortable with credit risk (Greed).

---

## Calculation Implementation
*See `scripts/calc_fear_greed.py` for the exact formula implementation.*
The final index is an equal-weighted average of these 7 normalized indicators (0-100 scale).
