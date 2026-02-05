
import requests
from bs4 import BeautifulSoup
import json
import time
import random
import os
import argparse
from datetime import datetime
import re
import yfinance as yf

# Configuration
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
]

DATA_DIR = os.path.join("public", "data")
CACHE_DIR = os.path.join("public", "data", "cache")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

SECTOR_MAP_FILE = os.path.join(DATA_DIR, "stock_sector_map.json")

def load_sector_map():
    if os.path.exists(SECTOR_MAP_FILE):
        with open(SECTOR_MAP_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_sector_map(sector_map):
    with open(SECTOR_MAP_FILE, 'w') as f:
        json.dump(sector_map, f, indent=2)

def get_soup(url):
    """Fetches URL with random delay."""
    delay = random.uniform(2, 5)
    print(f"Waiting {delay:.2f}s before fetching {url}...")
    time.sleep(delay)
    
    headers = {'User-Agent': random.choice(USER_AGENTS)}
    try:
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()
        return BeautifulSoup(response.text, 'html.parser')
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None

def fetch_stock_sector(ticker, sector_map):
    """Fetches sector for a stock if not in map."""
    if ticker in sector_map:
        return sector_map[ticker]
    
    print(f"Fetching sector for {ticker}...")
    url = f"https://www.dataroma.com/m/stock.php?sym={ticker}"
    soup = get_soup(url)
    if not soup:
        return "Unknown"
    
    # Parse Stats Table (#t1)
    t1 = soup.find('table', id='t1')
    if t1:
        rows = t1.find_all('tr')
        for row in rows:
            cols = row.find_all('td')
            if len(cols) == 2:
                key = cols[0].text.strip().lower().rstrip(':')
                val = cols[1].text.strip()
                if "sector" in key:
                    sector_map[ticker] = val
                    return val
    
    
    # Fallback to yfinance if Dataroma fails
    print(f"Fallback: Fetching {ticker} via yfinance...")
    try:
        yf_ticker = ticker.replace('.', '-')
        stock = yf.Ticker(yf_ticker)
        # Try to get sector, then category (for ETFs), then industry
        sector = stock.info.get('sector')
        if not sector:
            sector = stock.info.get('category')
        
        if sector:
            print(f"  -> Found via yfinance: {sector}")
            sector_map[ticker] = sector
            return sector
    except Exception as e:
        print(f"  -> yfinance error: {e}")

    sector_map[ticker] = "Unknown"
    return "Unknown"

def scrape_manager_list():
    """Scrapes the list of managers."""
    url = "https://www.dataroma.com/m/managers.php"
    soup = get_soup(url)
    if not soup:
        return []

    managers = []
    grid = soup.find('table', id='grid')
    if grid:
        rows = grid.find_all('tr')
        for row in rows:
            man_td = row.find('td', class_='man')
            if man_td:
                a_tag = man_td.find('a')
                if a_tag and 'href' in a_tag.attrs:
                    href = a_tag['href']
                    match = re.search(r'm=([^&]+)', href)
                    if match:
                        mgr_code = match.group(1)
                        mgr_name = a_tag.text.strip()
                        managers.append({'code': mgr_code, 'name': mgr_name})
    return managers

def parse_manager_history(mgr_code, sector_map):
    """Parses historical top holdings from p_hist.php."""
    url = f"https://www.dataroma.com/m/hist/p_hist.php?f={mgr_code}"
    soup = get_soup(url)
    if not soup:
        return {}

    history_data = {} # { "2024 Q3": { "sectors": { "Tech": 20.5 ... }, "total_pct": 85 } }

    grid = soup.find('table', id='grid')
    if not grid:
        return {}
    
    tbody = grid.find('tbody')
    if not tbody:
        return {}

    rows = tbody.find_all('tr')
    for row in rows:
        # Row structure: Period | Value | Col3 (Holding) | Col4 (Holding)...
        cols = row.find_all('td')
        if len(cols) < 3:
            continue
        
        period = cols[0].text.strip() # "2025 Q3" or "2025   Q3"
        # Cleanup period string
        period = " ".join(period.split())
        
        # Iterate holdings columns (starting index 2)
        quarter_sectors = {}
        total_tracked_pct = 0.0
        
        for col in cols[2:]:
            # structure: <span class="tit_ctl"> <a ...>AAPL</a> <div>... 22.69% ...</div> </span>
            span = col.find('span', class_='tit_ctl')
            if span:
                a_tag = span.find('a')
                if not a_tag: continue
                ticker = a_tag.text.strip()
                
                div = span.find('div')
                if div:
                    text = div.text # "Apple Inc.22.69% of portfolio"
                    # Extract percentage: requires digits
                    pct_match = re.search(r'(\d+(?:\.\d+)?)%', text)
                    if pct_match:
                        try:
                            pct = float(pct_match.group(1))
                            
                            # Get Sector
                            sector = fetch_stock_sector(ticker, sector_map)
                            
                            if sector not in quarter_sectors:
                                quarter_sectors[sector] = 0.0
                            quarter_sectors[sector] += pct
                            total_tracked_pct += pct
                        except ValueError:
                            print(f"Skipping bad pct: {pct_match.group(1)}")
        
        if total_tracked_pct > 0:
            history_data[period] = {
                "sectors": quarter_sectors,
                "coverage_pct": round(total_tracked_pct, 2)
            }
        
        # Limit to 20 quarters (5 years)
        if len(history_data) >= 20:
            break
            
    return history_data

def save_aggregated_data(manager_histories):
    """Aggregates and saves data incrementally."""
    global_rotation = {}
    
    # Collect all periods
    all_periods = set()
    for m in manager_histories.values():
        all_periods.update(m['history'].keys())
        
    for period in sorted(all_periods):
        period_sectors = {}
        manager_count = 0
        
        for m in manager_histories.values():
            if period in m['history']:
                h = m['history'][period]
                cov = h['coverage_pct']
                if cov < 10: continue # Skip if data is too thin
                
                # Normalize to 100%
                factor = 100.0 / cov if cov > 0 else 0
                
                for sec, pct in h['sectors'].items():
                    norm_pct = pct * factor
                    if sec not in period_sectors:
                        period_sectors[sec] = 0.0
                    period_sectors[sec] += norm_pct
                
                manager_count += 1
        
        # Average across managers
        if manager_count > 0:
            for sec in period_sectors:
                period_sectors[sec] = round(period_sectors[sec] / manager_count, 2)
            global_rotation[period] = period_sectors

    # Save Output
    output = {
        "updated_at": datetime.now().isoformat(),
        "managers_scraped": list(manager_histories.keys()),
        "rotation": global_rotation
    }
    
    out_file = os.path.join(DATA_DIR, "smart_money_sector_rotation.json")
    with open(out_file, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"Incremental save: {len(manager_histories)} managers processed.")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--managers', type=str, help='Comma separated list of manager codes to scrape (e.g. BRK,AKO)')
    parser.add_argument('--limit', type=int, default=1000, help='Limit number of managers to scrape (default=all)')
    args = parser.parse_args()

    sector_map = load_sector_map()
    
    # 1. Get List
    all_managers = scrape_manager_list()
    if not all_managers:
        print("Failed to get manager list.")
        return

    # Filter
    targets = []
    if args.managers:
        codes = [c.strip().upper() for c in args.managers.split(',')]
        targets = [m for m in all_managers if m['code'] in codes]
    else:
        targets = all_managers[:args.limit]
        
    print(f"Targeting {len(targets)} managers.")
    
    # 2. Scrape History for each
    manager_sector_histories = {}
    
    for i, mgr in enumerate(targets):
        print(f"[{i+1}/{len(targets)}] === Processing {mgr['name']} ({mgr['code']}) ===")
        try:
            hist = parse_manager_history(mgr['code'], sector_map)
            if hist:
                manager_sector_histories[mgr['code']] = {
                    "name": mgr['name'],
                    "history": hist
                }
                # Save sector map and aggregated data every manager
                save_sector_map(sector_map)
                save_aggregated_data(manager_sector_histories)
        except Exception as e:
            print(f"Failed to process {mgr['code']}: {e}")
            time.sleep(5) # Cooldown on error

    print(f"Done. Processed {len(manager_sector_histories)} managers.")

if __name__ == "__main__":
    main()
