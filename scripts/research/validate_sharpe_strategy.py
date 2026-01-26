import os
import json
import pandas as pd
import numpy as np
import random
from typing import Dict, List, Any

# Constants
DATA_DIR = "public/data"
OUTPUT_REPORT = "docs/validation_reports/v5_sharpe_results.md"
TARGET_PF = 2.0
TARGET_SHARPE = 1.5
CONFIDENCE_LEVEL = 0.98

class SharpeEngine:
    """Calculates volatility-based indicators for Sharpe optimization."""
    
    @staticmethod
    def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        close = df['close']
        high = df['high']
        low = df['low']
        
        # 1. Trend Filter (Long Term)
        df['ma200'] = close.rolling(200).mean()
        
        # 2. Bollinger Bands (20, 2)
        df['bb_mid'] = close.rolling(20).mean()
        df['bb_std'] = close.rolling(20).std()
        df['bb_upper'] = df['bb_mid'] + (2 * df['bb_std'])
        df['bb_lower'] = df['bb_mid'] - (2 * df['bb_std'])
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_mid']
        
        # 3. Keltner Channels (20, 1.5 ATR - approximation for Squeeze checking)
        # We'll just use BB Width Percentile for Squeeze to be robust
        # Squeeze = Width is in the bottom 20% of the last 120 days (6 months)
        df['bb_width_pct'] = df['bb_width'].rolling(120).rank(pct=True)
        df['is_squeeze'] = df['bb_width_pct'] < 0.20
        
        # 4. ATR (14)
        df['tr1'] = high - low
        df['tr2'] = abs(high - close.shift())
        df['tr3'] = abs(low - close.shift())
        df['tr'] = df[['tr1', 'tr2', 'tr3']].max(axis=1)
        df['atr'] = df['tr'].rolling(14).mean()
        
        # 5. Chandelier Exit (Long)
        # Traditionally 22 period High - 3 * ATR
        df['highest_high'] = high.rolling(22).max()
        df['chandelier_long'] = df['highest_high'] - (3 * df['atr'])
        
        return df

