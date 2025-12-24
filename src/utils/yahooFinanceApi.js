// Yahoo Finance API 整合
// 使用 Yahoo Finance 的公開 API 端點

import technicalIndicatorsCache from './technicalIndicatorsCache.js';
import { calculateAllIndicators } from './technicalIndicatorsCore.js';

class YahooFinanceAPI {
  constructor() {
    // 使用多個 CORS 代理服務來解決跨域問題 - 2024年12月修正版
    // 優先使用真正無限制的免費代理服務
    this.corsProxies = [
      // 🆓 真正免費且無生產環境限制的代理
      'https://api.allorigins.win/raw?url=',                // 測試成功: 368ms, 無生產限制 ✅
      
      // ⚠️ 可能有生產環境限制的代理（但保留作為開發/測試用）
      'https://corsproxy.io/?',                             // 測試成功: 119ms, 但可能限制生產環境 ⚠️
      
      // 🔄 其他免費代理（狀態未知，作為備用）
      'https://cors.sh/',                                    // 網路錯誤，但可能間歇性可用
      'https://proxy-cors.isomorphic-git.org/',             // 網路錯誤，但可能間歇性可用
      'https://thingproxy.freeboard.io/fetch/',             // 網路錯誤，但可能間歇性可用
      'https://cors-proxy.htmldriven.com/?url=',            // 網路錯誤，但可能間歇性可用
      'https://cors-anywhere.herokuapp.com/'                // 403 Forbidden，最後備用
    ];
    this.baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 分鐘緩存 (用於 API 請求緩存)
    this.currentProxyIndex = 0; // 從最可靠的免費代理開始
  }

  // 獲取技術指標數據 (帶每日緩存)
  async getTechnicalIndicators(symbol) {
    // 1. 先檢查每日緩存
    const cachedData = await technicalIndicatorsCache.getTechnicalIndicators(symbol);
    if (cachedData) {
      return cachedData;
    }

    // 2. 緩存未命中，從 API 獲取數據
    const freshData = await this.fetchTechnicalIndicatorsFromAPI(symbol);
    
    // 3. 如果獲取成功，存入每日緩存
    if (freshData && !freshData.error) {
      await technicalIndicatorsCache.setTechnicalIndicators(symbol, freshData);
    }

    return freshData;
  }

