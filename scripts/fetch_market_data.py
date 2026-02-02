import yfinance as yf
import pandas as pd
import json
import os
import time
import requests
from datetime import datetime, timedelta

# Configuration
DATA_DIR = "public/data"
from data.category_universes import get_all_category_tickers

# Configuration
DATA_DIR = "public/data"
# Base tickers + Category Specific Tickers
BASE_TICKERS = ["SPY", "QQQ", "IWM", "DIA", "VUG", "VTV", "VYM", "^VIX"] 
TICKERS = list(set(BASE_TICKERS + get_all_category_tickers()))
MAX_RETRIES = 3
BACKOFF_FACTOR = 2

def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

def fetch_ticker_data(ticker): # Modified to fetch from 2018
    """Fetches OHLCV data for a single ticker with retry logic."""
    print(f"Fetching data for {ticker}...")
    for attempt in range(MAX_RETRIES):
        try:
            # Using yf.download with start date for 2018 comparative test
            df = yf.download(ticker, start="2018-01-01", interval="1d", progress=False, auto_adjust=True)
            
            if df.empty:
                print(f"Warning: No data found for {ticker}")
                return None
            
            # Basic validation
            if len(df) < 50:
                print(f"Warning: Insufficient data for {ticker} (only {len(df)} rows)")
                return None

            return df
        
        except Exception as e:
            wait_time = BACKOFF_FACTOR ** attempt
            print(f"Error fetching {ticker}: {e}. Retrying in {wait_time}s...")
            time.sleep(wait_time)
            
    print(f"Failed to fetch {ticker} after {MAX_RETRIES} attempts.")
    return None

def save_to_json(df, ticker):
    """Saves DataFrame to JSON format optimized for frontend."""
    # Reset index to get Date as a column
    df_reset = df.reset_index()
    
    # Format Date
    df_reset['Date'] = df_reset['Date'].dt.strftime('%Y-%m-%d')
    
    # Select and rename columns standard
    # yfinance auto_adjust=True returns: Open, High, Low, Close, Volume
    # We map them to lowercase for JS
    data = []
    
    # Handling MultiIndex columns if yfinance returns them (common with single ticker download too sometimes)
    if isinstance(df_reset.columns, pd.MultiIndex):
        df_reset.columns = df_reset.columns.get_level_values(0)

    for _, row in df_reset.iterrows():
        record = {
            "time": row['Date'], # TradingView often likes 'time' as YYYY-MM-DD or timestamp
            "open": round(row['Open'], 2),
            "high": round(row['High'], 2),
            "low": round(row['Low'], 2),
            "close": round(row['Close'], 2),
            "volume": int(row['Volume'])
        }
        data.append(record)
        
    filepath = os.path.join(DATA_DIR, f"{ticker}.json")
    with open(filepath, 'w') as f:
        json.dump(data, f, separators=(',', ':')) # Minified JSON
        
    print(f"Saved {len(data)} records to {filepath}")

def main():
    ensure_dir(DATA_DIR)
    
    results = {
        "success": [],
        "failed": [],
        "last_updated": datetime.now().isoformat()
    }
    
    for ticker in TICKERS:
        df = fetch_ticker_data(ticker)
        if df is not None:
            save_to_json(df, ticker)
            results["success"].append(ticker)
        else:
            results["failed"].append(ticker)
            
    # Save a manifest file
    with open(os.path.join(DATA_DIR, "manifest.json"), 'w') as f:
        json.dump(results, f, indent=2)
        
    print("\nBatch processing complete.")
    print(f"Success: {len(results['success'])}")
    print(f"Failed: {len(results['failed'])}")

if __name__ == "__main__":
    main()
