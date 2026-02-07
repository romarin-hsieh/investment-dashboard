import requests
from bs4 import BeautifulSoup
import json
import time
import random
import os
import argparse
from datetime import datetime
import re

# Risk Mitigation: Random User-Agents
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
]

def get_soup(url):
    """Fetches URL with random delay and rotation headers."""
    delay = random.uniform(3, 8)
    print(f"Waiting {delay:.2f}s before fetching {url}...")
    time.sleep(delay)
    
    headers = {'User-Agent': random.choice(USER_AGENTS)}
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        return BeautifulSoup(response.text, 'html.parser')
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None

def clean_text(text):
    if not text:
        return ""
    return text.strip().replace('\xa0', ' ')

def parse_investor_history(url_suffix):
    """Parses history page, e.g., /m/hist/hist.php?f=MVALX&s=PL"""
    if not url_suffix:
        return []
        
    url = f"https://www.dataroma.com{url_suffix}"
    soup = get_soup(url)
    if not soup:
        return []

    history = []
    # Target table #grid
    grid = soup.find('table', id='grid')
    if grid:
        tbody = grid.find('tbody')
        if tbody:
            for row in tbody.find_all('tr'):
                cols = row.find_all('td')
                # Expected: Period, Shares, % of Portfolio, Activity, % Change to Portfolio, Reported Price
                if len(cols) >= 6:
                    try:
                        period = clean_text(cols[0].text)
                        shares = int(clean_text(cols[1].text).replace(',', ''))
                        pct_portfolio = clean_text(cols[2].text)
                        activity = clean_text(cols[3].text)
                        pct_change_portfolio = clean_text(cols[4].text)
                        reported_price = clean_text(cols[5].text)
                        
                        history.append({
                            "period": period,
                            "shares": shares,
                            "percent_portfolio": pct_portfolio,
                            "activity": activity,
                            "percent_change_portfolio": pct_change_portfolio,
                            "reported_price": reported_price
                        })
                    except ValueError:
                        continue
    return history

def parse_stock_overview(ticker):
    """Parses /m/stock.php?sym={ticker}"""
    url = f"https://www.dataroma.com/m/stock.php?sym={ticker}"
    soup = get_soup(url)
    if not soup:
        return {}

    data = {
        "stats": {},
        "holdings": []
    }

    # 1. Parse Stats Table (#t1)
    # 1. 解析統計表格 (#t1)
    # Structure: <tr><td class="sect">Sector:</td><td><b>Industrials</b></td></tr>
    t1 = soup.find('table', id='t1')
    if t1:
        rows = t1.find_all('tr')
        for row in rows:
            cols = row.find_all('td')
            if len(cols) == 2:
                key = clean_text(cols[0].text).lower().rstrip(':')
                val = clean_text(cols[1].text)
                
                # Map fields to keys
                # 將欄位映射到 JSON 鍵值
                if "sector" in key:
                    data["stats"]["sector"] = val
                elif "ownership count" in key:
                    data["stats"]["ownership_count"] = int(val) if val.isdigit() else val
                elif "ownership rank" in key:
                    data["stats"]["ownership_rank"] = int(val) if val.isdigit() else val
                elif "% of all portfolios" in key:
                    data["stats"]["percent_of_portfolios"] = val

    # 2. Parse Holdings Table (#grid) within #wrap
    # <thead>...</thead><tbody><tr>...</tr></tbody>
    grid = soup.find('table', id='grid')
    if grid:
        tbody = grid.find('tbody')
        if tbody:
            rows = tbody.find_all('tr')
            for row in rows:
                cols = row.find_all('td')
                # Expected columns based on user input:
                # 0: Hist link, 1: Portfolio Manager, 2: % of portfolio, 3: Recent Activity, 4: Shares, 5: Value
                if len(cols) >= 6:
                    # Extract history link
                    hist_link = None
                    hist_td = cols[0]
                    a_tag = hist_td.find('a')
                    if a_tag and 'href' in a_tag.attrs:
                        hist_link = a_tag['href']

                    manager_cell = cols[1]
                    manager_name = clean_text(manager_cell.text)
                    
                    pct_port = clean_text(cols[2].text)
                    activity = clean_text(cols[3].text)
                    shares = clean_text(cols[4].text).replace(',', '')
                    value = clean_text(cols[5].text).replace(',', '')

                    # Fetch history details
                    history_data = []
                    if hist_link:
                         history_data = parse_investor_history(hist_link)

                    data["holdings"].append({
                        "manager": manager_name,
                        "percent_portfolio": float(pct_port) if pct_port.replace('.','').isdigit() else pct_port,
                        "recent_activity": activity,
                        "shares": int(shares) if shares.isdigit() else 0,
                        "value": int(value) if value.isdigit() else 0,
                        "history": history_data
                    })
    
    return data

