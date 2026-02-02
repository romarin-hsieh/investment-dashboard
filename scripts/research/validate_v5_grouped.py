import os
import json
import pandas as pd
import numpy as np
from scipy import stats

# Constants
DATA_DIR = "public/data"
SECTOR_FILE = "public/data/sector_industry.json"
OUTPUT_REPORT = "docs/V5_GROUPED_VALIDATION_REPORT.md"
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
class GroupedValidator:
    def __init__(self):
        self.strategy = StrategyV5()
        self.results = []
        self.sector_map = {}
        self.industry_map = {}
        self.market_cap_map = {}
        self.load_metadata()

    def load_metadata(self):
        try:
            with open(SECTOR_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data.get('items', []):
                    sym = item.get('symbol').upper()
                    self.sector_map[sym] = item.get('sector', 'Unknown')
                    self.industry_map[sym] = item.get('industry', 'Unknown')
                    self.market_cap_map[sym] = item.get('market_cap_category', 'Unknown')
            print(f"Loaded metadata for {len(self.sector_map)} symbols.")
        except Exception as e:
            print(f"Error loading metadata: {e}")

    def load_data(self):
        files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and not f.startswith('index') and not f == 'sector_industry.json']
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
                        'Sector': self.sector_map.get(symbol, 'Unknown'),
                        'Industry': self.industry_map.get(symbol, 'Unknown'),
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

    def calculate_max_drawdown(self, returns):
        equity = [1.0]
        for r in returns:
            equity.append(equity[-1] * (1 + r))
        equity = np.array(equity)
        peak = np.maximum.accumulate(equity)
        drawdown = (equity - peak) / peak
        return drawdown.min()

    def bootstrap_metrics(self, df_group):
        if len(df_group) < 5: # Not enough data
            return None
            
        returns = df_group['PnL']
        sharpes = []
        pfs = []
        mdds = []
        annual_returns = []
        
        start_dt = df_group['EntryDate'].min()
        end_dt = df_group['ExitDate'].max()
        years = max((end_dt - start_dt).days / 365.25, 0.5) # Avoid div by zero
        
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
            
            # MaxDD
            mdd = self.calculate_max_drawdown(sample)
            mdds.append(mdd)
            
            # Exp Annual Return
            tpy = len(sample) / years
            ann_ret = sample.mean() * tpy
            annual_returns.append(ann_ret)

        # Sort
        sharpes.sort()
        pfs.sort()
        mdds.sort()
        annual_returns.sort()
        
        # 98% Confidence (Lower Bound)
        idx = int(BOOTSTRAP_ITERATIONS * (1 - CONFIDENCE_LEVEL))
        
        # Basic Stats
        win_rate = len(returns[returns > 0]) / len(returns)
        avg_win = returns[returns > 0].mean() if len(returns[returns > 0]) > 0 else 0
        avg_loss = returns[returns <= 0].mean() if len(returns[returns <= 0]) > 0 else 0
        
        return {
            'PF (98% LB)': pfs[idx],
            'PF (Avg)': sum(pfs)/len(pfs),
            'Sharpe (98% LB)': sharpes[idx],
            'Sharpe (Avg)': sum(sharpes)/len(sharpes),
            'MaxDD (98% LB)': mdds[idx], # Worst case
            'MaxDD (Avg)': sum(mdds)/len(mdds),
            'Ann. Ret (98% LB)': annual_returns[idx],
            'Ann. Ret (Avg)': sum(annual_returns)/len(annual_returns),
            'Win Rate': win_rate,
            'Avg Win': avg_win,
            'Avg Loss': avg_loss,
            'Trades': len(df_group)
        }

    def to_md_table(self, data):
        if not data: return ""
        df = pd.DataFrame(data)
        if df.empty: return ""
        
        headers = df.columns.tolist()
        lines = []
        lines.append("| " + " | ".join(headers) + " |")
        lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
        
        for _, row in df.iterrows():
            lines.append("| " + " | ".join([str(row[h]) for h in headers]) + " |")
        return "\n".join(lines)

    def generate_report(self):
        df_res = pd.DataFrame(self.results)
        if df_res.empty:
            print("No trades found.")
            return

        report = f"# V5 Strategy Grouped Validation (2018-2025)\n\n"
        report += f"**Confidence Level**: 98% (Bootstrap {BOOTSTRAP_ITERATIONS}x)\n"
        report += f"**Total Trades**: {len(df_res)}\n\n"
        
        # --- By Sector ---
        print("Processing Sectors...")
        sector_metrics = []
        for sector, group in df_res.groupby('Sector'):
            m = self.bootstrap_metrics(group)
            if m:
                m['Group'] = sector
                sector_metrics.append(m)
        
        # Format for table
        sec_table = []
        for m in sector_metrics:
            sec_table.append({
                "Sector": m['Group'],
                "PF (LB)": f"{m['PF (98% LB)']:.2f}",
                "PF (Avg)": f"{m['PF (Avg)']:.2f}",
                "Sharpe (LB)": f"{m['Sharpe (98% LB)']:.2f}",
                "MaxDD (Worst)": f"{m['MaxDD (98% LB)']:.1%}",
                "Avg Ret (LB)": f"{m['Ann. Ret (98% LB)']:.1%}",
                "Win Rate": f"{m['Win Rate']:.1%}",
                "Avg Win": f"{m['Avg Win']:.1%}",
                "Avg Loss": f"{m['Avg Loss']:.1%}",
                "Trades": m['Trades']
            })
        
        report += "## Performance by Sector\n\n"
        report += self.to_md_table(sec_table)
        report += "\n\n"
        
        # --- By Industry ---
        print("Processing Industries...")
        ind_metrics = []
        for ind, group in df_res.groupby('Industry'):
            if len(group) < 10: continue # Skip small samples
            m = self.bootstrap_metrics(group)
            if m:
                m['Group'] = ind
                ind_metrics.append(m)
                
        ind_table = []
        for m in sorted(ind_metrics, key=lambda x: x['Sharpe (Avg)'], reverse=True):
            ind_table.append({
                "Industry": m['Group'],
                "PF (LB)": f"{m['PF (98% LB)']:.2f}",
                "Sharpe (LB)": f"{m['Sharpe (98% LB)']:.2f}",
                "MaxDD (Worst)": f"{m['MaxDD (98% LB)']:.1%}",
                "Avg Ret (LB)": f"{m['Ann. Ret (98% LB)']:.1%}",
                "Win Rate": f"{m['Win Rate']:.1%}",
                "Trades": m['Trades']
            })
            
        report += "## Performance by Industry (Top Groups)\n\n"
        report += self.to_md_table(ind_table)
        
        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"Report complete: {OUTPUT_REPORT}")

if __name__ == "__main__":
    v = GroupedValidator()
    v.run_backtest()
    v.generate_report()
