// Yahoo Finance API 整合
// 使用 Yahoo Finance 的公開 API 端點

import technicalIndicatorsCache from '../utils/technicalIndicatorsCache.js';
import { calculateAllIndicators } from '../utils/technicalIndicatorsCore.js';

class YahooFinanceAPI {
  constructor() {
    // 使用多個 CORS 代理服務來解決跨域問題 - 2024年12月修正版
    // 優先使用真正無限制的免費代理服務
    this.corsProxies = [
      // 2. corsproxy.io (目前最穩定)
      'https://corsproxy.io/?',

      // 3. Fallback proxies (如果不穩定可考慮移除)
      'https://cors-anywhere.herokuapp.com/',
    ];
    this.baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 分鐘緩存 (用於 API 請求緩存)
    this.currentProxyIndex = 0; // 從最可靠的免費代理開始

    // 全局請求隊列，限制並發數
    this.requestQueue = [];
    this.activeRequests = 0;
    this.MAX_CONCURRENT_REQUESTS = 2; // 降低並發數以避免 429
    this.REQUEST_DELAY = 800; // 請求間隔 (ms) - 增加延遲以提高穩定性

    // 請求去重 (Request Deduplication)
    this.pendingRequests = new Map();
  }

  // 加入請求隊列
  enqueueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this.processQueue();
    });
  }

  // 處理請求隊列
  async processQueue() {
    if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS || this.requestQueue.length === 0) {
      return;
    }

    this.activeRequests++;
    const { requestFn, resolve, reject } = this.requestQueue.shift();

    try {
      // 執行請求
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeRequests--;
      // 請求間隔延遲，避免瞬間高並發
      setTimeout(() => {
        this.processQueue();
      }, this.REQUEST_DELAY);
    }
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

  // 從 API 獲取技術指標數據 (包裝器) - 增加去重機制
  async fetchTechnicalIndicatorsFromAPI(symbol) {
    const requestKey = `tech_${symbol}`;
    if (this.pendingRequests.has(requestKey)) {
      console.log(`Using pending request for technical indicators: ${symbol}`);
      return this.pendingRequests.get(requestKey);
    }

    const promise = this.enqueueRequest(() => this._fetchTechnicalIndicatorsFromAPIInternal(symbol))
      .finally(() => {
        this.pendingRequests.delete(requestKey);
      });

    this.pendingRequests.set(requestKey, promise);
    return promise;
  }

  // 從 API 獲取技術指標數據 (內部實現)
  async _fetchTechnicalIndicatorsFromAPIInternal(symbol) {
    const cacheKey = `technical_${symbol}`;

    // 檢查緩存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`Using cached data for ${symbol}`);
        return cached.data;
      }
    }

    // Detect environment
    const isNode = typeof window === 'undefined';

    // 嘗試多個代理服務
    for (let i = 0; i < this.corsProxies.length; i++) {
      try {
        // Node optimization: only try once
        if (isNode && i > 0) break;

        let proxyIndex = -1;

        // 構建請求 URL
        const targetUrl = `${this.baseUrl}${symbol}?interval=1d&range=6mo&indicators=quote&includePrePost=false`;
        let url = '';
        const headers = {};

        if (isNode) {
          url = targetUrl;
          headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        } else {
          // Browser environment: Use Proxy
          proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
          const proxy = this.corsProxies[proxyIndex];
          console.log(`Fetching data for ${symbol} using proxy ${proxyIndex + 1}...`);
          url = `${proxy}${encodeURIComponent(targetUrl)}`;
        }

        console.log(`Request URL: ${url}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: isNode ? headers : undefined
        });

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

        // 過濾掉 null 值，保持索引對齊，並確保數據質量
        const length = rawData.close.length;
        const ohlcv = {
          open: new Array(length),
          high: new Array(length),
          low: new Array(length),
          close: new Array(length),
          volume: new Array(length)
        };

        let validDataPoints = 0;
        for (let i = 0; i < length; i++) {
          ohlcv.open[i] = rawData.open[i] !== null ? rawData.open[i] : NaN;
          ohlcv.high[i] = rawData.high[i] !== null ? rawData.high[i] : NaN;
          ohlcv.low[i] = rawData.low[i] !== null ? rawData.low[i] : NaN;
          ohlcv.close[i] = rawData.close[i] !== null ? rawData.close[i] : NaN;
          ohlcv.volume[i] = rawData.volume[i] !== null ? rawData.volume[i] : NaN;

          // 計算有效數據點（OHLC 都不是 NaN）
          if (!isNaN(ohlcv.open[i]) && !isNaN(ohlcv.high[i]) &&
            !isNaN(ohlcv.low[i]) && !isNaN(ohlcv.close[i])) {
            validDataPoints++;
          }
        }

        console.log(`Found ${length} total data points, ${validDataPoints} valid OHLC points for ${symbol}`);

        // ADX 需要至少 28 個有效數據點 (14 * 2)
        if (validDataPoints < 28) {
          console.warn(`⚠️ Insufficient valid data for ADX calculation: ${validDataPoints} < 28`);
        }

        if (length < 50) {
          throw new Error(`Insufficient data points (${length}) for technical analysis`);
        }

        // Fetch Benchmark Data (S&P 500) for Beta Calculation
        let benchmarkClose = null;
        try {
          const benchmarkData = await this.getBenchmarkHistory('6mo'); // Matches approx range
          if (benchmarkData && benchmarkData.close) {
            benchmarkClose = benchmarkData.close;
            // Align Benchmark: Simple slicing if needed, but calculateAllIndicators handles length check
            // Ideally usage aligns by Date, but here we assume recent correlation of similar length arrays
            // If lengths differ significantly, calculation might be skew, but for daily data over 6mo it's close enough for 10D/3M estimate
            // Better approach: Slice benchmark to match length of stock data if benchmark is longer
            if (benchmarkClose.length > length) {
              benchmarkClose = benchmarkClose.slice(benchmarkClose.length - length);
            }
          }
        } catch (err) {
          console.warn(`Failed to load benchmark for ${symbol}:`, err);
        }

        // 使用新的技術指標核心計算所有指標
        const coreResults = calculateAllIndicators(ohlcv, benchmarkClose);

        // 轉換為舊格式以保持兼容性
        const getLastValue = (series) => {
          if (!series || !Array.isArray(series)) {
            console.warn('getLastValue: Invalid series data');
            return null;
          }

          for (let i = series.length - 1; i >= 0; i--) {
            const value = series[i];
            if (value !== null && value !== undefined && !isNaN(value) && isFinite(value)) {
              // console.log(`getLastValue: Found valid value ${value} at index ${i} of ${series.length}`);
              return value;
            }
          }
          // console.warn(`getLastValue: No valid values found in series of length ${series.length}`);
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
            console.log('🔍 Processing ADX results...');
            console.log('ADX_14 series:', coreResults.ADX_14);
            console.log('ADX_14_PLUS_DI series:', coreResults.ADX_14_PLUS_DI);
            console.log('ADX_14_MINUS_DI series:', coreResults.ADX_14_MINUS_DI);

            const adxValue = getLastValue(coreResults.ADX_14);
            const plusDI = getLastValue(coreResults.ADX_14_PLUS_DI);
            const minusDI = getLastValue(coreResults.ADX_14_MINUS_DI);

            console.log('ADX extracted values:', { adxValue, plusDI, minusDI });

            let signal = 'NEUTRAL';
            if (adxValue !== null && !isNaN(adxValue)) {
              if (adxValue > 25) signal = 'STRONG_TREND';
              else if (adxValue < 20) signal = 'WEAK_TREND';
            }

            const result = {
              value: adxValue !== null && !isNaN(adxValue) ? adxValue.toFixed(2) : null,
              signal: signal,
              plusDI: plusDI !== null && !isNaN(plusDI) ? plusDI.toFixed(2) : null,
              minusDI: minusDI !== null && !isNaN(minusDI) ? minusDI.toFixed(2) : null
            };

            console.log('ADX final result:', result);
            return result;
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

          // Parabolic SAR
          parabolicSAR: createIndicatorResult(coreResults.SAR, { type: 'price_comparison', buy: 1.0, sell: 1.0 }), // Simple price crossover

          // Stochastic
          stochK: createIndicatorResult(coreResults.STOCH_K, { type: 'rsi', overbought: 80, oversold: 20 }),
          stochD: createIndicatorResult(coreResults.STOCH_D, { type: 'rsi', overbought: 80, oversold: 20 }),

          // CCI
          cci20: createIndicatorResult(coreResults.CCI_20, { type: 'rsi', overbought: 100, oversold: -100 }),

          // ATR (Value only)
          atr14: createIndicatorResult(coreResults.ATR_14),

          // OBV
          obv: (() => {
            // Find last valid OBV value
            const obvSeries = coreResults.OBV.filter(v => v !== null && v !== undefined && !isNaN(v));
            const obvVal = obvSeries.length > 0 ? obvSeries[obvSeries.length - 1] : null;

            // Get previous valid for signal
            const prevObv = obvSeries.length > 1 ? obvSeries[obvSeries.length - 2] : null;

            let signal = 'NEUTRAL';
            if (obvVal !== null && prevObv !== null) {
              if (obvVal > prevObv) signal = 'BULLISH';
              else if (obvVal < prevObv) signal = 'BEARISH';
            }
            return {
              value: obvVal !== null ? (obvVal / 1000000).toFixed(2) + 'M' : 'N/A', // Format as Millions
              signal: signal
            };
          })(),

          // SuperTrend
          superTrend: createIndicatorResult(coreResults.SUPERTREND_10_3, { type: 'price_comparison', buy: 1.0, sell: 1.0 }),

          // MFI
          mfi14: createIndicatorResult(coreResults.MFI_14, { type: 'rsi', overbought: 80, oversold: 20 }),

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

        // Calculate Volume Change
        const latestVolume = getLastValue(ohlcv.volume);
        const prevVolume = getLastValue(ohlcv.volume.slice(0, -1));
        let volumeChangePct = null;
        if (latestVolume && prevVolume) {
          volumeChangePct = ((latestVolume - prevVolume) / prevVolume) * 100;
        }

        // Calculate Average Volumes
        const calcAvgVol = (days) => {
          const validVols = ohlcv.volume.filter(v => v !== null && !isNaN(v));
          if (validVols.length < days) return null;
          const slice = validVols.slice(-days);
          const sum = slice.reduce((a, b) => a + b, 0);
          return sum / days;
        };

        const avgVol10d = calcAvgVol(10);
        const avgVol3m = calcAvgVol(60); // approx 3 months

        // Add Volume Change and Beta to indicators (compatible with TechnicalIndicators.vue expectation)
        indicators.yf = {
          volume_last_day_pct: volumeChangePct,
          beta_10d: getLastValue(coreResults.BETA_10D)?.toFixed(2) || 'N/A',
          beta_3mo: getLastValue(coreResults.BETA_3M)?.toFixed(2) || 'N/A',
          extAvgVol10D: avgVol10d, // Pre-calculated
          extAvgVol3M: avgVol3m
        };

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
            source: 'Error',
            parabolicSAR: { value: null, signal: 'N/A' },
            stochK: { value: null, signal: 'N/A' },
            stochD: { value: null, signal: 'N/A' },
            cci20: { value: null, signal: 'N/A' },
            atr14: { value: null, signal: 'N/A' },
            obv: { value: null, signal: 'N/A' },
            superTrend: { value: null, signal: 'N/A' },
            mfi14: { value: null, signal: 'N/A' }
          };
        }
      }
    }
  }

  // 清除 API 請求緩存
  clearCache() {
    this.cache.clear();
  }

  // 獲取股票基本信息 (包裝器) - 增加去重機制
  async getStockInfo(symbol) {
    const requestKey = `info_${symbol}`;
    if (this.pendingRequests.has(requestKey)) {
      console.log(`Using pending request for stock info: ${symbol}`);
      return this.pendingRequests.get(requestKey);
    }

    const promise = this.enqueueRequest(() => this._getStockInfoInternal(symbol))
      .finally(() => {
        this.pendingRequests.delete(requestKey);
      });

    this.pendingRequests.set(requestKey, promise);
    return promise;
  }

  // 獲取股票基本信息 (內部實現)
  async _getStockInfoInternal(symbol) {
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

    // 0. 嘗試從靜態數據文件獲取 (Static Data Pipeline)
    try {
      console.log(`Attempting to fetch static data for ${symbol}...`);
      const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
      const staticResponse = await fetch(`${baseUrl}data/fundamentals/${symbol}.json?t=${Date.now()}`);
      if (staticResponse.ok) {
        const staticData = await staticResponse.json();
        console.log(`✅ Loaded static fundamental data for ${symbol}`);

        // Transform the raw static data using the shared logic
        const stockInfo = this._processQuoteSummaryResult(symbol, staticData, 'Static Build', `Static File`);
        stockInfo.isStatic = true;

        // Cache result
        this.cache.set(cacheKey, {
          data: stockInfo,
          timestamp: Date.now()
        });

        return stockInfo;
      } else {
        console.warn(`Static data for ${symbol} not found (HTTP ${staticResponse.status}), falling back to live API...`);
      }
    } catch (staticErr) {
      console.warn(`Failed to fetch static data for ${symbol}:`, staticErr);
    }

    // 嘗試多個代理服務獲取股票基本信息
    for (let i = 0; i < this.corsProxies.length; i++) {
      try {
        const isNode = typeof window === 'undefined';
        if (isNode && i > 0) break;

        let proxyIndex = -1;

        // Modules: summaryProfile, price, defaultKeyStatistics, financialData, earnings, majorHoldersBreakdown, insiderTransactions, institutionOwnership, recommendationTrend
        const modules = [
          'summaryProfile', 'price', 'defaultKeyStatistics',
          'financialData', 'earnings', 'majorHoldersBreakdown',
          'insiderTransactions', 'institutionOwnership', 'recommendationTrend',
          'upgradeDowngradeHistory'
        ].join(',');

        const targetUrl = `https://query1.finance.yahoo.com/v7/finance/quoteSummary/${symbol}?modules=${modules}`;

        let url = '';
        const headers = {};

        if (isNode) {
          // Node environment: Direct fetch with User-Agent
          url = targetUrl;
          headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        } else {
          proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
          const proxy = this.corsProxies[proxyIndex];
          console.log(`Fetching stock info for ${symbol} using proxy ${proxyIndex + 1}...`);
          url = `${proxy}${encodeURIComponent(targetUrl)}`;
        }

        const response = await fetch(url, {
          method: 'GET',
          headers: isNode ? headers : undefined
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
        const proxyInfoStr = isNode ? 'Direct (Node)' : `Proxy ${proxyIndex + 1}`;

        // Use shared transformation logic
        const stockInfo = this._processQuoteSummaryResult(symbol, result, 'Yahoo Finance API (Live)', proxyInfoStr);

        console.log(`Stock info for ${symbol}:`, stockInfo);

        // 緩存結果 (24小時)
        this.cache.set(cacheKey, {
          data: stockInfo,
          timestamp: Date.now()
        });

        // 更新成功的代理索引
        if (!isNode) {
          this.currentProxyIndex = proxyIndex;
        }

        return stockInfo;


      } catch (error) {
        console.warn(`Proxy ${i + 1} failed for stock info ${symbol}:`, error.message);

        // 如果是最後一個代理也失敗了，返回默認信息
        if (i === this.corsProxies.length - 1) {
          console.error(`All proxies failed for stock info ${symbol}:`, error);

          const defaultInfo = this._getFallbackStockInfo(symbol, error.message);

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

  // Helper: Process raw quoteSummary result into app structure
  _processQuoteSummaryResult(symbol, result, source, proxyInfo) {
    const summaryProfile = result.summaryProfile || {};
    const price = result.price || {};
    const keyStats = result.defaultKeyStatistics || {};
    const financialData = result.financialData || {};
    const earnings = result.earnings || {};
    const holders = result.majorHoldersBreakdown || {};
    const insiderTx = result.insiderTransactions || {};
    const institutionOwn = result.institutionOwnership || {};
    const trend = result.recommendationTrend || {};

    // Robust helpers to handle both Raw API ({raw, fmt}) and yahoo-finance2 (value) formats
    const getRaw = (val) => (val && typeof val === 'object' && val.raw !== undefined) ? val.raw : val;
    const getFmt = (val) => (val && typeof val === 'object' && val.fmt !== undefined) ? val.fmt : (val !== null && val !== undefined ? String(val) : null);
    // For percentages, yahoo-finance2 might return 0.12 for 12%, while API fmt returns "12%"
    // We might need to format numbers if fmt is missing but components expect formatted strings?
    // Let's rely on simple string conversion for start, or specific formatting if needed.
    const getPercentFmt = (val) => {
      if (val && typeof val === 'object' && val.fmt) return val.fmt;
      if (typeof val === 'number') return (val * 100).toFixed(2) + '%';
      return val || '0%';
    };

    // Helper to create the { raw, fmt } structure expected by the component
    const createFmt = (val, formatter) => {
      if (val && typeof val === 'object' && val.fmt) return val; // Already in correct format
      return {
        raw: val,
        fmt: val !== null && val !== undefined ? formatter(val) : 'N/A'
      };
    };

    // DEBUG: Trace missing data
    console.log(`[YF_API] Processing ${symbol} from ${source}`);
    console.log(`[YF_API] AvgVol10D (price):`, price.averageDailyVolume10Day);
    console.log(`[YF_API] Upgrades (history present?):`, !!(result.upgradeDowngradeHistory && result.upgradeDowngradeHistory.history));

    return {
      symbol: symbol,
      sector: summaryProfile.sector || 'Unknown',
      industry: summaryProfile.industry || 'Unknown Industry',
      exchange: price.exchangeName || price.exchange || this.getDefaultExchange(symbol),
      marketCap: getRaw(price.marketCap),
      marketCapFormatted: getFmt(price.marketCap) || 'N/A',
      currency: price.currency || 'USD',
      country: summaryProfile.country || 'Unknown',
      website: summaryProfile.website || null,
      employees: summaryProfile.fullTimeEmployees || null,
      businessSummary: summaryProfile.longBusinessSummary || null,

      // Volume & Price Stats
      volume: createFmt(price.regularMarketVolume, v => Number(v).toLocaleString()),
      averageVolume: createFmt(price.averageDailyVolume10Day || price.averageDailyVolume3Month, v => Number(v).toLocaleString()),
      averageDailyVolume10Day: getRaw(price.averageDailyVolume10Day),
      averageDailyVolume3Month: getRaw(price.averageDailyVolume3Month),
      beta: getFmt(keyStats.beta) || 'N/A', // Expose beta at top level for easier access

      financials: {
        targetPrice: getRaw(financialData.targetMeanPrice),
        targetLowPrice: getRaw(financialData.targetLowPrice),
        targetHighPrice: getRaw(financialData.targetHighPrice),
        targetMeanPrice: getRaw(financialData.targetMeanPrice),
        targetMedianPrice: getRaw(financialData.targetMedianPrice),
        currentPrice: getRaw(financialData.currentPrice),
        recommendationKey: financialData.recommendationKey || 'N/A',
        revenueGrowth: getPercentFmt(financialData.revenueGrowth),
        profitMargin: getPercentFmt(financialData.profitMargins),
        forwardPE: getFmt(keyStats.forwardPE),
        beta: getFmt(keyStats.beta),
        totalRevenue: getFmt(financialData.totalRevenue),
        ebitda: getFmt(financialData.ebitda),
        // Add Market Change Percent for Market Cap visualization
        regularMarketChangePercent: getRaw(price.regularMarketChangePercent)
      },

      earnings: {
        history: (earnings.earningsChart && earnings.earningsChart.quarterly) ? earnings.earningsChart.quarterly.map(item => ({
          date: item.date,
          actual: createFmt(item.actual, v => v.toFixed(2)),
          estimate: createFmt(item.estimate, v => v.toFixed(2))
        })) : [],
        financialsChart: (earnings.financialsChart && earnings.financialsChart.yearly) ? earnings.financialsChart.yearly.map(item => ({
          date: item.date, // Year (number)
          revenue: createFmt(item.revenue, v => Number(v) >= 1e9 ? (Number(v) / 1e9).toFixed(1) + 'B' : Number(v).toLocaleString()),
          earnings: createFmt(item.earnings, v => Number(v) >= 1e9 ? (Number(v) / 1e9).toFixed(1) + 'B' : Number(v).toLocaleString())
        })) : []
      },

      holders: {
        insidersPercent: getPercentFmt(holders.insidersPercentHeld),
        institutionsPercent: getPercentFmt(holders.institutionsPercentHeld),
        institutionsCount: institutionOwn.ownershipList ? institutionOwn.ownershipList.length : 0,
        topInstitutions: (institutionOwn.ownershipList || []).map(holder => {
          return {
            organization: holder.organization,
            position: createFmt(holder.position, v => Number(v).toLocaleString()),
            reportDate: createFmt(holder.reportDate, v => new Date(v).toLocaleDateString()),
            pctHeld: createFmt(holder.pctHeld, v => (Number(v) * 100).toFixed(2) + '%'),
            value: createFmt(holder.value, v => Number(v).toLocaleString())
          };
        })
      },

      insiderTransactions: (insiderTx.transactions || []).map(tx => ({
        filerName: tx.filerName,
        transactionText: tx.transactionText,
        moneyText: tx.moneyText,
        ownership: tx.ownership,
        startDate: createFmt(tx.startDate, v => new Date(v).toLocaleDateString()),
        startEpoch: tx.startEpoch,
        shares: createFmt(tx.shares, v => Number(v).toLocaleString()),
        value: createFmt(tx.value, v => Number(v).toLocaleString()),
        filerRelation: tx.filerRelation,
        filerUrl: tx.filerUrl,
        transactionPrice: createFmt(tx.value && tx.shares ? tx.value / tx.shares : 0, v => v.toFixed(2))
      })),
      recommendationTrend: trend.trend || [],
      upgradesDowngrades: (result.upgradeDowngradeHistory && result.upgradeDowngradeHistory.history) ? result.upgradeDowngradeHistory.history.slice(0, 50) : [],
      marketCapCategory: this.getMarketCapCategory(getRaw(price.marketCap)),

      lastUpdated: result.lastUpdated || new Date().toISOString(),
      source: source,
      proxy: proxyInfo,
      confidence: 0.95
    };
  }

  // Helper: Get Fallback Info
  _getFallbackStockInfo(symbol, errorMessage) {
    return {
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

      financials: {},
      earnings: { history: [], financialsChart: [] },
      holders: { topInstitutions: [], insidersPercent: 'N/A', institutionsPercent: 'N/A' },
      insiderTransactions: [],
      recommendationTrend: [],

      lastUpdated: new Date().toISOString(),
      source: 'Default (API Failed)',
      error: `All proxies failed: ${errorMessage}`,
      confidence: 0.0
    };
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

  // Build proxy URL for Yahoo Finance API requests
  buildProxyUrl(targetUrl) {
    const proxy = this.corsProxies[this.currentProxyIndex];
    return `${proxy}${encodeURIComponent(targetUrl)}`;
  }

  // Get Benchmark (SPY) OHLCV for Beta calculation
  async getBenchmarkHistory(range = '6mo') {
    const symbol = '^GSPC'; // S&P 500
    const cacheKey = `ohlcv_${symbol}_1d_${range}`;

    // Check cache (Longer timeout for benchmark)
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 12 * 60 * 60 * 1000) { // 12 hours
        return cached.data;
      }
    }

    try {
      // Reuse _getOhlcvInternal
      const data = await this._getOhlcvInternal(symbol, '1d', range);
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (e) {
      console.warn('Failed to fetch benchmark history:', e);
      return null;
    }
  }



  // Get OHLCV data for MFI Volume Profile calculations (Wrapper) - 增加去重機制
  async getOhlcv(symbol, period = '1d', range = '3mo') {
    const requestKey = `ohlcv_${symbol}_${period}_${range}`;
    if (this.pendingRequests.has(requestKey)) {
      console.log(`Using pending request for OHLCV: ${requestKey}`);
      return this.pendingRequests.get(requestKey);
    }

    const promise = this.enqueueRequest(() => this._getOhlcvInternal(symbol, period, range))
      .finally(() => {
        this.pendingRequests.delete(requestKey);
      });

    this.pendingRequests.set(requestKey, promise);
    return promise;
  }

  // Get OHLCV data (Internal Implementation)
  async _getOhlcvInternal(symbol, period = '1d', range = '3mo') {
    const cacheKey = `ohlcv_${symbol}_${period}_${range}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📊 Using cached OHLCV data for ${symbol}`);
        return cached.data;
      }
    }

    // Try multiple proxies for OHLCV data
    for (let i = 0; i < this.corsProxies.length; i++) {
      try {
        const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
        const proxy = this.corsProxies[proxyIndex];

        console.log(`📊 Fetching OHLCV data for ${symbol} using proxy ${proxyIndex + 1}...`);

        // Build Yahoo Finance chart API URL
        const targetUrl = `${this.baseUrl}${symbol}?interval=${period}&range=${range}&indicators=quote&includePrePost=false`;
        const url = this.buildProxyUrl(targetUrl);

        const response = await fetch(url, {
          method: 'GET'
          // 移除 headers 避免 CORS preflight
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Validate data structure
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
          throw new Error('No chart data available');
        }

        const result = data.chart.result[0];

        if (!result.indicators || !result.indicators.quote || !result.indicators.quote[0]) {
          throw new Error('Invalid data structure - missing indicators');
        }

        const quotes = result.indicators.quote[0];
        const timestamps = result.timestamp || [];

        // Extract and clean OHLCV data
        const ohlcv = {
          timestamps: timestamps,
          open: quotes.open || [],
          high: quotes.high || [],
          low: quotes.low || [],
          close: quotes.close || [],
          volume: quotes.volume || []
        };

        // Validate data quality
        const length = ohlcv.timestamps.length;
        if (length < 14) {
          throw new Error(`Insufficient OHLCV data points: ${length} < 14`);
        }

        // Count valid data points
        let validPoints = 0;
        for (let j = 0; j < length; j++) {
          if (ohlcv.open[j] != null && ohlcv.high[j] != null &&
            ohlcv.low[j] != null && ohlcv.close[j] != null &&
            ohlcv.volume[j] != null) {
            validPoints++;
          }
        }

        console.log(`📊 OHLCV data for ${symbol}: ${length} total points, ${validPoints} valid points`);

        if (validPoints < 15) {
          throw new Error(`Insufficient valid OHLCV data: ${validPoints} < 15`);
        }

        // Add metadata
        const ohlcvResult = {
          ...ohlcv,
          metadata: {
            symbol: symbol,
            period: period,
            range: range,
            totalPoints: length,
            validPoints: validPoints,
            fetchedAt: new Date().toISOString(),
            source: 'Yahoo Finance API',
            proxy: `Proxy ${proxyIndex + 1}`
          }
        };

        // Cache the result
        this.cache.set(cacheKey, {
          data: ohlcvResult,
          timestamp: Date.now()
        });

        // Update successful proxy index
        this.currentProxyIndex = proxyIndex;

        return ohlcvResult;

      } catch (error) {
        console.warn(`📊 Proxy ${i + 1} failed for OHLCV ${symbol}:`, error.message);

        // If all proxies failed, throw error
        if (i === this.corsProxies.length - 1) {
          console.error(`📊 All proxies failed for OHLCV ${symbol}:`, error);
          throw new Error(`Failed to fetch OHLCV data: ${error.message}`);
        }
      }
    }
  }
}

// 創建單例實例
export const yahooFinanceAPI = new YahooFinanceAPI();
export default yahooFinanceAPI;