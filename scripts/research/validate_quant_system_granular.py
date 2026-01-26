import os
import json
import pandas as pd
import numpy as np
import sys
from concurrent.futures import ProcessPoolExecutor

# Add project root to path
sys.path.append(os.getcwd())
from scripts.core.strategy_selector import QuantSystem

DATA_DIR = "public/data"
OUTPUT_REPORT = "docs/QUANT_SYSTEM_GRANULAR_REPORT.md"
BOOTSTRAP_ITERATIONS = 5000
CONFIDENCE_LEVEL = 0.98

class GranularValidator:
    def __init__(self):
        self.qs = QuantSystem()
        self.market_data = self.load_market_data()
        self.symbol_data = self.load_symbol_data()
        
    def load_market_data(self):
        path = os.path.join(DATA_DIR, "SPY.json")
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = json.load(f)
                if isinstance(content, dict) and 'timestamps' in content:
                    df = pd.DataFrame({
                        'date': pd.to_datetime(content['timestamps'], unit='ms'),
                        'close': content['close']
                    }).set_index('date').sort_index()
                    return df
                elif isinstance(content, list):
                     df = pd.DataFrame(content)
                     df['date'] = pd.to_datetime(df['time'])
                     df = df.set_index('date').sort_index()
                     return df
        except Exception as e:
            print(f"Error loading SPY data: {e}")
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
                        'open': content['open'], 'high': content['high'], 'low': content['low'], 'close': content['close']
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

    def simulate_symbol(self, sym, df_raw):
        # Determine Strategy via Matrix
        sector = self.qs.sector_map.get(sym, "Unknown")
        
        # Route Strategy
        engine = None
        if sector in self.qs.GROUPS["GROWTH"]: engine = self.qs.v5
        elif sector in self.qs.GROUPS["DEFENSIVE"]: engine = self.qs.v1
        else: return [] # Avoid
        
        # Prepare Data
        df = engine.prepare(df_raw.copy())
        
        # Regime Map
        spy_df = self.market_data
        regimes = ["BULL_RISK_ON"] * len(df)
        if spy_df is not None:
             df_merged = pd.merge_asof(df, spy_df['close'].rename('spy_close'), left_on='date', right_index=True)
             df_merged['spy_ma200'] = df_merged['spy_close'].rolling(200).mean()
             regimes = np.where(df_merged['spy_close'] > df_merged['spy_ma200'], "BULL_RISK_ON", "BEAR_RISK_OFF")

        trades = []
        in_pos = False
        entry_price = 0
        entry_idx = 0
        local_high = 0
        
        # Trade Logic (Replicated for Speed from validate_quant_system)
        for i in range(1, len(df)):
            regime = regimes[i]
            row = df.iloc[i]
            sig = "HOLD"
            
            if engine.name == "V5_Growth (Tight)":
                if in_pos:
                     days_held = (row['date'] - df.iloc[entry_idx]['date']).days
                     stop_price = local_high - (2.0 * row['atr'])
                     if row['close'] < stop_price: sig = "SELL_STOP"
                     elif days_held > 5 and ((row['close']-entry_price)/entry_price) < (0.5 * row['atr']/row['close']): sig = "SELL_TIME"
                     elif row.get('stoch_k', 0) > 95 and row.get('width_zscore', 0) > 2.0: sig = "SELL_CLIMAX"
                elif not in_pos:
                     if regime == "BEAR_RISK_OFF": sig = "NO_TRADE"
                     elif (row['bb_width_pct'] < 0.20) and (row['close'] > row['bb_upper']): sig = "BUY_BREAKOUT"
            
            elif engine.name == "V1_Defensive (MeanRev)":
                 if in_pos:
                     pnl = (row['close'] - entry_price) / entry_price
                     days_held = (row['date'] - df.iloc[entry_idx]['date']).days
                     if pnl < -0.05: sig = "SELL_STOP"
                     elif pnl > 0.10: sig = "SELL_TARGET"
                     elif days_held > 10: sig = "SELL_TIME"
                 elif not in_pos:
                     if row['close'] > row['mcginley'] and row['stoch_k'] < 20: sig = "BUY_DIP"

            if in_pos:
                local_high = max(local_high, row['high'])
                if "SELL" in sig:
                    pnl = (row['close'] - entry_price) / entry_price
                    trades.append(pnl) # For this script we just need PnL list
                    in_pos = False
            elif not in_pos and "BUY" in sig:
                in_pos = True
                entry_price = row['close']
                entry_idx = i
                local_high = row['close']
                
        return trades

    def bootstrap_metrics(self, returns):
        if len(returns) < 5: 
            return {
                "PF": 0, "Sharpe": 0, "MaxDD": 0, "AvgWin": 0, "AvgLoss": 0, "Trades": len(returns), "AvgRet": 0
            }
        
        returns = pd.Series(returns)
        sharpes, pfs, mdds = [], [], []
        
        for _ in range(BOOTSTRAP_ITERATIONS):
            sample = returns.sample(n=len(returns), replace=True)
            s = (sample.mean() / sample.std()) * (252**0.5) if sample.std() > 0 else 0
            w = sample[sample > 0].sum()
            l = abs(sample[sample <= 0].sum())
            pf = w / l if l > 0 else 0
            
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
            "PF": pfs[idx],
            "Sharpe": sharpes[idx],
            "MaxDD": mdds[idx],
            "AvgWin": returns[returns > 0].mean() if not returns[returns > 0].empty else 0,
            "AvgLoss": returns[returns <= 0].mean() if not returns[returns <= 0].empty else 0,
            "Trades": len(returns),
            "AvgRet": returns.mean()
        }

    def run(self):
        results = []
        print(f"Validating {len(self.symbol_data)} symbols...")
        
        for sym, df in self.symbol_data.items():
            trades = self.simulate_symbol(sym, df)
            metrics = self.bootstrap_metrics(trades)
            
            sector = self.qs.sector_map.get(sym, "Unknown")
            strat = "V5_Growth" if sector in self.qs.GROUPS["GROWTH"] else ("V1_Defensive" if sector in self.qs.GROUPS["DEFENSIVE"] else "Avoid")
            
            results.append({
                "Symbol": sym,
                "Sector": sector,
                "Strategy": strat,
                "PF (98% LB)": metrics['PF'],
                "Sharpe (98% LB)": metrics['Sharpe'],
                "MaxDD (98% LB)": metrics['MaxDD'],
                "Avg Win": metrics['AvgWin'],
                "Avg Loss": metrics['AvgLoss'],
                "Avg Return": metrics['AvgRet'],
                "Trades": metrics['Trades']
            })
            
        # Create Report
        df_res = pd.DataFrame(results)
        df_res = df_res.sort_values(['Strategy', 'PF (98% LB)'], ascending=[True, False])
        
        report = "# Granular Quant System Validation (2018-2025)\n\n"
        report += f"**Confidence**: 98% (Bootstrap {BOOTSTRAP_ITERATIONS}x)\n"
        report += "**Logic**: Matrix Route (Growth->V5, Defensive->V1) + Regime Filter (V5 Only)\n\n"
        
        # Custom Markdown Table
        headers = df_res.columns.tolist()
        md_table = "| " + " | ".join(headers) + " |\n"
        md_table += "| " + " | ".join(["---"] * len(headers)) + " |\n"
        for _, row in df_res.iterrows():
            row_str = []
            for item in row:
                if isinstance(item, float): row_str.append(f"{item:.2f}")
                else: row_str.append(str(item))
            md_table += "| " + " | ".join(row_str) + " |\n"
            
        report += md_table
        
        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f: f.write(report)
        print(f"Report: {OUTPUT_REPORT}")

if __name__ == "__main__":
    v = GranularValidator()
    v.run()
