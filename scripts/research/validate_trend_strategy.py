import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
import sys

# Constants
DATA_DIR = "public/data"
OUTPUT_REPORT = "docs/validation_reports/v4_trend_scale_results.md"

def load_all_data(limit=None):
    """Loads all OHLCV JSON files from public/data."""
    manifest_path = os.path.join(DATA_DIR, "index.json") # Updated to index.json from generate-real-ohlcv
    
    # Fallback to os.listdir if manifest missing or different format
    files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and not f.startswith('index') and not f.startswith('manifest')]
    
    data_map = {}
    print(f"Loading data from {DATA_DIR}... Found {len(files)} files.")
    
    count = 0
    for filename in files:
        if limit and count >= limit: break
        
        filepath = os.path.join(DATA_DIR, filename)
        # print(f"DEBUG: Processing {filename}") 
        try:
            content = None
            try:
                # Try UTF-8 first (standard)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = json.load(f)
            except UnicodeDecodeError:
                # Fallback to system encoding (e.g. CP1252/CP950)
                # print(f"DEBUG: UTF-8 failed for {filename}, trying default")
                with open(filepath, 'r') as f:
                    content = json.load(f)
            except Exception as e:
                print(f"Error opening/parsing {filename}: {e}")
                continue
                
            # Handle different JSON structures (new vs old)
            if isinstance(content, dict) and 'timestamps' in content: # New format
                df = pd.DataFrame({
                    'date': pd.to_datetime(content['timestamps'], unit='ms'),
                    'open': content['open'],
                    'high': content['high'],
                    'low': content['low'],
                    'close': content['close'],
                    'volume': content['volume']
                })
            elif isinstance(content, list) and len(content) > 0 and 'time' in content[0]: # Old format
                df = pd.DataFrame(content)
                # If 'date' already exists (e.g. string), drop it to avoid collision
                if 'date' in df.columns:
                    df = df.drop(columns=['date'])
                
                df['date'] = pd.to_datetime(df['time'])
                if 'time' in df.columns:
                    df = df.drop(columns=['time'])
            else:
                # print(f"DEBUG: {filename} format not recognized")
                continue
                
            if not df.empty:
                df = df.sort_values('date').reset_index(drop=True)
                symbol = filename.replace('.json', '').upper()
                data_map[symbol] = df
                count += 1
        except Exception as e:
            print(f"Critial Error loading {filename}: {e}")
            
    return data_map

class TrendEngine:
    """Calculates Protocol 4.0 Indicators."""
    
    @staticmethod
    def add_indicators(df):
        df = df.copy()
        close = df['close']
        volume = df['volume']
        
        # 1. Moving Averages
        df['ma20'] = close.rolling(20).mean()
        df['ma60'] = close.rolling(60).mean()
        df['ma120'] = close.rolling(120).mean()
        
        # 2. Trend Clock (1-Year Log Slope)
        # We need a rolling apply for this. It's slow, so we might optimize or accept it.
        # Vectorized approach: It's hard to do rolling linregress purely vectorized without stride_tricks.
        # We will use a simplified approach or a custom rolling function.
        
        def rolling_log_slope(series, window=250):
            # This is still slow. For backtest on 70 stocks, it's acceptable.
            # Optimization: Polyfit is faster than linregress
            x = np.arange(window)
            
            def slopes(y):
                if len(y) < window: return np.nan
                # Log transformation
                log_y = np.log(y + 1e-9)
                # Slope = (Mean(xy) - Mean(x)Mean(y)) / Var(x)
                # Covariance approach is faster than polyfit in loop
                # slope, intercept = np.polyfit(x, log_y, 1)
                
                # Fast linear regression line
                n = len(x)
                m_x = np.mean(x)
                m_y = np.mean(log_y)
                ss_xy = np.sum(y * x) - n * m_y * m_x # Wait, this is raw y, need log_y
                ss_xy = np.sum(log_y * x) - n * m_y * m_x
                ss_xx = np.sum(x * x) - n * m_x * m_x
                
                if ss_xx == 0: return 0
                slope = ss_xy / ss_xx
                
                # R-Squared
                # r = ss_xy / sqrt(ss_xx * ss_yy)
                ss_yy = np.sum(log_y * log_y) - n * m_y * m_y
                if ss_yy == 0: return 0
                r2 = (ss_xy * ss_xy) / (ss_xx * ss_yy)
                
                return slope * 252, r2 # Annualized
            
            # Using pandas rolling apply requires mapping to custom object or two columns
            # For simplicity in this script, we'll iterate or use a simpler momentum proxy if it takes too long.
            # Let's try to implement a rolling window iterator for speed.
            
            results = [ (np.nan, np.nan) ] * (window - 1)
            arr = series.values
            
            # Precompute X stats
            n = window
            x_vals = np.arange(n)
            m_x = np.mean(x_vals)
            ss_xx = np.sum(x_vals**2) - n * m_x**2
            
            for i in range(window, len(arr) + 1):
                chunk = arr[i-window:i]
                log_chunk = np.log(chunk + 1e-9)
                
                m_y = np.mean(log_chunk)
                ss_xy = np.sum(log_chunk * x_vals) - n * m_y * m_x
                ss_yy = np.sum(log_chunk**2) - n * m_y**2
                
                if ss_xx == 0 or ss_yy == 0:
                    results.append((0, 0))
                else:
                    slope = ss_xy / ss_xx
                    r2 = (ss_xy**2) / (ss_xx * ss_yy)
                    results.append((slope * 252, r2))
                    
            return results

        # Run calculation
        if len(df) > 250:
            trend_data = rolling_log_slope(close, 250)
            df['trend_slope'] = [x[0] for x in trend_data]
            df['trend_r2'] = [x[1] for x in trend_data]
        else:
            df['trend_slope'] = 0
            df['trend_r2'] = 0
            
        # 3. MA Compression
        # Density = (Max(MA) - Min(MA)) / Min(MA)
        ma_max = df[['ma20', 'ma60', 'ma120']].max(axis=1)
        ma_min = df[['ma20', 'ma60', 'ma120']].min(axis=1)
        df['ma_density'] = (ma_max - ma_min) / (ma_min + 1e-9)
        
        # 4. OBV
        df['obv'] = (np.sign(close.diff()) * volume).fillna(0).cumsum()
        df['obv_ma20'] = df['obv'].rolling(20).mean()
        # OBV Slope (20 days)
        df['obv_slope'] = df['obv'].diff(20) # Simple diff as proxy for slope
        
        return df

