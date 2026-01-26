import os
import json
import pandas as pd
import numpy as np
import sys

# Fix import for local execution
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from quant_engine import KineticMarketState
except ImportError:
    from research.quant_engine import KineticMarketState

DATA_DIR = "public/data"

class ComparativeBacktestEngine:
    def __init__(self, initial_capital=100000):
        self.initial_capital = initial_capital
        
    def load_data(self):
        manifest_path = os.path.join(DATA_DIR, "manifest.json")
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        tickers = manifest.get("success", [])
        data_map = {}
        for ticker in tickers:
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
        print(f"\n--- Backtesting Period: {name} ({start_date} to {end_date}) ---")
        
        cash = self.initial_capital
        positions = {}
        history = []
        trade_log = []
        max_positions = 5
        position_size = 0.10
        holding_period = 5
        
        data_map = self.load_data()
        all_dates = sorted(list(set().union(*[df['date'].tolist() for df in data_map.values()])))
        period_dates = [d for d in all_dates if pd.Timestamp(start_date) <= d <= pd.Timestamp(end_date)]
        
        for current_date in period_dates:
            current_equity = cash
            
            # 1. Update/Exit Positions
            for ticker, pos in list(positions.items()):
                df = data_map[ticker]
                row = df[df['date'] == current_date]
                if row.empty: continue
                price = row.iloc[0]['close']
                current_equity += pos['qty'] * price
                
                days_held = (current_date - pos['entry_date']).days
                pnl_pct = (price - pos['entry_price']) / pos['entry_price']
                
                if days_held >= holding_period or pnl_pct < -0.05 or pnl_pct > 0.10:
                    cash += pos['qty'] * price
                    trade_log.append({
                        "pnl": pnl_pct, 
                        "year": current_date.year
                    })
                    del positions[ticker]
            
            history.append(current_equity)

            # 2. Enter Positions
            if len(positions) < max_positions:
                for ticker, df in data_map.items():
                    row = df[df['date'] == current_date]
                    if row.empty: continue
                    
                    if ticker not in positions:
                        # Strategy Logic
                        if row.iloc[0]['signal'] in ["DIP_BUY", "LAUNCHPAD"]:
                             allocation = current_equity * position_size
                             if cash > allocation:
                                 price = row.iloc[0]['close']
                                 qty = allocation / price
                                 cash -= allocation
                                 positions[ticker] = {
                                     "qty": qty, "entry_price": price, "entry_date": current_date
                                 }

        # Analysis
        final_equity = history[-1] if history else self.initial_capital
        total_ret = (final_equity - self.initial_capital) / self.initial_capital
        
        # Win Rate
        trades = pd.DataFrame(trade_log)
        win_rate = (trades['pnl'] > 0).mean() if not trades.empty else 0
        
        # Drawdown
        equity_curve = pd.Series(history)
        peak = equity_curve.cummax()
        dd = (equity_curve - peak) / peak
        max_dd = dd.min() if not dd.empty else 0
        
        print(f"Total Return: {total_ret:.2%}")
        print(f"Max Drawdown: {max_dd:.2%}")
        print(f"Win Rate:     {win_rate:.1%}")
        print(f"Trade Count:  {len(trades)}")
        
        return {
            "period": name,
            "return": total_ret,
            "max_dd": max_dd,
            "win_rate": win_rate
        }

if __name__ == "__main__":
    engine = ComparativeBacktestEngine()
    
    # 2018 Trade War & Tech Correction
    res_2018 = engine.run_period('2018-01-01', '2018-12-31', '2018 Crisis')
    
    # 2024-2025 AI Boom & Rate Cuts
    # Assuming data goes up to today
    res_2025 = engine.run_period('2024-01-01', '2025-12-31', '2024-25 Recovery')
