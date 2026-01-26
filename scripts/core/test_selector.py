import sys
import os
import pandas as pd
import numpy as np

sys.path.append(os.getcwd())
from scripts.core.strategy_selector import QuantSystem, MarketRegime

def create_mock(trend="up", volatility="normal"):
    dates = pd.date_range(start="2024-01-01", periods=250)
    
    if trend == "up":
        # Price > MA200/MA20
        # Add noise to standard period
        np.random.seed(42)
        noise = np.random.normal(0, 1, 250)
        close = np.linspace(100, 120, 250) + noise
    else:
        # Price < MA20
        np.random.seed(42)
        noise = np.random.normal(0, 1, 250)
        close = np.linspace(120, 100, 250) + noise
        
    if volatility == "squeeze":
        # Squeeze in last 20 days
        close[-20:] = 115.0 # Flat
        
    if volatility == "breakout":
        # Squeeze then Pop
        close[-20:-1] = 115.0
        close[-1] = 125.0
        
    df = pd.DataFrame({
        'date': dates,
        'open': close, 'high': close*1.02, 'low': close*0.98, 'close': close, 'volume': [1000]*250
    })
    return df

def test_v6_system():
    qs = QuantSystem()
    print("--- v6.0 Integration Test ---")
    
    # Context
    spy_bull = create_mock("up")
    spy_bear = create_mock("down")
    
    xlk_up = create_mock("up")   # Tech Sector Strong
    xlk_down = create_mock("down") # Tech Sector Weak
    
    stock_breakout = create_mock("up", volatility="breakout")
    
    # Case 1: Perfect Setup (Bull + Peer Up + Breakout)
    res1 = qs.analyze_ticker("AAPL", stock_breakout, spy_bull, xlk_up)
    print(f"1. A+ Setup (Bull+SectorUp): {res1['Signal']} (Reason: {res1['Reason']})")
    
    # Case 2: Peer Weakness (Bull + Peer Down + Breakout)
    res2 = qs.analyze_ticker("AAPL", stock_breakout, spy_bull, xlk_down)
    print(f"2. Peer Weakness (Bull+SectorDown): {res2['Signal']} (Reason: {res2['Reason']})")
    
    # Case 3: Global Bear (Bear + Peer Up + Breakout)
    res3 = qs.analyze_ticker("AAPL", stock_breakout, spy_bear, xlk_up)
    print(f"3. Global Bear (Bear+SectorUp): {res3['Signal']} (Reason: {res3['Reason']})")
    
if __name__ == "__main__":
    test_v6_system()
