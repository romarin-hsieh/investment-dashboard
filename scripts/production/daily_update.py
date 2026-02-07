import os
import json
import pandas as pd
import numpy as np
import sys
import argparse
from datetime import datetime

# Add path
sys.path.append(os.getcwd())
from scripts.core.strategy_selector import QuantSystem, DataProvider, MarketRegime

DATA_DIR = "public/data"
OHLCV_DIR = "public/data/ohlcv"
OUTPUT_JSON = "public/data/dashboard_status.json"
OUTPUT_IMG_DIR = "public/assets"

class DailyUpdate:
    def __init__(self):
        self.qs = QuantSystem()
        self.symbol_data = {}
        self.spy_data = None
        self.sector_data = {} # Cache for XLK, etc.
        
    def load_data(self):
        print("Loading Market Data...")
        # SPY
        try:
            spy_path = f"{OHLCV_DIR}/SPY.json"
            if not os.path.exists(spy_path): spy_path = f"{DATA_DIR}/SPY.json"
            
            with open(spy_path, 'r', encoding='utf-8') as f:
                c = json.load(f)
                self.spy_data = pd.DataFrame(c) if isinstance(c, list) else pd.DataFrame({'date':pd.to_datetime(c['timestamps'],unit='ms'),'close':c['close']})
                if 'time' in self.spy_data.columns: self.spy_data['date'] = pd.to_datetime(self.spy_data['time'])
                self.spy_data = self.spy_data.set_index('date').sort_index()
        except: pass
        
        # Symbols
        # Scan OHLCV directory for symbol data
        if os.path.exists(OHLCV_DIR):
            files = [f for f in os.listdir(OHLCV_DIR) if f.endswith('.json') and not f.startswith('index') and 'SPY' not in f and 'sector' not in f]
            dir_to_scan = OHLCV_DIR
        else:
            files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and not f.startswith('index') and 'SPY' not in f and 'sector' not in f]
            dir_to_scan = DATA_DIR

        for fname in files:
            try:
                sym = fname.replace('.json', '').upper()
                with open(f"{dir_to_scan}/{fname}", 'r', encoding='utf-8') as f: c = json.load(f)
                df = pd.DataFrame(c) if isinstance(c, list) else pd.DataFrame({'date':pd.to_datetime(c['timestamps'],unit='ms'),'close':c['close'],'open':c['open'],'high':c['high'],'low':c['low']})
                if 'time' in df.columns: df['date'] = pd.to_datetime(df['time'])
                df = df.set_index('date').sort_index()
                if not df.empty: self.symbol_data[sym] = df
            except: pass
            
    def run_analysis(self):
        print("Running QuantSystem Matrix Analysis...")
        results = []
        
        # Global Regime
        regime = MarketRegime.get_global_regime(self.spy_data)
        
        for sym, df in self.symbol_data.items():
            # Get Sector Logic
            # Note: strategy_selector.py uses a mock or passed sector_data.
            # In production we ideally load XLK.json etc.
            # For now we reuse SPY as proxy if specific ETF missing, or try to load.
            
            sector = self.qs.sector_map.get(sym, "Unknown")
            etf = DataProvider.get_etf_ticker(sector)
            
            # Try load ETF data
            sector_df = None
            if etf == "SPY": sector_df = self.spy_data
            else:
                 # Try load from file
                 path = f"{DATA_DIR}/{etf}.json"
                 if os.path.exists(path):
                     # Load logic strictly needs implementation, but assuming file exists for full production
                     # For MVP we default to SPY proxy inside logic if missing
                     pass
                 else:
                     # Fallback to SPY if Sector ETF missing
                     sector_df = self.spy_data
            
            # Check required columns
            required_cols = ['open', 'high', 'low', 'close']
            if not all(col in df.columns for col in required_cols):
                print(f"Skipping {sym}: Missing columns")
                continue

            # Run Analysis
            res = self.qs.analyze_ticker(sym, df, self.spy_data, sector_df)
            
            # Calculate Metrics Function (Reusable for history)
            # 計算指標函數 (可重用於歷史數據)
            def calc_metrics(series_close):
                if len(series_close) < 50: return 0, 0.5, 0.5
                
                # X: Trend Velocity (Z-Score of Price vs 20MA)
                # X: 趨勢速度 (價格相對於 20日移動平均線的 Z-Score)
                # Formula: (Price - MA20) / StdDev50
                _ma20 = series_close.ewm(span=20).mean()
                _std50 = series_close.rolling(50).std()
                _x = (series_close - _ma20) / (_std50.replace(0, 1))
                
                # Y: Momentum Force (Stochastic RSI)
                # Y: 動能強度 (隨機指標 RSI)
                # Formula: Stoch(RSI(14)), smoothed by SMA(3)
                _delta = series_close.diff()
                _up = _delta.clip(lower=0)
                _down = -1 * _delta.clip(upper=0)
                _rs = _up.rolling(14).mean() / _down.rolling(14).mean().replace(0, 0.001)
                _rsi = 100 - (100 / (1 + _rs))
                _rsi_min = _rsi.rolling(14).min()
                _rsi_max = _rsi.rolling(14).max()
                _stoch = (_rsi - _rsi_min) / (_rsi_max - _rsi_min).replace(0, 1)
                _y = _stoch.rolling(3).mean()
                
                # Z: Market Structure (Volatility Compression / Squeeze)
                # Z: 市場結構 (波動率壓縮 / 擠壓)
                # Formula: 1 - Normalized Bollinger Band Width (120-day lookback)
                # High Z = High Compression (Potential Breakout)
                _std20 = series_close.rolling(20).std()
                _bbw = (4 * _std20) / _ma20
                _w_min = _bbw.rolling(120).min()
                _w_max = _bbw.rolling(120).max()
                _z = 1 - (_bbw - _w_min) / (_w_max - _w_min).replace(0, 1)
                _z = _z.clip(0, 1)
                
                return _x, _y, _z

            # Full History Calc for Stock
            sx, sy, sz = calc_metrics(df['close'])
            x_val, y_val, z_val = sx.iloc[-1], sy.iloc[-1], sz.iloc[-1]
            
            # Trace (Last 30 points)
            trace = []
            for i in range(max(0, len(df)-30), len(df)):
                trace.append({
                    "x_trend": float(sx.iloc[i]) if not pd.isna(sx.iloc[i]) else 0,
                    "y_momentum": float(sy.iloc[i]) if not pd.isna(sy.iloc[i]) else 0.5,
                    "z_structure": float(sz.iloc[i]) if not pd.isna(sz.iloc[i]) else 0.5
                })

            # Sector Trace (Last 30 points)
            sector_trace = []
            if sector_df is not None and not sector_df.empty:
                # Align dates? Assuming similar index or reindex.
                # For MVP, just take last 30 of sector_df (might misalign if holidays differ, but okay for viz)
                sex, sey, sez = calc_metrics(sector_df['close'])
                for i in range(max(0, len(sector_df)-30), len(sector_df)):
                    sector_trace.append({
                        "x_trend": float(sex.iloc[i]) if not pd.isna(sex.iloc[i]) else 0,
                        "y_momentum": float(sey.iloc[i]) if not pd.isna(sey.iloc[i]) else 0.5,
                        "z_structure": float(sez.iloc[i]) if not pd.isna(sez.iloc[i]) else 0.5
                    })

            # Add latest price info
            last_close = df['close'].iloc[-1]
            prev_close = df['close'].iloc[-2] if len(df) > 1 else last_close
            change_pct = ((last_close - prev_close) / prev_close) * 100
            last_date = df.index[-1].strftime('%Y-%m-%d')
            
            # Format Result
            row = {
                "ticker": sym, # Frontend uses 'ticker'
                "sector": sector,
                "strategy": res['Strategy'],
                "signal": res['Signal'],
                "reason": res['Reason'],
                "commentary": res['Reason'], # Map reason to commentary
                "price": float(last_close),
                "change_percent": float(change_pct),
                "date": last_date,
                "coordinates": {
                    "x_trend": float(x_val) if not pd.isna(x_val) else 0,
                    "y_momentum": float(y_val) if not pd.isna(y_val) else 0.5,
                    "z_structure": float(z_val) if not pd.isna(z_val) else 0.5
                },
                "trace": trace,
                "sector_trace": sector_trace
            }
            results.append(row)
            
        # Export
        output = {
            "meta": {
                "description": "Quant Kinetic State & Dashboard Status",
                "version": "2.5",
                "generated_by": "daily_update.py"
            },
            "updated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "global_regime": regime,
            "data": results
        }
        
        with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2)
        print(f"Dashboard Data Saved: {OUTPUT_JSON}")
        
    def generate_viz(self):
        # Run the Ghost Comet script for the 'Best' output or just run it to update assets
        # We can import or subprocess.
        print("Generating Visualization...")
        cmd = "python scripts/viz/ghost_comet.py" # Uses its own simulation data currently
        # Todo: Update ghost_comet.py to read real data. 
        # For Phase 18 MVP, we run the simulation script to prove pipeline.
        os.system(cmd)

if __name__ == "__main__":
    app = DailyUpdate()
    app.load_data()
    app.run_analysis()
    app.generate_viz()
