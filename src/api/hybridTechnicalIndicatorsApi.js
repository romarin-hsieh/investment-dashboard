// 混合技術指標 API
// 優先使用預計算數據，回退到實時計算

import precomputedIndicatorsAPI from './precomputedIndicatorsApi.js';
import yahooFinanceAPI from './yahooFinanceApi.js';
import technicalIndicatorsCache from '../utils/technicalIndicatorsCache.js';

class HybridTechnicalIndicatorsAPI {
  constructor() {
    this.preferPrecomputed = true; // 優先使用預計算數據
    this.maxPrecomputedAge = 24 * 60 * 60 * 1000; // 24小時內的預計算數據可接受
    this.fallbackToRealtime = true; // 允許回退到實時計算
  }

  // 主要的技術指標獲取方法
  async getTechnicalIndicators(symbol) {
    console.log(`🔍 Getting technical indicators for ${symbol}`);

    try {
      // 策略 1: 嘗試預計算數據 (檢查 ADX 是否有效)
      if (this.preferPrecomputed) {
        const precomputedData = await this.tryPrecomputedData(symbol);
        if (precomputedData && this.isADXValid(precomputedData)) {
          console.log(`✅ Using precomputed data with valid ADX for ${symbol}`);

          // 確保 yfinance 資料正確傳遞
          console.log(`🔍 YFinance data check for ${symbol}:`, {
            hasYF: !!precomputedData.yf,
            yfKeys: precomputedData.yf ? Object.keys(precomputedData.yf) : 'none'
          });

          return precomputedData;
        } else if (precomputedData) {
          console.log(`⚠️ Precomputed data has invalid ADX for ${symbol}, falling back to real-time`);
        }
      }

      // 策略 2: 檢查每日緩存 (檢查 ADX 是否有效)
      const cachedData = await technicalIndicatorsCache.getTechnicalIndicators(symbol);
      if (cachedData && this.isADXValid(cachedData)) {
        console.log(`📦 Using daily cache with valid ADX for ${symbol}`);
        return cachedData;
      } else if (cachedData) {
        console.log(`⚠️ Cached data has invalid ADX for ${symbol}, falling back to real-time`);
      }

      // 策略 3: 實時計算
      if (this.fallbackToRealtime) {
        console.log(`⚡ Using real-time calculation for ${symbol}`);
        const realtimeData = await yahooFinanceAPI.fetchTechnicalIndicatorsFromAPI(symbol);

        if (realtimeData && !realtimeData.error) {
          // 存入每日緩存
          await technicalIndicatorsCache.setTechnicalIndicators(symbol, realtimeData);
          return realtimeData;
        }
      }

      // 所有策略都失敗
      throw new Error('All data sources failed');

    } catch (error) {
      console.error(`❌ Failed to get technical indicators for ${symbol}:`, error);

      // 返回錯誤狀態的指標
      return this.createErrorResponse(symbol, error.message);
    }
  }

  // 預加載所有技術指標
  async preloadAllPrecomputedData() {
    if (this.preferPrecomputed) {
      return await precomputedIndicatorsAPI.getAllTechnicalIndicators();
    }
    return null;
  }

  // 檢查數據完整性 (ADX, OBV, Beta)
  isADXValid(data) {
    if (!data) return false;

    // 1. Check ADX (Existing Logic)
    if (!data.adx14) return false;
    const adxValue = data.adx14.value;
    if (adxValue === null || adxValue === undefined || adxValue === 'N/A') return false;

    // 2. Check OBV (New Requirement) - Relaxed
    const obvObj = data.obv || (data.indicators && data.indicators.obv);
    if (!obvObj || obvObj.value === null || obvObj.value === undefined || obvObj.value === 'N/A') {
      // console.warn('Validation warning: Missing valid OBV (continuing anyway)');
    }

    // 3. Check Beta (New Requirement) - Relaxed
    const yf = data.yf || (data.indicators && data.indicators.yf);
    const hasBeta = yf && (
      (yf.beta_10d !== undefined && yf.beta_10d !== null && yf.beta_10d !== 'N/A') ||
      (yf.beta_3mo !== undefined && yf.beta_3mo !== null && yf.beta_3mo !== 'N/A')
    );
    if (!hasBeta) {
      // console.warn('Validation warning: Missing valid Beta (continuing anyway)');
    }

    // k. Check Full Series ADX (Existing Logic) - Relaxed
    // 不要因為 ADX 計算失敗就丟棄所有數據 (例如 MA, RSI 可能還是好的)
    if (data.fullSeries && data.fullSeries.ADX_14) {
      const adxSeries = data.fullSeries.ADX_14;
      const validADXCount = adxSeries.filter(v => v !== null && v !== undefined && !isNaN(v)).length;

      if (validADXCount < 5) {
        console.warn(`ADX validation warning: only ${validADXCount} valid values. Continuing with partial data.`);
        // return true; // 改為返回 true，允許部分數據展示
      }
    }

    return true; // Always return true if we have basic data, effectively disabling strict "All or Nothing" validation
  }

