import os
import json
import pandas as pd
import numpy as np
from scipy import stats

# Constants
DATA_DIR = "public/data"
OUTPUT_REPORT = "docs/V5_FINAL_VALIDATION_REPORT.md"
BOOTSTRAP_ITERATIONS = 5000
CONFIDENCE_LEVEL = 0.98
START_DATE = "2018-01-01"

# --- Indicator Library (V5 Specific) ---
class Indicators:
    @staticmethod
    def atr(high, low, close, period=14):
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.rolling(period).mean()

    @staticmethod
    def bollinger_bands(close, period=20):
        sma = close.rolling(period).mean()
        std = close.rolling(period).std()
        upper = sma + 2 * std
        lower = sma - 2 * std
        width = (upper - lower) / sma
        return sma, upper, width

# --- Strategy Logic ---
class StrategyV5:
    def __init__(self):
        self.name = "V5 (Sharpe/Squeeze) 2018-2025"

    def prepare(self, df):
        df['atr'] = Indicators.atr(df['high'], df['low'], df['close'], 14)
        df['ma20'], df['bb_upper'], df['bb_width'] = Indicators.bollinger_bands(df['close'], 20)
        df['bb_width_pct'] = df['bb_width'].rolling(120).rank(pct=True)
        df['ma200'] = df['close'].rolling(200).mean()
        df['highest_high'] = df['high'].rolling(22).max()
        return df

    def get_signal(self, row, prev_row, days_held, current_pnl, **kwargs):
        # Entry
        is_squeeze = (row['bb_width_pct'] < 0.20)
        is_breakout = (row['close'] > row['bb_upper'])
        is_bull = (row['close'] > row['ma200'])
        entry = is_squeeze and is_breakout and is_bull
        
        # Exit
        stop_price = kwargs.get('local_high', row['high']) - 3 * row['atr']
        
        exit_sig = False
        reason = ""
        
        if row['close'] < stop_price:
            exit_sig = True
            reason = "Chandelier"
        elif days_held > 10 and current_pnl < (0.5 * row['atr'] / row['close']):
            exit_sig = True
            reason = "TimeStop"
            
        return entry, exit_sig, reason