class StrategyValidator:
    """Runs the backtest and validation logic."""
    
    def __init__(self):
        self.trades = []
        self.equity_curve = []
        self.data_map = {}

    def load_data(self):
        """Loads data from public/data with robust error handling."""
        files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and not f.startswith('index')]
        print(f"Loading {len(files)} files from {DATA_DIR}...")
        
        loaded_count = 0
        for filename in files:
            filepath = os.path.join(DATA_DIR, filename)
            try:
                # Try UTF-8
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = json.load(f)
                except:
                    with open(filepath, 'r') as f:
                        content = json.load(f)
                        
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
                    # Filter for decent volume/liquid stocks if needed, but we take all for now
                    df = df.sort_values('date').reset_index(drop=True)
                    df = SharpeEngine.add_indicators(df)
                    df = df.dropna()
                    symbol = filename.replace('.json', '').upper()
                    self.data_map[symbol] = df
                    loaded_count += 1
            except Exception as e:
                print(f"Skipping {filename}: {e}")
        
        print(f"Successfully loaded {loaded_count} symbols.")

    def run_backtest(self):
        """Executes the strategy logic."""
        print("Running Squeeze & Chandelier Backtest...")
        
        for symbol, df in self.data_map.items():
            self._backtest_symbol(symbol, df)
            
        print(f"Backtest Complete. Total Trades: {len(self.trades)}")

    def _backtest_symbol(self, symbol, df):
        in_position = False
        entry_price = 0
        entry_date = None
        entry_idx = 0
        highest_price_in_trade = 0
        
        for i in range(1, len(df)):
            row = df.iloc[i]
            prev_row = df.iloc[i-1]
            
            if not in_position:
                # ENTRY CONDITIONS
                # 1. Bull Trend (Close > MA200)
                # 2. Squeeze (Width < 20th percentile)
                # 3. Breakout (Close > Upper BB)
                
                is_bull = row['close'] > row['ma200']
                is_squeeze = row['is_squeeze']
                is_breakout = (row['close'] > row['bb_upper']) and (prev_row['close'] <= prev_row['bb_upper'])
                
                if is_bull and is_squeeze and is_breakout:
                    in_position = True
                    entry_price = row['close']
                    entry_date = row['date']
                    entry_idx = i
                    highest_price_in_trade = row['close']
            
            else:
                # UPDATE STATE
                highest_price_in_trade = max(highest_price_in_trade, row['high'])
                days_held = (row['date'] - entry_date).days
                
                # EXIT CONDITIONS
                exit_signal = False
                exit_reason = ""
                
                # 1. Chandelier Exit (Trailing Stop)
                # We calculate dynamic chandelier from the highest price seen in TRADE 
                # (Standard chandelier is rolling high, but local trade high is stricter)
                stop_price = highest_price_in_trade - (3 * row['atr'])
                if row['close'] < stop_price:
                    exit_signal = True
                    exit_reason = "Chandelier Stop"
                
                # 2. Time Stop (Dead Money)
                # If held > 10 days and profit < 0.5 ATR
                unrealized_pnl = row['close'] - entry_price
                if days_held > 10 and unrealized_pnl < (0.5 * row['atr']):
                    exit_signal = True
                    exit_reason = "Time Stop (Dead Money)"
                    
                if exit_signal:
                    pnl_pct = (row['close'] - entry_price) / entry_price
                    self.trades.append({
                        'Symbol': symbol,
                        'EntryDate': entry_date,
                        'ExitDate': row['date'],
                        'Reason': exit_reason,
                        'PnL': pnl_pct,
                        'Days': days_held,
                        'R_Multiple': unrealized_pnl / row['atr'] # Approximation
                    })
                    in_position = False

    def generate_report(self):
        if not self.trades:
            print("No trades generated.")
            return

        df_trades = pd.DataFrame(self.trades)
        
        # Basic Metrics
        wins = df_trades[df_trades['PnL'] > 0]
        losses = df_trades[df_trades['PnL'] <= 0]
        
        win_rate = len(wins) / len(df_trades)
        avg_win = wins['PnL'].mean() if not wins.empty else 0
        avg_loss = losses['PnL'].mean() if not losses.empty else 0
        
        gross_profit = wins['PnL'].sum()
        gross_loss = abs(losses['PnL'].sum())
        profit_factor = gross_profit / gross_loss if gross_loss != 0 else 0
        
        # Bootstrap Validation for Sharpe & Confidence
        # Assume 1% risk per trade for Sharpe calc
        risk_per_trade = 0.01
        capital_curve = [1.0]
        for pnl in df_trades['PnL']:
            # PnL here is % price move. 
            # If we risk 1% of equity at 1 ATR stop, and PnL is in R multiples...
            # Let's simplify: Return = PnL
            capital = capital_curve[-1] * (1 + pnl)
            capital_curve.append(capital)
            
        returns = pd.Series(df_trades['PnL'])
        sharpe_annualized = (returns.mean() / returns.std()) * (252 ** 0.5) if returns.std() != 0 else 0
        
        # Bootstrap
        n_iterations = 10000
        boot_metrics = []
        for _ in range(n_iterations):
            sample = returns.sample(n=len(returns), replace=True)
            s_mean = sample.mean()
            s_std = sample.std()
            sh = (s_mean / s_std) * (252 ** 0.5) if s_std != 0 else 0
            boot_metrics.append(sh)
            
        boot_metrics = sorted(boot_metrics)
        alpha_idx = int(n_iterations * (1 - CONFIDENCE_LEVEL))
        lower_bound_sharpe = boot_metrics[alpha_idx]
        
        # Output Generation
        report_content = f"""# Sharpe Strategy Validation (Protocol 5.0)

## Executive Summary
*   **Total Trades**: {len(df_trades)}
*   **Win Rate**: {win_rate:.1%}
*   **Profit Factor**: {profit_factor:.2f} (Target > {TARGET_PF})
*   **Sharpe Ratio**: {sharpe_annualized:.2f} (Target > {TARGET_SHARPE})
*   **98% Conf. Lower Bound Sharpe**: {lower_bound_sharpe:.2f}

## Hypothesis Status
*   **Profit Factor > 2.0**: {"✅ PASS" if profit_factor > 2.0 else "❌ FAIL"}
*   **Sharpe > 1.5**: {"✅ PASS" if sharpe_annualized > 1.5 else "❌ FAIL"}
*   **Statistical Significance**: The strategy has a 98% probability of having a Sharpe Ratio above {lower_bound_sharpe:.2f}.

## Trade Stats
*   **Avg Win**: {avg_win:.2%}
*   **Avg Loss**: {avg_loss:.2%}
*   **Risk/Reward Ratio**: {abs(avg_win/avg_loss):.2f}

## Detailed Log (First 10)
"""
        
        try:
            table_md = df_trades.head(10).to_markdown(index=False)
        except ImportError:
            # Fallback if tabulate is not installed
            table_md = df_trades.head(10).to_string(index=False)
        except Exception:
             table_md = str(df_trades.head(10))

        report_content += table_md
        
        # Ensure dir exists
        os.makedirs(os.path.dirname(OUTPUT_REPORT), exist_ok=True)
        with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"Report written to {OUTPUT_REPORT}")

if __name__ == "__main__":
    validator = StrategyValidator()
    validator.load_data()
    validator.run_backtest()
    validator.generate_report()
