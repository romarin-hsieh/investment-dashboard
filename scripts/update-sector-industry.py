#!/usr/bin/env python3
"""
Update Sector and Industry Data
更新 Sector 和 Industry 資料

This script fetches sector and industry data from Yahoo Finance
and updates the symbols_metadata.json file.
此腳本從 Yahoo Finance 取得 sector 和 industry 資料，
並更新 symbols_metadata.json 檔案。

Usage / 使用方式:
    python scripts/update-sector-industry.py
"""

import yfinance as yf
import json
import sys
from datetime import datetime, timezone
import time
import os


def get_stock_symbols():
    """
    Get stock symbols from multiple sources.
    從多個來源獲取股票代號列表。
    """
    symbols = []
    
    # 1. Try to read from stocks.json (primary config)
    # 1. 嘗試從 stocks.json 讀取（主要配置）
    try:
        if os.path.exists('public/config/stocks.json'):
            with open('public/config/stocks.json', 'r') as f:
                data = json.load(f)
                if 'stocks' in data and isinstance(data['stocks'], list):
                    symbols = [s['symbol'] for s in data['stocks'] if s.get('enabled', True)]
                    print(f"✅ Loaded {len(symbols)} symbols from stocks.json")
                    print(f"✅ 從 stocks.json 載入 {len(symbols)} 個股票代號")
                    return symbols
    except Exception as e:
        print(f"⚠️ Cannot read stocks.json: {e}")
        print(f"⚠️ 無法從 stocks.json 讀取: {e}")
    
    # 2. Try to read from existing symbols_metadata.json
    # 2. 嘗試從現有的 symbols_metadata.json 讀取
    try:
        if os.path.exists('public/data/symbols_metadata.json'):
            with open('public/data/symbols_metadata.json', 'r') as f:
                data = json.load(f)
                if 'items' in data:
                    symbols = [item['symbol'] for item in data['items']]
                    print(f"✅ Loaded {len(symbols)} symbols from symbols_metadata.json")
                    print(f"✅ 從 symbols_metadata.json 載入 {len(symbols)} 個股票代號")
                    return symbols
    except Exception as e:
        print(f"⚠️ Cannot read symbols_metadata.json: {e}")
        print(f"⚠️ 無法從 symbols_metadata.json 讀取: {e}")
    
    # 3. Use default symbols
    # 3. 使用預設的股票代號
    symbols = [
        'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 
        'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
        'CRM', 'NVDA', 'AVGO', 'AMZN', 'GOOG',
        'META', 'NFLX', 'LEU', 'SMR', 'CRWV',
        'IONQ', 'PLTR', 'HIMS', 'TSLA'
    ]
    print(f"✅ Using default {len(symbols)} symbols")
    print(f"✅ 使用預設的 {len(symbols)} 個股票代號")
    return symbols


def categorize_market_cap(market_cap):
    """
    Categorize market cap into size buckets.
    將市值分類至規模區間。
    """
    if not market_cap or market_cap <= 0:
        return 'unknown'
    
    if market_cap >= 200_000_000_000:  # >= 200B
        return 'mega_cap'
    elif market_cap >= 10_000_000_000:  # >= 10B
        return 'large_cap'
    elif market_cap >= 2_000_000_000:   # >= 2B
        return 'mid_cap'
    elif market_cap >= 300_000_000:     # >= 300M
        return 'small_cap'
    else:
        return 'micro_cap'


def normalize_exchange(exchange):
    """
    Normalize exchange names for TradingView compatibility.
    標準化交易所名稱以相容 TradingView。
    """
    exchange_mapping = {
        'NasdaqGS': 'NASDAQ',
        'NasdaqGM': 'NASDAQ',
        'NasdaqCM': 'NASDAQ',
        'NASDAQ': 'NASDAQ',
        'NMS': 'NASDAQ',
        'NGM': 'NASDAQ',
        'NCM': 'NASDAQ',
        'NYQ': 'NYSE',
        'NYSE': 'NYSE',
        'ASE': 'AMEX',
        'PCX': 'AMEX',
        'AMEX': 'AMEX',
    }
    return exchange_mapping.get(exchange, exchange or 'NASDAQ')


def get_default_exchange(symbol):
    """
    Get default exchange for a symbol.
    取得股票預設交易所。
    """
    nyse_symbols = ['CRM', 'TSM', 'ORCL', 'RDW', 'PL']
    return 'NYSE' if symbol in nyse_symbols else 'NASDAQ'


