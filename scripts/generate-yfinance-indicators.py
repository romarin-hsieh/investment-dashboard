#!/usr/bin/env python3
"""
yfinance 指標產檔器
合併寫入既有 technical-indicators JSON，新增 indicators.yf 區塊
"""

import os
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# 加入當前目錄到 Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from yfinance_indicators_core import YFinanceIndicatorsCore

class YFinanceIndicatorsGenerator:
    def __init__(self):
        self.core = YFinanceIndicatorsCore()
        self.base_dir = Path(__file__).parent.parent
        self.config_dir = self.base_dir / 'config'
        self.output_dir = self.base_dir / 'public' / 'data' / 'technical-indicators'
        self.universe_file = self.base_dir / 'public' / 'config' / 'stocks.json'
        
        # 確保輸出目錄存在
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def load_universe(self):
        """載入 universe 配置"""
        try:
            with open(self.universe_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            # Support both new stocks.json and old universe.json format
            if 'stocks' in data:
                return [s['symbol'] for s in data['stocks']]
            return data.get('symbols', [])
        except Exception as e:
            print(f"❌ Failed to load universe: {e}")
            return []
    
    def get_date_key(self):
        """取得今日 dateKey (UTC)"""
        return datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    def load_existing_indicators(self, date_key, symbol):
        """載入既有的 technical-indicators JSON"""
        filename = f"{date_key}_{symbol}.json"
        filepath = self.output_dir / filename
        
        if filepath.exists():
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ Failed to load existing file {filename}: {e}")
        
        # 如果檔案不存在，建立基本結構
        return {
            "symbol": symbol,
            "timestamps": [],
            "indicators": {},
            "metadata": {
                "generated": datetime.now(timezone.utc).isoformat(),
                "source": "GitHub Actions Daily Update",
                "dataPoints": 0,
                "indicators": []
            }
        }
    
    def merge_yfinance_indicators(self, existing_data, yf_indicators):
        """合併 yfinance 指標到既有資料"""
        # 確保 indicators 區塊存在
        if 'indicators' not in existing_data:
            existing_data['indicators'] = {}
        
        # 新增 indicators.yf 區塊
        existing_data['indicators']['yf'] = yf_indicators
        
        # 更新 metadata
        if 'metadata' not in existing_data:
            existing_data['metadata'] = {}
        
        existing_data['metadata']['yf_updated'] = datetime.now(timezone.utc).isoformat()
        
        # 更新 indicators 列表
        if 'indicators' in existing_data['metadata']:
            if isinstance(existing_data['metadata']['indicators'], list):
                yf_indicators_list = ['Volume', '5D Avg Volume', 'Market Cap', 'Beta 3mo', 'Beta 1y', 'Beta 5y']
                for indicator in yf_indicators_list:
                    if indicator not in existing_data['metadata']['indicators']:
                        existing_data['metadata']['indicators'].append(indicator)
        
        return existing_data
    
    def save_indicators_file(self, date_key, symbol, data):
        """儲存指標檔案"""
        filename = f"{date_key}_{symbol}.json"
        filepath = self.output_dir / filename
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"❌ Failed to save {filename}: {e}")
            return False
    
    def update_latest_index(self, date_key, symbols, successful_files):
        """更新 latest_index.json"""
        index_file = self.output_dir / 'latest_index.json'
        
        # 載入既有 index
        index_data = {}
        if index_file.exists():
            try:
                with open(index_file, 'r', encoding='utf-8') as f:
                    index_data = json.load(f)
            except Exception as e:
                print(f"⚠️ Failed to load existing index: {e}")
        
        # 更新 index 資料
        index_data.update({
            'date': date_key,
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'symbols': symbols,
            'yf_updated': datetime.now(timezone.utc).isoformat(),
            'yf_successful_files': successful_files,
            'yf_indicators': ['Volume', '5D Avg Volume', 'Market Cap', 'Beta 3mo', 'Beta 1y', 'Beta 5y']
        })
        
        # 確保既有欄位存在
        if 'files' not in index_data:
            index_data['files'] = []
        if 'totalFiles' not in index_data:
            index_data['totalFiles'] = len(index_data.get('files', []))
        if 'source' not in index_data:
            index_data['source'] = 'GitHub Actions Daily Update'
        if 'indicators' not in index_data:
            index_data['indicators'] = []
        
        # 新增 yfinance 指標到 indicators 列表
        yf_indicators_list = ['Volume', '5D Avg Volume', 'Market Cap', 'Beta 3mo', 'Beta 1y', 'Beta 5y']
        for indicator in yf_indicators_list:
            if indicator not in index_data['indicators']:
                index_data['indicators'].append(indicator)
        
        try:
            with open(index_file, 'w', encoding='utf-8') as f:
                json.dump(index_data, f, indent=2, ensure_ascii=False)
            print(f"📋 Updated latest_index.json")
            return True
        except Exception as e:
            print(f"❌ Failed to update index: {e}")
            return False
    
    def cleanup_old_files(self, keep_days=30):
        """清理舊檔案（保留近 30 天）"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=keep_days)
            cutoff_str = cutoff_date.strftime('%Y-%m-%d')
            
            removed_count = 0
            for file_path in self.output_dir.glob('*.json'):
                if file_path.name == 'latest_index.json':
                    continue
                
                # 檢查檔名格式 YYYY-MM-DD_SYMBOL.json
                parts = file_path.stem.split('_', 1)
                if len(parts) == 2:
                    file_date = parts[0]
                    if file_date < cutoff_str:
                        file_path.unlink()
                        removed_count += 1
            
            if removed_count > 0:
                print(f"🧹 Cleaned up {removed_count} old files (older than {keep_days} days)")
            
        except Exception as e:
            print(f"⚠️ Cleanup failed: {e}")
    
    def generate_all_yfinance_indicators(self):
        """產生所有 yfinance 指標"""
        print('🚀 Starting yfinance indicators generation...')
        print('=' * 60)
        
        # 載入 symbols
        symbols = self.load_universe()
        if not symbols:
            print("❌ No symbols found in universe")
            return False
        
        date_key = self.get_date_key()
        print(f"📅 Date key: {date_key}")
        print(f"📊 Processing {len(symbols)} symbols...")
        
        successful_files = []
        failed_symbols = []
        
        for i, symbol in enumerate(symbols, 1):
            print(f"\n[{i}/{len(symbols)}] Processing {symbol}...")
            
            try:
                # 計算 yfinance 指標
                yf_indicators = self.core.get_all_yfinance_indicators(symbol)
                
                # 載入既有資料
                existing_data = self.load_existing_indicators(date_key, symbol)
                
                # 合併資料
                merged_data = self.merge_yfinance_indicators(existing_data, yf_indicators)
                
                # 儲存檔案
                if self.save_indicators_file(date_key, symbol, merged_data):
                    successful_files.append(f"{date_key}_{symbol}.json")
                    print(f"✅ {symbol}: Success")
                    
                    # 顯示關鍵指標
                    vol = yf_indicators.get('volume_last_day')
                    vol_pct = yf_indicators.get('volume_last_day_pct')
                    mcap = yf_indicators.get('market_cap')
                    beta_1y = yf_indicators.get('beta_1y')
                    
                    print(f"   Volume: {vol:,} ({vol_pct:+.1f}%)" if vol and vol_pct is not None else f"   Volume: {vol}")
                    print(f"   Market Cap: ${mcap:,}" if mcap else "   Market Cap: N/A")
                    print(f"   Beta 1Y: {beta_1y}" if beta_1y else "   Beta 1Y: N/A")
                    
                    if yf_indicators.get('warnings'):
                        print(f"   ⚠️ Warnings: {len(yf_indicators['warnings'])}")
                else:
                    failed_symbols.append(symbol)
                    print(f"❌ {symbol}: Failed to save file")
                    
            except Exception as e:
                failed_symbols.append(symbol)
                print(f"❌ {symbol}: {str(e)}")
        
        # 更新 latest_index.json
        self.update_latest_index(date_key, symbols, successful_files)
        
        # 清理舊檔案
        self.cleanup_old_files()
        
        # 總結
        print('\n' + '=' * 60)
        print('📊 Generation Summary:')
        print(f'✅ Successful: {len(successful_files)}/{len(symbols)} ({len(successful_files)/len(symbols)*100:.1f}%)')
        print(f'❌ Failed: {len(failed_symbols)}')
        
        if failed_symbols:
            print(f'Failed symbols: {", ".join(failed_symbols)}')
        
        print(f'📁 Total files: {len(successful_files)}')
        print(f'📋 Index updated: latest_index.json')
        
        # 如果有超過 50% 失敗，回傳失敗狀態
        success_rate = len(successful_files) / len(symbols)
        if success_rate < 0.5:
            print(f'❌ Success rate too low: {success_rate:.1%}')
            return False
        
        print('🎉 yfinance indicators generation completed!')
        return True

def main():
    """主執行函數"""
    try:
        generator = YFinanceIndicatorsGenerator()
        success = generator.generate_all_yfinance_indicators()
        
        if not success:
            print("❌ Generation failed")
            sys.exit(1)
        
        print("✅ Generation successful")
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()