  // 從 API 獲取技術指標數據 (原有邏輯)
  async fetchTechnicalIndicatorsFromAPI(symbol) {
    const cacheKey = `technical_${symbol}`;
    
    // 檢查緩存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`Using cached data for ${symbol}`);
        return cached.data;
      }
    }

    // 嘗試多個代理服務
    for (let i = 0; i < this.corsProxies.length; i++) {
      try {
        const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
        const proxy = this.corsProxies[proxyIndex];
        
        console.log(`Fetching data for ${symbol} using proxy ${proxyIndex + 1}...`);
        
        // 構建請求 URL
        const targetUrl = `${this.baseUrl}${symbol}?interval=1d&range=3mo&indicators=quote&includePrePost=false`;
        const url = `${proxy}${encodeURIComponent(targetUrl)}`;
        
        console.log(`Request URL: ${url}`);
        
        // 獲取歷史數據用於計算技術指標
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Response status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Raw data structure:`, data);
        
        // 檢查數據結構
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
          throw new Error('No chart data available');
        }
        
        const result = data.chart.result[0];
        
        if (!result.indicators || !result.indicators.quote || !result.indicators.quote[0]) {
          throw new Error('Invalid data structure - missing indicators');
        }
        
        const quotes = result.indicators.quote[0];
        
        // 提取並清理 OHLCV 數據
        const rawData = {
          open: quotes.open || [],
          high: quotes.high || [],
          low: quotes.low || [],
          close: quotes.close || [],
          volume: quotes.volume || []
        };
        
        // 過濾掉 null 值，保持索引對齊
        const length = rawData.close.length;
        const ohlcv = {
          open: new Array(length),
          high: new Array(length),
          low: new Array(length),
          close: new Array(length),
          volume: new Array(length)
        };
        
        for (let i = 0; i < length; i++) {
          ohlcv.open[i] = rawData.open[i] !== null ? rawData.open[i] : NaN;
          ohlcv.high[i] = rawData.high[i] !== null ? rawData.high[i] : NaN;
          ohlcv.low[i] = rawData.low[i] !== null ? rawData.low[i] : NaN;
          ohlcv.close[i] = rawData.close[i] !== null ? rawData.close[i] : NaN;
          ohlcv.volume[i] = rawData.volume[i] !== null ? rawData.volume[i] : NaN;
        }
        
        console.log(`Found ${length} data points for ${symbol}`);
        
        if (length < 50) {
          throw new Error(`Insufficient data points (${length}) for technical analysis`);
        }
        
        // 使用新的技術指標核心計算所有指標
        const coreResults = calculateAllIndicators(ohlcv);
        
        // 轉換為舊格式以保持兼容性
        const getLastValue = (series) => {
          for (let i = series.length - 1; i >= 0; i--) {
            if (!isNaN(series[i])) {
              return series[i];
            }
          }
          return null;
        };
        
        const createIndicatorResult = (series, signalThresholds = null) => {
          const lastValue = getLastValue(series);
          const currentPrice = getLastValue(ohlcv.close);
          
          let signal = 'NEUTRAL';
          if (signalThresholds && lastValue !== null && currentPrice !== null) {
            if (signalThresholds.type === 'price_comparison') {
              if (currentPrice > lastValue * signalThresholds.buy) signal = 'BUY';
              else if (currentPrice < lastValue * signalThresholds.sell) signal = 'SELL';
            } else if (signalThresholds.type === 'rsi') {
              if (lastValue > signalThresholds.overbought) signal = 'OVERBOUGHT';
              else if (lastValue < signalThresholds.oversold) signal = 'OVERSOLD';
            } else if (signalThresholds.type === 'adx') {
              if (lastValue > signalThresholds.strong) signal = 'STRONG_TREND';
              else if (lastValue < signalThresholds.weak) signal = 'WEAK_TREND';
            }
          }
          
          return {
            value: lastValue !== null ? lastValue.toFixed(2) : null,
            signal: signal,
            currentPrice: currentPrice !== null ? currentPrice.toFixed(2) : null
          };
        };
        
        // 計算技術指標（保持舊接口兼容性）
        const indicators = {
          // 移動平均線
          ma5: createIndicatorResult(coreResults.MA_5, { type: 'price_comparison', buy: 1.02, sell: 0.98 }),
          sma5: createIndicatorResult(coreResults.SMA_5, { type: 'price_comparison', buy: 1.02, sell: 0.98 }),
          ma10: createIndicatorResult(coreResults.MA_10, { type: 'price_comparison', buy: 1.02, sell: 0.98 }),
          sma10: createIndicatorResult(coreResults.SMA_10, { type: 'price_comparison', buy: 1.02, sell: 0.98 }),
          ma30: createIndicatorResult(coreResults.MA_30, { type: 'price_comparison', buy: 1.02, sell: 0.98 }),
          sma30: createIndicatorResult(coreResults.SMA_30, { type: 'price_comparison', buy: 1.02, sell: 0.98 }),
          sma50: { value: null, signal: 'N/A' }, // 暫時保留但不計算
          
          // 一目均衡表
          ichimokuBaseLine: createIndicatorResult(coreResults.ICHIMOKU_BASELINE_26, { type: 'price_comparison', buy: 1.01, sell: 0.99 }),
          ichimokuConversionLine: createIndicatorResult(coreResults.ICHIMOKU_CONVERSIONLINE_9, { type: 'price_comparison', buy: 1.01, sell: 0.99 }),
          ichimokuLaggingSpan: createIndicatorResult(coreResults.ICHIMOKU_LAGGINGSPAN_26),
          
          // 成交量加權移動平均線
          vwma20: createIndicatorResult(coreResults.VWMA_20, { type: 'price_comparison', buy: 1.02, sell: 0.98 }),
          
          // 其他技術指標
          rsi14: createIndicatorResult(coreResults.RSI_14, { type: 'rsi', overbought: 70, oversold: 30 }),
          adx14: (() => {
            const adxValue = getLastValue(coreResults.ADX_14);
            const plusDI = getLastValue(coreResults.ADX_14_PLUS_DI);
            const minusDI = getLastValue(coreResults.ADX_14_MINUS_DI);
            
            let signal = 'NEUTRAL';
            if (adxValue !== null) {
              if (adxValue > 25) signal = 'STRONG_TREND';
              else if (adxValue < 20) signal = 'WEAK_TREND';
            }
            
            return {
              value: adxValue !== null ? adxValue.toFixed(2) : null,
              signal: signal,
              plusDI: plusDI !== null ? plusDI.toFixed(2) : null,
              minusDI: minusDI !== null ? minusDI.toFixed(2) : null
            };
          })(),
          macd: (() => {
            const macdValue = getLastValue(coreResults.MACD_12_26_9);
            const signalValue = getLastValue(coreResults.MACD_SIGNAL_9);
            const histValue = getLastValue(coreResults.MACD_HIST);
            
            let signal = 'NEUTRAL';
            if (macdValue !== null && signalValue !== null && histValue !== null) {
              if (macdValue > signalValue && histValue > 0) {
                signal = 'BUY';
              } else if (macdValue < signalValue && histValue < 0) {
                signal = 'SELL';
              }
            }
            
            return {
              value: macdValue !== null ? macdValue.toFixed(2) : null,
              signal: signal,
              signalLine: signalValue !== null ? signalValue.toFixed(2) : null,
              histogram: histValue !== null ? histValue.toFixed(2) : null
            };
          })(),
          
          // 元數據
          lastUpdated: new Date().toISOString(),
          dataPoints: length,
          proxy: `Proxy ${proxyIndex + 1}`,
          source: 'Yahoo Finance API (Fresh) - Core v1.0.0',
          
          // 添加完整序列數據（用於高級分析）
          fullSeries: coreResults,
          
          // 調試信息
          priceRange: {
            min: Math.min(...ohlcv.close.filter(p => !isNaN(p))).toFixed(2),
            max: Math.max(...ohlcv.close.filter(p => !isNaN(p))).toFixed(2),
            latest: getLastValue(ohlcv.close)?.toFixed(2) || 'N/A',
            first: ohlcv.close.find(p => !isNaN(p))?.toFixed(2) || 'N/A'
          }
        };
        
        console.log(`Price data for ${symbol}:`, {
          dataPoints: length,
          priceRange: indicators.priceRange,
          samplePrices: ohlcv.close.slice(-10).filter(p => !isNaN(p)) // 最後 10 個有效價格
        });
        
        console.log(`Calculated indicators for ${symbol}:`, indicators);
        
        // 緩存結果
        this.cache.set(cacheKey, {
          data: indicators,
          timestamp: Date.now()
        });
        
        // 更新成功的代理索引
        this.currentProxyIndex = proxyIndex;
        
        return indicators;
        
      } catch (error) {
        console.warn(`Proxy ${i + 1} failed for ${symbol}:`, error.message);
        
        // 如果是最後一個代理也失敗了，返回錯誤
        if (i === this.corsProxies.length - 1) {
          console.error(`All proxies failed for ${symbol}:`, error);
          
          // 返回錯誤狀態
          return {
            ma5: { value: null, signal: 'N/A' },
            sma5: { value: null, signal: 'N/A' },
            ma10: { value: null, signal: 'N/A' },
            sma10: { value: null, signal: 'N/A' },
            ma30: { value: null, signal: 'N/A' },
            sma30: { value: null, signal: 'N/A' },
            sma50: { value: null, signal: 'N/A' },
            ichimokuBaseLine: { value: null, signal: 'N/A' },
            ichimokuConversionLine: { value: null, signal: 'N/A' },
            ichimokuLaggingSpan: { value: null, signal: 'N/A' },
            vwma20: { value: null, signal: 'N/A' },
            rsi14: { value: null, signal: 'N/A' },
            adx14: { value: null, signal: 'N/A' },
            macd: { value: null, signal: 'N/A' },
            lastUpdated: new Date().toISOString(),
            error: `All proxies failed: ${error.message}`,
            source: 'Error'
          };
        }
      }
    }
  }

  // 清除 API 請求緩存
  clearCache() {
    this.cache.clear();
  }

  // 獲取股票基本信息 (sector, industry, marketCap 等)
  async getStockInfo(symbol) {
    const cacheKey = `info_${symbol}`;
    
    // 檢查緩存 (24小時有效期)
    const longCacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < longCacheTimeout) {
        console.log(`Using cached stock info for ${symbol}`);
        return cached.data;
      }
    }

    // 嘗試多個代理服務獲取股票基本信息
    for (let i = 0; i < this.corsProxies.length; i++) {
      try {
        const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
        const proxy = this.corsProxies[proxyIndex];
        
        console.log(`Fetching stock info for ${symbol} using proxy ${proxyIndex + 1}...`);
        
        // 使用 Yahoo Finance 的 quoteSummary API 獲取詳細信息
        const targetUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryProfile,price,defaultKeyStatistics`;
        const url = `${proxy}${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 檢查數據結構
        if (!data.quoteSummary || !data.quoteSummary.result || data.quoteSummary.result.length === 0) {
          throw new Error('No quoteSummary data available');
        }
        
        const result = data.quoteSummary.result[0];
        const summaryProfile = result.summaryProfile || {};
        const price = result.price || {};
        const keyStats = result.defaultKeyStatistics || {};
        
        // 提取股票基本信息
        const stockInfo = {
          symbol: symbol,
          sector: summaryProfile.sector || 'Unknown',
          industry: summaryProfile.industry || 'Unknown Industry',
          exchange: price.exchangeName || price.exchange || this.getDefaultExchange(symbol),
          marketCap: price.marketCap ? price.marketCap.raw : null,
          marketCapFormatted: price.marketCap ? price.marketCap.fmt : 'N/A',
          currency: price.currency || 'USD',
          country: summaryProfile.country || 'Unknown',
          website: summaryProfile.website || null,
          employees: summaryProfile.fullTimeEmployees || null,
          businessSummary: summaryProfile.longBusinessSummary || null,
          
          // 市值分類
          marketCapCategory: this.getMarketCapCategory(price.marketCap ? price.marketCap.raw : null),
          
          // 元數據
          lastUpdated: new Date().toISOString(),
          source: 'Yahoo Finance API (Live)',
          proxy: `Proxy ${proxyIndex + 1}`,
          confidence: 0.95 // yfinance API 的信心度很高
        };
        
        console.log(`Stock info for ${symbol}:`, stockInfo);
        
        // 緩存結果 (24小時)
        this.cache.set(cacheKey, {
          data: stockInfo,
          timestamp: Date.now()
        });
        
        // 更新成功的代理索引
        this.currentProxyIndex = proxyIndex;
        
        return stockInfo;
        
      } catch (error) {
        console.warn(`Proxy ${i + 1} failed for stock info ${symbol}:`, error.message);
        
        // 如果是最後一個代理也失敗了，返回默認信息
        if (i === this.corsProxies.length - 1) {
          console.error(`All proxies failed for stock info ${symbol}:`, error);
          
          const defaultInfo = {
            symbol: symbol,
            sector: 'Unknown',
            industry: 'Unknown Industry',
            exchange: this.getDefaultExchange(symbol),
            marketCap: null,
            marketCapFormatted: 'N/A',
            currency: 'USD',
            country: 'Unknown',
            website: null,
            employees: null,
            businessSummary: null,
            marketCapCategory: 'unknown',
            lastUpdated: new Date().toISOString(),
            source: 'Default (API Failed)',
            error: `All proxies failed: ${error.message}`,
            confidence: 0.0
          };
          
          // 短期緩存錯誤結果 (1小時)
          this.cache.set(cacheKey, {
            data: defaultInfo,
            timestamp: Date.now()
          });
          
          return defaultInfo;
        }
      }
    }
  }

  // 獲取默認交易所
  getDefaultExchange(symbol) {
    const nasdaqSymbols = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'RKLB', 'ASTS', 'RIVN', 'MDB', 'ONDS', 'PL', 'AVAV', 'CRM', 'AVGO', 'LEU', 'SMR', 'CRWV', 'IONQ', 'PLTR', 'HIMS'];
    const nyseSymbols = ['TSM', 'ORCL', 'RDW'];
    
    if (nasdaqSymbols.includes(symbol)) {
      return 'NASDAQ';
    } else if (nyseSymbols.includes(symbol)) {
      return 'NYSE';
    }
    
    return 'NASDAQ'; // Default
  }

  // 根據市值分類
  getMarketCapCategory(marketCap) {
    if (!marketCap || marketCap <= 0) {
      return 'unknown';
    }
    
    // 市值分類 (美元)
    if (marketCap >= 200000000000) { // >= $200B
      return 'mega_cap';
    } else if (marketCap >= 10000000000) { // >= $10B
      return 'large_cap';
    } else if (marketCap >= 2000000000) { // >= $2B
      return 'mid_cap';
    } else if (marketCap >= 300000000) { // >= $300M
      return 'small_cap';
    } else {
      return 'micro_cap';
    }
  }

  // 清除每日技術指標緩存
  clearDailyCache() {
    technicalIndicatorsCache.clearAllCache();
  }

  // 獲取緩存統計
  getCacheStats() {
    const apiCacheStats = {};
    for (const [key, value] of this.cache.entries()) {
      apiCacheStats[key] = {
        age: Date.now() - value.timestamp,
        expired: Date.now() - value.timestamp > this.cacheTimeout
      };
    }

    return {
      apiCache: apiCacheStats,
      dailyCache: technicalIndicatorsCache.getCacheStats()
    };
  }
}

// 創建單例實例
export const yahooFinanceAPI = new YahooFinanceAPI();
export default yahooFinanceAPI;