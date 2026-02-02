import os
import json
import pandas as pd
import numpy as np
import sys
# Fix import for local execution
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
# Simple try-except to handle both direct run and module run if needed, 
# but consistent with correlation script
try:
    from quant_engine import KineticMarketState
except ImportError:
    from research.quant_engine import KineticMarketState

DATA_DIR = "public/data"

class BacktestEngine:
    def __init__(self, initial_capital=100000):
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.equity = initial_capital
        self.positions = {} # {ticker: {qty, entry_price, entry_date}}
        self.history = []
        self.trade_log = []
        
        # Strategy Parameters
        self.position_size = 0.10 # Allocate 10% per trade
        self.max_positions = 5
        self.holding_period = 5 # Days to hold
        
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
            if not df.empty:
                # Ensure date is parsed
                if 'time' in df.columns:
                    df['date'] = pd.to_datetime(df['time'])
                
                # Run Engine to get signals
                engine = KineticMarketState(df)
                df_processed = engine.analyze()
                data_map[ticker] = df_processed
                
        return data_map
    
    def run(self):
        print(f"Starting Backtest... Capital: ${self.initial_capital}")
        data_map = self.load_data()
        
        # Merge all dates to iterate chronologically
        all_dates = sorted(list(set().union(*[df['date'].tolist() for df in data_map.values()])))
        
        # Start from a year ago (or consistent start)
        # Using full available history from the json files
        
        for current_date in all_dates:
            # 1. Update Portfolio Value (Mark to Market)
            current_equity = self.cash
            
            for ticker, pos in list(self.positions.items()):
                df = data_map[ticker]
                # Get price on current_date
                row = df[df['date'] == current_date]
                if row.empty:
                    continue # No trading today for this asset?
                    
                price = row.iloc[0]['close']
                current_equity += pos['qty'] * price
                
                # Exit Logic (Simple Time-based or Signal Reversal)
                days_held = (current_date - pos['entry_date']).days
                
                # Check for exit signals
                # For simplicity, using Time Exit (5 days) or 10% Stop Loss
                pnl_pct = (price - pos['entry_price']) / pos['entry_price']
                
                should_exit = False
                exit_reason = ""
                
                if days_held >= self.holding_period:
                    should_exit = True
                    exit_reason = "Time Exit"
                elif pnl_pct < -0.05: # 5% Stop loss
                    should_exit = True
                    exit_reason = "Stop Loss"
                elif pnl_pct > 0.10: # 10% Take Profit
                    should_exit = True
                    exit_reason = "Take Profit"
                    
                if should_exit:
                    self.cash += pos['qty'] * price
                    self.trade_log.append({
                        "ticker": ticker,
                        "entry": pos['entry_date'],
                        "exit": current_date,
                        "pnl": pnl_pct,
                        "reason": exit_reason
                    })
                    del self.positions[ticker]
            
            self.equity = current_equity
            self.history.append({"date": current_date, "equity": self.equity})
            
            # 2. Check for New Entries
            if len(self.positions) < self.max_positions:
                for ticker, df in data_map.items():
                    row = df[df['date'] == current_date]
                    if row.empty:
                        continue
                        
                    signal = row.iloc[0]['signal']
                    price = row.iloc[0]['close']
                    
                    # Entry Logic: Only enter if we don't have it and CASH is enough
                    if ticker not in self.positions:
                        # Strategy: Buy DIP_BUY and LAUNCHPAD
                        if signal in ["DIP_BUY", "LAUNCHPAD"]:
                            # Allocation amount
                            allocation = self.equity * self.position_size
                            if self.cash > allocation:
                                qty = allocation / price
                                self.cash -= allocation
                                self.positions[ticker] = {
                                    "qty": qty,
                                    "entry_price": price,
                                    "entry_date": current_date
                                }
                                
        self._print_stats()

    def _print_stats(self):
        equity_df = pd.DataFrame(self.history)
        if equity_df.empty:
            print("No history.")
            return

        final_equity = self.history[-1]['equity']
        total_return = (final_equity - self.initial_capital) / self.initial_capital
        
        # Calculate Max Drawdown
        equity_df['peak'] = equity_df['equity'].cummax()
        equity_df['dd'] = (equity_df['equity'] - equity_df['peak']) / equity_df['peak']
        max_dd = equity_df['dd'].min()
        
        # Win Rate
        trades = pd.DataFrame(self.trade_log)
        win_rate = 0
        avg_trade = 0
        if not trades.empty:
            win_rate = (trades['pnl'] > 0).mean()
            avg_trade = trades['pnl'].mean()
            
        print("\n=== Backtest Results (Post-Pandemic Window) ===")
        print(f"Initial Capital: ${self.initial_capital:,.0f}")
        print(f"Final Equity:    ${final_equity:,.0f}")
        print(f"Total Return:    {total_return:.2%}")
        print(f"Max Drawdown:    {max_dd:.2%}")
        print(f"Total Trades:    {len(trades)}")
        print(f"Win Rate:        {win_rate:.1%}")
        print(f"Avg Trade PnL:   {avg_trade:.2%}")

if __name__ == "__main__":
    backtester = BacktestEngine()
    backtester.run()
