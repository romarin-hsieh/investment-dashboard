import os
import json
import pandas as pd
import numpy as np

# Constants
DATA_DIR = "public/data"
SECTOR_FILE = "public/data/sector_industry.json"
OUTPUT_REPORT = "docs/OPTIMIZED_STRATEGY_MATRIX.md"
BOOTSTRAP_ITERATIONS = 2000 # Reduced slightly for grid search speed, can increase for final verify
CONFIDENCE_LEVEL = 0.98
START_DATE = "2018-01-01"

# --- Variations ---
CONFIGS = [
    # Baseline
    {"name": "Base V5", "filter": "None", "stop_atr": 3.0, "time_stop": 10},
    
    # Market Filters
    {"name": "V5 + SPY Trend", "filter": "SPY_MA200", "stop_atr": 3.0, "time_stop": 10},
    {"name": "V5 + Low VIX", "filter": "VIX_25", "stop_atr": 3.0, "time_stop": 10},
    
    # Tighter Management (Defensive)
    {"name": "V5 Tight Stop", "filter": "None", "stop_atr": 2.0, "time_stop": 5},
    {"name": "V5 Tight + SPY", "filter": "SPY_MA200", "stop_atr": 2.0, "time_stop": 5},
]

# --- Indicators ---
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

# --- Strategy Engine ---
class StrategySimulator:
    def __init__(self, config):
        self.config = config
    
    def prepare(self, df, spy_df=None, vix_df=None):
        # Base Indicators
        df['atr'] = Indicators.atr(df['high'], df['low'], df['close'], 14)
        df['ma20'], df['bb_upper'], df['bb_width'] = Indicators.bollinger_bands(df['close'], 20)
        df['bb_width_pct'] = df['bb_width'].rolling(120).rank(pct=True)
        df['ma200'] = df['close'].rolling(200).mean()
        
        # Merge External Data for Filters (approximate alignment by index/date)
        if self.config['filter'] == 'SPY_MA200' and spy_df is not None:
            # Need to align by date. For speed, we assume alignment or use reindex.
            # Merging inside a loop is slow. Better is to pass aligned Series.
            pass 
        return df

    def run(self, df, spy_series=None, vix_series=None):
        # Optimized vectorized-like loop
        signals = []
        
        # Entry Logic (Vectorized Pre-calc)
        is_squeeze = (df['bb_width_pct'] < 0.20)
        is_breakout = (df['close'] > df['bb_upper'])
        is_bull = (df['close'] > df['ma200'])
        
        # Filter Logic
        filter_mask = pd.Series(True, index=df.index)
        if self.config['filter'] == 'SPY_MA200' and spy_series is not None:
             # SPY > MA200
             filter_mask = (spy_series > spy_series.rolling(200).mean())
        elif self.config['filter'] == 'VIX_25' and vix_series is not None:
             filter_mask = (vix_series < 25)
             
        entries = is_squeeze & is_breakout & is_bull & filter_mask
        
        # Trade Simulation Loop
        trades = []
        in_pos = False
        entry_price = 0
        entry_idx = 0
        local_high = 0
        
        stop_mult = self.config['stop_atr']
        time_limit = self.config['time_stop']
        
        # Convert to numpy for speed
        close_arr = df['close'].values
        high_arr = df['high'].values
        atr_arr = df['atr'].values
        date_arr = df['date'].values
        entry_mask = entries.values
        
        for i in range(1, len(df)):
            if in_pos:
                # Numpy timedelta64 to float days
                days_held = (date_arr[i] - date_arr[entry_idx]) / np.timedelta64(1, 'D')
                
                # Update High
                if high_arr[i] > local_high: local_high = high_arr[i]
                
                # Exit Logic
                stop_price = local_high - (stop_mult * atr_arr[i])
                
                exit_signal = False
                if close_arr[i] < stop_price:
                    exit_signal = True
                elif days_held > time_limit:
                    # Check PnL? V5 Original: days > 10 and PnL < small gain
                    current_pnl = (close_arr[i] - entry_price) / entry_price
                    if current_pnl < (0.5 * atr_arr[i] / close_arr[i]):
                        exit_signal = True
                
                if exit_signal:
                    pnl = (close_arr[i] - entry_price) / entry_price
                    trades.append({
                        'EntryDate': date_arr[entry_idx],
                        'ExitDate': date_arr[i],
                        'PnL': pnl
                    })
                    in_pos = False
            
            elif entry_mask[i]: # New Entry
                in_pos = True
                entry_price = close_arr[i]
                entry_idx = i
                local_high = close_arr[i]
                
        return trades