def fetch_symbol_data(symbol):
    """
    Fetch data for a single symbol.
    獲取單個股票的資料。
    """
    try:
        print(f"🔍 Fetching {symbol}...")
        print(f"🔍 正在獲取 {symbol} 的資料...")
        
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        if not info or 'symbol' not in info:
            raise Exception(f"Cannot get basic info for {symbol}")
        
        # Extract data / 提取資料
        sector = info.get('sector', 'Unknown')
        industry = info.get('industry', 'Unknown Industry')
        market_cap = info.get('marketCap', 0)
        exchange = normalize_exchange(info.get('exchange', get_default_exchange(symbol)))
        country = info.get('country', 'US')
        website = info.get('website', '')
        employee_count = info.get('fullTimeEmployees', None)
        business_summary = info.get('longBusinessSummary', '')
        
        # Fallback for empty sector/industry
        # 若 sector/industry 為空則使用備援值
        if sector in ['Unknown', '', None]:
            sector = info.get('sectorKey', 'Unknown')
        if industry in ['Unknown Industry', '', None]:
            industry = info.get('industryKey', 'Unknown Industry')
        
        data = {
            'symbol': symbol,
            'sector': sector,
            'industry': industry,
            'confidence': 1.0,
            'sources': ['yfinance_python'],
            'last_verified_at': datetime.now(timezone.utc).isoformat(),
            'market_cap_category': categorize_market_cap(market_cap),
            'exchange': exchange,
            'country': country,
            'website': website,
            'employee_count': employee_count,
            'business_summary': business_summary[:500] if business_summary else '',
            'market_cap': market_cap,
            'api_source': 'yfinance_python'
        }
        
        print(f"✅ {symbol}: {sector} - {industry} ({exchange})")
        return data
        
    except Exception as e:
        print(f"❌ {symbol} failed: {e}")
        print(f"❌ {symbol} 失敗: {e}")
        
        # Fallback data / 回退資料
        return {
            'symbol': symbol,
            'sector': 'Unknown',
            'industry': 'Unknown Industry',
            'confidence': 0.5,
            'sources': ['fallback'],
            'last_verified_at': datetime.now(timezone.utc).isoformat(),
            'market_cap_category': 'unknown',
            'exchange': get_default_exchange(symbol),
            'country': 'US',
            'website': '',
            'employee_count': None,
            'business_summary': '',
            'market_cap': None,
            'api_source': 'fallback'
        }


def main():
    print("🚀 Starting Sector and Industry data update...")
    print("🚀 開始獲取 Sector 和 Industry 資料...")
    
    symbols = get_stock_symbols()
    
    if not symbols:
        print("❌ No symbols found")
        print("❌ 無法獲取股票代號列表")
        sys.exit(1)
    
    print(f"📊 Processing {len(symbols)} symbols...")
    print(f"📊 將處理 {len(symbols)} 個股票代號")
    
    results = []
    success_count = 0
    fallback_count = 0
    
    for i, symbol in enumerate(symbols, 1):
        print(f"\n[{i}/{len(symbols)}] {symbol}")
        
        data = fetch_symbol_data(symbol)
        results.append(data)
        
        if data['api_source'] == 'yfinance_python':
            success_count += 1
        else:
            fallback_count += 1
        
        # Delay to avoid API rate limiting
        # 延遲以避免 API 速率限制
        if i < len(symbols):
            time.sleep(1)
    
    # Generate sector grouping / 生成行業分組
    sector_grouping = {}
    for item in results:
        sector = item['sector']
        if sector not in sector_grouping:
            sector_grouping[sector] = []
        sector_grouping[sector].append(item['symbol'])
    
    # Create final data structure / 建立最終資料結構
    final_data = {
        'ttl_days': 7,
        'as_of': datetime.now(timezone.utc).isoformat(),
        'items': results,
        'sector_grouping': sector_grouping,
        'refresh_metadata': {
            'symbols_updated': len(results),
            'symbols_success': success_count,
            'symbols_fallback': fallback_count,
            'update_source': 'github_actions_python'
        }
    }
    
    # Ensure directory exists / 確保目錄存在
    os.makedirs('public/data', exist_ok=True)
    
    # Write files / 寫入檔案
    with open('public/data/sector_industry.json', 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)
    
    with open('public/data/symbols_metadata.json', 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Update completed!")
    print(f"✅ 資料更新完成!")
    print(f"📊 Total: {len(results)} symbols")
    print(f"🎯 Success: {success_count} (YFinance API)")
    print(f"🔄 Fallback: {fallback_count}")


if __name__ == '__main__':
    main()
