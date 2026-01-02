#!/usr/bin/env python3
"""
yfinance 指標計算核心模組
新增 6 項指標：Volume, 5D Avg Volume, Market Cap, Beta (3mo/1y/5y)
Enhanced with comprehensive error handling and logging
"""

import yfinance as yf
import pandas as pd
import numpy as np
import pytz
from datetime import datetime, timedelta
import warnings
import logging
import sys
from typing import Dict, Any, Optional, Tuple, List

warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('yfinance_indicators.log', mode='a')
    ]
)
logger = logging.getLogger(__name__)

class YFinanceIndicatorsCore:
    def __init__(self, benchmark='^GSPC'):
        self.benchmark = benchmark
        self.min_data_points = 30  # 最少資料點數
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        self.logger.info(f"Initialized YFinanceIndicatorsCore with benchmark: {benchmark}")
        
    def _log_error(self, operation: str, symbol: str, error: Exception) -> str:
        """統一錯誤記錄格式"""
        error_msg = f"{operation} failed for {symbol}: {str(error)}"
        self.logger.error(error_msg, exc_info=True)
        return error_msg
        
    def _log_warning(self, operation: str, symbol: str, message: str) -> str:
        """統一警告記錄格式"""
        warning_msg = f"{operation} warning for {symbol}: {message}"
        self.logger.warning(warning_msg)
        return warning_msg
        
    def get_exchange_timezone(self, ticker) -> pytz.BaseTzInfo:
        """取得交易所時區 - Enhanced with comprehensive error handling"""
        try:
            self.logger.debug(f"Getting exchange timezone for ticker")
            
            # 方法 1: ticker.info["exchangeTimezoneName"]
            if hasattr(ticker, 'info') and ticker.info:
                tz_name = ticker.info.get("exchangeTimezoneName")
                if tz_name:
                    try:
                        tz = pytz.timezone(tz_name)
                        self.logger.debug(f"Found timezone from info: {tz_name}")
                        return tz
                    except Exception as e:
                        self.logger.warning(f"Invalid timezone from info '{tz_name}': {e}")
            
            # 方法 2: ticker.fast_info["timezone"] 
            if hasattr(ticker, 'fast_info') and ticker.fast_info:
                tz_name = getattr(ticker.fast_info, 'timezone', None)
                if tz_name:
                    try:
                        tz = pytz.timezone(tz_name)
                        self.logger.debug(f"Found timezone from fast_info: {tz_name}")
                        return tz
                    except Exception as e:
                        self.logger.warning(f"Invalid timezone from fast_info '{tz_name}': {e}")
            
            # 方法 3: history index tz fallback
            try:
                hist = ticker.history(period='5d')
                if not hist.empty and hasattr(hist.index, 'tz') and hist.index.tz:
                    self.logger.debug(f"Found timezone from history index: {hist.index.tz}")
                    return hist.index.tz
            except Exception as e:
                self.logger.warning(f"Failed to get timezone from history: {e}")
                
        except Exception as e:
            self.logger.error(f"Failed to get timezone: {e}", exc_info=True)
        
        # 預設美東時區
        default_tz = pytz.timezone('America/New_York')
        self.logger.info(f"Using default timezone: {default_tz}")
        return default_tz
    
    def get_last_completed_trading_day(self, ticker, exchange_tz: pytz.BaseTzInfo) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[str]]:
        """取得上一個完整交易日 - Enhanced with conservative date handling"""
        try:
            self.logger.debug("Getting last completed trading day")
            
            # 取得最近 15 天的歷史資料 (增加緩衝以確保有足夠資料)
            hist = ticker.history(period='15d')
            if hist.empty:
                error_msg = "No historical data available"
                self.logger.error(error_msg)
                return None, None, error_msg
            
            # 確保資料按日期排序
            hist = hist.sort_index()
            self.logger.debug(f"Retrieved {len(hist)} days of historical data")
            
            # 取得交易所現在時間
            now_exchange = datetime.now(exchange_tz)
            now_taipei = now_exchange.astimezone(pytz.timezone('Asia/Taipei'))
            
            # Conservative logic: 檢查最後一根 K 線是否為完整交易日
            last_date = hist.index[-1].date()
            today = now_exchange.date()
            
            self.logger.debug(f"Last data date: {last_date}, Today: {today}, Exchange time: {now_exchange}")
            
            # Conservative approach: 如果最後一根 K 線是今天，需要更保守的檢查
            if last_date == today:
                # 檢查是否已收盤 - 使用更保守的時間 (美東時間 16:30 之後才認為收盤)
                market_close_time = now_exchange.replace(hour=16, minute=30, second=0, microsecond=0)
                
                # 週末檢查 - 如果是週六日，使用上週五的資料
                if now_exchange.weekday() >= 5:  # Saturday = 5, Sunday = 6
                    self.logger.debug("Weekend detected, using previous trading day")
                    if len(hist) >= 2:
                        last_completed_date = hist.index[-2].date()
                        prev_completed_date = hist.index[-3].date() if len(hist) >= 3 else None
                    else:
                        error_msg = "Insufficient trading days for weekend calculation"
                        self.logger.error(error_msg)
                        return None, None, error_msg
                elif now_exchange < market_close_time:
                    # 盤中，使用前一個交易日 (Conservative approach)
                    self.logger.debug("Market still open, using previous trading day")
                    if len(hist) >= 2:
                        last_completed_date = hist.index[-2].date()
                        prev_completed_date = hist.index[-3].date() if len(hist) >= 3 else None
                    else:
                        error_msg = "Insufficient trading days for intraday calculation"
                        self.logger.error(error_msg)
                        return None, None, error_msg
                else:
                    # 已收盤，但仍保守使用前一個交易日以避免不完整資料
                    self.logger.debug("Market closed, but using conservative approach")
                    if len(hist) >= 2:
                        last_completed_date = hist.index[-2].date()
                        prev_completed_date = hist.index[-3].date() if len(hist) >= 3 else None
                    else:
                        # 如果只有一天資料，使用當天但標記警告
                        last_completed_date = hist.index[-1].date()
                        prev_completed_date = None
                        self.logger.warning("Only one day of data available, using current day with caution")
            else:
                # 最後一根不是今天，使用最後一個交易日
                self.logger.debug("Last data is not today, using last available trading day")
                last_completed_date = hist.index[-1].date()
                prev_completed_date = hist.index[-2].date() if len(hist) >= 2 else None
            
            result = {
                'exchange_timezone': str(exchange_tz),
                'as_of_exchange': now_exchange.isoformat(),
                'as_of_taipei': now_taipei.isoformat(),
                'last_completed_trading_day': last_completed_date.strftime('%Y-%m-%d'),
                'prev_completed_trading_day': prev_completed_date.strftime('%Y-%m-%d') if prev_completed_date else None,
                'hist_data': hist,
                'conservative_logic_applied': True,
                'data_points_available': len(hist)
            }
            
            self.logger.info(f"Completed trading day calculation: {last_completed_date}")
            return result, None, None
            
        except Exception as e:
            error_msg = self._log_error("get_last_completed_trading_day", "ticker", e)
            return None, None, error_msg
    
    def get_last_completed_day_volume(self, symbol: str) -> Dict[str, Any]:
        """取得上一個完整交易日成交量 - Enhanced with comprehensive error handling"""
        try:
            self.logger.info(f"Getting last completed day volume for {symbol}")
            ticker = yf.Ticker(symbol)
            exchange_tz = self.get_exchange_timezone(ticker)
            
            # 取得交易日資訊
            trading_info, _, error = self.get_last_completed_trading_day(ticker, exchange_tz)
            if error:
                return {
                    'volume_last_day': None,
                    'volume_last_day_pct': None,
                    'reason': error,
                    'symbol': symbol
                }
            
            hist = trading_info['hist_data']
            
            # 找到對應的交易日資料
            last_date = pd.to_datetime(trading_info['last_completed_trading_day']).date()
            prev_date = pd.to_datetime(trading_info['prev_completed_trading_day']).date() if trading_info['prev_completed_trading_day'] else None
            
            last_volume = None
            prev_volume = None
            
            # 更安全的資料查找
            for idx, row in hist.iterrows():
                date = idx.date()
                if date == last_date and 'Volume' in row and pd.notna(row['Volume']):
                    last_volume = row['Volume']
                    self.logger.debug(f"Found last day volume: {last_volume} for {last_date}")
                elif date == prev_date and 'Volume' in row and pd.notna(row['Volume']):
                    prev_volume = row['Volume']
                    self.logger.debug(f"Found previous day volume: {prev_volume} for {prev_date}")
            
            # 計算百分比變化 - 增強錯誤處理
            pct_change = None
            if last_volume is not None and prev_volume is not None:
                if prev_volume > 0:
                    pct_change = round((last_volume - prev_volume) / prev_volume * 100, 1)
                    self.logger.debug(f"Volume change: {pct_change}%")
                else:
                    self.logger.warning(f"Previous volume is zero for {symbol}")
            
            result = {
                'volume_last_day': int(last_volume) if last_volume is not None and last_volume > 0 else None,
                'volume_last_day_pct': pct_change,
                'exchange_timezone': trading_info['exchange_timezone'],
                'as_of_exchange': trading_info['as_of_exchange'],
                'as_of_taipei': trading_info['as_of_taipei'],
                'last_completed_trading_day': trading_info['last_completed_trading_day'],
                'prev_completed_trading_day': trading_info['prev_completed_trading_day'],
                'reason': None if last_volume is not None else "Volume data not available",
                'symbol': symbol,
                'conservative_logic_applied': trading_info.get('conservative_logic_applied', False)
            }
            
            self.logger.info(f"Successfully calculated volume for {symbol}: {result['volume_last_day']}")
            return result
            
        except Exception as e:
            error_msg = self._log_error("get_last_completed_day_volume", symbol, e)
            return {
                'volume_last_day': None,
                'volume_last_day_pct': None,
                'reason': error_msg,
                'symbol': symbol
            }
    
    def get_last_5d_avg_volume(self, symbol: str) -> Dict[str, Any]:
        """取得最近 5 個完整交易日平均成交量 - Enhanced with comprehensive error handling"""
        try:
            self.logger.info(f"Getting 5-day average volume for {symbol}")
            ticker = yf.Ticker(symbol)
            exchange_tz = self.get_exchange_timezone(ticker)
            
            # 取得最近 20 個交易日資料（確保有足夠資料進行 5+5 比較）
            hist = ticker.history(period='20d')
            if hist.empty:
                error_msg = "No historical data available"
                self.logger.error(f"{symbol}: {error_msg}")
                return {
                    'avg_volume_5d': None,
                    'avg_volume_5d_pct': None,
                    'reason': error_msg,
                    'symbol': symbol
                }
            
            # 確保資料按日期排序
            hist = hist.sort_index()
            self.logger.debug(f"Retrieved {len(hist)} days of data for {symbol}")
            
            # Conservative approach: 檢查是否需要排除今天的盤中資料
            now_exchange = datetime.now(exchange_tz)
            today = now_exchange.date()
            last_date = hist.index[-1].date()
            
            if last_date == today:
                # 更保守的收盤時間檢查 (16:30 之後才認為收盤)
                market_close_time = now_exchange.replace(hour=16, minute=30, second=0, microsecond=0)
                if now_exchange < market_close_time or now_exchange.weekday() >= 5:
                    # 盤中或週末，排除最後一筆
                    hist = hist[:-1]
                    self.logger.debug(f"Excluded today's data (conservative approach), remaining: {len(hist)} days")
            
            if len(hist) < 10:
                error_msg = f"Insufficient completed trading days: {len(hist)} < 10"
                self.logger.error(f"{symbol}: {error_msg}")
                return {
                    'avg_volume_5d': None,
                    'avg_volume_5d_pct': None,
                    'reason': error_msg,
                    'symbol': symbol
                }
            
            # 取最後 10 個完整交易日進行 5+5 比較
            last_10_days = hist.tail(10)
            
            # 檢查 Volume 欄位是否存在且有效
            if 'Volume' not in last_10_days.columns:
                error_msg = "Volume column not found in historical data"
                self.logger.error(f"{symbol}: {error_msg}")
                return {
                    'avg_volume_5d': None,
                    'avg_volume_5d_pct': None,
                    'reason': error_msg,
                    'symbol': symbol
                }
            
            # 分兩段：最近 5 天 vs 再前 5 天
            window_last = last_10_days.tail(5)['Volume'].dropna()
            window_prev = last_10_days.head(5)['Volume'].dropna()
            
            # 確保兩個窗口都有足夠資料
            if len(window_last) < 3 or len(window_prev) < 3:
                error_msg = f"Insufficient volume data in windows: last={len(window_last)}, prev={len(window_prev)}"
                self.logger.warning(f"{symbol}: {error_msg}")
                return {
                    'avg_volume_5d': None,
                    'avg_volume_5d_pct': None,
                    'reason': error_msg,
                    'symbol': symbol
                }
            
            avg_last = window_last.mean()
            avg_prev = window_prev.mean()
            
            self.logger.debug(f"{symbol}: Last 5D avg: {avg_last}, Prev 5D avg: {avg_prev}")
            
            # 計算百分比變化
            pct_change = None
            if pd.notna(avg_last) and pd.notna(avg_prev) and avg_prev > 0:
                pct_change = round((avg_last - avg_prev) / avg_prev * 100, 1)
                self.logger.debug(f"{symbol}: 5D volume change: {pct_change}%")
            
            result = {
                'avg_volume_5d': int(avg_last) if pd.notna(avg_last) and avg_last > 0 else None,
                'avg_volume_5d_pct': pct_change,
                'data_points': {
                    'total_days_used': len(last_10_days),
                    'window_last_days': len(window_last),
                    'window_prev_days': len(window_prev),
                    'conservative_logic_applied': True
                },
                'reason': None if pd.notna(avg_last) else "Volume calculation failed",
                'symbol': symbol
            }
            
            self.logger.info(f"Successfully calculated 5D avg volume for {symbol}: {result['avg_volume_5d']}")
            return result
            
        except Exception as e:
            error_msg = self._log_error("get_last_5d_avg_volume", symbol, e)
            return {
                'avg_volume_5d': None,
                'avg_volume_5d_pct': None,
                'reason': error_msg,
                'symbol': symbol
            }
    
    def get_market_cap(self, symbol: str) -> Dict[str, Any]:
        """取得 Market Cap - Enhanced with comprehensive error handling"""
        try:
            self.logger.info(f"Getting market cap for {symbol}")
            ticker = yf.Ticker(symbol)
            
            # 嘗試多種方法獲取市值
            market_cap = None
            method_used = None
            
            # 方法 1: ticker.info["marketCap"]
            try:
                if hasattr(ticker, 'info') and ticker.info:
                    market_cap = ticker.info.get('marketCap')
                    if market_cap is not None and market_cap > 0:
                        method_used = 'ticker.info.marketCap'
                        self.logger.debug(f"{symbol}: Found market cap via info: {market_cap}")
            except Exception as e:
                self.logger.warning(f"{symbol}: Failed to get market cap from info: {e}")
            
            # 方法 2: ticker.fast_info (如果方法1失敗)
            if market_cap is None:
                try:
                    if hasattr(ticker, 'fast_info') and ticker.fast_info:
                        market_cap = getattr(ticker.fast_info, 'market_cap', None)
                        if market_cap is not None and market_cap > 0:
                            method_used = 'ticker.fast_info.market_cap'
                            self.logger.debug(f"{symbol}: Found market cap via fast_info: {market_cap}")
                except Exception as e:
                    self.logger.warning(f"{symbol}: Failed to get market cap from fast_info: {e}")
            
            # 驗證市值合理性
            if market_cap is not None:
                if market_cap <= 0:
                    self.logger.warning(f"{symbol}: Invalid market cap value: {market_cap}")
                    market_cap = None
                    method_used = None
                elif market_cap > 1e15:  # 超過 1000 兆美元，可能是錯誤資料
                    self.logger.warning(f"{symbol}: Suspiciously large market cap: {market_cap}")
            
            result = {
                'market_cap': int(market_cap) if market_cap is not None else None,
                'reason': None if market_cap is not None else 'Market cap not available',
                'method_used': method_used,
                'symbol': symbol,
                'note': 'Yahoo Finance snapshot value'
            }
            
            if market_cap is not None:
                self.logger.info(f"Successfully retrieved market cap for {symbol}: {market_cap}")
            else:
                self.logger.warning(f"Market cap not available for {symbol}")
            
            return result
            
        except Exception as e:
            error_msg = self._log_error("get_market_cap", symbol, e)
            return {
                'market_cap': None,
                'reason': error_msg,
                'method_used': None,
                'symbol': symbol,
                'note': 'Yahoo Finance snapshot value'
            }
    
    def get_beta(self, symbol: str, benchmark: Optional[str] = None) -> Dict[str, Any]:
        """計算 Beta (3mo/1y/5y) - Enhanced with comprehensive error handling"""
        if benchmark is None:
            benchmark = self.benchmark
            
        try:
            self.logger.info(f"Calculating beta for {symbol} vs {benchmark}")
            
            # 取得股票和基準指數資料
            stock_ticker = yf.Ticker(symbol)
            benchmark_ticker = yf.Ticker(benchmark)
            
            results = {
                'beta_3mo': None,
                'beta_1y': None,
                'beta_5y': None,
                'benchmark': benchmark,
                'symbol': symbol,
                'data_points': {
                    'beta_3mo_returns': 0,
                    'beta_1y_returns': 0,
                    'beta_5y_returns': 0
                },
                'reasons': {
                    'beta_3mo': None,
                    'beta_1y': None,
                    'beta_5y': None
                },
                'calculation_details': {}
            }
            
            # 計算不同期間的 Beta
            periods = {
                'beta_3mo': '3mo',
                'beta_1y': '1y', 
                'beta_5y': '5y'
            }
            
            for beta_key, period in periods.items():
                try:
                    self.logger.debug(f"Calculating {beta_key} for {symbol}")
                    
                    # 取得歷史資料 - 增加重試機制
                    stock_hist = None
                    benchmark_hist = None
                    
                    for attempt in range(2):  # 最多重試2次
                        try:
                            stock_hist = stock_ticker.history(period=period)
                            benchmark_hist = benchmark_ticker.history(period=period)
                            break
                        except Exception as e:
                            if attempt == 0:
                                self.logger.warning(f"Retry {attempt + 1} for {symbol} {period}: {e}")
                                continue
                            else:
                                raise e
                    
                    if stock_hist is None or benchmark_hist is None or stock_hist.empty or benchmark_hist.empty:
                        error_msg = f"No data available for {period}"
                        results['reasons'][beta_key] = error_msg
                        self.logger.warning(f"{symbol} {beta_key}: {error_msg}")
                        continue
                    
                    # 檢查資料品質
                    if len(stock_hist) < 10 or len(benchmark_hist) < 10:
                        error_msg = f"Insufficient raw data: stock={len(stock_hist)}, benchmark={len(benchmark_hist)}"
                        results['reasons'][beta_key] = error_msg
                        self.logger.warning(f"{symbol} {beta_key}: {error_msg}")
                        continue
                    
                    # 使用 Close 價格計算日報酬 (yfinance 的 Close 已經是調整後價格)
                    if 'Close' not in stock_hist.columns or 'Close' not in benchmark_hist.columns:
                        error_msg = "Close price data not available"
                        results['reasons'][beta_key] = error_msg
                        self.logger.warning(f"{symbol} {beta_key}: {error_msg}")
                        continue
                    
                    stock_prices = stock_hist['Close'].dropna()
                    benchmark_prices = benchmark_hist['Close'].dropna()
                    
                    # 計算日報酬率
                    stock_returns = stock_prices.pct_change().dropna()
                    benchmark_returns = benchmark_prices.pct_change().dropna()
                    
                    # 對齊交易日（inner join 後 dropna）
                    aligned_data = pd.concat([stock_returns, benchmark_returns], axis=1, join='inner').dropna()
                    
                    if len(aligned_data) < self.min_data_points:
                        error_msg = f"Insufficient aligned data points: {len(aligned_data)} < {self.min_data_points}"
                        results['reasons'][beta_key] = error_msg
                        self.logger.warning(f"{symbol} {beta_key}: {error_msg}")
                        continue
                    
                    stock_aligned = aligned_data.iloc[:, 0]
                    benchmark_aligned = aligned_data.iloc[:, 1]
                    
                    # 檢查資料變異性
                    if stock_aligned.std() == 0:
                        error_msg = "Stock returns have zero variance"
                        results['reasons'][beta_key] = error_msg
                        self.logger.warning(f"{symbol} {beta_key}: {error_msg}")
                        continue
                    
                    if benchmark_aligned.std() == 0:
                        error_msg = "Benchmark returns have zero variance"
                        results['reasons'][beta_key] = error_msg
                        self.logger.warning(f"{symbol} {beta_key}: {error_msg}")
                        continue
                    
                    # 計算 Beta = Cov(Ri, Rm) / Var(Rm)
                    covariance = np.cov(stock_aligned, benchmark_aligned)[0, 1]
                    benchmark_variance = np.var(benchmark_aligned, ddof=1)  # 使用樣本變異數
                    
                    if benchmark_variance == 0 or np.isnan(benchmark_variance):
                        error_msg = "Benchmark variance is zero or NaN"
                        results['reasons'][beta_key] = error_msg
                        self.logger.warning(f"{symbol} {beta_key}: {error_msg}")
                        continue
                    
                    beta = covariance / benchmark_variance
                    
                    # 檢查 Beta 合理性
                    if np.isnan(beta) or np.isinf(beta):
                        error_msg = f"Invalid beta calculation result: {beta}"
                        results['reasons'][beta_key] = error_msg
                        self.logger.warning(f"{symbol} {beta_key}: {error_msg}")
                        continue
                    
                    # 極端值檢查 (Beta 通常在 -5 到 5 之間)
                    if abs(beta) > 10:
                        self.logger.warning(f"{symbol} {beta_key}: Extreme beta value: {beta}")
                    
                    results[beta_key] = round(beta, 2)
                    results['data_points'][f'{beta_key}_returns'] = len(aligned_data)
                    results['calculation_details'][beta_key] = {
                        'covariance': round(covariance, 6),
                        'benchmark_variance': round(benchmark_variance, 6),
                        'correlation': round(np.corrcoef(stock_aligned, benchmark_aligned)[0, 1], 3)
                    }
                    
                    self.logger.info(f"Successfully calculated {beta_key} for {symbol}: {beta}")
                    
                except Exception as e:
                    error_msg = self._log_error(f"calculate_{beta_key}", symbol, e)
                    results['reasons'][beta_key] = error_msg
            
            return results
            
        except Exception as e:
            error_msg = self._log_error("get_beta", symbol, e)
            return {
                'beta_3mo': None,
                'beta_1y': None,
                'beta_5y': None,
                'benchmark': benchmark,
                'symbol': symbol,
                'data_points': {
                    'beta_3mo_returns': 0,
                    'beta_1y_returns': 0,
                    'beta_5y_returns': 0
                },
                'reasons': {
                    'beta_3mo': error_msg,
                    'beta_1y': error_msg,
                    'beta_5y': error_msg
                },
                'calculation_details': {}
            }
    
    def get_all_yfinance_indicators(self, symbol: str, benchmark: Optional[str] = None) -> Dict[str, Any]:
        """取得所有 yfinance 指標 - Enhanced with comprehensive error handling"""
        self.logger.info(f"📊 Calculating yfinance indicators for {symbol}...")
        
        try:
            # 取得各項指標 - 每個指標都有獨立的錯誤處理
            volume_data = self.get_last_completed_day_volume(symbol)
            avg_volume_data = self.get_last_5d_avg_volume(symbol)
            market_cap_data = self.get_market_cap(symbol)
            beta_data = self.get_beta(symbol, benchmark)
            
            # 合併結果 - 使用安全的字典訪問
            result = {
                'symbol': symbol,
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
                    'total_days_used': avg_volume_data.get('data_points', {}).get('total_days_used', 0),
                    'beta_3mo_returns': beta_data.get('data_points', {}).get('beta_3mo_returns', 0),
                    'beta_1y_returns': beta_data.get('data_points', {}).get('beta_1y_returns', 0),
                    'beta_5y_returns': beta_data.get('data_points', {}).get('beta_5y_returns', 0),
                    'conservative_logic_applied': volume_data.get('conservative_logic_applied', False)
                },
                
                # 詳細計算資訊
                'calculation_details': beta_data.get('calculation_details', {}),
                
                # 方法和來源資訊
                'methods_used': {
                    'market_cap_method': market_cap_data.get('method_used'),
                    'volume_conservative_logic': volume_data.get('conservative_logic_applied', False)
                },
                
                # 警告和原因
                'warnings': [],
                'notes': [],
                'reasons': {
                    'volume_last_day': volume_data.get('reason'),
                    'avg_volume_5d': avg_volume_data.get('reason'),
                    'market_cap': market_cap_data.get('reason'),
                    'beta_3mo': beta_data.get('reasons', {}).get('beta_3mo'),
                    'beta_1y': beta_data.get('reasons', {}).get('beta_1y'),
                    'beta_5y': beta_data.get('reasons', {}).get('beta_5y')
                }
            }
            
            # 收集警告和註記
            warnings = []
            notes = []
            
            for field, reason in result['reasons'].items():
                if reason:
                    warnings.append(f"{field}: {reason}")
            
            # 添加成功指標的註記
            successful_indicators = []
            if result['volume_last_day'] is not None:
                successful_indicators.append('volume_last_day')
            if result['avg_volume_5d'] is not None:
                successful_indicators.append('avg_volume_5d')
            if result['market_cap'] is not None:
                successful_indicators.append('market_cap')
            if result['beta_3mo'] is not None:
                successful_indicators.append('beta_3mo')
            if result['beta_1y'] is not None:
                successful_indicators.append('beta_1y')
            if result['beta_5y'] is not None:
                successful_indicators.append('beta_5y')
            
            if successful_indicators:
                notes.append(f"Successfully calculated: {', '.join(successful_indicators)}")
            
            if result['data_points']['conservative_logic_applied']:
                notes.append("Conservative trading day logic applied for data integrity")
            
            result['warnings'] = warnings
            result['notes'] = notes
            
            # 記錄成功統計
            success_count = len(successful_indicators)
            total_indicators = 6
            self.logger.info(f"✅ Completed yfinance indicators for {symbol}: {success_count}/{total_indicators} successful")
            
            if warnings:
                self.logger.warning(f"⚠️ {symbol} warnings: {len(warnings)} issues found")
            
            return result
            
        except Exception as e:
            error_msg = self._log_error("get_all_yfinance_indicators", symbol, e)
            return {
                'symbol': symbol,
                'exchange_timezone': 'America/New_York',
                'benchmark': benchmark or self.benchmark,
                'as_of_exchange': None,
                'as_of_taipei': None,
                'last_completed_trading_day': None,
                'prev_completed_trading_day': None,
                'volume_last_day': None,
                'volume_last_day_pct': None,
                'avg_volume_5d': None,
                'avg_volume_5d_pct': None,
                'market_cap': None,
                'beta_3mo': None,
                'beta_1y': None,
                'beta_5y': None,
                'data_points': {
                    'total_days_used': 0,
                    'beta_3mo_returns': 0,
                    'beta_1y_returns': 0,
                    'beta_5y_returns': 0,
                    'conservative_logic_applied': False
                },
                'calculation_details': {},
                'methods_used': {},
                'warnings': [error_msg],
                'notes': ['Complete calculation failure'],
                'reasons': {
                    'volume_last_day': error_msg,
                    'avg_volume_5d': error_msg,
                    'market_cap': error_msg,
                    'beta_3mo': error_msg,
                    'beta_1y': error_msg,
                    'beta_5y': error_msg
                }
            }