# --- Validation Engine ---
class FinalValidator:
    def __init__(self):
        self.strategy = StrategyV5()
        self.results = []
        self.equity_curve = [] 

    def load_data(self):
        files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and not f.startswith('index')]
        print(f"Loading {len(files)} files...")
        data = {}
        for fname in files:
            path = os.path.join(DATA_DIR, fname)
            try:
                with open(path, 'r', encoding='utf-8') as f: content = json.load(f)
                df = None
                if isinstance(content, dict) and 'timestamps' in content: # New format
                     df = pd.DataFrame({
                        'date': pd.to_datetime(content['timestamps'], unit='ms'),
                        'open': content['open'], 'high': content['high'], 'low': content['low'], 'close': content['close'], 'volume': content['volume']
                    })
                elif isinstance(content, list) and len(content) > 0 and 'time' in content[0]: # Yahoo format
                    df = pd.DataFrame(content)
                    df['date'] = pd.to_datetime(df['time'])

                if df is not None:
                    # Filter Date Range
                    df = df[df['date'] >= pd.to_datetime(START_DATE)]
                    if len(df) > 200: # Need 200 for MA200
                        df = df.sort_values('date').reset_index(drop=True)
                        symbol = fname.replace('.json', '').upper()
                        data[symbol] = df
            except: pass
        return data

    def run_backtest(self):
        all_data = self.load_data()
        print(f"Running validation on {len(all_data)} symbols (2018-2025)...")
        
        for symbol, df_raw in all_data.items():
            df = df_raw.copy()
            df = self.strategy.prepare(df)
            df = df.dropna().reset_index(drop=True)
            
            in_pos = False
            entry_price = 0
            entry_idx = 0
            local_high = 0
            entry_date = None
            
            for i in range(1, len(df)):
                row = df.iloc[i]
                prev_row = df.iloc[i-1]
                
                days_held = 0
                current_pnl = 0.0
                
                if in_pos:
                    days_held = (row['date'] - entry_date).days
                    current_pnl = (row['close'] - entry_price) / entry_price
                    local_high = max(local_high, row['high'])
                
                ent, ext, reason = self.strategy.get_signal(row, prev_row, days_held, current_pnl, local_high=local_high)
                
                if in_pos and ext:
                    self.results.append({
                        'Symbol': symbol,
                        'EntryDate': entry_date,
                        'ExitDate': row['date'],
                        'PnL': current_pnl,
                        'Days': days_held,
                        'Reason': reason
                    })
                    in_pos = False
                elif not in_pos and ent:
                    in_pos = True
                    entry_price = row['close']
                    entry_idx = i
                    entry_date = row['date']
                    local_high = row['close']

    def calculate_cagr(self, returns_df):
        # Approximate CAGR based on portfolio simulation
        # Assume equal weight or simply sum returns over time (simple approximation)
        # Better: Total Return / Years
        if returns_df.empty: return 0
        total_days = (returns_df['ExitDate'].max() - returns_df['EntryDate'].min()).days
        if total_days <= 0: return 0
        years = total_days / 365.25
        
        # Simple compounding of average return per trade * trades
        # This is tricky without a portfolio engine. 
        # Using "Expected Annual Return" = (Avg Return per Trade * Trades per Year)
        avg_ret = returns_df['PnL'].mean()
        trades_per_year = len(returns_df) / years
        
        # Simple non-compounded annual return estimate (sum of PnL / years) / symbols? No.
        # User asked for "Expected Annual Profit". 
        # Let's use: Mean Trade Return * (Trades / Year)
        return avg_ret * trades_per_year # Returns in decimal

    def calculate_max_drawdown(self, returns):
        # Simulate equity curve from trade stream (assuming 1 unit invested per trade, sequential)
        # This is a synthetic curve for validation
        equity = [1.0]
        for r in returns:
            equity.append(equity[-1] * (1 + r))
        equity = np.array(equity)
        peak = np.maximum.accumulate(equity)
        drawdown = (equity - peak) / peak
        return drawdown.min()

    def to_md_table(self, data):
        if isinstance(data, pd.DataFrame):
            if data.empty: return ""
            data = data.to_dict('records')
        
        if not data: return ""
        headers = list(data[0].keys())
        lines = []
        lines.append("| " + " | ".join([str(h) for h in headers]) + " |")
        lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
        for row in data:
            lines.append("| " + " | ".join([str(row.get(h, "")) for h in headers]) + " |")
        return "\n".join(lines)

    def generate_report(self):
        df_res = pd.DataFrame(self.results)
        if df_res.empty:
            print("No trades found.")
            return

        # Bootstrapping for CI
        returns = df_res['PnL']
        sharpes = []
        pfs = []
        mdds = []
        annual_returns = [] # Synthetic
        
        # Time Span
        start_dt = df_res['EntryDate'].min()
        end_dt = df_res['ExitDate'].max()
        years = (end_dt - start_dt).days / 365.25
        
        print(f"Bootstrapping {BOOTSTRAP_ITERATIONS} times...")
        
        for _ in range(BOOTSTRAP_ITERATIONS):
            sample = returns.sample(n=len(returns), replace=True)
            
            # Sharpe
            s = (sample.mean() / sample.std()) * (252**0.5) if sample.std() > 0 else 0
            sharpes.append(s)
            
            # PF
            wins = sample[sample > 0].sum()
            losses = abs(sample[sample <= 0].sum())
            pf = wins / losses if losses > 0 else 0
            pfs.append(pf)
            
            # MaxDD (Synthetic)
            mdd = self.calculate_max_drawdown(sample)
            mdds.append(mdd)
            
            # Exp Annual Return (Simple)
            # Sum of returns / Years (assuming simple interest for portfolio)
            # OR Compound
            # Let's stick to Sum of Returns / Years (Total Yield / Years)
            # But this depends on position sizing. Assuming 100% allocation per trade (impossible).
            # Better: Avg Trade % * TradesPerYear
            tpy = len(sample) / years
            ann_ret = sample.mean() * tpy
            annual_returns.append(ann_ret)

        # Sort for Percentiles
        sharpes.sort()
        pfs.sort()
        mdds.sort() # Negative numbers
        annual_returns.sort()
        
        # 98% Confidence (Lower Bound usually, or relevant tail)
        # CI 98% means excluding bottom 1% and top 1%? Or User means "Lower 98% Bound"?
        # Usually "With 98% Confidence" implies we are 98% sure it's above X. So 2nd percentile.
        idx = int(BOOTSTRAP_ITERATIONS * (1 - CONFIDENCE_LEVEL))
        
        sharpe_lb = sharpes[idx]
        pf_lb = pfs[idx]
        mdd_worst = mdds[idx] # This is closer to -1.0 (smaller index = more negative)
        ann_ret_lb = annual_returns[idx]
        
        # Summary Table
        summary = {
            "Metric": ["Profit Factor (PF)", "Sharpe Ratio", "Max Drawdown", "Exp. Annual Return"],
            "98% Confidence Level (Lower Bound)": [
                f"{pf_lb:.2f}",
                f"{sharpe_lb:.2f}",
                f"{mdd_worst:.2%}",
                f"{ann_ret_lb:.2%}"
            ],
            "Average Estimate": [
                f"{sum(pfs)/len(pfs):.2f}",
                f"{sum(sharpes)/len(sharpes):.2f}",
                f"{sum(mdds)/len(mdds):.2%}",
                f"{sum(annual_returns)/len(annual_returns):.2%}"
            ]
        }
        
        report = f"# Final V5 Strategy Validation (2018-2025)\n\n"
        report += f"**Period**: {start_dt.date()} to {end_dt.date()} ({years:.1f} years)\n"
        report += f"**Sample Size**: {len(df_res)} Trades across ~75 Symbols\n"
        report += f"**Confidence Level**: 98% (Bootstrap {BOOTSTRAP_ITERATIONS}x)\n\n"
        
        report += self.to_md_table(pd.DataFrame(summary))
        
        report += "\n\n## Trade Distribution\n"
        win_rate = len(returns[returns > 0]) / len(returns)
        report += f"- **Win Rate**: {win_rate:.1%}\n"
        report += f"- **Avg Win**: {returns[returns > 0].mean():.2%}\n"
        report += f"- **Avg Loss**: {returns[returns <= 0].mean():.2%}\n"
        
        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"Report complete: {OUTPUT_REPORT}")

if __name__ == "__main__":
    validator = FinalValidator()
    validator.run_backtest()
    validator.generate_report()