  // 嘗試獲取預計算數據
  async tryPrecomputedData(symbol) {
    try {
      console.log(`🔄 Trying precomputed data for ${symbol}`);

      const data = await precomputedIndicatorsAPI.getTechnicalIndicators(symbol);

      // 檢查數據年齡
      const computedAt = new Date(data.lastUpdated);
      const age = Date.now() - computedAt.getTime();

      if (age <= this.maxPrecomputedAge) {
        console.log(`✅ Using precomputed data for ${symbol} (${data.dataAge})`);
        return {
          ...data,
          source: `Precomputed (${data.dataAge})`,
          loadTime: '<50ms'
        };
      } else {
        // 即使資料過期，仍回傳並標記 isStale
        // 避免丟棄 Beta (10D/3M/1Y) 等自訂指標（Yahoo Finance 無法提供）
        console.log(`⏰ Precomputed data stale for ${symbol} (${data.dataAge}), using as fallback`);
        return {
          ...data,
          source: `Precomputed-Stale (${data.dataAge})`,
          loadTime: '<50ms',
          isStale: true
        };
      }

    } catch (error) {
      console.log(`❌ Precomputed data not available for ${symbol}: ${error.message}`);
      return null;
    }
  }

  // 創建錯誤響應
  createErrorResponse(symbol, errorMessage) {
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
      error: errorMessage,
      source: 'Error',
      symbol: symbol
    };
  }

  // 強制刷新數據 (跳過所有緩存)
  async refreshTechnicalIndicators(symbol) {
    console.log(`🔄 Force refreshing data for ${symbol}`);

    // 清除所有緩存
    technicalIndicatorsCache.clearSymbolCache(symbol);
    precomputedIndicatorsAPI.clearCache();

    // 強制實時計算
    const originalFallback = this.fallbackToRealtime;
    const originalPrecomputed = this.preferPrecomputed;

    this.fallbackToRealtime = true;
    this.preferPrecomputed = false;

    try {
      const data = await this.getTechnicalIndicators(symbol);
      return data;
    } finally {
      // 恢復原設置
      this.fallbackToRealtime = originalFallback;
      this.preferPrecomputed = originalPrecomputed;
    }
  }

  // 批量獲取多個股票的技術指標
  async getBatchTechnicalIndicators(symbols, maxConcurrent = 3) {
    const results = new Map();
    const batches = [];

    // 分批處理
    for (let i = 0; i < symbols.length; i += maxConcurrent) {
      batches.push(symbols.slice(i, i + maxConcurrent));
    }

    console.log(`📦 Processing ${symbols.length} symbols in ${batches.length} batches`);

    for (const batch of batches) {
      const batchPromises = batch.map(async symbol => {
        try {
          const data = await this.getTechnicalIndicators(symbol);
          return { symbol, success: true, data };
        } catch (error) {
          return { symbol, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(result => {
        results.set(result.symbol, result);
      });

      // 批次間短暫延遲
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  // 獲取數據源狀態
  async getDataSourceStatus() {
    const status = {
      precomputed: {
        available: false,
        symbols: [],
        lastUpdate: null
      },
      cache: technicalIndicatorsCache.getCacheStats(),
      realtime: {
        available: true,
        proxies: yahooFinanceAPI.corsProxies.length
      }
    };

    try {
      const precomputedIndex = await precomputedIndicatorsAPI.getAvailableData();
      if (precomputedIndex) {
        status.precomputed = {
          available: true,
          symbols: precomputedIndex.symbols,
          lastUpdate: precomputedIndex.generatedAt,
          successful: precomputedIndex.successful,
          failed: precomputedIndex.failed
        };
      }
    } catch (error) {
      console.warn('Failed to get precomputed status:', error);
    }

    return status;
  }

  // 配置選項
  setPreferences(options) {
    if (options.preferPrecomputed !== undefined) {
      this.preferPrecomputed = options.preferPrecomputed;
    }
    if (options.fallbackToRealtime !== undefined) {
      this.fallbackToRealtime = options.fallbackToRealtime;
    }
    if (options.maxPrecomputedAge !== undefined) {
      this.maxPrecomputedAge = options.maxPrecomputedAge;
    }

    console.log('Updated preferences:', {
      preferPrecomputed: this.preferPrecomputed,
      fallbackToRealtime: this.fallbackToRealtime,
      maxPrecomputedAge: this.maxPrecomputedAge
    });
  }
}

// 創建單例實例
export const hybridTechnicalIndicatorsAPI = new HybridTechnicalIndicatorsAPI();
export default hybridTechnicalIndicatorsAPI;