# --- Optimization Wrapper ---
class MatrixOptimizer:
    def __init__(self):
        self.sector_map = {}
        self.load_metadata()
        self.market_data = self.load_market_data()
        
    def load_metadata(self):
        try:
            with open(SECTOR_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data.get('items', []):
                    self.sector_map[item['symbol'].upper()] = item.get('sector', 'Unknown')
        except: pass

    def load_market_data(self):
        # Load SPY and VIX
        market = {}
        for sym in ['SPY', '^VIX']:
            try:
                path = os.path.join(DATA_DIR, f"{sym}.json")
                with open(path, 'r', encoding='utf-8') as f: content = json.load(f)
                if isinstance(content, dict) and 'timestamps' in content: 
                     df = pd.DataFrame({'date': pd.to_datetime(content['timestamps'], unit='ms'), 'close': content['close']})
                elif isinstance(content, list) and len(content) > 0 and 'time' in content[0]:
                    df = pd.DataFrame(content)
                    df['date'] = pd.to_datetime(df['time'])
                    df['close'] = df['close']
                
                df = df.set_index('date').sort_index()
                market[sym] = df['close']
            except: print(f"Warning: {sym} not found.")
        return market

    def load_symbol_data(self):
        files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and not f.startswith('index') and f != 'sector_industry.json']
        data = {}
        for fname in files:
            sym = fname.replace('.json', '').upper()
            if sym in ['SPY', '^VIX', 'QQQ']: continue
            try:
                path = os.path.join(DATA_DIR, fname)
                with open(path, 'r', encoding='utf-8') as f: content = json.load(f)
                if isinstance(content, dict):
                     df = pd.DataFrame({
                        'date': pd.to_datetime(content['timestamps'], unit='ms'),
                        'open': content['open'], 'high': content['high'], 'low': content['low'], 'close': content['close']
                    })
                else:
                    df = pd.DataFrame(content)
                    df['date'] = pd.to_datetime(df['time'])
                
                df = df[df['date'] >= pd.to_datetime(START_DATE)].sort_values('date').reset_index(drop=True)
                if len(df) > 200:
                    data[sym] = df
            except: pass
        return data

    def bootstrap_score(self, trades):
        if len(trades) < 5: return -1, -1, -1 # Invalid
        
        returns = pd.Series([t['PnL'] for t in trades])
        metrics = {'pf': [], 'sharpe': [], 'mdd': []}
        
        for _ in range(BOOTSTRAP_ITERATIONS):
            sample = returns.sample(n=len(returns), replace=True)
            
            # Sharpe (Simple)
            s = (sample.mean() / sample.std()) * (252**0.5) if sample.std() > 0 else 0
            
            # PF
            w = sample[sample > 0].sum()
            l = abs(sample[sample <= 0].sum())
            pf = w / l if l > 0 else 0
            
            # MaxDD (Simple)
            # Just approximate from sum of neg runs? 
            # Reconstruct equity curve for accurate MDD
            equity = [1.0]
            for r in sample: equity.append(equity[-1] * (1+r))
            equity = np.array(equity)
            mdd = ((equity - np.maximum.accumulate(equity))/np.maximum.accumulate(equity)).min()
            
            metrics['pf'].append(pf)
            metrics['sharpe'].append(s)
            metrics['mdd'].append(mdd)
            
        idx = int(BOOTSTRAP_ITERATIONS * (1 - CONFIDENCE_LEVEL)) # 98% Lower Bound
        # Sort
        for k in metrics: metrics[k].sort()
        
        return metrics['pf'][idx], metrics['sharpe'][idx], metrics['mdd'][idx]

    def run_optimization(self):
        print("Loading Data...")
        symbol_data = self.load_symbol_data()
        
        print("Running Matrix Optimization...")
        results = []
        
        # Prepare Market Series reindexed to each symbol (expensive, optimize later)
        # Simply pass full series and use .reindex in simulator if needed
        # Or simpler: merge once.
        
        for sector in set(self.sector_map.values()):
            if sector == "Unknown": continue # Skip for now or handle later
            
            sector_syms = [s for s, sec in self.sector_map.items() if sec == sector and s in symbol_data]
            if not sector_syms: continue
            
            print(f"Optimizing Sector: {sector} ({len(sector_syms)} symbols)")
            
            best_score = -999
            best_config = None
            best_metrics = None
            
            for config in CONFIGS:
                # Accumulate trades for this config across all sector symbols
                sector_trades = []
                
                simulator = StrategySimulator(config)
                
                for sym in sector_syms:
                    df = symbol_data[sym].copy()
                    
                    # Align Market Filter
                    spy_aligned = None
                    vix_aligned = None
                    
                    if config['filter'] == 'SPY_MA200' and 'SPY' in self.market_data:
                        spy_aligned = self.market_data['SPY'].reindex(df['date'], method='ffill')
                    elif config['filter'] == 'VIX_25' and '^VIX' in self.market_data:
                        vix_aligned = self.market_data['^VIX'].reindex(df['date'], method='ffill')
                        
                    df_res = simulator.prepare(df, spy_aligned, vix_aligned)
                    trades = simulator.run(df_res, spy_aligned, vix_aligned)
                    sector_trades.extend(trades)
                
                # Score this Config
                pf_lb, sharpe_lb, mdd_lb = self.bootstrap_score(sector_trades)
                
                # Scoring Logic: Maximize PF, but must have PF > 1.0. Prefer PF > |MaxDD|
                # Score = PF Lower Bound.
                # Penalty if MaxDD is too deep (-50%?)
                
                score = pf_lb
                if mdd_lb < -0.5: score -= 1.0 # Penalize deep drawdowns
                
                if score > best_score:
                    best_score = score
                    best_config = config
                    best_metrics = (pf_lb, sharpe_lb, mdd_lb)
            
            if best_config:
                results.append({
                    "Sector": sector,
                    "Best Strategy": best_config['name'],
                    "Filter": best_config['filter'],
                    "PF (98% LB)": best_metrics[0],
                    "Sharpe (98% LB)": best_metrics[1],
                    "MaxDD (Worst)": best_metrics[2]
                })

        # Generate Report
        self.generate_report(results)

    def generate_report(self, results):
        df = pd.DataFrame(results)
        md = "# Optimized Strategy Matrix (98% Confidence)\n\n"
        md += "| Sector | Best Strategy | Filter | PF (LB) | Sharpe (LB) | MaxDD (Worst) |\n"
        md += "| --- | --- | --- | --- | --- | --- |\n"
        for _, row in df.iterrows():
            md += f"| {row['Sector']} | {row['Best Strategy']} | {row['Filter']} | {row['PF (98% LB)']:.2f} | {row['Sharpe (98% LB)']:.2f} | {row['MaxDD (Worst)']:.1%} |\n"
            
        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f: f.write(md)
        print(f"Report: {OUTPUT_REPORT}")

if __name__ == "__main__":
    opt = MatrixOptimizer()
    opt.run_optimization()
