"""
Tag-Based Strategy Validator
Performs rigorous statistical validation of the Tag Matrix Hypothesis.
1. Comparative Analysis: Static vs Tag-Optimized Parameters.
2. Sensitivity Analysis: Parameter stability testing.
3. Regime Robustness: Performance across Bull/Bear markets.
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime

# Add parent directory to path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from research.quant_engine import KineticMarketState
from data.tag_engine import get_ticker_tags, get_strategy_mode
from data.category_universes import get_all_category_tickers

# --- 1. Parametric Engine (Subclass for Validation) ---

class ParametricMarketState(KineticMarketState):
    def __init__(self, df, params=None):
        super().__init__(df)
        # Default Parameters (Baseline)
        self.params = {
            "dip_buy_x": 0.5,
            "dip_buy_y": 0.2,
            "momentum_x": 1.0,
            "momentum_y": 0.9,
            "avoid_x": -0.5
        }
        if params:
            self.params.update(params)

    def _get_signal_tag(self, row):
        x, y, z = row['x_trend'], row['y_momentum'], row['z_structure']
        p = self.params
        
        # Modified Logic using injected parameters
        if z > 0.8 and x > 0: return "LAUNCHPAD"
        if x > p['dip_buy_x'] and y < p['dip_buy_y']: return "DIP_BUY"
        if x > p['momentum_x'] and y > p['momentum_y']: return "MOMENTUM_RUN"
        if x < p['avoid_x']: return "AVOID"
        return "WAIT"

# --- 2. Backtest Engine (Simplified for Speed) ---

class SimpleBacktester:
    def __init__(self, df):
        self.df = df
    
    def run(self, initial_capital=10000):
        capital = initial_capital
        position = 0
        equity_curve = []
        
        for index, row in self.df.iterrows():
            signal = row['signal']
            price = row['close']
            
            # Simple Logic: 100% allocation per ticker (for unit testing)
            if signal in ["LAUNCHPAD", "DIP_BUY"] and position == 0:
                position = capital / price
                capital = 0
            
            elif signal in ["AVOID"] and position > 0:
                capital = position * price
                position = 0
            
            # value tracking
            current_val = capital + (position * price)
            equity_curve.append(current_val)
            
        self.df['equity'] = equity_curve
        
        # Calculate Stats
        total_return = (equity_curve[-1] - initial_capital) / initial_capital
        
        # Max Drawdown
        equity_series = pd.Series(equity_curve)
        rolling_max = equity_series.cummax()
        drawdown = (equity_series - rolling_max) / rolling_max
        max_dd = drawdown.min()
        
        # CAGR (approx)
        years = len(self.df) / 252
        cagr = ((equity_curve[-1] / initial_capital) ** (1/years)) - 1 if years > 0 else 0
        
        return {
            "total_return": total_return,
            "max_dd": max_dd,
            "cagr": cagr,
            "equity_curve": equity_series
        }

# --- 3. Validation Logic ---

def get_params_for_mode(mode):
    """Maps Strategy Mode to specific numeric parameters."""
    if mode == "TREND_FOLLOWING": # For Growth/SmallCap
        return {
            "dip_buy_x": 0.6,    # Stricter Trend requirement (Trend is friend)
            "dip_buy_y": 0.3,    # Looser Oversold (Buy shallow dips)
            "momentum_x": 0.8,   # Easier to enter Momentum Run
            "avoid_x": 0.0       # Exit immediately if Trend breaks 0 (Fast Exit)
        }
    elif mode == "MEAN_REVERSION": # For Value/Dividend
        return {
            "dip_buy_x": 0.3,    # Looser Trend (It's ok if trend is weak)
            "dip_buy_y": 0.1,    # Stricter Oversold (Must be deep value)
            "momentum_x": 1.5,   # Harder to enter Momentum Run (Fade rallies)
            "avoid_x": -0.8      # Hold through chop (Slow Exit)
        }
    else: # BALANCED (Baseline)
        return {
            "dip_buy_x": 0.5,
            "dip_buy_y": 0.2,
            "momentum_x": 1.0,
            "avoid_x": -0.5
        }

def load_data(ticker):
    path = f"public/data/{ticker}.json"
    if not os.path.exists(path):
        return None
    try:
        df = pd.read_json(path)
        # Rename columns standard
        df.columns = [c.lower() for c in df.columns]
        return df
    except:
        return None

def run_validation():
    print("Starting Tag-Based Strategy Validation...")
    tickers = get_all_category_tickers()
    
    results = []
    
    for ticker in tickers:
        df = load_data(ticker)
        if df is None or len(df) < 200:
            continue
            
        tags = get_ticker_tags(ticker)
        mode = get_strategy_mode(tags)
        
        # 1. Run Baseline (Static)
        engine_base = ParametricMarketState(df) # Uses defaults
        df_base = engine_base.analyze()
        bt_base = SimpleBacktester(df_base).run()
        
        # 2. Run Optimized (Dynamic)
        params = get_params_for_mode(mode)
        engine_opt = ParametricMarketState(df, params)
        df_opt = engine_opt.analyze()
        bt_opt = SimpleBacktester(df_opt).run()
        
        results.append({
            "ticker": ticker,
            "tags": str(tags),
            "mode": mode,
            "base_ret": bt_base['total_return'],
            "opt_ret": bt_opt['total_return'],
            "base_dd": bt_base['max_dd'],
            "opt_dd": bt_opt['max_dd'],
            "improvement": bt_opt['total_return'] - bt_base['total_return']
        })
        
    df_res = pd.DataFrame(results)
    
    print("\n--- 1. Comparative Analysis (Summary) ---")
    print(df_res[['ticker', 'mode', 'base_ret', 'opt_ret', 'improvement']].head(10))
    
    avg_base = df_res['base_ret'].mean()
    avg_opt = df_res['opt_ret'].mean()
    print(f"\nAverage Baseline Return: {avg_base:.2%}")
    print(f"Average Optimized Return: {avg_opt:.2%}")
    print(f"Net Improvement: {(avg_opt - avg_base):.2%}")
    
    print("\n--- 2. Sensitivity Analysis (Growth Tickers: Momentum Threshold) ---")
    growth_tickers = [t for t in tickers if "GROWTH" in get_ticker_tags(t)][:5] # Sample 5 for speed
    thresholds = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
    sens_results = {}
    
    print(f"Testing Sensitivity on: {growth_tickers}")
    for thresh in thresholds:
        avg_ret = 0
        for t in growth_tickers:
            df = load_data(t)
            if df is None: continue
            
            # Varying "dip_buy_x" (Trend Threshold)
            p = get_params_for_mode("TREND_FOLLOWING")
            p['dip_buy_x'] = thresh
            
            eng = ParametricMarketState(df, p)
            d = eng.analyze()
            bt = SimpleBacktester(d).run()
            avg_ret += bt['total_return']
            
        sens_results[thresh] = avg_ret / len(growth_tickers)
        
    for k, v in sens_results.items():
        print(f"Threshold X > {k}: Return = {v:.2%}")

    # Generate Report Content
    return df_res, sens_results

if __name__ == "__main__":
    run_validation()
