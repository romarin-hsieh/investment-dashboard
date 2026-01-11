#!/usr/bin/env python3
"""
YFinance Metadata Update Script (Python)
直接在 GitHub Actions 中運行，無需 CORS 代理
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
import time

try:
    import yfinance as yf
    import requests
except ImportError:
    print("❌ 缺少必要的 Python 套件")
    print("請安裝: pip install yfinance requests")
    sys.exit(1)

class YFinanceMetadataUpdater:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.output_file = self.project_root / 'public' / 'data' / 'symbols_metadata.json'
        self.sector_file = self.project_root / 'public' / 'data' / 'sector_industry.json'
        self.stocks_config_file = self.project_root / 'public' / 'config' / 'stocks.json'
        
        # 確保輸出目錄存在
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        
        print("🚀 Python YFinance Metadata Updater 初始化完成")
        print(f"📁 輸出文件: {self.output_file}")

    def load_universe_symbols(self):
        """從 public/config/stocks.json 載入股票列表"""
        try:
            with open(self.stocks_config_file, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
                # stocks.json 結構是 {"stocks": [{"symbol": "..."}]}
                if 'stocks' in config_data:
                    symbols = [item['symbol'] for item in config_data['stocks'] if item.get('enabled', True)]
                else:
                    # 兼容舊格式
                    symbols = config_data.get('symbols', [])
                    
                print(f"📊 從 stocks.json 載入 {len(symbols)} 個股票")
                return symbols
        except Exception as e:
            print(f"⚠️ 無法載入 stocks.json: {e}")
            # Fallback 股票列表
            fallback_symbols = [
                'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
                'CRM', 'NVDA', 'AVGO', 'AMZN', 'GOOG', 'META', 'NFLX', 'LEU', 'SMR', 'CRWV',
                'IONQ', 'PLTR', 'HIMS', 'TSLA', 'SNDK', 'MU', 'BE'
            ]
            print(f"🔄 使用 fallback 股票列表: {len(fallback_symbols)} 個股票")
            return fallback_symbols

    def get_stock_metadata(self, symbol):
        """獲取單個股票的 metadata"""
        try:
            print(f"🔍 正在獲取 {symbol} 的資料...")
            
            # 使用 yfinance 獲取股票資訊
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            if not info or 'symbol' not in info:
                raise Exception("無效的股票資訊")
            
            # 提取需要的資訊
            metadata = {
                'symbol': symbol,
                'sector': info.get('sector', 'Unknown'),
                'industry': info.get('industry', 'Unknown Industry'),
                'confidence': 1.0,
                'sources': ['yfinance_python'],
                'last_verified_at': datetime.now(timezone.utc).isoformat(),
                'market_cap_category': self.get_market_cap_category(info.get('marketCap')),
                'exchange': self.normalize_exchange(info.get('exchange', 'Unknown')),
                'country': info.get('country', 'Unknown'),
                'website': info.get('website', ''),
                'employee_count': info.get('fullTimeEmployees'),
                'business_summary': info.get('longBusinessSummary', ''),
                'market_cap': info.get('marketCap'),
                'api_source': 'yfinance_python'
            }
            
            print(f"✅ {symbol}: {metadata['sector']} - {metadata['industry']}")
            return metadata
            
        except Exception as e:
            print(f"❌ {symbol} 獲取失敗: {e}")
            # 返回 fallback 資料
            return self.get_fallback_metadata(symbol)

    def get_fallback_metadata(self, symbol):
        """獲取 fallback metadata"""
        fallback_data = {
            'ASTS': {'sector': 'Technology', 'industry': 'Communication Equipment', 'exchange': 'NASDAQ'},
            'RIVN': {'sector': 'Consumer Cyclical', 'industry': 'Auto Manufacturers', 'exchange': 'NASDAQ'},
            'PL': {'sector': 'Industrials', 'industry': 'Aerospace & Defense', 'exchange': 'NYSE'},
            'ONDS': {'sector': 'Technology', 'industry': 'Industrial IoT Solutions', 'exchange': 'NASDAQ'},
            'RDW': {'sector': 'Industrials', 'industry': 'Space Infrastructure', 'exchange': 'NYSE'},
            'AVAV': {'sector': 'Industrials', 'industry': 'Aerospace & Defense', 'exchange': 'NASDAQ'},
            'MDB': {'sector': 'Technology', 'industry': 'Database Software', 'exchange': 'NASDAQ'},
            'ORCL': {'sector': 'Technology', 'industry': 'Enterprise Software', 'exchange': 'NYSE'},
            'TSM': {'sector': 'Technology', 'industry': 'Semiconductors', 'exchange': 'NYSE'},
            'RKLB': {'sector': 'Industrials', 'industry': 'Aerospace & Defense', 'exchange': 'NASDAQ'},
            'CRM': {'sector': 'Technology', 'industry': 'Software - Application', 'exchange': 'NYSE'},
            'NVDA': {'sector': 'Technology', 'industry': 'Semiconductors', 'exchange': 'NASDAQ'},
            'AVGO': {'sector': 'Technology', 'industry': 'Semiconductors', 'exchange': 'NASDAQ'},
            'AMZN': {'sector': 'Consumer Cyclical', 'industry': 'Internet Retail', 'exchange': 'NASDAQ'},
            'GOOG': {'sector': 'Communication Services', 'industry': 'Internet Content & Information', 'exchange': 'NASDAQ'},
            'META': {'sector': 'Communication Services', 'industry': 'Internet Content & Information', 'exchange': 'NASDAQ'},
            'NFLX': {'sector': 'Communication Services', 'industry': 'Entertainment', 'exchange': 'NASDAQ'},
            'LEU': {'sector': 'Energy', 'industry': 'Uranium', 'exchange': 'NYSE'},
            'SMR': {'sector': 'Energy', 'industry': 'Nuclear Energy', 'exchange': 'NYSE'},
            'CRWV': {'sector': 'Technology', 'industry': 'Software - Application', 'exchange': 'NASDAQ'},
            'IONQ': {'sector': 'Technology', 'industry': 'Quantum Computing', 'exchange': 'NYSE'},
            'PLTR': {'sector': 'Technology', 'industry': 'Software - Infrastructure', 'exchange': 'NASDAQ'},
            'HIMS': {'sector': 'Healthcare', 'industry': 'Health Information Services', 'exchange': 'NYSE'},
            'TSLA': {'sector': 'Consumer Cyclical', 'industry': 'Auto Manufacturers', 'exchange': 'NASDAQ'},
            'VST': {'sector': 'Utilities', 'industry': 'Utilities - Independent Power Producers', 'exchange': 'NYSE'},
            'KTOS': {'sector': 'Industrials', 'industry': 'Aerospace & Defense', 'exchange': 'NASDAQ'},
            'MELI': {'sector': 'Consumer Cyclical', 'industry': 'Internet Retail', 'exchange': 'NASDAQ'},
            'SOFI': {'sector': 'Financial Services', 'industry': 'Credit Services', 'exchange': 'NASDAQ'},
            'RBRK': {'sector': 'Financial Services', 'industry': 'Asset Management', 'exchange': 'NYSE'},
            'EOSE': {'sector': 'Industrials', 'industry': 'Electrical Equipment & Parts', 'exchange': 'NASDAQ'},
            'CEG': {'sector': 'Utilities', 'industry': 'Utilities - Independent Power Producers', 'exchange': 'NASDAQ'},
            'TMDX': {'sector': 'Healthcare', 'industry': 'Medical Devices', 'exchange': 'NASDAQ'},
            'GRAB': {'sector': 'Technology', 'industry': 'Software - Application', 'exchange': 'NASDAQ'},
            'RBLX': {'sector': 'Communication Services', 'industry': 'Electronic Gaming & Multimedia', 'exchange': 'NYSE'},
            'IREN': {'sector': 'Technology', 'industry': 'Information Technology Services', 'exchange': 'NASDAQ'},
            'OKLO': {'sector': 'Energy', 'industry': 'Nuclear Energy', 'exchange': 'NYSE'},
            'PATH': {'sector': 'Technology', 'industry': 'Software - Infrastructure', 'exchange': 'NYSE'},
            'INTR': {'sector': 'Financial Services', 'industry': 'Banks - Regional', 'exchange': 'NASDAQ'},
            'SE': {'sector': 'Consumer Cyclical', 'industry': 'Internet Retail', 'exchange': 'NYSE'},
            'KSPI': {'sector': 'Financial Services', 'industry': 'Credit Services', 'exchange': 'NASDAQ'},
            'LUNR': {'sector': 'Industrials', 'industry': 'Aerospace & Defense', 'exchange': 'NASDAQ'},
            'HOOD': {'sector': 'Financial Services', 'industry': 'Capital Markets', 'exchange': 'NASDAQ'},
            'APP': {'sector': 'Technology', 'industry': 'Software - Application', 'exchange': 'NASDAQ'},
            'CHYM': {'sector': 'Technology', 'industry': 'Software - Application', 'exchange': 'NASDAQ'},
            'NU': {'sector': 'Financial Services', 'industry': 'Credit Services', 'exchange': 'NYSE'},
            'COIN': {'sector': 'Financial Services', 'industry': 'Capital Markets', 'exchange': 'NASDAQ'},
            'CRCL': {'sector': 'Financial Services', 'industry': 'Capital Markets', 'exchange': 'NYSE'},
            'IBKR': {'sector': 'Financial Services', 'industry': 'Capital Markets', 'exchange': 'NASDAQ'},
            'CCJ': {'sector': 'Energy', 'industry': 'Uranium', 'exchange': 'NYSE'},
            'UUUU': {'sector': 'Energy', 'industry': 'Uranium', 'exchange': 'AMEX'},
            'VRT': {'sector': 'Technology', 'industry': 'Information Technology Services', 'exchange': 'NYSE'},
            'ETN': {'sector': 'Industrials', 'industry': 'Electrical Equipment & Parts', 'exchange': 'NYSE'},
            'MSFT': {'sector': 'Technology', 'industry': 'Software - Infrastructure', 'exchange': 'NASDAQ'},
            'ADBE': {'sector': 'Technology', 'industry': 'Software - Infrastructure', 'exchange': 'NASDAQ'},
            'FIG': {'sector': 'Financial Services', 'industry': 'Asset Management', 'exchange': 'NYSE'},
            'PANW': {'sector': 'Technology', 'industry': 'Software - Infrastructure', 'exchange': 'NASDAQ'},
            'CRWD': {'sector': 'Technology', 'industry': 'Software - Infrastructure', 'exchange': 'NASDAQ'},
            'DDOG': {'sector': 'Technology', 'industry': 'Software - Infrastructure', 'exchange': 'NASDAQ'},
            'DUOL': {'sector': 'Consumer Cyclical', 'industry': 'Education & Training Services', 'exchange': 'NASDAQ'},
            'ZETA': {'sector': 'Technology', 'industry': 'Software - Application', 'exchange': 'NYSE'},
            'AXON': {'sector': 'Industrials', 'industry': 'Aerospace & Defense', 'exchange': 'NASDAQ'},
            'ALAB': {'sector': 'Technology', 'industry': 'Semiconductors', 'exchange': 'NASDAQ'},
            'LRCX': {'sector': 'Technology', 'industry': 'Semiconductor Equipment & Materials', 'exchange': 'NASDAQ'},
            'BWXT': {'sector': 'Energy', 'industry': 'Nuclear Energy', 'exchange': 'NYSE'},
            'UMAC': {'sector': 'Industrials', 'industry': 'Aerospace & Defense', 'exchange': 'AMEX'},
            'MP': {'sector': 'Basic Materials', 'industry': 'Other Industrial Metals & Mining', 'exchange': 'NYSE'},
            'RR': {'sector': 'Technology', 'industry': 'Information Technology Services', 'exchange': 'NASDAQ'}
        }
        
        data = fallback_data.get(symbol, {
            'sector': 'Unknown',
            'industry': 'Unknown Industry',
            'exchange': 'Unknown'
        })
        
        return {
            'symbol': symbol,
            'sector': data['sector'],
            'industry': data['industry'],
            'confidence': 0.8,
            'sources': ['fallback_data'],
            'last_verified_at': datetime.now(timezone.utc).isoformat(),
            'market_cap_category': 'unknown',
            'exchange': data['exchange'],
            'country': 'United States',
            'website': '',
            'employee_count': None,
            'business_summary': '',
            'market_cap': None,
            'api_source': 'fallback_data'
        }

    def get_market_cap_category(self, market_cap):
        """根據市值分類"""
        if not market_cap:
            return 'unknown'
        
        if market_cap >= 200_000_000_000:  # 2000億
            return 'mega_cap'
        elif market_cap >= 10_000_000_000:  # 100億
            return 'large_cap'
        elif market_cap >= 2_000_000_000:   # 20億
            return 'mid_cap'
        else:
            return 'small_cap'

    def normalize_exchange(self, exchange):
        """標準化交易所名稱"""
        exchange_mapping = {
            'NMS': 'NASDAQ',
            'NGM': 'NASDAQ', 
            'NCM': 'NASDAQ',
            'NYQ': 'NYSE',
            'NYSE': 'NYSE',
            'NASDAQ': 'NASDAQ'
        }
        return exchange_mapping.get(exchange, exchange)

    def update_metadata(self):
        """更新所有股票的 metadata"""
        print("🚀 開始更新 YFinance Metadata...")
        
        # 載入股票列表
        symbols = self.load_universe_symbols()
        
        # 備份現有文件
        if self.output_file.exists():
            backup_file = self.output_file.with_suffix('.json.backup')
            import shutil
            shutil.copy2(self.output_file, backup_file)
            print(f"💾 已備份現有 metadata 文件到 {backup_file}")
        
        # 獲取所有股票的 metadata
        metadata_items = []
        successful_count = 0
        
        for i, symbol in enumerate(symbols, 1):
            print(f"📊 處理進度: {i}/{len(symbols)} - {symbol}")
            
            try:
                metadata = self.get_stock_metadata(symbol)
                metadata_items.append(metadata)
                
                if metadata['confidence'] == 1.0:
                    successful_count += 1
                
                # 避免 API 限制，稍微延遲
                time.sleep(0.5)
                
            except Exception as e:
                print(f"❌ {symbol} 處理失敗: {e}")
                # 添加 fallback 資料
                metadata_items.append(self.get_fallback_metadata(symbol))
        
        # 生成 sector grouping
        sector_grouping = {}
        for item in metadata_items:
            sector = item['sector']
            if sector not in sector_grouping:
                sector_grouping[sector] = []
            sector_grouping[sector].append(item['symbol'])
        
        # 構建最終數據結構
        output_data = {
            'ttl_days': 7,
            'as_of': datetime.now(timezone.utc).isoformat(),
            'next_refresh': datetime.now(timezone.utc).isoformat(),
            'items': metadata_items,
            'sector_grouping': sector_grouping,
            'confidence_distribution': {
                'high_confidence_1_0': sum(1 for item in metadata_items if item['confidence'] == 1.0),
                'fallback_confidence_0_8': sum(1 for item in metadata_items if item['confidence'] == 0.8)
            },
            'data_sources': {
                'yfinance_python': sum(1 for item in metadata_items if 'yfinance_python' in item['sources']),
                'fallback_data': sum(1 for item in metadata_items if 'fallback_data' in item['sources'])
            },
            'refresh_metadata': {
                'symbols_updated': len(metadata_items),
                'symbols_success': successful_count,
                'symbols_fallback': len(metadata_items) - successful_count,
                'update_source': 'github_actions_python'
            }
        }
        
        # 保存到文件
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        # 同時保存到 sector_industry.json
        with open(self.sector_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Metadata 文件已保存到 {self.output_file}")
        print(f"💾 Sector 文件已保存到 {self.sector_file}")
        
        # 輸出統計
        print("\n📊 更新統計:")
        print(f"- 總股票數: {len(metadata_items)}")
        print(f"- 成功獲取: {successful_count}")
        print(f"- 使用 fallback: {len(metadata_items) - successful_count}")
        print(f"- API 成功率: {(successful_count/len(metadata_items)*100):.1f}%")
        print(f"- Sector 數量: {len(sector_grouping)}")
        
        # 檢查關鍵股票
        key_stocks = ['CRM', 'NVDA', 'TSLA', 'IONQ']
        print("\n🔑 關鍵股票檢查:")
        for symbol in key_stocks:
            item = next((item for item in metadata_items if item['symbol'] == symbol), None)
            if item:
                print(f"✅ {symbol}: {item['sector']} - {item['industry']}")
            else:
                print(f"❌ {symbol}: 未找到資料")
        
        print("\n✅ YFinance Metadata 更新完成！")
        return True

def main():
    """主函數"""
    try:
        updater = YFinanceMetadataUpdater()
        success = updater.update_metadata()
        
        if success:
            print("🎉 所有操作成功完成！")
            sys.exit(0)
        else:
            print("❌ 更新過程中發生錯誤")
            sys.exit(1)
            
    except Exception as e:
        print(f"💥 嚴重錯誤: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()