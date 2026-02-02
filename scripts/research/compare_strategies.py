import os
import json
import pandas as pd
import numpy as np
from scipy import stats

try:
    from tabulate import tabulate
except ImportError:
    tabulate = None

# Constants
DATA_DIR = "public/data"
SECTOR_FILE = "public/data/sector_industry.json"
OUTPUT_REPORT = "docs/STRATEGY_MATRIX_MAPPING.md"
BOOTSTRAP_ITERATIONS = 2000
CONFIDENCE_LEVEL = 0.98

# --- Indicator Library ---
class Indicators:
    @staticmethod
    def mcginley_dynamic(series, period=14):
        # User formula: k = window (or window * 0.6)
        # We use window=14 as requested
        md = np.zeros_like(series)
        md[0] = series.iloc[0]
        k = float(period)
        for i in range(1, len(series)):
            prev = md[i-1]
            price = series.iloc[i]
            if prev == 0: prev = 1e-9
            ratio = max(price / prev, 0.001)
            # Power 4 acceleration
            md[i] = prev + (price - prev) / (k * (ratio ** 4))
        return pd.Series(md, index=series.index)

    @staticmethod
    def stoch_rsi(series, period=14):
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        loss = loss.replace(0, 1e-9)
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        min_rsi = rsi.rolling(window=period).min()
        max_rsi = rsi.rolling(window=period).max()
        stoch = (rsi - min_rsi) / (max_rsi - min_rsi).replace(0, 1e-9)
        return stoch.fillna(0.5)

    @staticmethod
    def atr(high, low, close, period=14):
        tr1 = high - low
        tr2 = abs(high - close.shift())
        tr3 = abs(low - close.shift())
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        return tr.rolling(period).mean()

    @staticmethod
    def bollinger_width(close, period=20):
        sma = close.rolling(period).mean()
        std = close.rolling(period).std()
        upper = sma + 2 * std
        lower = sma - 2 * std
        return (upper - lower) / sma

class StrategyBase:
    def __init__(self, name):
        self.name = name
        self.audit = {"EMA": False, "ATR": False, "OBV": False}

    def prepare(self, df):
        return df

    def get_signal(self, row, prev_row, days_held, current_pnl, **kwargs):
        raise NotImplementedError

class StrategyV1_Original(StrategyBase):
    def __init__(self):
        super().__init__("V1 (Original)")
        self.audit = {"EMA": True, "ATR": False, "OBV": False}

    def prepare(self, df):
        # X: McGinley (14)
        df['mcginley'] = Indicators.mcginley_dynamic(df['close'], 14)
        # Y: StochRSI (14)
        df['stoch_rsi'] = Indicators.stoch_rsi(df['close'], 14)
        # Z: BB Width (20)
        df['bb_width'] = Indicators.bollinger_width(df['close'], 20)
        
        # We need a condition. Assuming "Dip Buy" similar to V2 but with V1 indicators
        # Or maybe "Trend Following"?
        # Given "Trend Scale" context, likely:
        # Buy when Trend(X) is Up AND Mom(Y) is Low (Dip) OR Mom is High (Breakout)?
        # Let's use the Classic Kinetic Logic: X > Price (Support) or Trend Up?
        # User said X=Trend. Usually Price > X is Bull.
        # User said Y=Momentum. Usually oversold is buy.
        # Let's assume Kinetic Logic: Buy Dip in Trend. 
        # Price > McGinley AND StochRSI < 0.2
        return df

    def get_signal(self, row, prev_row, days_held, current_pnl, **kwargs):
        # Entry
        is_bull = row['close'] > row['mcginley']
        is_oversold = row['stoch_rsi'] < 0.2
        entry = is_bull and is_oversold
        
        # Exit: 10% TP, 5% SL, 5 Days Time
        exit_sig = False
        reason = ""
        if days_held >= 5:
            exit_sig = True
            reason = "Time"
        elif current_pnl < -0.05:
            exit_sig = True
            reason = "Stop"
        elif current_pnl > 0.10:
            exit_sig = True
            reason = "TP"
            
        return entry, exit_sig, reason

class StrategyV5_Sharpe(StrategyBase):
    def __init__(self):
        super().__init__("V5 (Sharpe/Squeeze)")
        self.audit = {"EMA": False, "ATR": True, "OBV": False}

    def prepare(self, df):
        df['atr'] = Indicators.atr(df['high'], df['low'], df['close'], 14)
        df['bb_width'] = Indicators.bollinger_width(df['close'], 20)
        df['bb_width_pct'] = df['bb_width'].rolling(120).rank(pct=True)
        df['ma200'] = df['close'].rolling(200).mean()
        sma = df['close'].rolling(20).mean()
        std = df['close'].rolling(20).std()
        df['bb_upper'] = sma + 2 * std
        df['highest_high'] = df['high'].rolling(22).max()
        return df

    def get_signal(self, row, prev_row, days_held, current_pnl, **kwargs):
        is_squeeze = (row['bb_width_pct'] < 0.20)
        is_breakout = (row['close'] > row['bb_upper'])
        is_bull = (row['close'] > row['ma200'])
        entry = is_squeeze and is_breakout and is_bull
        
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

