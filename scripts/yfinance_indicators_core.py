#!/usr/bin/env python3
"""
yfinance 指標計算核心模組
新增 6 項指標：Volume, 5D Avg Volume, Market Cap, Beta (3mo/1y/5y)
"""

import yfinance as yf
import pandas as pd
import numpy as np
import pytz
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class YFinanceIndicatorsCore:
    def __init__(self, benchmark='^GSPC'):
        self.benchmark = benchmark
        self.min_data_points = 30  # 最少資料點數
        
    def get_exchange_timezone(self, ticker):
        """取得交易所時區"""
        try:
            # 方法 1: ticker.info["exchangeTimezoneName"]
            if hasattr(ticker, 'info') and ticker.info:
                tz_name = ticker.info.get("exchangeTimezoneName")
                if tz_name:
                    return pytz.timezone(tz_name)
            
            # 方法 2: ticker.fast_info["timezone"] 
            if hasattr(ticker, 'fast_info') and ticker.fast_info:
                tz_name = getattr(ticker.fast_info, 'timezone', None)
                if tz_name:
                    return pytz.timezone(tz_name)
            
            # 方法 3: history index tz fallback
            hist = ticker.history(period='5d')
            if not hist.empty and hasattr(hist.index, 'tz'):
                return hist.index.tz
                
        except Exception as e:
            print(f"⚠️ Failed to get timezone: {e}")
        
        # 預設美東時區
        return pytz.timezone('America/New_York')
    
    def get_last_completed_trading_day(self, ticker, exchange_tz):
        """取得上一個完整交易日"""
        try:
            # 取得最近 10 天的歷史資料
            hist = ticker.history(period='10d')
            if hist.empty:
                return None, None, "No historical data available"
            
            # 確保資料按日期排序
            hist = hist.sort_index()
            
            # 取得交易所現在時間
            now_exchange = datetime.now(exchange_tz)
            now_taipei = now_exchange.astimezone(pytz.timezone('Asia/Taipei'))
            
            # 檢查最後一根 K 線是否為完整交易日
            last_date = hist.index[-1].date()
            today = now_exchange.date()
            
            # 如果最後一根 K 線是今天，可能是盤中資料，需要檢查
            if last_date == today:
                # 檢查是否已收盤（美東時間 16:00 之後）
                market_close_time = now_exchange.replace(hour=16, minute=0, second=0, microsecond=0)
                if now_exchange < market_close_time:
                    # 盤中，使用前一個交易日
                    if len(hist) >= 2:
                        last_completed_date = hist.index[-2].date()
                        prev_completed_date = hist.index[-3].date() if len(hist) >= 3 else None
                    else:
                        return None, None, "Insufficient trading days"
                else:
                    # 已收盤，使用最後一個交易日
                    last_completed_date = hist.index[-1].date()
                    prev_completed_date = hist.index[-2].date() if len(hist) >= 2 else None
            else:
                # 最後一根不是今天，使用最後一個交易日
                last_completed_date = hist.index[-1].date()
                prev_completed_date = hist.index[-2].date() if len(hist) >= 2 else None
            
            return {
                'exchange_timezone': str(exchange_tz),
                'as_of_exchange': now_exchange.isoformat(),
                'as_of_taipei': now_taipei.isoformat(),
                'last_completed_trading_day': last_completed_date.strftime('%Y-%m-%d'),
                'prev_completed_trading_day': prev_completed_date.strftime('%Y-%m-%d') if prev_completed_date else None,
                'hist_data': hist
            }, None, None
            
        except Exception as e:
            return None, None, f"Failed to get trading days: {str(e)}"
    
    def get_last_completed_day_volume(self, symbol):
        """取得上一個完整交易日成交量"""
        try:
            ticker = yf.Ticker(symbol)
            exchange_tz = self.get_exchange_timezone(ticker)
            
            # 取得交易日資訊
            trading_info, _, error = self.get_last_completed_trading_day(ticker, exchange_tz)
            if error:
                return {
                    'volume_last_day': None,
                    'volume_last_day_pct': None,
                    'reason': error
                }
            
            hist = trading_info['hist_data']
            
            # 找到對應的交易日資料
            last_date = pd.to_datetime(trading_info['last_completed_trading_day']).date()
            prev_date = pd.to_datetime(trading_info['prev_completed_trading_day']).date() if trading_info['prev_completed_trading_day'] else None
            
            last_volume = None
            prev_volume = None
            
            for idx, row in hist.iterrows():
                date = idx.date()
                if date == last_date:
                    last_volume = row['Volume']
                elif date == prev_date:
                    prev_volume = row['Volume']
            
            # 計算百分比變化
            pct_change = None
            if last_volume is not None and prev_volume is not None and prev_volume > 0:
                pct_change = round((last_volume - prev_volume) / prev_volume * 100, 1)
            
            result = {
                'volume_last_day': int(last_volume) if last_volume is not None else None,
                'volume_last_day_pct': pct_change,
                'exchange_timezone': trading_info['exchange_timezone'],
                'as_of_exchange': trading_info['as_of_exchange'],
                'as_of_taipei': trading_info['as_of_taipei'],
                'last_completed_trading_day': trading_info['last_completed_trading_day'],
                'prev_completed_trading_day': trading_info['prev_completed_trading_day'],
                'reason': None if last_volume is not None else "Volume data not available"
            }
            
            return result
            
        except Exception as e:
            return {
                'volume_last_day': None,
                'volume_last_day_pct': None,
                'reason': f"Failed to get volume data: {str(e)}"
            }
    
    def get_last_5d_avg_volume(self, symbol):
        """取得最近 5 個完整交易日平均成交量"""
        try:
            ticker = yf.Ticker(symbol)
            exchange_tz = self.get_exchange_timezone(ticker)
            
            # 取得最近 15 個交易日資料（確保有足夠資料）
            hist = ticker.history(period='15d')
            if hist.empty or len(hist) < 10:
                return {
                    'avg_volume_5d': None,
                    'avg_volume_5d_pct': None,
                    'reason': "Insufficient trading days for 5D average"
                }
            
            # 確保資料按日期排序
            hist = hist.sort_index()
            
            # 檢查是否需要排除今天的盤中資料
            now_exchange = datetime.now(exchange_tz)
            today = now_exchange.date()
            last_date = hist.index[-1].date()
            
            if last_date == today:
                market_close_time = now_exchange.replace(hour=16, minute=0, second=0, microsecond=0)
                if now_exchange < market_close_time:
                    # 盤中，排除最後一筆
                    hist = hist[:-1]
            
            if len(hist) < 10:
                return {
                    'avg_volume_5d': None,
                    'avg_volume_5d_pct': None,
                    'reason': "Insufficient completed trading days"
                }
            
            # 取最後 10 個完整交易日
            last_10_days = hist.tail(10)
            
            # 分兩段：最近 5 天 vs 再前 5 天
            window_last = last_10_days.tail(5)['Volume']
            window_prev = last_10_days.head(5)['Volume']
            
            avg_last = window_last.mean()
            avg_prev = window_prev.mean()
            
            # 計算百分比變化
            pct_change = None
            if avg_prev > 0:
                pct_change = round((avg_last - avg_prev) / avg_prev * 100, 1)
            
            return {
                'avg_volume_5d': int(avg_last) if not pd.isna(avg_last) else None,
                'avg_volume_5d_pct': pct_change,
                'data_points': {
                    'volume_days_used': len(last_10_days),
                    'window_last_days': len(window_last),
                    'window_prev_days': len(window_prev)
                },
                'reason': None if not pd.isna(avg_last) else "Volume calculation failed"
            }
            
        except Exception as e:
            return {
                'avg_volume_5d': None,
                'avg_volume_5d_pct': None,
                'reason': f"Failed to calculate 5D average volume: {str(e)}"
            }
    
    def get_market_cap(self, symbol):
        """取得 Market Cap"""
        try:
            ticker = yf.Ticker(symbol)
            
            # 只使用 info["marketCap"]
            if hasattr(ticker, 'info') and ticker.info:
                market_cap = ticker.info.get('marketCap')
                if market_cap is not None:
                    return {
                        'market_cap': market_cap,
                        'reason': None,
                        'note': 'Yahoo Finance snapshot value'
                    }
            
            return {
                'market_cap': None,
                'reason': 'Market cap not available in ticker.info',
                'note': 'Yahoo Finance snapshot value'
            }
            
        except Exception as e:
            return {
                'market_cap': None,
                'reason': f"Failed to get market cap: {str(e)}",
                'note': 'Yahoo Finance snapshot value'
            }
    
    def get_beta(self, symbol, benchmark=None):
        """計算 Beta (3mo/1y/5y)"""
        if benchmark is None:
            benchmark = self.benchmark
            
        try:
            # 取得股票和基準指數資料
            stock_ticker = yf.Ticker(symbol)
            benchmark_ticker = yf.Ticker(benchmark)
            
            results = {
                'beta_3mo': None,
                'beta_1y': None,
                'beta_5y': None,
                'benchmark': benchmark,
                'data_points': {
                    'beta_3mo_returns': 0,
                    'beta_1y_returns': 0,
                    'beta_5y_returns': 0
                },
                'reasons': {
                    'beta_3mo': None,
                    'beta_1y': None,
                    'beta_5y': None
                }
            }
            
            # 計算不同期間的 Beta
            periods = {
                'beta_3mo': '3mo',
                'beta_1y': '1y', 
                'beta_5y': '5y'
            }
            
            for beta_key, period in periods.items():
                try:
                    # 取得歷史資料
                    stock_hist = stock_ticker.history(period=period)
                    benchmark_hist = benchmark_ticker.history(period=period)
                    
                    if stock_hist.empty or benchmark_hist.empty:
                        results['reasons'][beta_key] = f"No data available for {period}"
                        continue
                    
                    # 使用 Adj Close 計算日報酬
                    stock_prices = stock_hist['Close']  # yfinance 的 Close 已經是調整後價格
                    benchmark_prices = benchmark_hist['Close']
                    
                    # 計算日報酬率
                    stock_returns = stock_prices.pct_change().dropna()
                    benchmark_returns = benchmark_prices.pct_change().dropna()
                    
                    # 對齊交易日（concat 後 dropna）
                    aligned_data = pd.concat([stock_returns, benchmark_returns], axis=1, join='inner').dropna()
                    
                    if len(aligned_data) < self.min_data_points:
                        results['reasons'][beta_key] = f"Insufficient data points: {len(aligned_data)} < {self.min_data_points}"
                        continue
                    
                    stock_aligned = aligned_data.iloc[:, 0]
                    benchmark_aligned = aligned_data.iloc[:, 1]
                    
                    # 計算 Beta = Cov(Ri, Rm) / Var(Rm)
                    covariance = np.cov(stock_aligned, benchmark_aligned)[0, 1]
                    benchmark_variance = np.var(benchmark_aligned)
                    
                    if benchmark_variance == 0:
                        results['reasons'][beta_key] = "Benchmark variance is zero"
                        continue
                    
                    beta = covariance / benchmark_variance
                    results[beta_key] = round(beta, 2)
                    results['data_points'][f'{beta_key}_returns'] = len(aligned_data)
                    
                except Exception as e:
                    results['reasons'][beta_key] = f"Calculation failed: {str(e)}"
            
            return results
            
        except Exception as e:
            return {
                'beta_3mo': None,
                'beta_1y': None,
                'beta_5y': None,
                'benchmark': benchmark,
                'data_points': {
                    'beta_3mo_returns': 0,
                    'beta_1y_returns': 0,
                    'beta_5y_returns': 0
                },
                'reasons': {
                    'beta_3mo': f"Failed to calculate beta: {str(e)}",
                    'beta_1y': f"Failed to calculate beta: {str(e)}",
                    'beta_5y': f"Failed to calculate beta: {str(e)}"
                }
            }
    
    def get_all_yfinance_indicators(self, symbol, benchmark=None):
        """取得所有 yfinance 指標"""
        print(f"📊 Calculating yfinance indicators for {symbol}...")
        
        # 取得各項指標
        volume_data = self.get_last_completed_day_volume(symbol)
        avg_volume_data = self.get_last_5d_avg_volume(symbol)
        market_cap_data = self.get_market_cap(symbol)
        beta_data = self.get_beta(symbol, benchmark)
        
        # 合併結果
        result = {
            'exchange_timezone': volume_data.get('exchange_timezone', 'America/New_York'),
            'benchmark': beta_data.get('benchmark', self.benchmark),
            'as_of_exchange': volume_data.get('as_of_exchange'),
            'as_of_taipei': volume_data.get('as_of_taipei'),
            'last_completed_trading_day': volume_data.get('last_completed_trading_day'),
            'prev_completed_trading_day': volume_data.get('prev_completed_trading_day'),
            
            # Volume 指標
            'volume_last_day': volume_data.get('volume_last_day'),
            'volume_last_day_pct': volume_data.get('volume_last_day_pct'),
            
            # 5D Average Volume 指標
            'avg_volume_5d': avg_volume_data.get('avg_volume_5d'),
            'avg_volume_5d_pct': avg_volume_data.get('avg_volume_5d_pct'),
            
            # Market Cap
            'market_cap': market_cap_data.get('market_cap'),
            
            # Beta 指標
            'beta_3mo': beta_data.get('beta_3mo'),
            'beta_1y': beta_data.get('beta_1y'),
            'beta_5y': beta_data.get('beta_5y'),
            
            # 資料點統計
            'data_points': {
                'volume_days_used': avg_volume_data.get('data_points', {}).get('volume_days_used', 0),
                'beta_3mo_returns': beta_data.get('data_points', {}).get('beta_3mo_returns', 0),
                'beta_1y_returns': beta_data.get('data_points', {}).get('beta_1y_returns', 0),
                'beta_5y_returns': beta_data.get('data_points', {}).get('beta_5y_returns', 0)
            },
            
            # 警告和原因
            'warnings': [],
            'reasons': {
                'volume_last_day': volume_data.get('reason'),
                'avg_volume_5d': avg_volume_data.get('reason'),
                'market_cap': market_cap_data.get('reason'),
                'beta_3mo': beta_data.get('reasons', {}).get('beta_3mo'),
                'beta_1y': beta_data.get('reasons', {}).get('beta_1y'),
                'beta_5y': beta_data.get('reasons', {}).get('beta_5y')
            }
        }
        
        # 收集警告
        warnings = []
        for field, reason in result['reasons'].items():
            if reason:
                warnings.append(f"{field}: {reason}")
        
        result['warnings'] = warnings
        
        print(f"✅ Completed yfinance indicators for {symbol}")
        return result

# 測試函數
def test_yfinance_indicators():
    """測試 yfinance 指標計算"""
    core = YFinanceIndicatorsCore()
    
    test_symbols = ['NVDA', 'ONDS', 'TSM']
    
    for symbol in test_symbols:
        print(f"\n🧪 Testing {symbol}...")
        result = core.get_all_yfinance_indicators(symbol)
        
        print(f"Volume Last Day: {result['volume_last_day']} ({result['volume_last_day_pct']}%)")
        print(f"5D Avg Volume: {result['avg_volume_5d']} ({result['avg_volume_5d_pct']}%)")
        print(f"Market Cap: {result['market_cap']}")
        print(f"Beta 3mo: {result['beta_3mo']}")
        print(f"Beta 1y: {result['beta_1y']}")
        print(f"Beta 5y: {result['beta_5y']}")
        
        if result['warnings']:
            print(f"⚠️ Warnings: {result['warnings']}")

if __name__ == '__main__':
    test_yfinance_indicators()