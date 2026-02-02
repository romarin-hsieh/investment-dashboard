import yfinance as yf
import pandas as pd
import numpy as np
import requests
import json
import os
import time

OUTPUT_DIR = "public/data/technical-indicators"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "market-sentiment.json")

# Ensure dir exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

def fetch_cnn_api():
    url = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        print(f"Fetching Official CNN Data from {url}...")
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'fear_and_greed' in data:
                score = data['fear_and_greed']['score']
                rating = data['fear_and_greed']['rating']
                # Extract history
                prev_close = data['fear_and_greed'].get('previous_close')
                prev_week = data['fear_and_greed'].get('previous_1_week')
                prev_month = data['fear_and_greed'].get('previous_1_month')
                prev_year = data['fear_and_greed'].get('previous_1_year')
                
                print(f"CNN API Success: {score} ({rating})")
                return {
                    "score": round(score, 2),
                    "rating": rating.capitalize(),
                    "source": "official",
                    "timestamp": datetime.datetime.now().isoformat(),
                    "history": {
                        "previous_close": round(prev_close, 2) if prev_close else None,
                        "1_week_ago": round(prev_week, 2) if prev_week else None,
                        "1_month_ago": round(prev_month, 2) if prev_month else None,
                        "1_year_ago": round(prev_year, 2) if prev_year else None
                    }
                }
    except Exception as e:
        print(f"CNN API Failed: {e}")
    return None

# --- Z-Score Logic (Fallback) ---
def calculate_z_score_model():
    print("Calculating Z-Score Model (Fallback)...")
    try:
        # Fetch Data
        tickers = ["^GSPC", "^VIX", "JNK", "IEF", "^NYA"]
        data = yf.download(tickers, period="2y", interval="1d", progress=False) # 2y is enough for 125d lookback
        
        # Flatten MultiIndex
        if isinstance(data.columns, pd.MultiIndex):
            closes = data['Close']
            highs = data['High']
            lows = data['Low']
        else:
            closes = data
            highs = data
            lows = data
            
        closes = closes.ffill()
        highs = highs.ffill()
        lows = lows.ffill()
        
        # Parameters
        LOOKBACK = 125
        SCALE = 20
        
        def z_norm(series, invert=False):
            rm = series.rolling(LOOKBACK).mean()
            rstd = series.rolling(LOOKBACK).std()
            z = (series - rm) / rstd
            if invert: z = -z
            return float((50 + z * SCALE).clip(0, 100).iloc[-1])
            
        # 1. Momentum
        spx = closes['^GSPC']
        ma125 = spx.rolling(125).mean()
        mom = z_norm(spx / ma125)
        
        # 2. Strength
        nya = closes['^NYA']
        h52 = nya.rolling(252).max()
        l52 = nya.rolling(252).min()
        stre = z_norm((nya - l52) / (h52 - l52))
        
        # 3. Breadth
        vix = closes['^VIX']
        br = z_norm(vix.diff(5), invert=True)
        
        # 4. Options
        opt = z_norm(vix, invert=True)
        
        # 5. Volatility
        vma50 = vix.rolling(50).mean()
        vol = z_norm((vix - vma50) / vma50, invert=True)
        
        # 6. Safe Haven
        sret = spx.pct_change(20)
        bret = closes['IEF'].pct_change(20)
        safe = z_norm(sret - bret)
        
        # 7. Junk
        junk = z_norm(closes['JNK'] / closes['IEF'])
        
        score = round((mom + stre + br + opt + vol + safe + junk) / 7)
        
        rating = "Neutral"
        if score < 25: rating = "Extreme Fear"
        elif score < 45: rating = "Fear"
        elif score > 75: rating = "Extreme Greed"
        elif score > 55: rating = "Greed"
        
        print(f"Model Calculated: {score} ({rating})")
        
        return {
            "score": score,
            "rating": rating,
            "source": "model",
            "timestamp": datetime.datetime.now().isoformat(),
            "components": {
                "momentum": mom,
                "strength": stre,
                "breadth": br,
                "options": opt,
                "volatility": vol,
                "safe_haven": safe,
                "junk_bond": junk
            }
        }
        
    except Exception as e:
        print(f"Model Calculation Failed: {e}")
        return {
            "score": 50,
            "rating": "Neutral",
            "source": "fallback_error",
            "timestamp": datetime.datetime.now().isoformat()
        }

import datetime

if __name__ == "__main__":
    # Try API
    result = fetch_cnn_api()
    
    # Try Model if API fails
    if not result:
        result = calculate_z_score_model()
        
    # Always Calculate Components for UI? 
    # Current Issue: API gives Score, but Vue needs components to draw the 7 sub-gauges.
    # If Source is Official, we still don't have sub-components from API.
    # Solution: ALWAYS run model to get components, but overwrite SCORE if API works.
    
    model_data = calculate_z_score_model()
    
    final_data = model_data.copy()
    
    if result and result.get('source') == 'official':
        final_data['score'] = result['score']
        final_data['rating'] = result['rating']
        final_data['source'] = 'official_with_model_components'
        if 'history' in result:
            final_data['history'] = result['history']
        print(f"Using Official Score: {final_data['score']}")
    
    # Save
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(final_data, f, indent=2)
        
    print(f"Saved to {OUTPUT_FILE}")