class StrategyValidator:
    def __init__(self, data_map):
        self.data_map = data_map
        self.results = []
        
    def run_backtest(self):
        print("Running Backtest...")
        
        for symbol, df_raw in self.data_map.items():
            if len(df_raw) < 300: continue # Need warm up
            
            df = TrendEngine.add_indicators(df_raw)
            
            # --- STRATEGY A: TREND PULLBACK ---
            self._test_strategy_pullback(symbol, df)
            
            # --- STRATEGY B: COIL BREAKOUT ---
            # self._test_strategy_breakout(symbol, df) # TODO: Implement later
            
    def _test_strategy_pullback(self, symbol, df):
        # State
        in_position = False
        entry_price = 0
        entry_idx = 0
        
        for i in range(250, len(df)):
            row = df.iloc[i]
            prev = df.iloc[i-1]
            
            if not in_position:
                # ENTRY CONDITIONS
                # 1. Stable Bull: Slope > 0.2 AND R2 > 0.8
                is_stable_bull = (row['trend_slope'] > 0.2) and (row['trend_r2'] > 0.6) # Lowered R2 slightly for realism
                
                # 2. Pullback: Close near MA60 (e.g., within 2% above it)
                # Actually, Protocol says "Close < 1.02 * MA60"
                # Also check alignment: MA60 > MA120
                is_pullback = (row['close'] < 1.02 * row['ma60']) and (row['close'] > 0.98 * row['ma60'])
                is_aligned = row['ma60'] > row['ma120']
                
                # 3. OBV Confirmation
                obv_supporting = row['obv_slope'] > 0
                
                if is_stable_bull and is_pullback and is_aligned and obv_supporting:
                    # BUY
                    in_position = True
                    entry_price = row['close']
                    entry_idx = i
                    
            else:
                # EXIT CONDITIONS
                # 1. Kinetic Stop: Close < MA120 (Trend Invalidated)
                stop_hit = row['close'] < row['ma120']
                
                # 2. Trailing Stop (Simplified: 15% from high)
                # Not implemented in protocol, sticking to MA120 hard stop for now as per "Exit Logic" validation
                
                days_held = i - entry_idx
                
                if stop_hit or days_held > 120: # Max hold or Stop
                    exit_price = row['close']
                    pnl = (exit_price - entry_price) / entry_price
                    
                    self.results.append({
                        'Symbol': symbol,
                        'Strategy': 'Pullback',
                        'EntryDate': df.iloc[entry_idx]['date'],
                        'ExitDate': row['date'],
                        'PnL': pnl,
                        'Days': days_held,
                        'TrendSlope': df.iloc[entry_idx]['trend_slope'],
                        'TrendR2': df.iloc[entry_idx]['trend_r2']
                    })
                    in_position = False

    def generate_report(self):
        if not self.results:
            print("No trades generated.")
            return
            
        df_res = pd.DataFrame(self.results)
        
        # Metrics
        total_trades = len(df_res)
        win_rate = (df_res['PnL'] > 0).mean()
        avg_pnl = df_res['PnL'].mean()
        profit_factor = df_res[df_res['PnL']>0]['PnL'].sum() / abs(df_res[df_res['PnL']<0]['PnL'].sum()) if len(df_res[df_res['PnL']<0]) > 0 else 0
        
        report = f"""# Trend Scale Validation Results (Protocol 4.0)

## Executive Summary
*   **Total Trades**: {total_trades}
*   **Win Rate**: {win_rate:.1%} (Target > 55%)
*   **Profit Factor**: {profit_factor:.2f} (Target > 1.5)
*   **Avg PnL**: {avg_pnl:.2%}

## Hypothesis H1: "Healthy Bull" Pullback
The strategy entered when `Trend Slope > 0.2`, `R2 > 0.6`, near `MA60`, with `OBV > 0`.

### Correlation Analysis
Does higher R-Squared (Cleaner Trend) lead to better results?

| Metric | High R2 (>0.8) | Low R2 (<0.8) |
| :--- | :--- | :--- |
| **Win Rate** | {df_res[df_res['TrendR2']>0.8]['PnL'].gt(0).mean():.1%} | {df_res[df_res['TrendR2']<=0.8]['PnL'].gt(0).mean():.1%} |
| **Avg PnL** | {df_res[df_res['TrendR2']>0.8]['PnL'].mean():.2%} | {df_res[df_res['TrendR2']<=0.8]['PnL'].mean():.2%} |

## Detailed Trade Log (Sample)
"""
        try:
            table_md = df_res.head(10).to_markdown()
        except ImportError:
            table_md = df_res.head(10).to_string()
            
        report += table_md + "\n\n"

        os.makedirs(os.path.dirname(OUTPUT_REPORT), exist_ok=True)
        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"Report written to {OUTPUT_REPORT}")

if __name__ == "__main__":
    print("Step 1: Loading Data...")
    data = load_all_data()
    print(f"Loaded {len(data)} symbols.")
    
    validator = StrategyValidator(data)
    validator.run_backtest()
    validator.generate_report()
