import os
import json
import pandas as pd
import numpy as np
import sys
from concurrent.futures import ProcessPoolExecutor

sys.path.append(os.getcwd())
from scripts.core.strategy_selector import QuantSystem, DataProvider, MarketRegime

DATA_DIR = "public/data"
OUTPUT_REPORT = "docs/PORTFOLIO_SIMULATION_REPORT.md"

class PortfolioManager:
    def __init__(self, initial_capital=100000, max_positions=10):
        self.initial_capital = initial_capital
        self.max_positions = max_positions
        self.cash = initial_capital
        self.positions = {} # {symbol: {size, entry_price}}
        self.equity_curve = []
        self.qs = QuantSystem()
        self.symbol_data = {}
        self.spy_data = None
        
    def load_data(self):
        # SPY
        path = os.path.join(DATA_DIR, "SPY.json")
        try:
            with open(path, 'r', encoding='utf-8') as f:
                c = json.load(f)
                if isinstance(c, dict): 
                   self.spy_data = pd.DataFrame({'date':pd.to_datetime(c['timestamps'], unit='ms'), 'close':c['close']}).set_index('date').sort_index()
                elif isinstance(c, list):
                   self.spy_data = pd.DataFrame(c)
                   self.spy_data['date'] = pd.to_datetime(self.spy_data['time'])
                   self.spy_data = self.spy_data.set_index('date').sort_index()
        except: pass
        
        # Symbols
        files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and not f.startswith('index') and 'SPY' not in f and 'sector' not in f]
        for fname in files:
            try:
                path = os.path.join(DATA_DIR, fname)
                with open(path, 'r', encoding='utf-8') as f: c = json.load(f)
                sym = fname.replace('.json', '').upper()
                df = None
                if isinstance(c, dict) and 'timestamps' in c:
                     df = pd.DataFrame({
                        'date': pd.to_datetime(c['timestamps'], unit='ms'),
                        'open': c['open'], 'high': c['high'], 'low': c['low'], 'close': c['close']
                    }).set_index('date').sort_index()
                elif isinstance(c, list):
                     df = pd.DataFrame(c)
                     df['date'] = pd.to_datetime(df['time'])
                     df = df.set_index('date').sort_index()
                
                if df is not None:
                     # Filter 2018+
                     df = df[df.index >= "2018-01-01"]
                     self.symbol_data[sym] = df
            except: pass
            
    def generate_signals(self):
        # Pre-calc signals for efficiency
        print("Pre-calculating signals for Universe...")
        all_signals = [] # List of tuples (date, symbol, action)
        
        # Need aligned regime and sector trend
        # For simplicity, calculate per symbol (vectorized or engine)
        # Using Strategy Engine logic
        
        for sym, df in self.symbol_data.items():
            sector = self.qs.sector_map.get(sym, "Unknown")
            engine = None
            if sector in self.qs.GROUPS["GROWTH"]: engine = self.qs.v5
            elif sector in self.qs.GROUPS["DEFENSIVE"]: engine = self.qs.v1
            else: continue
            
            # Prepare
            df = engine.prepare(df.copy())
            
            # Align SPY
            if self.spy_data is not None:
                # Merge logic
                df = pd.merge_asof(df, self.spy_data['close'].rename('spy_close'), left_index=True, right_index=True)
                df['spy_ma200'] = df['spy_close'].rolling(200).mean()
                df['regime'] = np.where(df['spy_close'] > df['spy_ma200'], "BULL_RISK_ON", "BEAR_RISK_OFF")
            else:
                 df['regime'] = "BULL_RISK_ON"
                 
            # Align Sector Trend (Mocking XLK with SPY for now if Sector ETF missing)
            # Todo: Load actual Sector ETFs if avail (XLI.json etc). Assuming not available for now.
            # Using SPY as proxy for Sector Trend for simplicity in this MVP
            df['sector_trend'] = np.where(df['spy_close'] > df['spy_close'].rolling(20).mean(), "UP", "DOWN")
            
            # Loop for signals
            in_pos = False
            entry_price = 0
            entry_idx = 0 # integer index, not needed if iterating rows?
            local_high = 0
            
            # Iterating rows
            for date, row in df.iterrows():
                # We need historical context for Loop logic (prev candle)
                # This is slow, but correct.
                # Actually, the 'df' is prepped. 
                # Engine needs 'last' and 'prev'. 'row' is last.
                # Just accessing row is fine.
                
                regime = row['regime']
                sector_trend = row['sector_trend']
                
                sig = "HOLD"
                
                if engine.name == "V5_Growth (Tight)":
                     if in_pos:
                         # Exit Logic
                         days_held = (date - entry_date).days
                         stop_price = local_high - (2.0 * row['atr'])
                         if row['close'] < stop_price: sig = "SELL_STOP"
                         elif days_held > 5 and ((row['close']-entry_price)/entry_price) < (0.5 * row['atr']/row['close']): sig = "SELL_TIME"
                         elif row.get('stoch_k', 0) > 95 and row.get('width_zscore', 0) > 2.0: sig = "SELL_CLIMAX"
                     else:
                         # Entry Logic
                         # Squeeze check needs prev
                         # Approximate: if bb_width_pct is low.
                         if regime == "BEAR_RISK_OFF": sig = "NO_TRADE"
                         elif sector_trend == "DOWN": sig = "WAIT"
                         elif (row['bb_width_pct'] < 0.20) and (row['close'] > row['bb_upper']): sig = "BUY_BREAKOUT"
                
                elif engine.name == "V1_Defensive (MeanRev)":
                     if in_pos:
                         pnl = (row['close'] - entry_price) / entry_price
                         days_held = (date - entry_date).days
                         if pnl < -0.05: sig = "SELL_STOP"
                         elif pnl > 0.10: sig = "SELL_TARGET"
                         elif days_held > 10: sig = "SELL_TIME"
                     else:
                         if sector_trend == "DOWN": sig = "WAIT"
                         elif row['close'] > row['mcginley'] and row['stoch_k'] < 20: sig = "BUY_DIP"

                if "BUY" in sig and not in_pos:
                    all_signals.append((date, sym, "BUY", row['close']))
                    in_pos = True
                    entry_price = row['close']
                    entry_date = date
                    local_high = row['close']
                elif "SELL" in sig and in_pos:
                    all_signals.append((date, sym, "SELL", row['close']))
                    in_pos = False
                
                if in_pos:
                    local_high = max(local_high, row['high'])

        # Sort by Date
        all_signals.sort(key=lambda x: x[0])
        return all_signals

    def run_backtest(self):
        self.load_data()
        signals = self.generate_signals() # List of (Date, Sym, Action, Price)
        
        # Convert signals to a Queue-like structure or just iterate
        # But we need to track daily equity.
        # So we need to iterate ALL dates in universe, and process signals on that date.
        
        # Get all dates
        if self.spy_data is None: return
        all_dates = self.spy_data[self.spy_data.index >= "2018-01-01"].index
        
        # Index signals by date
        sig_map = {}
        for s in signals:
            d = s[0]
            if d not in sig_map: sig_map[d] = []
            sig_map[d].append(s)
            
        print("Running Portfolio Simulation...")
        for date in all_dates:
            # 1. Process Signals (Buys/Sells)
            todays_signals = sig_map.get(date, [])
            
            # Process Sells first
            for _, sym, action, price in [s for s in todays_signals if s[2] == "SELL"]:
                if sym in self.positions:
                     pos = self.positions.pop(sym)
                     proceeds = pos['shares'] * price
                     self.cash += proceeds
            
            # Process Buys
            for _, sym, action, price in [s for s in todays_signals if s[2] == "BUY"]:
                if sym not in self.positions and len(self.positions) < self.max_positions:
                    # Size: 10% of INITIAL capital ($10k) or Current Equity?
                    # Generally fixed fractional or fixed amount.
                    # User: dynamic weighting? "Growth 10%, Defensive 5%"
                    # Let's simplify: Fixed $10k per slot (10 slots).
                    size = 10000 
                    if self.cash >= size:
                        shares = size / price
                        self.positions[sym] = {'shares': shares, 'entry': price}
                        self.cash -= size
            
            # 2. Update Equity
            pos_val = 0
            for sym, pos in self.positions.items():
                # Get current price
                # Look up in symbol_data
                try:
                    curr_price = self.symbol_data[sym].loc[date]['close']
                    pos_val += pos['shares'] * curr_price
                except:
                    # If missing data for today, use entry price or skip?
                    # Use last known? Complicated. Use Entry for approximation if missing approx.
                    pos_val += pos['shares'] * pos['entry']
            
            total_equity = self.cash + pos_val
            self.equity_curve.append({'date': date, 'equity': total_equity})
            
        self.generate_report()

    def generate_report(self):
        df_eq = pd.DataFrame(self.equity_curve).set_index('date')
        
        # Stats
        start_val = self.initial_capital
        end_val = df_eq['equity'].iloc[-1]
        cagr = ((end_val/start_val)**(1/7) - 1)
        
        # Drawdown
        roll_max = df_eq['equity'].cummax()
        dd = (df_eq['equity'] - roll_max) / roll_max
        max_dd = dd.min()
        
        # SPY Benchmark
        spy_base = self.spy_data[self.spy_data.index >= "2018-01-01"]['close']
        spy_ret = (spy_base.iloc[-1] / spy_base.iloc[0])**(1/7) - 1
        
        report = "# Portfolio Simulation Report (The Validated Fund)\n\n"
        report += "### Parameters\n"
        report += f"- **Initial Capital**: ${self.initial_capital:,.0f}\n"
        report += f"- **Max Positions**: {self.max_positions}\n"
        report += "- **Strategy**: Matrix v6.0 (V5/V1 + Filters)\n\n"
        
        report += "### Performance (2018-2025)\n"
        report += f"| Metric | Portfolio | SPY Benchmark |\n"
        report += f"| --- | --- | --- |\n"
        report += f"| **Ending Equity** | **${end_val:,.0f}** | N/A |\n"
        report += f"| **CAGR** | **{cagr:.1%}** | {spy_ret:.1%} |\n"
        report += f"| **Max Drawdown** | **{max_dd:.1%}** | -33.7% (2020/22) |\n"
        report += f"| **Total Return** | **{(end_val-start_val)/start_val:.1%}** | {(spy_base.iloc[-1]/spy_base.iloc[0])-1:.1%} |\n\n"

        report += "### Conclusions\n"
        if max_dd > -0.25:
             report += "- **Risk Objective Met**: MaxDD < 25%. The Filters worked.\n"
        else:
             report += "- **Risk Warning**: MaxDD > 25%. Further diversification needed.\n"
             
        if cagr > spy_ret:
             report += "- **Alpha Generated**: Outperformed SPY.\n"
        else:
             report += "- **Beta Lag**: Underperformed SPY (Cost of Safety).\n"

        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f: f.write(report)
        print(f"Report Generated: {OUTPUT_REPORT}")

if __name__ == "__main__":
    pm = PortfolioManager()
    pm.run_backtest()
