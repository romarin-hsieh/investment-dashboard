import yfinance as yf
import pandas as pd
import numpy as np
from scipy.optimize import minimize

# Extended Truth Table
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
    "2026-01-12": 59
}

def fixed_scale(value, min_val, max_val):
    clamped = max(min_val, min(value, max_val))
    return ((clamped - min_val) / (max_val - min_val)) * 100

def fetch_data():
    tickers = ["^GSPC", "^VIX", "JNK", "IEF", "^NYA"]
    # Need data covering Oct 2025. 2yr history is fine.
    data = yf.download(tickers, period="2y", interval="1d", progress=False)
    if isinstance(data.columns, pd.MultiIndex):
        closes = data['Close']
    else:
        closes = data
    return closes.ffill()

def calculate_components(df):
    results = pd.DataFrame(index=df.index)
    
    # 1. Momentum: SPX vs 125 SMA (%)
    spx = df['^GSPC']
    ma125 = spx.rolling(125).mean()
    mom_pct = ((spx - ma125) / ma125) * 100
    results['momentum'] = mom_pct.apply(lambda x: fixed_scale(x, -5, 5))
    
    # 2. Strength: NYA vs 52wk Position
    nya = df['^NYA']
    low252 = nya.rolling(252).min()
    high252 = nya.rolling(252).max()
    pos = (nya - low252) / (high252 - low252) 
    results['strength'] = pos * 100
    
    # 3. Breadth: Proxy via VIX Delta (Inverted)
    vix = df['^VIX']
    vix_slope = vix.diff(5)
    breadth_score = vix_slope.apply(lambda x: fixed_scale(x, -2, 2))
    results['breadth'] = 100 - breadth_score
    
    # 4. Options: Proxy via VIX Level (Inverted)
    opt_score = vix.apply(lambda x: fixed_scale(x, 10, 30))
    results['options'] = 100 - opt_score
    
    # 5. Volatility: VIX vs 50MA (Inverted)
    vix_ma50 = vix.rolling(50).mean()
    vix_diff = vix - vix_ma50
    vol_score = vix_diff.apply(lambda x: fixed_scale(x, -5, 5))
    results['volatility'] = 100 - vol_score
    
    # 6. Safe Haven: Stock - Bond Returns (20d %)
    spx_ret = spx.pct_change(20) * 100
    bond_ret = df['IEF'].pct_change(20) * 100
    safe_diff = spx_ret - bond_ret
    results['safe_haven'] = safe_diff.apply(lambda x: fixed_scale(x, -5, 5))
    
    # 7. Junk Bond: Ratio Deviation
    junk_ratio = df['JNK'] / df['IEF']
    ratio_ma = junk_ratio.rolling(125).mean()
    ratio_diff = (junk_ratio - ratio_ma) / ratio_ma * 100
    results['junk_bond'] = ratio_diff.apply(lambda x: fixed_scale(x, -3, 3))
    
    return results

def optimize_weights(df):
    COMPONENT_NAMES = ['momentum', 'strength', 'breadth', 'options', 'volatility', 'safe_haven', 'junk_bond']
    
    # Create target array
    targets = []
    component_matrix = []
    dates_used = []
    
    for date_str, target in TRUTH_TABLE.items():
        try:
            date = pd.Timestamp(date_str)
            if date not in df.index:
                # Find nearest
                idx = df.index.get_indexer([date], method='nearest')[0]
                date = df.index[idx]
            
            row = df.loc[date]
            vals = [row[c] for c in COMPONENT_NAMES]
            if not any(np.isnan(vals)):
                component_matrix.append(vals)
                targets.append(target)
                dates_used.append(date_str)
        except Exception as e:
            print(f"Skip {date_str}: {e}")

    X = np.array(component_matrix) # Shape (N_samples, 7)
    y = np.array(targets)          # Shape (N_samples,)
    
    def loss_fn(weights):
        # Weights sum to 1 constraint is handled by manual normalization inside or constraints
        # Here we just penalize
        w = np.array(weights)
        w = w / np.sum(w) # Normalize to 1
        preds = X @ w
        mse = np.mean((preds - y) ** 2)
        return mse

    # Initial guess: Equal weights
    init_w = np.ones(7) / 7
    
    # Bounds: Weights between 0 and 1
    bounds = [(0, 1) for _ in range(7)]
    
    # Constrain sum to 1
    constraints = ({'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0})
    
    res = minimize(loss_fn, init_w, method='SLSQP', bounds=bounds, constraints=constraints)
    
    best_weights = res.x / np.sum(res.x)
    final_mse = loss_fn(best_weights)
    
    print("\n--- Optimized Weights ---")
    for name, w in zip(COMPONENT_NAMES, best_weights):
        print(f"{name:<12}: {w:.3f}")
        
    print(f"\nFinal MSE: {final_mse:.2f}")
    
    # Verification with new weights
    print("\n--- Verification (Optimized) ---")
    print(f"{'Date':<12} | {'Target':<6} | {'Calc':<6} | {'Diff':<5}")
    print("-" * 40)
    
    preds = X @ best_weights
    for d, t, p in zip(dates_used, y, preds):
         print(f"{d:<12} | {t:<6} | {p:<6.1f} | {p-t:<5.1f}")

    return best_weights

if __name__ == "__main__":
    df_raw = fetch_data()
    df_comps = calculate_components(df_raw)
    optimize_weights(df_comps)
