import yfinance as yf
import pandas as pd
import numpy as np

# Target "Truth" values for verification
TRUTH_TABLE = {
    "2025-10-16": 23,
    "2025-10-21": 29,
    "2025-10-27": 37,
    "2025-10-28": 39,
    "2025-11-05": 23,
    "2025-11-21": 6,
    "2025-11-25": 15,
    "2025-12-01": 22,
    "2025-12-05": 38,
    "2025-12-17": 47,
    "2025-12-22": 57,
    "2025-12-26": 53,
    "2026-01-01": 45,
    "2026-01-06": 52,
    "2026-01-07": 44,
    "2026-01-09": 54,
    "2026-01-12": 59,
    "2026-01-15": 62,
    "2026-01-16": 62
}

def calculate_z_score(series, window=125):
    """
    Calculate rolling Z-Score: (Value - Mean) / StdDev
    """
    roll_mean = series.rolling(window=window).mean()
    roll_std = series.rolling(window=window).std()
    z_score = (series - roll_mean) / roll_std
    return z_score

def normalize_score(z_score, invert=False):
    """
    Map Z-Score to 0-100.
    Scaling Factor: 20
    """
    if invert:
        z_score = -z_score
        
    score = 50 + (z_score * 20)
    return score.clip(0, 100)

def fetch_data():
    tickers = ["^GSPC", "^VIX", "JNK", "IEF", "^NYA"]
    # Need enough data for 252d rolling window
    data = yf.download(tickers, period="5y", interval="1d", progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        closes = data['Close']
        highs = data['High']
        lows = data['Low']
        volumes = data['Volume']
    else:
        closes = data
        highs = data
        lows = data
        volumes = data
    return closes.ffill(), highs.ffill(), lows.ffill(), volumes.ffill()

def calculate_index(closes, highs, lows, volumes):
    results = pd.DataFrame(index=closes.index)
    
    # 1. Momentum: SPX Price relative to 125-day MA
    # Raw Metric: Price / MA125 (or Diff)
    spx = closes['^GSPC']
    ma125 = spx.rolling(125).mean()
    mom_metric = spx / ma125
    # Normalize: Z-Score of this metric
    z_mom = calculate_z_score(mom_metric)
    results['momentum'] = normalize_score(z_mom)
    
    # 2. Strength: Stocks at Highs vs Lows
    # Proxy: NYA Price relative to 52-week High/Low range?
    # Better Proxy if we don't have individual stock data: Position in 52wk Range
    # (Current - Low52) / (High52 - Low52) -> Then Z-Score of this ratio?
    # CNN uses "Number of stocks hitting 52w highs vs lows". We don't have this.
    # Proxy: Use Ratio of NYA vs its 52w High.
    nya = closes['^NYA']
    high52 = nya.rolling(252).max()
    low52 = nya.rolling(252).min()
    # str_metric = (nya - low52) / (high52 - low52)  # Relative position
    # Actually, let's use the raw deviation from Highs as a proxy for "Strength"
    # Or just use the Z-Score of the NYA index itself? No, that's just price level.
    # Let's stick to the Position Proxy, normalized by ITS history.
    str_metric = (nya - low52) / (high52 - low52)
    z_str = calculate_z_score(str_metric)
    results['strength'] = normalize_score(z_str)
    
    # 3. Breadth: McClellan Summation Index
    # Proxy: VIX 5-day slope is poor.
    # Better Proxy: Relative Volume on Up days vs Down days? Hard with just indices.
    # Let's use the VIX Slope again but normalize via Z-Score.
    # Or, deviation of NYSE volume? 
    # Let's stick to VIX Delta as a "Fear Impulse" proxy.
    vix = closes['^VIX']
    # breadth_metric = vix.diff(10).rolling(5).mean() # Smoothed change
    # Or simply: VIX itself (short term) vs VIX (long term)? That's volatility.
    # Let's use the TRIN proxy if available? No.
    # Revert to: VIX inverted change.
    breadth_metric = vix.diff(5) 
    z_breadth = calculate_z_score(breadth_metric)
    results['breadth'] = normalize_score(z_breadth, invert=True) # Rising VIX = Fear
    
    # 4. Put/Call Ratio
    # Proxy: VIX Level relative to recent history (Z-Score of VIX itself)
    # High VIX = Fear.
    z_opt = calculate_z_score(vix)
    results['options'] = normalize_score(z_opt, invert=True)
    
    # 5. Volatility: VIX vs 50-day MA
    vix_ma50 = vix.rolling(50).mean()
    vol_metric = (vix - vix_ma50) / vix_ma50 # Pct deviation
    z_vol = calculate_z_score(vol_metric)
    results['volatility'] = normalize_score(z_vol, invert=True) # Higher > MA = Fear
    
    # 6. Safe Haven: Stock Return - Bond Return (20d)
    spx_ret = spx.pct_change(20)
    bond_ret = closes['IEF'].pct_change(20)
    safe_metric = spx_ret - bond_ret # Higher = Greed
    z_safe = calculate_z_score(safe_metric)
    results['safe_haven'] = normalize_score(z_safe)
    
    # 7. Junk Bond Demand: Yield Spread (JNK vs IEF)
    # Yield move inversely to price. 
    # JNK Yield approx: Distribution? No.
    # Use Price Ratio: JNK / IEF. 
    # Risk On = JNK outperforms IEF (Ratio rises).
    # Risk Off = JNK underperforms (Ratio falls).
    junk_metric = closes['JNK'] / closes['IEF']
    z_junk = calculate_z_score(junk_metric)
    results['junk_bond'] = normalize_score(z_junk)
    
    # Combine (Equal Weight)
    components = ['momentum', 'strength', 'breadth', 'options', 'volatility', 'safe_haven', 'junk_bond']
    results['FGI'] = results[components].mean(axis=1)
    
    return results

def verify(results):
    print(f"{'Date':<12} | {'Target':<6} | {'Calc':<6} | {'Diff':<5}")
    print(f"{' ':12} | {' ':6} | {'Mom':<5} {'Str':<5} {'Br(V)':<5} {'Opt(V)':<5} {'Vol':<5} {'Safe':<5} {'Junk':<5}")
    print("-" * 80)
    
    total_diff = 0
    count = 0
    
    for date_str, expected in TRUTH_TABLE.items():
        try:
            date = pd.Timestamp(date_str)
            if date not in results.index:
                idx = results.index.get_indexer([date], method='nearest')[0]
            else:
                idx = results.index.get_loc(date)
                
            row = results.iloc[idx]
            score = row['FGI']
            diff = score - expected
            total_diff += abs(diff)
            count += 1
            
            print(f"{date_str:<12} | {expected:<6} | {score:<6.1f} | {diff:<5.1f}")
            print(f"{' ':12} | {' ':6} | "
                  f"{row['momentum']:<5.1f} {row['strength']:<5.1f} {row['breadth']:<5.1f} "
                  f"{row['options']:<5.1f} {row['volatility']:<5.1f} {row['safe_haven']:<5.1f} {row['junk_bond']:<5.1f}")
            print("-" * 50)
                  
        except Exception as e:
            print(f"Error {date_str}: {e}")

    print(f"Average Abs Error: {total_diff/count:.2f}")

if __name__ == "__main__":
    try:
        closes, highs, lows, vols = fetch_data()
        res = calculate_index(closes, highs, lows, vols)
        verify(res)
    except Exception as e:
        print(f"Execution Error: {e}")