def parse_activity(ticker):
    """Parses /m/activity.php?sym={ticker}&typ=a"""
    url = f"https://www.dataroma.com/m/activity.php?sym={ticker}&typ=a"
    soup = get_soup(url)
    if not soup:
        return {}
    
    activity_data = {}
    
    # Target: #grid with tr.q_chg headers
    grid = soup.find('table', id='grid')
    if grid:
        tbody = grid.find('tbody')
        if tbody:
            current_quarter = "Unknown"
            
            # Iterate through all rows (headers and data mixed)
            for row in tbody.find_all('tr'):
                # Check if it's a Quarter Header
                # <tr class="q_chg"><td colspan="6"><b>Q3</b> &nbsp;<b>2025</b></td></tr>
                if 'q_chg' in row.get('class', []):
                    current_quarter = clean_text(row.text)
                    if current_quarter not in activity_data:
                        activity_data[current_quarter] = []
                    continue
                
                # Check if it's a Data Row
                cols = row.find_all('td')
                # 0: Hist, 1: Manager, 2: Activity, 3: Share change, 4: % change to portfolio (variable)
                if len(cols) >= 5:
                    manager = clean_text(cols[1].text)
                    action = clean_text(cols[2].text)
                    share_change = clean_text(cols[3].text).replace(',', '')
                    
                    # Extract Portfolio Change (Column 4)
                    portfolio_change = "0.00"
                    if len(cols) > 4:
                        portfolio_change = clean_text(cols[4].text)

                    try:
                        # Extract share change direction from class if possible, or just parse text
                        shares_val = int(share_change) if share_change.lstrip('-').isdigit() else 0
                        
                        # Adjust sign based on 'sell' class or text if needed
                        action_type = "Buy"
                        if 'sell' in cols[2].get('class', []) or 'Reduce' in action or 'Sell' in action:
                            action_type = "Sell"
                            shares_val = -abs(shares_val) # Force negative for sells
                        else:
                            shares_val = abs(shares_val) # Force positive for buys

                        activity_data[current_quarter].append({
                            "manager": manager,
                            "action": action,
                            "type": action_type,
                            "shares_changed": shares_val,
                            "portfolio_change": portfolio_change
                        })
                    except ValueError:
                        pass

    return activity_data

def parse_insider(ticker):
    """Parses /m/ins/ins.php?t=y&sym={ticker}&o=fd&d=d"""
    url = f"https://www.dataroma.com/m/ins/ins.php?t=y&sym={ticker}&o=fd&d=d"
    soup = get_soup(url)
    if not soup:
        return {}

    insider_data = {
        "summary": {"buys": {"count": 0, "amount": 0}, "sells": {"count": 0, "amount": 0}},
        "transactions": []
    }

    # 1. Parse Summary (#sum)
    # <table id="sum">...<tr class="Buys">...<tr class="Sells">...
    sum_table = soup.find('table', id='sum')
    if sum_table:
        # Only look at tbody rows or filter out headers
        rows = sum_table.find_all('tr')
        for row in rows:
            cols = row.find_all('td')
            if len(cols) == 3:
                lbl = clean_text(cols[0].text)
                
                # Check if columns are numeric before converting
                col1_text = clean_text(cols[1].text)
                col2_text = clean_text(cols[2].text).replace('$','').replace(',','')
                
                if col1_text.isdigit() and col2_text.isdigit():
                    count = int(col1_text)
                    amount = int(col2_text)
                    
                    if "Buys" in lbl:
                        insider_data["summary"]["buys"] = {"count": count, "amount": amount}
                    elif "Sells" in lbl:
                        insider_data["summary"]["sells"] = {"count": count, "amount": amount}

    # 2. Parse Transactions (#grid)
    grid = soup.find('table', id='grid')
    if grid:
        tbody = grid.find('tbody')
        if tbody:
            for row in tbody.find_all('tr'):
                cols = row.find_all('td')
                # 0: Filing Date, 1: Symbol, 2: Security, 3: Reporter, 4: Relationship
                # 5: Trans Date, 6: Type, 7: Shares, 8: Price, 9: Amount, 10: D/I
                if len(cols) >= 10:
                    try:
                        filing_date_text = clean_text(cols[0].text) # "23 Jan 2026 18:33"
                        # Simple cleanup to keep just date part for JSON if preferred, or keep full
                        # Let's keep raw text for now or split
                        
                        reporter = clean_text(cols[3].text)
                        relationship = clean_text(cols[4].text)
                        trans_date = clean_text(cols[5].text)
                        trans_type = clean_text(cols[6].text)
                        shares = int(clean_text(cols[7].text).replace(',',''))
                        price = float(clean_text(cols[8].text).replace('$','').replace(',',''))
                        total_val = int(clean_text(cols[9].text).replace('$','').replace(',',''))
                        
                        insider_data["transactions"].append({
                            "filing_date": filing_date_text,
                            "reporter": reporter,
                            "relationship": relationship,
                            "transaction_date": trans_date,
                            "transaction_type": trans_type,
                            "shares": shares,
                            "price": price,
                            "value": total_val
                        })
                    except (ValueError, IndexError):
                        continue

    return insider_data

def main():
    parser = argparse.ArgumentParser(description='Crawl Dataroma data for a specific ticker.')
    parser.add_argument('--ticker', type=str, required=True, help='Stock ticker symbol (e.g., PL)')
    args = parser.parse_args()
    
    ticker = args.ticker.upper()
    print(f"Starting crawl for {ticker}...")

    # Crawl Data
    # 爬取數據說明:
    # 1. parse_stock_overview: 獲取基本持倉概況與超級投資人持股
    # 2. parse_activity: 獲取近期的買賣活動 (Activity)
    # 3. parse_insider: 獲取內部人交易數據 (Insider Trades)
    overview = parse_stock_overview(ticker)
    activity = parse_activity(ticker)
    insider = parse_insider(ticker)

    # Combine Data
    # 整合數據
    final_data = {
        "ticker": ticker,
        "updated_at": datetime.now().isoformat(),
        "stats": overview.get("stats", {}),
        "superinvestors": overview.get("holdings", []),
        "activity": activity,
        "insiders": insider
    }

    # Ensure output directory exists
    # 確保輸出目錄存在
    output_dir = os.path.join("public", "data", "dataroma")
    os.makedirs(output_dir, exist_ok=True)
    
    # Write JSON
    # 寫入 JSON 檔案
    output_file = os.path.join(output_dir, f"{ticker}.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)
    
    print(f"Data saved to {output_file}")

if __name__ == "__main__":
    main()
