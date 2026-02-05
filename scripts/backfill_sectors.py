
import json
import os
import yfinance as yf
import time

# Configuration
DATA_DIR = os.path.join("public", "data")
SECTOR_MAP_FILE = os.path.join(DATA_DIR, "stock_sector_map.json")

def load_sector_map():
    if os.path.exists(SECTOR_MAP_FILE):
        with open(SECTOR_MAP_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_sector_map(sector_map):
    with open(SECTOR_MAP_FILE, 'w') as f:
        json.dump(sector_map, f, indent=2)

def backfill_sectors():
    print("Loading sector map...")
    sector_map = load_sector_map()
    
    # Identify keys with missing/bad data
    missing_tickers = []
    
    for ticker, sector in sector_map.items():
        if not sector or sector in ["NA", "N/A", "Unknown", ""]:
            missing_tickers.append(ticker)
            
    print(f"Found {len(missing_tickers)} tickers with missing sector data.")
    
    if not missing_tickers:
        print("No missing data to backfill.")
        return

    # Process batch
    updated_count = 0
    
    for i, ticker in enumerate(missing_tickers):
        print(f"[{i+1}/{len(missing_tickers)}] Fetching {ticker} via yfinance...")
        
        try:
            # Handle special tickers if needed (e.g. BRK.B -> BRK-B)
            yf_ticker = ticker.replace('.', '-')
            
            stock = yf.Ticker(yf_ticker)
            info = stock.info
            
            sector = info.get('sector')
            if not sector:
                 # Try 'category' for ETFs?
                 sector = info.get('category')
            
            if sector:
                print(f"  -> Found: {sector}")
                sector_map[ticker] = sector
                updated_count += 1
            else:
                print(f"  -> Still not found.")
                
            time.sleep(0.5) # Politeness delay
            
        except Exception as e:
            print(f"  -> Error: {e}")
            
    if updated_count > 0:
        print(f"Saving {updated_count} updated records...")
        save_sector_map(sector_map)
        print("Done.")
    else:
        print("No updates made.")

if __name__ == "__main__":
    backfill_sectors()
