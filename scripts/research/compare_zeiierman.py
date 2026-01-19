import yfinance as yf
import pandas as pd
import numpy as np

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

def fetch_data():
    # Proxies for Zeiierman's inputs
    # SPX -> ^GSPC
    # ADVN/DECN -> Not avail. Use Volume Proxy or just VIX inv? Zeiierman uses ADVN/DECN explicitly. 
    # We don't have ADVN/DECN in yfinance easily without fetching breadth data. 
    # For fair comparison, we use OUR best proxies but HIS formulas?
    # No, to answer "Zeiierman's algorithm", we must implement HIS math.
    # We will use Volume flows as proxy for Adv/Dec if needed, or just VIX proxy as fallback but applying HIS Normalization.
    # Let's use our data but apply his MinMax Logic.
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

# --- Current Method (Z-Score 125d) ---
def calc_current(closes, highs, lows):
    def z_norm(series, invert=False, scale=20):
        wd = 125
        rm = series.rolling(wd).mean()
        rstd = series.rolling(wd).std()
        z = (series - rm) / rstd
        if invert: z = -z
        return (50 + z*scale).clip(0, 100)

    # Momentum
    spx = closes['^GSPC']
    ma125 = spx.rolling(125).mean()
    mom = z_norm(spx / ma125)

    # Strength
    nya = closes['^NYA']
    h52 = nya.rolling(252).max()
    l52 = nya.rolling(252).min()
    stre = z_norm((nya - l52)/(h52-l52))

    # Breadth (VIX diff)
    vix = closes['^VIX']
    br = z_norm(vix.diff(5), invert=True)

    # Options (VIX Lvl)
    opt = z_norm(vix, invert=True)

    # Vol (VIX vs 50)
    vma50 = vix.rolling(50).mean()
    vol = z_norm((vix - vma50)/vma50, invert=True)

    # Safe
    sret = spx.pct_change(20)
    bret = closes['IEF'].pct_change(20)
    safe = z_norm(sret - bret)

    # Junk
    junk = z_norm(closes['JNK']/closes['IEF'])

    return (mom+stre+br+opt+vol+safe+junk)/7

# --- Zeiierman Method (MinMax) ---
def calc_zeiierman(closes, highs, lows):
    # Zeiierman uses two scaling functions:
    # Scales(input) -> MinMax over global/long window (Simulate 500)
    # Scale(input) -> MinMax over 100
    
    def scales(series, window=500):
        # Rolling MinMax over "max_bars_back"
        rmin = series.rolling(window).min()
        rmax = series.rolling(window).max()
        return ((series - rmin) / (rmax - rmin) * 100).clip(0, 100)

    def scale100(series):
        return scales(series, 100)

    spx = closes['^GSPC']
    vix = closes['^VIX']
    
    # 1. SPX 125MA
    # Code: Scales(spxPrice - spxAverage)
    sma125 = spx.rolling(125).mean()
    mom = scales(spx - sma125)

    # 2. Strength
    # Code: close - avg(highest(52), lowest(52))
    # Note: Zeiierman uses Weekly data for this ("W"). We have daily. 52 weeks = 252 days.
    nya = closes['^NYA'] # Proxy for NYSE
    h52 = nya.rolling(252).max()
    l52 = nya.rolling(252).min()
    mid = (h52 + l52) / 2
    # He divides by 100 in logic? "week52 / 100" -> Then scales.
    # The div 100 doesn't matter for MinMax.
    stre = scales(nya - mid)

    # 3. Breadth
    # Code: SMA(Adv - Dec, 19). 
    # WE DO NOT HAVE ADV/DEC. We must use a proxy. 
    # Use VIX Slope? Or SPX Volume * sign?
    # For honest comparison, let's use OUR Breadth Proxy (VIX diff) but HIS Normalization (Scales).
    # Zeiierman uses `Scales(ta.sma(adv-dec, 19))`
    # Our proxy: VIX 5d diff inverted.
    # Let's smooth it like he does (SMA 19).
    # Invert first because High VIX = Fear (Low Breath).
    br_proxy = -vix.diff(1)
    br = scales(br_proxy.rolling(19).mean())

    # 4. Put/Call
    # Code: Scale(-putCallRatio). Lookback 100.
    # Our proxy: VIX level (inverted).
    opt = scale100(-vix)

    # 5. Volatility
    # Code: Scale(-(vix - vixMA50))
    vix50 = vix.rolling(50).mean()
    vol = scale100(-(vix - vix50))

    # 6. Safe Haven
    # Code: Scales(SMA(spx - spx[20], 20) - (Bond - Bond[20]))
    # SPX 20d momentum smoothed vs Bond 20d diff.
    spx_chg = spx.diff(20)
    spx_smooth = spx_chg.rolling(20).mean()
    
    bond = closes['IEF'] # Proxy for US10Y price
    bond_chg = bond.diff(20)
    
    safe = scales(spx_smooth - bond_chg)

    # 7. Junk Bond
    # Code: Scale(JunkYield - TreasuryYield).
    # We have Prices (JNK, IEF). Yield moves opposite.
    # Spread = JunkYield - TryYield.
    # Price Ratio JNK/IEF is roughly inverse to Yield Spread.
    # He uses Scale (100d).
    # We use JNK/IEF ratio.
    yield_proxy = closes['JNK'] / closes['IEF']
    xy = scale100(yield_proxy)

    avg = (mom + stre + br + opt + vol + safe + xy) / 7
    return avg

if __name__ == "__main__":
    closes, highs, lows = fetch_data()
    
    curr = calc_current(closes, highs, lows)
    zeii = calc_zeiierman(closes, highs, lows)
    
    print(f"{'Date':<12} | {'Target':<6} | {'Current':<8} | {'Zeiierman':<8} | {'Diff(Z-C)':<6}")
    print("-" * 60)
    
    c_err = 0
    z_err = 0
    count = 0
    
    for d_str, tgt in TRUTH_TABLE.items():
        try:
            d = pd.Timestamp(d_str)
            
            # Find closest date
            idx = closes.index.get_indexer([d], method='nearest')[0]
            
            val_c = curr.iloc[idx]
            val_z = zeii.iloc[idx]
            
            diff = val_z - val_c
            
            c_err += abs(val_c - tgt)
            z_err += abs(val_z - tgt)
            count += 1
            
            print(f"{d_str:<12} | {tgt:<6} | {val_c:<8.1f} | {val_z:<8.1f} | {diff:<6.1f}")
        except:
            pass
            
    print("-" * 60)
    print(f"Avg Error    | {'-':<6} | {c_err/count:<8.1f} | {z_err/count:<8.1f}")