# 測試函數
def test_yfinance_indicators():
    """測試 yfinance 指標計算 - Enhanced with comprehensive testing"""
    logger.info("🧪 Starting yfinance indicators test")
    core = YFinanceIndicatorsCore()
    
    test_symbols = ['NVDA', 'ONDS', 'TSM']
    
    for symbol in test_symbols:
        logger.info(f"\n🧪 Testing {symbol}...")
        try:
            result = core.get_all_yfinance_indicators(symbol)
            
            print(f"\n=== {symbol} Results ===")
            print(f"Volume Last Day: {result['volume_last_day']} ({result['volume_last_day_pct']}%)")
            print(f"5D Avg Volume: {result['avg_volume_5d']} ({result['avg_volume_5d_pct']}%)")
            print(f"Market Cap: {result['market_cap']}")
            print(f"Beta 3mo: {result['beta_3mo']}")
            print(f"Beta 1y: {result['beta_1y']}")
            print(f"Beta 5y: {result['beta_5y']}")
            print(f"Data Points: {result['data_points']}")
            
            if result['warnings']:
                print(f"⚠️ Warnings ({len(result['warnings'])}): {result['warnings']}")
            
            if result['notes']:
                print(f"📝 Notes: {result['notes']}")
                
            logger.info(f"✅ Test completed for {symbol}")
            
        except Exception as e:
            logger.error(f"❌ Test failed for {symbol}: {e}", exc_info=True)
    
    logger.info("🧪 Test suite completed")

if __name__ == '__main__':
    test_yfinance_indicators()