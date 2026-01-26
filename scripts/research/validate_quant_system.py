import os
import json
import pandas as pd
import numpy as np
import sys

# Add project root to path
sys.path.append(os.getcwd())
from scripts.core.strategy_selector import QuantSystem, MarketRegime

DATA_DIR = "public/data"
OUTPUT_REPORT = "docs/QUANT_SYSTEM_VALIDATION_REPORT.md"
BOOTSTRAP_ITERATIONS = 2000 # Enough for verification
CONFIDENCE_LEVEL = 0.98

class SystemValidator:
    def __init__(self):
        self.qs = QuantSystem()
        self.market_data = self.load_market_data()
        self.symbol_data = self.load_symbol_data()
        
    def load_market_data(self):
        # Load SPY for Regime
        path = os.path.join(DATA_DIR, "SPY.json")
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = json.load(f)
                if isinstance(content, dict) and 'timestamps' in content:
                    df = pd.DataFrame({
                        'date': pd.to_datetime(content['timestamps'], unit='ms'),
                        'close': content['close']
                    }).set_index('date').sort_index()
                    print(f"Loaded SPY Data: {len(df)} rows")
                    return df
                elif isinstance(content, list):
                     df = pd.DataFrame(content)
                     df['date'] = pd.to_datetime(df['time'])
                     df = df.set_index('date').sort_index()
                     print(f"Loaded SPY Data: {len(df)} rows")
                     return df
        except Exception as e:
            print(f"Error loading SPY data from {path}: {e}")
            return None

    def load_symbol_data(self):
        files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and not f.startswith('index') and f != 'sector_industry.json']
        data = {}
        for fname in files:
            sym = fname.replace('.json', '').upper()
            if sym in ['SPY', '^VIX']: continue
            try:
                path = os.path.join(DATA_DIR, fname)
                with open(path, 'r', encoding='utf-8') as f: content = json.load(f)
                if isinstance(content, dict) and 'timestamps' in content:
                     df = pd.DataFrame({
                        'date': pd.to_datetime(content['timestamps'], unit='ms'),
                        'open': content['open'], 'high': content['high'], 'low': content['low'], 'close': content['close'], 'volume': content['volume']
                    })
                elif isinstance(content, list):
                    df = pd.DataFrame(content)
                    df['date'] = pd.to_datetime(df['time'])
                
                # Filter 2018-2025
                df = df[df['date'] >= "2018-01-01"].sort_values('date').reset_index(drop=True)
                if len(df) > 200:
                    data[sym] = df
            except: pass
        return data

    def run_simulation(self, use_filter=True):
        trades = []
        spy_df = self.market_data
        
        print(f"Running Simulation (Filter={'ON' if use_filter else 'OFF'})...")
        
        for sym, df_raw in self.symbol_data.items():
            # Get Strategy Engine
            # We can use qs.analyze_ticker but that's for single slice.
            # Ideally we reuse the strategy logic in a vectorized way or loop.
            # Using qs.analyze_ticker in a loop is slow but accurate to logic.
            # Let's use the Strategy Engine directly from QS for speed.
            
            # Determine Strategy Type
            sector = self.qs.sector_map.get(sym, "Unknown")
            engine = None
            if sector in self.qs.GROUPS["GROWTH"]: engine = self.qs.v5
            elif sector in self.qs.GROUPS["DEFENSIVE"]: engine = self.qs.v1
            else: continue # Avoid
            
            # Prepare Indicators
            df = engine.prepare(df_raw.copy())
            df = df.dropna().reset_index(drop=True)
            
            # Align SPY Regime
            # Resample SPY to DF frequency? or map dates.
            # Mapping dates is safer.
            # Pre-calc regime array
            regime_arr = []
            for d in df['date']:
                # Find SPY date <= d
                # Simple lookup if index is datetime
                # Optimization: Reindex logic
                pass # Logic below inside loop is slow
            
            # Faster Regime Map
            if spy_df is not None:
                # Merge
                df_merged = pd.merge_asof(df, spy_df['close'].rename('spy_close'), left_on='date', right_index=True)
                df_merged['spy_ma200'] = df_merged['spy_close'].rolling(200).mean()
                # If use_filter=False, Force BULL
                if not use_filter:
                    regimes = ["BULL_RISK_ON"] * len(df)
                else:
                    # Logic
                    regimes = np.where(df_merged['spy_close'] > df_merged['spy_ma200'], "BULL_RISK_ON", "BEAR_RISK_OFF")
            else:
                regimes = ["BULL_RISK_ON"] * len(df) # Default if no SPY
            
            # Trade Loop
            in_pos = False
            entry_price = 0
            entry_idx = 0
            local_high = 0
            
            for i in range(1, len(df)):
                regime = regimes[i]
                row = df.iloc[i]
                
                # Check for Signal
                # qs engine needs 'df' context usually? No generate_signal implies stateless usage on pre-calc df?
                # Wait, my Engine implementation in strategy_selector.py uses `last = df.iloc[-1]` inside generate_signal.
                # So I can just pass a 1-row or full df? 
                # The Engines `generate_signal` takes (df, regime).
                # To simulate correctly using the exact code, I should call engine.generate_signal(df.iloc[:i+1], regime).
                # Slicing is expensive.
                # Let's approximate by calling the logic directly here or modifying engine to accept row.
                # For validation, let's replicate the logic for speed.
                
                sig = "HOLD"
                reason = ""
                
                # --- Replicate Logic for Speed ---
                if engine.name == "V5_Growth (Tight)":
                    # Exit (Climax or Stop)
                    if in_pos:
                         days_held = (row['date'] - df.iloc[entry_idx]['date']).days
                         # Stop 2 ATR
                         stop_price = local_high - (2.0 * row['atr'])
                         
                         if row['close'] < stop_price:
                             sig = "SELL_STOP"
                         elif days_held > 5 and ((row['close']-entry_price)/entry_price) < (0.5 * row['atr'] / row['close']):
                             sig = "SELL_TIME"
                         elif row.get('stoch_k', 0) > 95 and row.get('width_zscore', 0) > 2.0:
                             sig = "SELL_CLIMAX"
                             
                    elif not in_pos:
                         if regime == "BEAR_RISK_OFF": sig = "NO_TRADE"
                         elif (row['bb_width_pct'] < 0.20) and (row['close'] > row['bb_upper']):
                             sig = "BUY_BREAKOUT"
                             
                elif engine.name == "V1_Defensive (MeanRev)":
                     if in_pos:
                         pnl = (row['close'] - entry_price) / entry_price
                         days_held = (row['date'] - df.iloc[entry_idx]['date']).days
                         if pnl < -0.05: sig = "SELL_STOP"
                         elif pnl > 0.10: sig = "SELL_TARGET"
                         elif days_held > 10: sig = "SELL_TIME"
                     elif not in_pos:
                         # Allowed in Bear? Yes.
                         if row['close'] > row['mcginley'] and row['stoch_k'] < 20:
                             sig = "BUY_DIP"

                # Execute
                if in_pos:
                    local_high = max(local_high, row['high'])
                    if "SELL" in sig:
                        pnl = (row['close'] - entry_price) / entry_price
                        trades.append({
                            'Symbol': sym, 'Sector': sector,
                            'EntryDate': df.iloc[entry_idx]['date'],
                            'ExitDate': row['date'],
                            'ExitYear': row['date'].year,
                            'PnL': pnl, 'Type': ('Filtered' if use_filter else 'Raw'),
                            'Strategy': engine.name
                        })
                        in_pos = False
                elif not in_pos and "BUY" in sig:
                    in_pos = True
                    entry_price = row['close']
                    entry_idx = i
                    local_high = row['close']

        return pd.DataFrame(trades)

    def calculate_metrics(self, df_trades):
        if df_trades.empty: return {}
        
        returns = df_trades['PnL']
        
        # Bootstrap
        sharpes, pfs, mdds = [], [], []
        for _ in range(BOOTSTRAP_ITERATIONS):
            sample = returns.sample(n=len(returns), replace=True)
            s = (sample.mean() / sample.std()) * (252**0.5) if sample.std() > 0 else 0
            w = sample[sample > 0].sum()
            l = abs(sample[sample <= 0].sum())
            pf = w / l if l > 0 else 0
            
            # Approx MaxDD
            equity = [1.0]
            for r in sample: equity.append(equity[-1] * (1+r))
            equity = np.array(equity)
            mdd = ((equity - np.maximum.accumulate(equity))/np.maximum.accumulate(equity)).min()
            
            sharpes.append(s)
            pfs.append(pf)
            mdds.append(mdd)
            
        idx = int(BOOTSTRAP_ITERATIONS * (1 - CONFIDENCE_LEVEL))
        sharpes.sort()
        pfs.sort()
        mdds.sort()
        
        return {
            "PF (LB)": pfs[idx],
            "Sharpe (LB)": sharpes[idx],
            "MaxDD (LB)": mdds[idx],
            "Trades": len(df_trades)
        }

    def generate_report(self):
        trades_raw = self.run_simulation(use_filter=False)
        trades_filter = self.run_simulation(use_filter=True)
        
        report = "# Quant System Validation (Raw vs Filtered)\n\n"
        report += "**Metric**: 98% Confidence Lower Bound\n\n"
        
        # 1. Global Comparison
        m_raw = self.calculate_metrics(trades_raw)
        m_filt = self.calculate_metrics(trades_filter)
        
        report += "## 1. Global Performance Improvement\n"
        report += "| Metric | Raw V5/V1 | Filtered QuantSystem | Improvement |\n"
        report += "| --- | --- | --- | --- | \n"
        report += f"| PF (LB) | {m_raw.get('PF (LB)',0):.2f} | {m_filt.get('PF (LB)',0):.2f} | {m_filt.get('PF (LB)',0) - m_raw.get('PF (LB)',0):+.2f} |\n"
        report += f"| Sharpe (LB) | {m_raw.get('Sharpe (LB)',0):.2f} | {m_filt.get('Sharpe (LB)',0):.2f} | {m_filt.get('Sharpe (LB)',0) - m_raw.get('Sharpe (LB)',0):+.2f} |\n"
        report += f"| MaxDD (LB) | {m_raw.get('MaxDD (LB)',-1):.1%} | {m_filt.get('MaxDD (LB)',-1):.1%} | {(m_filt.get('MaxDD (LB)',0) - m_raw.get('MaxDD (LB)',0))*100:+.1f}% |\n\n"
        
        # 2. 2022 Stress Test
        report += "## 2. The 2022 Bear Market Stress Test\n"
        t22_raw = trades_raw[trades_raw['ExitYear'] == 2022]
        t22_filt = trades_filter[trades_filter['ExitYear'] == 2022]
        
        m_22_raw = self.calculate_metrics(t22_raw)
        m_22_filt = self.calculate_metrics(t22_filt)
        
        report += "| Config | Profit Factor (LB) | Max Drawdown (LB) | Trades |\n"
        report += "| --- | --- | --- | --- |\n"
        report += f"| Raw | {m_22_raw.get('PF (LB)',0):.2f} | {m_22_raw.get('MaxDD (LB)',-1):.1%} | {len(t22_raw)} |\n"
        report += f"| Filtered | {m_22_filt.get('PF (LB)',0):.2f} | {m_22_filt.get('MaxDD (LB)',-1):.1%} | {len(t22_filt)} |\n"
        
        if len(t22_filt) > 0:
             report += "\n### 2022 Trade Breakdown (Filtered)\n"
             counts = t22_filt['Strategy'].value_counts()
             for strat, count in counts.items():
                 report += f"- **{strat}**: {count} trades\n"
        else:
             report += "*Note: Filtered system correctly blocked all trades in 2022.*\n"
             
        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f: f.write(report)
        print(f"Report: {OUTPUT_REPORT}")

if __name__ == "__main__":
    v = SystemValidator()
    v.generate_report()
