import os
import json
import pandas as pd
import numpy as np
from datetime import datetime

# Constants
DATA_DIR = "public/data"
SECTOR_FILE = "public/data/sector_industry.json"
OUTPUT_REPORT = "docs/V5_YEARLY_GROUPED_VALIDATION_REPORT.md"
BOOTSTRAP_ITERATIONS = 5000
CONFIDENCE_LEVEL = 0.98
YEARS = list(range(2018, 2026))

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
        self.name = "V5 (Sharpe/Squeeze) Yearly"

    def prepare(self, df):
        df['atr'] = Indicators.atr(df['high'], df['low'], df['close'], 14)
        df['ma20'], df['bb_upper'], df['bb_width'] = Indicators.bollinger_bands(df['close'], 20)
        df['bb_width_pct'] = df['bb_width'].rolling(120).rank(pct=True)
        df['ma200'] = df['close'].rolling(200).mean()
        # df['highest_high'] = df['high'].rolling(22).max() # Not strictly needed if calculated dynamically
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
class YearlyValidator:
    def __init__(self):
        self.strategy = StrategyV5()
        self.results = []
        self.sector_map = {}
        self.industry_map = {}
        self.load_metadata()

    def load_metadata(self):
        try:
            with open(SECTOR_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data.get('items', []):
                    sym = item.get('symbol').upper()
                    self.sector_map[sym] = item.get('sector', 'Unknown')
                    self.industry_map[sym] = item.get('industry', 'Unknown')
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
                if isinstance(content, dict) and 'timestamps' in content: 
                     df = pd.DataFrame({
                        'date': pd.to_datetime(content['timestamps'], unit='ms'),
                        'open': content['open'], 'high': content['high'], 'low': content['low'], 'close': content['close'], 'volume': content['volume']
                    })
                elif isinstance(content, list) and len(content) > 0 and 'time' in content[0]:
                    df = pd.DataFrame(content)
                    df['date'] = pd.to_datetime(df['time'])

                if df is not None:
                    # Filter Date Range (Include 2017 for lookback)
                    df = df[df['date'] >= pd.to_datetime("2017-01-01")]
                    if len(df) > 200:
                        df = df.sort_values('date').reset_index(drop=True)
                        symbol = fname.replace('.json', '').upper()
                        data[symbol] = df
            except: pass
        return data

    def run_backtest(self):
        all_data = self.load_data()
        print(f"Running validation on {len(all_data)} symbols...")
        
        for symbol, df_raw in all_data.items():
            df = df_raw.copy()
            df = self.strategy.prepare(df)
            df = df.dropna().reset_index(drop=True)
            
            in_pos = False
            entry_price = 0
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
                    # CRITICAL: No Day Trading Check
                    if days_held < 1:
                        # Force hold until next day close? Or just ignore trade?
                        # User Rule: "Execution BUY then SELL at least next day".
                        # If signal says sell same day, we ignore signal? Unsafe.
                        # Interpretation: Trade counts, but Exit Price should be Next Day Open/Close?
                        # Simplification: If algo exits same day, it's a violation.
                        # But wait, our backtest loop is daily bars (Close to Close context).
                        # Entry is at 'i' (assumed Close). Exit at 'i+k'.
                        # If 'i' is entry day, next loop is 'i+1'.
                        # So days_held will be >= 1 by definition of loop structure if we enter at Close.
                        # Wait, logic:
                        # ent -> in_pos=True (Mark entry at Close of i).
                        # Next iteration (i+1): ext check. Exit at Close of i+1.
                        # days_held = (date[i+1] - date[i]).days. Usually >= 1 (unless intraday data).
                        # This dataset is Daily. So min hold is 1 day.
                        # Day Trading is implicitly impossible with Daily Close-to-Close logic (Entry today close, Exit tomorrow close).
                        # Valid.
                        pass

                    self.results.append({
                        'Symbol': symbol,
                        'Sector': self.sector_map.get(symbol, 'Unknown'),
                        'Industry': self.industry_map.get(symbol, 'Unknown'),
                        'EntryDate': entry_date,
                        'ExitDate': row['date'],
                        'ExitYear': row['date'].year,
                        'PnL': current_pnl,
                        'Days': days_held,
                        'Reason': reason
                    })
                    in_pos = False
                elif not in_pos and ent:
                    in_pos = True
                    entry_price = row['close']
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
        unique_symbols = df_group['Symbol'].nunique()
        if unique_symbols < 3: return None
        
        returns = df_group['PnL']
        sharpes = []
        pfs = []
        mdds = []
        annual_returns = []
        
        # Determine strict time span for annualization within the specific year context?
        # Actually for "Yearly" group, the span is at most 1 year.
        # But trades might overlap years? We group by ExitYear.
        years_span = 1.0 
        
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
            tpy = len(sample) # Total % sum / 1 year essentially if we assume full reinvestment? 
            # Let's use simple sum for "Annual Return" of strategy in that year
            ann_ret = sample.mean() * len(sample) # Total yield per unit
            annual_returns.append(ann_ret)

        sharpes.sort()
        pfs.sort()
        mdds.sort()
        annual_returns.sort()
        
        idx = int(BOOTSTRAP_ITERATIONS * (1 - CONFIDENCE_LEVEL))
        
        return {
            'PF (LB)': pfs[idx],
            'Sharpe (LB)': sharpes[idx],
            'MaxDD (LB)': mdds[idx],
            'Avg Ret (LB)': annual_returns[idx],
            'Avg Win': returns[returns > 0].mean() if not returns[returns > 0].empty else 0,
            'Avg Loss': returns[returns <= 0].mean() if not returns[returns <= 0].empty else 0,
            'Trades': len(df_group),
            'Symbols': unique_symbols
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
        if df_res.empty: print("No trades."); return

        report = f"# V5 Yearly Validation (2018-2025)\n\n"
        report += f"**Confidence**: 98% (Bootstrap {BOOTSTRAP_ITERATIONS}x)\n"
        report += f"**Filter**: Min 3 Symbols per Group\n\n"
        
        print("Processing Yearly Results...")
        
        all_metrics = []
        
        for year in YEARS:
            df_year = df_res[df_res['ExitYear'] == year]
            if df_year.empty: continue
            
            # 1. Overall Year
            m_all = self.bootstrap_metrics(df_year)
            if m_all:
                all_metrics.append({
                    "Year": year, "Group": "ALL",
                    "PF": f"{m_all['PF (LB)']:.2f}",
                    "Sharpe": f"{m_all['Sharpe (LB)']:.2f}",
                    "MaxDD": f"{m_all['MaxDD (LB)']:.1%}",
                    "AvgRet": f"{m_all['Avg Ret (LB)']:.1%}",
                    "Trades": m_all['Trades']
                })
            
            # 2. By Sector
            for sector, group in df_year.groupby('Sector'):
                m = self.bootstrap_metrics(group)
                if m:
                     all_metrics.append({
                        "Year": year, "Group": sector,
                        "PF": f"{m['PF (LB)']:.2f}",
                        "Sharpe": f"{m['Sharpe (LB)']:.2f}",
                        "MaxDD": f"{m['MaxDD (LB)']:.1%}",
                        "AvgRet": f"{m['Avg Ret (LB)']:.1%}",
                        "Trades": m['Trades']
                    })

        report += self.to_md_table(all_metrics)
        
        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"Report complete: {OUTPUT_REPORT}")

if __name__ == "__main__":
    v = YearlyValidator()
    v.run_backtest()
    v.generate_report()
