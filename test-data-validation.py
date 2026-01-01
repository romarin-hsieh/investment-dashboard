#!/usr/bin/env python3
"""
測試生成的 yfinance 資料
"""

import json
from pathlib import Path
from datetime import datetime

def test_nvda_data():
    today = datetime.now().strftime('%Y-%m-%d')
    file_path = Path('public/data/technical-indicators') / f'{today}_NVDA.json'
    
    if not file_path.exists():
        print(f'❌ NVDA file not found: {file_path}')
        return False
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    if 'yf' not in data.get('indicators', {}):
        print('❌ No yfinance data found in NVDA file')
        return False
    
    yf = data['indicators']['yf']
    print('✅ NVDA yfinance data found:')
    print(f'   Volume: {yf.get("volume_last_day", "N/A")}')
    print(f'   Market Cap: {yf.get("market_cap", "N/A")}')
    print(f'   Beta 1Y: {yf.get("beta_1y", "N/A")}')
    
    return True

if __name__ == '__main__':
    if test_nvda_data():
        print('✅ Data validation passed')
        exit(0)
    else:
        print('❌ Data validation failed')
        exit(1)