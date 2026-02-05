import sys
import os
import time
import subprocess
from data.category_universes import get_all_category_tickers

# Add local directory to path to allow imports if running from scripts dir
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def main():
    # 1. Gather all tickers
    category_tickers = get_all_category_tickers()
    base_tickers = ["SPY", "QQQ", "IWM", "DIA", "VUG", "VTV", "VYM", "^VIX"]
    
    # Combined unique set
    all_tickers = sorted(list(set(category_tickers + base_tickers)))
    
    # Filter out problematic tickers if known (e.g. indices with ^ might need special handling or skip)
    # Dataroma likely doesn't have data for ^VIX.
    valid_tickers = [t for t in all_tickers if not t.startswith('^')]
    
    print(f"Found {len(valid_tickers)} tickers to process.")
    
    # 2. Process each ticker
    failed = []
    success = []
    
    for i, ticker in enumerate(valid_tickers):
        print(f"[{i+1}/{len(valid_tickers)}] Processing {ticker}...")
        try:
            # Run the existing crawler script as a subprocess
            # This ensures we use the logic exactly as defined in crawl_dataroma_stock.py
            # and isolates memory/state.
            result = subprocess.run(
                ["python", "scripts/crawl_dataroma_stock.py", "--ticker", ticker],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"SUCCESS: {ticker}")
                success.append(ticker)
            else:
                print(f"FAILED: {ticker}")
                print(f"Error output: {result.stderr}")
                failed.append(ticker)
                
        except Exception as e:
            print(f"EXCEPTION for {ticker}: {e}")
            failed.append(ticker)
        
        # Add a small delay between subprocess calls on top of the internal script delay
        # just to be extra safe, though the script has its own.
        # Actually the script has a start delay. We don't need double delay if calling sequentially.
        
    # 3. Summary
    print("\n" + "="*30)
    print("BATCH CRAWL COMPLETE")
    print(f"Total: {len(valid_tickers)}")
    print(f"Success: {len(success)}")
    print(f"Failed: {len(failed)}")
    
    if failed:
        print(f"Failed Tickers: {', '.join(failed)}")

if __name__ == "__main__":
    main()
