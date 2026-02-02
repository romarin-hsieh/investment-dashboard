import os
import json
import pandas as pd
import numpy as np
import sys

# Fix import
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from quant_engine import KineticMarketState
except ImportError:
    from research.quant_engine import KineticMarketState

DATA_DIR = "public/data"

class OptimizedBacktestEngine:
    def __init__(self, initial_capital=100000):
        self.initial_capital = initial_capital
        
    def load_data(self):
        manifest_path = os.path.join(DATA_DIR, "manifest.json")
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        tickers = manifest.get("success", [])
        data_map = {}
        
        # 1. Load VIX
        vix_path = os.path.join(DATA_DIR, "^VIX.json")
        if os.path.exists(vix_path):
            with open(vix_path, 'r') as f:
                vix_data = json.load(f)
            vix_df = pd.DataFrame(vix_data)
            if 'time' in vix_df.columns:
                vix_df['date'] = pd.to_datetime(vix_df['time'])
            data_map['^VIX'] = vix_df
        
        # 2. Load Tickers
        for ticker in tickers:
            if ticker == "^VIX": continue
            filepath = os.path.join(DATA_DIR, f"{ticker}.json")
            with open(filepath, 'r') as f:
                data = json.load(f)
            df = pd.DataFrame(data)
            if not df.empty and 'time' in df.columns:
                df['date'] = pd.to_datetime(df['time'])
                engine = KineticMarketState(df)
                data_map[ticker] = engine.analyze()
                
        return data_map

    def run_period(self, start_date, end_date, name):
        print(f"\n--- Optimized v2.0 Backtest: {name} ({start_date} to {end_date}) ---")
        
        cash = self.initial_capital
        positions = {}
        history = []
        trade_log = []
        max_positions = 5
        position_size = 0.10
        
        data_map = self.load_data()
        
        # Filter dates
        all_dates = sorted(list(set().union(*[df['date'].tolist() for df in data_map.values()])))
        period_dates = [d for d in all_dates if pd.Timestamp(start_date) <= d <= pd.Timestamp(end_date)]
        
        vix_df = data_map.get('^VIX')
        
        for current_date in period_dates:
            # Check VIX Panic Level
            is_panic = False
            if vix_df is not None:
                vix_row = vix_df[vix_df['date'] == current_date]
                if not vix_row.empty and vix_row.iloc[0]['close'] > 35:
                    is_panic = True
            
            # 1. Update/Exit Positions
            current_equity = cash
            for ticker, pos in list(positions.items()):
                df = data_map[ticker]
                row = df[df['date'] == current_date]
                if row.empty: continue
                price = row.iloc[0]['close']
                current_equity += pos['qty'] * price
                
                # OPTIMIZATION NOTE: Adaptive Exit
                # If Trend (X) is still > 0.5, we hold (Trend Following Mode)
                # Else fallback to Time Exit (5 days)
                
                x_trend = row.iloc[0]['x_trend']
                days_held = (current_date - pos['entry_date']).days
                pnl_pct = (price - pos['entry_price']) / pos['entry_price']
                
                should_exit = False
                
                if pnl_pct < -0.05: # Stop Loss (Hard Rule)
                    should_exit = True
                elif x_trend > 0.5: # Strong Trend -> Let it run!
                    should_exit = False
                elif days_held >= 5: # Time Exit (Only if trend is weak)
                    should_exit = True
                
                if should_exit:
                    cash += pos['qty'] * price
                    trade_log.append({"pnl": pnl_pct})
                    del positions[ticker]
            
            history.append(current_equity)
            
            # 2. Enter Positions (If not Panic)
            if not is_panic and len(positions) < max_positions:
                candidates = []
                for ticker, df in data_map.items():
                    if ticker == "^VIX": continue
                    row = df[df['date'] == current_date]
                    if row.empty: continue
                    
                    if ticker not in positions:
                        if row.iloc[0]['signal'] in ["DIP_BUY", "LAUNCHPAD"]:
                            candidates.append({
                                'ticker': ticker,
                                'price': row.iloc[0]['close'],
                                'x_trend': row.iloc[0]['x_trend']
                            })
                
                # OPTIMIZATION NOTE: Relative Strength Ranking
                # Sort candidates by X-Trend (Strongest first)
                candidates.sort(key=lambda x: x['x_trend'], reverse=True)
                
                for cand in candidates:
                    if len(positions) >= max_positions: break
                    
                    allocation = current_equity * position_size
                    if cash > allocation:
                        qty = allocation / cand['price']
                        cash -= allocation
                        positions[cand['ticker']] = {
                            "qty": qty, "entry_price": cand['price'], "entry_date": current_date
                        }

        # Stats
        final_equity = history[-1] if history else self.initial_capital
        total_ret = (final_equity - self.initial_capital) / self.initial_capital
        trades = pd.DataFrame(trade_log)
        win_rate = (trades['pnl'] > 0).mean() if not trades.empty else 0
        
        equity_curve = pd.Series(history)
        peak = equity_curve.cummax()
        max_dd = ((equity_curve - peak) / peak).min() if not pd.isna(peak.max()) else 0
        
        print(f"Total Return: {total_ret:.2%}")
        print(f"Max Drawdown: {max_dd:.2%}")
        print(f"Win Rate:     {win_rate:.1%}")
        print(f"Trade Count:  {len(trades)}")
        
        return { "period": name, "return": total_ret * 100, "max_dd": max_dd * 100 }

if __name__ == "__main__":
    engine = OptimizedBacktestEngine()
    
    # Run requested years
    results = []
    years = [2018, 2019, 2023, 2024, 2025]
    
    for year in years:
        start = f"{year}-01-01"
        end = f"{year}-12-31"
        res = engine.run_period(start, end, str(year))
        results.append(res)
        
    # Summary Table
    print("\n=== OPTIMIZED PERFORMANCE SUMMARY ===")
    print(f"{'Year':<10} {'Return':<10} {'MaxDD':<10}")
    print("-" * 30)
    for r in results:
        print(f"{r['period']:<10} {r['return']:>6.2f}% {r['max_dd']:>7.2f}%")
