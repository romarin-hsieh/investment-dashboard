import os
import json
import pandas as pd
import numpy as np
try:
    from research.quant_engine import KineticMarketState
except ImportError:
    # Fallback for running directly from the directory
    import sys
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from quant_engine import KineticMarketState

DATA_DIR = "public/data"

def load_all_data():
    """Loads all JSON data into a single Dictionary of DataFrames."""
    manifest_path = os.path.join(DATA_DIR, "manifest.json")
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
        
    tickers = manifest.get("success", [])
    data_map = {}
    
    for ticker in tickers:
        filepath = os.path.join(DATA_DIR, f"{ticker}.json")
        with open(filepath, 'r') as f:
            data = json.load(f)
        df = pd.DataFrame(data)
        if not df.empty:
            data_map[ticker] = df
            
    return data_map

def calculate_correlations():
    print("Loading data...")
    data_map = load_all_data()
    
    master_records = []
    
    print(f"Processing {len(data_map)} tickers...")
    for ticker, df in data_map.items():
        try:
            # 1. Run Quant Engine
            engine = KineticMarketState(df)
            df_analyzed = engine.analyze()
            
            # 2. Calculate Forward Returns (Ground Truth)
            # Future 1-day, 3-day, 5-day returns
            df_analyzed['ret_1d'] = df_analyzed['close'].shift(-1) / df_analyzed['close'] - 1
            df_analyzed['ret_3d'] = df_analyzed['close'].shift(-3) / df_analyzed['close'] - 1
            df_analyzed['ret_5d'] = df_analyzed['close'].shift(-5) / df_analyzed['close'] - 1
            
            # 3. Collect Data Points (ignoring last 5 days where future is unknown)
            valid_df = df_analyzed.dropna(subset=['ret_5d', 'x_trend', 'y_momentum', 'z_structure'])
            
            for _, row in valid_df.iterrows():
                master_records.append({
                    "ticker": ticker,
                    "x": row['x_trend'],
                    "y": row['y_momentum'],
                    "z": row['z_structure'],
                    "ret_1d": row['ret_1d'],
                    "ret_3d": row['ret_3d'],
                    "ret_5d": row['ret_5d']
                })
                
        except Exception as e:
            print(f"Error processing {ticker}: {e}")
            
    # 4. Global Correlation Analysis
    master_df = pd.DataFrame(master_records)
    print(f"\nTotal Data Points: {len(master_df)}")
    
    # Spearman Correlation (Rank Correlation - robust to outliers)
    corr_matrix = master_df[['x', 'y', 'z', 'ret_1d', 'ret_3d', 'ret_5d']].corr(method='spearman')
    
    print("\n=== Information Coefficient (IC) Analysis ===")
    print("Spearman Correlation with Future Returns:")
    print(corr_matrix.loc[['x', 'y', 'z'], ['ret_1d', 'ret_3d', 'ret_5d']].round(4))
    
    # 5. Conditional Probabilities (The "Actionable" Insight)
    print("\n=== Conditional Probabilities (Validation of Strategies) ===")
    
    # Scenario 1: LAUNCHPAD (High Z + Up Trend)
    launchpad_mask = (master_df['z'] > 0.8) & (master_df['x'] > 0)
    lp_returns = master_df[launchpad_mask]['ret_5d']
    lp_win_rate = (lp_returns > 0).mean()
    print(f"\n[LAUNCHPAD] (Z>0.8, X>0)")
    print(f"Sample Size: {len(lp_returns)}")
    print(f"5-Day Win Rate: {lp_win_rate:.1%}")
    print(f"Avg 5-Day Return: {lp_returns.mean():.2%}")
    
    # Scenario 2: DIP BUY (Strong Trend + Oversold)
    dip_mask = (master_df['x'] > 0.5) & (master_df['y'] < 0.2)
    dip_returns = master_df[dip_mask]['ret_5d']
    dip_win_rate = (dip_returns > 0).mean()
    print(f"\n[DIP BUY] (X>0.5, Y<0.2)")
    print(f"Sample Size: {len(dip_returns)}")
    print(f"5-Day Win Rate: {dip_win_rate:.1%}")
    print(f"Avg 5-Day Return: {dip_returns.mean():.2%}")

    # Scenario 3: CLIMAX (Overheated)
    climax_mask = (master_df['x'] > 1.0) & (master_df['y'] > 0.9)
    climax_returns = master_df[climax_mask]['ret_5d']
    climax_win_rate = (climax_returns > 0).mean()
    print(f"\n[CLIMAX (Short Signal?)] (X>1.0, Y>0.9)")
    print(f"Sample Size: {len(climax_returns)}")
    print(f"5-Day Win Rate (Bullish): {climax_win_rate:.1%}")
    print(f"Avg 5-Day Return: {climax_returns.mean():.2%}")

if __name__ == "__main__":
    calculate_correlations()
