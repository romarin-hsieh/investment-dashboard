// 從靜態文件讀取預計算的技術指標數據
import { technicalIndicatorsCache } from '../utils/technicalIndicatorsCache.js';
import { getDataBaseUrl } from '../utils/baseUrl';

class PrecomputedIndicatorsAPI {
  constructor() {
    // 更強健的環境檢測和路徑設定
    this.baseUrl = this.getCorrectBaseUrl();
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1小時緩存 (技術指標每日更新)

    // 索引緩存 - 避免重複載入 latest_index.json
    this.indexCache = null;
    this.indexCacheTimestamp = null;
    this.indexCacheTimeout = 10 * 60 * 1000; // 10分鐘緩存索引

    // 調試日誌
    console.log('PrecomputedIndicatorsAPI initialized:', {
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      baseUrl: this.baseUrl,
      fullUrl: window.location.href
    });

    // 正在進行的請求 PromiseMap (用於去重)
    this.fetchingPromises = new Map();
  }

  // 獲取正確的基礎 URL
  getCorrectBaseUrl() {
    // 使用統一的 data base helper (可由 VITE_DATA_BASE_URL 覆寫至獨立 data 站台)
    const base = getDataBaseUrl();
    return `${base}data/technical-indicators/`;
  }

  // 獲取今天的日期字符串
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  // 獲取緩存的索引數據（避免重複載入）
  async getCachedIndex() {
    // 委託給 technicalIndicatorsCache 處理，確保全局單例和去重
    try {
      const index = await technicalIndicatorsCache.getLatestIndex();

      if (index) {
        // 同步本地簡易緩存
        this.indexCache = index;
        this.indexCacheTimestamp = technicalIndicatorsCache.indexCacheTimestamp;

        console.log(`📦 Using cached index data (via TechnicalIndicatorsCache)`);
        return index;
      }

      console.warn('⚠️ latest_index.json not found via cache service');
      return null;

    } catch (error) {
      console.error('❌ Failed to load latest_index.json:', error);
      return null;
    }
  }