class ComparisonEngine:
    def __init__(self):
        self.strategies = [StrategyV1_Original(), StrategyV5_Sharpe()]
        self.sector_map = {}
        self.results = []

    def load_metadata(self):
        if not os.path.exists(SECTOR_FILE): return
        with open(SECTOR_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data.get('items', []):
                self.sector_map[item['symbol']] = item.get('sector', 'Unknown')

    def load_ohlcv(self):
        files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and not f.startswith('index')]
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

                if df is not None and len(df) > 200:
                    df = df.sort_values('date').reset_index(drop=True)
                    symbol = fname.replace('.json', '').upper()
                    data[symbol] = df
            except: pass
        return data

    def run(self):
        self.load_metadata()
        all_data = self.load_ohlcv()
        print(f"Loaded {len(all_data)} symbols.")

        for symbol, df_raw in all_data.items():
            sector = self.sector_map.get(symbol, 'Unknown')
            for strat in self.strategies:
                df = df_raw.copy()
                try:
                    df = strat.prepare(df)
                    df = df.dropna().reset_index(drop=True)
                except: continue

                in_pos = False
                entry_price = 0
                entry_idx = 0
                local_high = 0
                
                for i in range(1, len(df)):
                    row = df.iloc[i]
                    prev_row = df.iloc[i-1]
                    
                    days_held = 0
                    current_pnl = 0.0
                    if in_pos:
                        days_held = i - entry_idx
                        current_pnl = (row['close'] - entry_price) / entry_price
                        local_high = max(local_high, row['high'])
                    
                    ent, ext, reason = strat.get_signal(row, prev_row, days_held, current_pnl, local_high=local_high)
                    
                    if in_pos:
                        if ext:
                            self.results.append({
                                'Symbol': symbol,
                                'Sector': sector,
                                'Strategy': strat.name,
                                'PnL': current_pnl,
                                'Days': days_held
                            })
                            in_pos = False
                    elif ent:
                        in_pos = True
                        entry_price = row['close']
                        entry_idx = i
                        local_high = row['close']
    
    def calculate_max_drawdown(self, returns):
        # Simulate equity curve
        equity = [1.0]
        for r in returns:
            equity.append(equity[-1] * (1 + r))
        equity = np.array(equity)
        peak = np.maximum.accumulate(equity)
        drawdown = (equity - peak) / peak
        return drawdown.min()

    def to_md_table(self, data):
        if not data: return ""
        if isinstance(data, pd.DataFrame): data = data.to_dict('records')
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
        if df_res.empty: return

        report = "# Strategy Matrix Mapping (Sector Optimization)\n\n"
        
        sectors = sorted(df_res['Sector'].unique())
        sector_rows = []
        
        for sector in sectors:
            best_strat = "None"
            best_score = -999
            
            for strat in self.strategies:
                s_df = df_res[(df_res['Strategy'] == strat.name) & (df_res['Sector'] == sector)]
                if len(s_df) < 5: continue
                
                returns = s_df['PnL']
                
                # Sharpe Bootstrap
                sharpes = []
                for _ in range(500):
                    sample = returns.sample(n=len(returns), replace=True)
                    s = (sample.mean() / sample.std()) * (252**0.5) if sample.std() > 0 else 0
                    sharpes.append(s)
                sharpes.sort()
                lb_sharpe = sharpes[int(500 * (1 - CONFIDENCE_LEVEL))]
                
                # Profit Factor
                wins = returns[returns > 0].sum()
                losses = abs(returns[returns <= 0].sum())
                pf = wins / losses if losses > 0 else 0
                
                # Max DD
                mdd = self.calculate_max_drawdown(returns)
                mdd = abs(mdd) # comparison
                
                pf_mdd_ratio = pf / mdd if mdd > 0 else 0
                
                # Winning Logic: Highest Lower Bound Sharpe? Or PF > MaxDD?
                # User asked: Which has best PF & Sharpe & PF > MaxDD
                # We use Lower Bound Sharpe as primary quality metric
                
                score = lb_sharpe
                
                sector_rows.append({
                    "Sector": sector,
                    "Strategy": strat.name,
                    "PF": f"{pf:.2f}",
                    "Sharpe (98% Low)": f"{lb_sharpe:.2f}",
                    "MaxDD": f"{mdd:.2%}",
                    "PF/MaxDD": f"{pf_mdd_ratio:.2f}"
                })
        
        report += self.to_md_table(sector_rows)
        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f: f.write(report)
        print(f"Report written to {OUTPUT_REPORT}")

if __name__ == "__main__":
    engine = ComparisonEngine()
    engine.run()
    engine.generate_report()
