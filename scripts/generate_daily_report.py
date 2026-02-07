import os
import json
import pandas as pd
from datetime import datetime
from research.quant_engine import KineticMarketState

# Configuration
DATA_DIR = "public/data/ohlcv"
OUTPUT_FILE = "public/data/quant_kinetic_signals.json"

def load_market_data(ticker):
    """Loads JSON data for a ticker into a DataFrame."""
    filepath = os.path.join(DATA_DIR, f"{ticker}.json")
    if not os.path.exists(filepath):
        print(f"Warning: Data file not found for {ticker}")
        return None
        
    with open(filepath, 'r') as f:
        data = json.load(f)
        
    df = pd.DataFrame(data)
    return df

def main():
    # Load manifest to see which tickers we have
    manifest_path = os.path.join(DATA_DIR, "manifest.json")
    if not os.path.exists(manifest_path):
        print("Error: manifest.json not found. Run fetch_market_data.py first.")
        return
        
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
        
    successful_tickers = manifest.get("success", [])
    report_data = []
    
    print(f"Starting analysis for {len(successful_tickers)} tickers...")
    
    # v2.0 VIX Filter Check
    vix_panic_mode = False
    vix_path = os.path.join(DATA_DIR, "^VIX.json")
    if os.path.exists(vix_path):
        try:
            with open(vix_path, 'r') as f:
                vix_data = json.load(f)
            if vix_data:
                # Latest VIX close
                last_vix = vix_data[-1]['close']
                if last_vix > 35:
                    vix_panic_mode = True
                    print(f"!!! CRITICAL: VIX is {last_vix} (>35). Engaging CRISIS_HALT Protocol. !!!")
        except Exception as e:
            print(f"Warning: Could not check VIX: {e}")

    for ticker in successful_tickers:
        try:
            if ticker == "^VIX": continue # Skip VIX itself in report
            
            df = load_market_data(ticker)
            if df is None or df.empty:
                continue
                
            # Initialize Engine
            engine = KineticMarketState(df)
            result_df = engine.analyze()
            
            # Get latest data point (Today)
            latest = result_df.iloc[-1]
            
            # v2.0 Global Override
            final_signal = latest['signal']
            final_commentary = latest['commentary']
            
            if vix_panic_mode and final_signal in ["LAUNCHPAD", "DIP_BUY"]:
                final_signal = "CRISIS_HALT"
                final_commentary = "Global Risk Alert: VIX > 35. All buy signals are suspended. Cash is King."
            
            # Pack result for Frontend
            summary = {
                "ticker": ticker,
                "date": latest['time'],
                "price": latest['close'],
                "change_percent": round(((latest['close'] - result_df.iloc[-2]['close']) / result_df.iloc[-2]['close']) * 100, 2),
                "coordinates": {
                    "x_trend": round(latest['x_trend'], 2),
                    "y_momentum": round(latest['y_momentum'], 2),
                    "z_structure": round(latest['z_structure'], 2)
                },
                "signal": final_signal,
                "commentary": final_commentary,
                # History trace for "Comet" visualization (Last 20 points)
                "trace": result_df.iloc[-20:][['x_trend', 'y_momentum', 'z_structure']].to_dict(orient='records')
            }
            
            report_data.append(summary)
            print(f"Processed {ticker}: {summary['signal']}")
            
        except Exception as e:
            print(f"Error analyzing {ticker}: {e}")
            
    # Save Report
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(report_data, f, indent=2)
        
    print(f"\nAnalysis complete. Report saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
