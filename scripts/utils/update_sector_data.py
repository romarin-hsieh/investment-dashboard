import json
import os
from datetime import datetime

SECTOR_FILE = "public/data/sector_industry.json"

# Manual Mapping for Missing Symbols
NEW_DATA = {
    "AAPL": {"sector": "Technology", "industry": "Consumer Electronics", "market_cap": "mega_cap"},
    "ABBV": {"sector": "Healthcare", "industry": "Drug Manufacturers", "market_cap": "mega_cap"},
    "ACHR": {"sector": "Industrials", "industry": "Aerospace & Defense", "market_cap": "mid_cap"},
    "AMD": {"sector": "Technology", "industry": "Semiconductors", "market_cap": "large_cap"},
    "AMGN": {"sector": "Healthcare", "industry": "Drug Manufacturers", "market_cap": "large_cap"},
    "AXP": {"sector": "Financial Services", "industry": "Credit Services", "market_cap": "large_cap"},
    "BA": {"sector": "Industrials", "industry": "Aerospace & Defense", "market_cap": "large_cap"},
    "BAC": {"sector": "Financial Services", "industry": "Banks - Diversified", "market_cap": "mega_cap"},
    "BBIO": {"sector": "Healthcare", "industry": "Biotechnology", "market_cap": "mid_cap"},
    "BRK-B": {"sector": "Financial Services", "industry": "Insurance", "market_cap": "mega_cap"},
    "CAT": {"sector": "Industrials", "industry": "Farm & Heavy Construction Machinery", "market_cap": "large_cap"},
    "CDE": {"sector": "Basic Materials", "industry": "Silver", "market_cap": "small_cap"},
    "COST": {"sector": "Consumer Defensive", "industry": "Discount Stores", "market_cap": "mega_cap"},
    "CRDO": {"sector": "Technology", "industry": "Semiconductors", "market_cap": "mid_cap"},
    "CSCO": {"sector": "Technology", "industry": "Communication Equipment", "market_cap": "large_cap"},
    "CVLT": {"sector": "Technology", "industry": "Software - Infrastructure", "market_cap": "mid_cap"},
    "CVX": {"sector": "Energy", "industry": "Oil & Gas Integrated", "market_cap": "mega_cap"},
    "DIA": {"sector": "ETF", "industry": "Index - Dow 30", "market_cap": "mega_cap"},
    "DY": {"sector": "Industrials", "industry": "Engineering & Construction", "market_cap": "mid_cap"},
    "FN": {"sector": "Technology", "industry": "Electronic Components", "market_cap": "mid_cap"},
    "GH": {"sector": "Healthcare", "industry": "Diagnostics & Research", "market_cap": "mid_cap"},
    "GOOGL": {"sector": "Communication Services", "industry": "Internet Content", "market_cap": "mega_cap"},
    "GS": {"sector": "Financial Services", "industry": "Capital Markets", "market_cap": "large_cap"},
    "HD": {"sector": "Consumer Cyclical", "industry": "Home Improvement Retail", "market_cap": "mega_cap"},
    "HL": {"sector": "Basic Materials", "industry": "Silver", "market_cap": "mid_cap"},
    "HON": {"sector": "Industrials", "industry": "Conglomerates", "market_cap": "large_cap"},
    "HQY": {"sector": "Healthcare", "industry": "Health Information Services", "market_cap": "mid_cap"},
    "IBM": {"sector": "Technology", "industry": "Information Technology Services", "market_cap": "large_cap"},
    "INTU": {"sector": "Technology", "industry": "Software - Application", "market_cap": "large_cap"},
    "IWM": {"sector": "ETF", "industry": "Index - Russell 2000", "market_cap": "large_cap"},
    "JNJ": {"sector": "Healthcare", "industry": "Drug Manufacturers", "market_cap": "mega_cap"},
    "JPM": {"sector": "Financial Services", "industry": "Banks - Diversified", "market_cap": "mega_cap"},
    "KO": {"sector": "Consumer Defensive", "industry": "Beverages - Non-Alcoholic", "market_cap": "mega_cap"},
    "LLY": {"sector": "Healthcare", "industry": "Drug Manufacturers", "market_cap": "mega_cap"},
    "MA": {"sector": "Financial Services", "industry": "Credit Services", "market_cap": "mega_cap"},
    "MCD": {"sector": "Consumer Cyclical", "industry": "Restaurants", "market_cap": "mega_cap"},
    "MDGL": {"sector": "Healthcare", "industry": "Biotechnology", "market_cap": "mid_cap"},
    "MRK": {"sector": "Healthcare", "industry": "Drug Manufacturers", "market_cap": "mega_cap"},
    "NXT": {"sector": "Technology", "industry": "Solar", "market_cap": "mid_cap"},
    "PG": {"sector": "Consumer Defensive", "industry": "Household & Personal Products", "market_cap": "mega_cap"},
    "PM": {"sector": "Consumer Defensive", "industry": "Tobacco", "market_cap": "large_cap"},
    "QBTS": {"sector": "Technology", "industry": "Computer Hardware", "market_cap": "small_cap"},
    "QQQ": {"sector": "ETF", "industry": "Index - Nasdaq 100", "market_cap": "mega_cap"},
    "RMBS": {"sector": "Technology", "industry": "Semiconductors", "market_cap": "mid_cap"},
    "RTX": {"sector": "Industrials", "industry": "Aerospace & Defense", "market_cap": "large_cap"},
    "SATS": {"sector": "Communication Services", "industry": "Telecom Services", "market_cap": "mid_cap"},
    "SHW": {"sector": "Basic Materials", "industry": "Specialty Chemicals", "market_cap": "large_cap"},
    "SPY": {"sector": "ETF", "industry": "Index - S&P 500", "market_cap": "mega_cap"},
    "STRL": {"sector": "Industrials", "industry": "Engineering & Construction", "market_cap": "mid_cap"},
    "TRV": {"sector": "Financial Services", "industry": "Insurance", "market_cap": "large_cap"},
    "UNH": {"sector": "Healthcare", "industry": "Healthcare Plans", "market_cap": "mega_cap"},
    "V": {"sector": "Financial Services", "industry": "Credit Services", "market_cap": "mega_cap"},
    "VTV": {"sector": "ETF", "industry": "Index - Value", "market_cap": "mega_cap"},
    "VUG": {"sector": "ETF", "industry": "Index - Growth", "market_cap": "mega_cap"},
    "VYM": {"sector": "ETF", "industry": "Index - Dividend", "market_cap": "mega_cap"},
    "WFC": {"sector": "Financial Services", "industry": "Banks - Diversified", "market_cap": "large_cap"},
    "WMT": {"sector": "Consumer Defensive", "industry": "Discount Stores", "market_cap": "mega_cap"},
    "XOM": {"sector": "Energy", "industry": "Oil & Gas Integrated", "market_cap": "mega_cap"},
}

IGNORE_FILES = {"ANALYSIS_RESULTS", "MANIFEST", "STATUS", "SYMBOLS_METADATA", "^VIX"}

def update():
    try:
        with open(SECTOR_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except:
        data = {"items": []}

    existing_symbols = {item['symbol'].upper(): item for item in data['items']}
    
    count = 0
    for sym, meta in NEW_DATA.items():
        if sym not in existing_symbols:
            new_item = {
                "symbol": sym,
                "sector": meta['sector'],
                "industry": meta['industry'],
                "market_cap_category": meta['market_cap'],
                "confidence": 1.0,
                "sources": ["manual_fix"],
                "last_verified_at": datetime.utcnow().isoformat() + "+00:00"
            }
            data['items'].append(new_item)
            count += 1
            
    if count > 0:
        with open(SECTOR_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Added {count} new symbols to {SECTOR_FILE}")
    else:
        print("No new symbols to add.")

if __name__ == "__main__":
    update()
