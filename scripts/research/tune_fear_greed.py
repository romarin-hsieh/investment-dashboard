import yfinance as yf
import pandas as pd
import numpy as np

# Target "Truth" values
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

def calculate_z_score(series, window):
    roll_mean = series.rolling(window=window).mean()
    roll_std = series.rolling(window=window).std()
    # Avoid div by zero
    z_score = (series - roll_mean) / roll_std.replace(0, np.nan)
    return z_score

def normalize_score(z_score, scale, invert=False):
    if invert:
        z_score = -z_score
    score = 50 + (z_score * scale)
    return score.clip(0, 100)

def fetch_data():
    tickers = ["^GSPC", "^VIX", "JNK", "IEF", "^NYA"]
    data = yf.download(tickers, period="5y", interval="1d", progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        closes = data['Close']
        highs = data['High']
        lows = data['Low']
    else:
        closes = data
        highs = data
        lows = data
    return closes.ffill(), highs.ffill(), lows.ffill()

def run_scenario(closes, highs, lows, lookback, scale):
    results = pd.DataFrame(index=closes.index)
    
    # 1. Momentum: SPX / MA125
    spx = closes['^GSPC']
    ma125 = spx.rolling(125).mean()
    mom_metric = spx / ma125
    results['mom'] = normalize_score(calculate_z_score(mom_metric, lookback), scale)
    
    # 2. Strength: Price Position in 52w Range
    # Proxy for Net Highs/Lows
    nya = closes['^NYA']
    h52 = nya.rolling(252).max()
    l52 = nya.rolling(252).min()
    str_metric = (nya - l52) / (h52 - l52)
    results['str'] = normalize_score(calculate_z_score(str_metric, lookback), scale)
    
    # 3. Breadth: VIX 5d Delta (Inverted)
    vix = closes['^VIX']
    breadth_metric = vix.diff(5)
    results['br'] = normalize_score(calculate_z_score(breadth_metric, lookback), scale, invert=True)
    
    # 4. Options: VIX Level (Inverted)
    results['opt'] = normalize_score(calculate_z_score(vix, lookback), scale, invert=True)
    
    # 5. Volatility: VIX vs MA50 (Inverted)
    vix_ma50 = vix.rolling(50).mean()
    vol_metric = (vix - vix_ma50) / vix_ma50
    results['vol'] = normalize_score(calculate_z_score(vol_metric, lookback), scale, invert=True)
    
    # 6. Safe Haven: Stock - Bond 20d
    spx_ret = spx.pct_change(20)
    bond_ret = closes['IEF'].pct_change(20)
    safe_metric = spx_ret - bond_ret
    results['safe'] = normalize_score(calculate_z_score(safe_metric, lookback), scale)
    
    # 7. Junk Bond: JNK/IEF Ratio
    junk_metric = closes['JNK'] / closes['IEF']
    results['junk'] = normalize_score(calculate_z_score(junk_metric, lookback), scale)
    
    # Combine
    results['FGI'] = results[['mom', 'str', 'br', 'opt', 'vol', 'safe', 'junk']].mean(axis=1)
    
    # Calculate Error
    total_error = 0
    count = 0
    
    for date_str, target in TRUTH_TABLE.items():
        try:
            d = pd.Timestamp(date_str)
            if d in results.index:
                val = results.loc[d, 'FGI']
            else:
                idx = results.index.get_indexer([d], method='nearest')[0]
                val = results.iloc[idx]['FGI']
            
            if not np.isnan(val):
                total_error += abs(val - target)
                count += 1
        except:
            pass
            
    return total_error / count if count > 0 else 999

if __name__ == "__main__":
    closes, highs, lows = fetch_data()
    
    print(f"{'Lookback':<10} | {'Scale':<10} | {'Avg Error':<10}")
    print("-" * 36)
    
    best_err = 999
    best_params = (0, 0)
    
    # Grid Search
    lookbacks = [63, 125, 252, 500] # 3m, 6m, 1y, 2y
    scales = [15, 20, 25, 30] 
    
    for lb in lookbacks:
        for sc in scales:
            err = run_scenario(closes, highs, lows, lb, sc)
            print(f"{lb:<10} | {sc:<10} | {err:<10.2f}")
            if err < best_err:
                best_err = err
                best_params = (lb, sc)
                
    print(f"\nBest Parameters: Lookback={best_params[0]}, Scale={best_params[1]}, Error={best_err:.2f}")