  // 獲取預計算的技術指標數據
  async getTechnicalIndicators(symbolInput) {
    const symbol = symbolInput.toUpperCase();
    const cacheKey = `precomputed_${symbol}`;

    // 檢查緩存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📦 Using precomputed cache for ${symbol}`);
        return cached.data;
      }
    }

    // 檢查是否有正在進行的請求 (去重)
    // 檢查是否有正在進行的請求 (去重)
    if (this.fetchingPromises.has(cacheKey)) {
      console.log(`⏳ [Dedup] Waiting for existing precomputed request for ${symbol}`);
      return this.fetchingPromises.get(cacheKey);
    }

    try {
      // 創建新的請求 Promise
      const fetchPromise = (async () => {
        // 🚀 性能優化：只有在需要時才載入索引
        // 使用緩存的索引數據，避免每個股票都重複載入
        const index = await this.getCachedIndex();
        let latestDate = this.getTodayString(); // 默認使用今天

        if (index) {
          latestDate = index.date; // 使用索引中的最新日期

          // 檢查該 symbol 是否在可用列表中
          if (!index.symbols.includes(symbol)) {
            throw new Error(`Symbol ${symbol} not found in precomputed data`);
          }
        }

        // 使用最新日期構建 URL - 只載入當前股票的數據
        // Add Minute-based Cache Busting
        const timestamp = Math.floor(Date.now() / 60000);
        const dataUrl = `${this.baseUrl}${latestDate}_${symbol}.json?t=${timestamp}`;

        console.log(`🔍 Fetching precomputed data for ${symbol} from ${dataUrl}`);

        const response = await fetch(dataUrl);

        if (!response.ok) {
          throw new Error(`Precomputed data not found for ${symbol} (${response.status})`);
        }

        const data = await response.json();

        // 轉換數據格式以匹配原有 API
        const raw = data.indicators;

        // Helper to get last valid value
        const getLast = (arr) => {
          if (!arr || arr.length === 0) return null;
          for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i] !== null && arr[i] !== undefined) return arr[i];
          }
          return null;
        };

        // 轉換數據格式以匹配原有 API
        // Map new hierarchical structure to flat keys expected by UI/Validation
        // Note: UI props 'ma5' usually refer to EMA in modern context if distinct from 'sma5'
        const indicators = {
          ...raw,
          // SMA
          sma5: { value: getLast(raw.sma?.sma5), signal: 'N/A' },
          sma10: { value: getLast(raw.sma?.sma10), signal: 'N/A' },
          sma20: { value: getLast(raw.sma?.sma20), signal: 'N/A' },
          sma30: { value: getLast(raw.sma?.sma30), signal: 'N/A' },
          sma50: { value: getLast(raw.sma?.sma50), signal: 'N/A' },
          sma60: { value: getLast(raw.sma?.sma60), signal: 'N/A' },

          // EMA (Mapped to 'ma' or 'ema' keys as per UI requirement)
          // UI uses 'ma5', 'ma10', 'ma30' for EMA
          ma5: { value: getLast(raw.ema?.ema5), signal: 'N/A' },
          ma10: { value: getLast(raw.ema?.ema10), signal: 'N/A' },
          ema20: { value: getLast(raw.ema?.ema20), signal: 'N/A' }, // UI uses 'ema20' explicitly?
          ma30: { value: getLast(raw.ema?.ema30), signal: 'N/A' },
          ma50: { value: getLast(raw.ema?.ema50), signal: 'N/A' },
          ma60: { value: getLast(raw.ema?.ema60), signal: 'N/A' },

          // Oscillators
          rsi14: { value: getLast(raw.rsi?.rsi14), signal: 'N/A' },
          adx14: { value: getLast(raw.adx?.adx), signal: 'N/A' },
          stochK: { value: getLast(raw.stoch?.k), signal: 'N/A' },
          stochD: { value: getLast(raw.stoch?.d), signal: 'N/A' },
          cci20: { value: getLast(raw.cci?.cci20), signal: 'N/A' },

          macd: {
            value: getLast(raw.macd?.macd),
            signal: getLast(raw.macd?.signal),
            histogram: getLast(raw.macd?.histogram)
          },

          // Ichimoku
          ichimokuConversionLine: { value: getLast(raw.ichimoku?.conversion), signal: 'N/A' },
          ichimokuBaseLine: { value: getLast(raw.ichimoku?.base), signal: 'N/A' },
          ichimokuLaggingSpan: { value: getLast(raw.ichimoku?.lagging), signal: 'N/A' },
          ichimokuLeadingSpanA: { value: getLast(raw.ichimoku?.spanA), signal: 'N/A' },
          ichimokuLeadingSpanB: { value: getLast(raw.ichimoku?.spanB), signal: 'N/A' },

          // Other Trends
          vwma20: { value: getLast(raw.vwma?.vwma), signal: 'N/A' },
          parabolicSAR: { value: getLast(raw.psar?.sar), signal: 'N/A' }, // Mapped from psar.sar
          superTrend: { value: getLast(raw.supertrend?.supertrend), signal: 'N/A' },

          // Market
          obv: { value: getLast(raw.obv?.value), signal: 'N/A' }, // Mapped from obv.value
          atr14: { value: getLast(raw.atr?.atr14), signal: 'N/A' },
          mfi14: { value: getLast(raw.mfi?.mfi14), signal: 'N/A' },
          cmf20: { value: getLast(raw.cmf?.cmf20), signal: 'N/A' },
          willr14: { value: getLast(raw.williamsR?.r14), signal: 'N/A' },

          // Other fundamentals (grouped under 'yf' for compatibility)
          yf: {
            beta: data.fundamentals?.defaultKeyStatistics?.beta || 'N/A',
            beta_10d: getLast(raw.beta?.beta10d),
            beta_3mo: getLast(raw.beta?.beta3m),
            beta_1y: getLast(raw.beta?.beta1y),

            // Market Cap with multiple fallbacks
            market_cap: data.fundamentals?.price?.marketCap
              || data.fundamentals?.summaryDetail?.marketCap
              || (data.fundamentals?.defaultKeyStatistics?.sharesOutstanding && data.fundamentals?.financialData?.currentPrice ? data.fundamentals.defaultKeyStatistics.sharesOutstanding * data.fundamentals.financialData.currentPrice : null)
              || data.fundamentals?.quoteType?.marketCap
              || 'N/A',

            // Volume Stats (Calculated from OHLCV in generation script)
            avg_volume_10d: raw.market?.avgVolume10d || data.fundamentals?.price?.averageDailyVolume10Day || 'N/A',
            avg_volume_3m: raw.market?.avgVolume3m || 'N/A',
            volume_last_day: raw.market?.volumeLastDay || data.fundamentals?.price?.regularMarketVolume || 'N/A',

            // Legacy fallbacks if needed (for older files without 'market' object)
            extAvgVol10D: raw.market?.avgVolume10d,
            extVolume: raw.market?.volumeLastDay
          },
          beta: { value: data.fundamentals?.defaultKeyStatistics?.beta || 'N/A', signal: 'N/A' },

          // Full Series for Charts (Mapping to Expected Keys)
          fullSeries: {
            SMA_5: raw.sma?.sma5 || [],
            SMA_10: raw.sma?.sma10 || [],
            SMA_30: raw.sma?.sma30 || [],
            SMA_50: raw.sma?.sma50 || [],

            EMA_5: raw.ema?.ema5 || [],
            EMA_10: raw.ema?.ema10 || [],
            EMA_20: raw.ema?.ema20 || [],
            EMA_30: raw.ema?.ema30 || [],

            RSI_14: raw.rsi?.rsi14 || [],
            ADX_14: raw.adx?.adx || [],
            MACD: raw.macd?.macd || [],
            MACD_Signal: raw.macd?.signal || [],
            MACD_Hist: raw.macd?.histogram || [],

            OBV: raw.obv?.value || [],
            ATR_14: raw.atr?.atr14 || [],
            MFI_14: raw.mfi?.mfi14 || [],
            CCI_20: raw.cci?.cci20 || [],
            SAR: raw.psar?.sar || [],
            SUPERTREND: raw.supertrend?.supertrend || [],
            CMF_20: raw.cmf?.cmf20 || [],
            WILLR_14: raw.williamsR?.r14 || [],
            VWMA_20: raw.vwma?.vwma || [],

            // New: Stoch and Ichimoku for % change
            STOCH_K: raw.stoch?.k || [],
            STOCH_D: raw.stoch?.d || [],
            ICHIMOKU_CONVERSIONLINE_9: raw.ichimoku?.conversion || [],
            ICHIMOKU_BASELINE_26: raw.ichimoku?.base || [],
            ICHIMOKU_LAGGINGSPAN_26: raw.ichimoku?.lagging || []
          },

          source: 'Precomputed',
          lastUpdated: data.metadata?.generated || data.computedAt || new Date().toISOString(),
          dataAge: this.calculateDataAge(data.metadata?.generated || data.computedAt),
          precomputedDate: data.date || (data.metadata?.generated ? data.metadata.generated.split('T')[0] : null),
          symbol: symbol
        };

        // 調試：檢查 yfinance 數據
        console.log(`🔍 YFinance data check for ${symbol}:`, {
          hasYFInRaw: !!(data.indicators && data.indicators.yf),
          hasYFInProcessed: !!indicators.yf,
          yfKeys: indicators.yf ? Object.keys(indicators.yf) : 'none',
          rawYF: data.indicators?.yf
        });

        // 緩存結果
        this.cache.set(cacheKey, {
          data: indicators,
          timestamp: Date.now()
        });

        console.log(`✅ Loaded precomputed data for ${symbol} (date: ${latestDate}, age: ${indicators.dataAge})`);
        return indicators;
      })();

      // 存儲 Promise 以供後續請求複用
      this.fetchingPromises.set(cacheKey, fetchPromise);

      // 等待請求完成
      const result = await fetchPromise;
      return result;

    } catch (error) {
      console.error(`❌ Failed to load precomputed data for ${symbol}:`, error);
      throw error;
    } finally {
      // 請求完成後（無論成功或失敗），清除 Promise
      this.fetchingPromises.delete(cacheKey);
    }
  }

  // 計算數據年齡
  calculateDataAge(computedAt) {
    const now = new Date();
    const computed = new Date(computedAt);
    const diffMs = now - computed;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m ago`;
    } else {
      return `${diffMinutes}m ago`;
    }
  }

  // 獲取可用的預計算數據索引
  async getAvailableData() {
    return await this.getCachedIndex();
  }

  // 檢查預計算數據是否可用
  async isPrecomputedDataAvailable(symbol) {
    try {
      const index = await this.getCachedIndex();
      return index && index.symbols.includes(symbol);
    } catch (error) {
      return false;
    }
  }

  // 清除緩存
  clearCache() {
    this.cache.clear();
    this.indexCache = null;
    this.indexCacheTimestamp = null;
    console.log('🗑️ Cleared all precomputed caches');
  }

  // 批量獲取所有技術指標 (Load Consolidated File)
  async getAllTechnicalIndicators() {
    console.log('📦 Loading consolidated technical indicators (latest_all.json)...');

    // Check cache first
    const cacheKey = 'ALL_INDICATORS';
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📦 Using cached consolidated data');
        return cached.data;
      }
    }

    try {
      const timestamp = Math.floor(Date.now() / 60000); // Minute-level cache busting
      const url = `${this.baseUrl}latest_all.json?t=${timestamp}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load latest_all.json (${response.status})`);
      }

      const data = await response.json();

      // Cache the bulk data
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      // Also populate individual symbol cache to avoid re-fetching if requested individually later
      Object.entries(data).forEach(([symbol, indicatorData]) => {
        this.cache.set(`precomputed_${symbol}`, {
          data: indicatorData,
          timestamp: Date.now()
        });
      });

      console.log(`✅ Loaded consolidated indicators for ${Object.keys(data).length} symbols`);
      return data;
    } catch (error) {
      console.warn('⚠️ Failed to load consolidated indicators:', error);
      return null;
    }
  }

  // 獲取緩存統計
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      indexCached: !!this.indexCache,
      indexAge: this.indexCacheTimestamp ? Date.now() - this.indexCacheTimestamp : null,
      items: []
    };

    for (const [key, value] of this.cache.entries()) {
      stats.items.push({
        key,
        age: Date.now() - value.timestamp,
        expired: Date.now() - value.timestamp > this.cacheTimeout
      });
    }

    return stats;
  }
}

// 創建單例實例
export const precomputedIndicatorsAPI = new PrecomputedIndicatorsAPI();
export default precomputedIndicatorsAPI;