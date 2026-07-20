// 從靜態文件讀取預計算的技術指標數據
import { technicalIndicatorsCache, type LatestIndex } from '../utils/technicalIndicatorsCache';
import { getDataBaseUrl } from '../utils/baseUrl';

/** 單一指標序列（可能含 null 空洞）。 */
type Series = (number | null)[];

/**
 * 靜態 JSON 的 `indicators` 區塊。各群組皆為 optional（不同來源欄位不一），
 * 序列型欄位為 `Series`，`market` 內的統計為純量。其餘容器以 index signature 容納。
 */
export interface RawIndicators {
  sma?: { sma5?: Series; sma10?: Series; sma20?: Series; sma30?: Series; sma50?: Series; sma60?: Series } | null;
  ema?: { ema5?: Series; ema10?: Series; ema20?: Series; ema30?: Series; ema50?: Series; ema60?: Series } | null;
  rsi?: { rsi14?: Series } | null;
  adx?: { adx?: Series } | null;
  stoch?: { k?: Series; d?: Series } | null;
  cci?: { cci20?: Series } | null;
  macd?: { macd?: Series; signal?: Series; histogram?: Series } | null;
  ichimoku?: { conversion?: Series; base?: Series; lagging?: Series; spanA?: Series; spanB?: Series } | null;
  vwma?: { vwma?: Series } | null;
  psar?: { sar?: Series } | null;
  supertrend?: { supertrend?: Series } | null;
  obv?: { value?: Series } | null;
  atr?: { atr14?: Series } | null;
  mfi?: { mfi14?: Series } | null;
  cmf?: { cmf20?: Series } | null;
  williamsR?: { r14?: Series } | null;
  beta?: { beta10d?: Series; beta3m?: Series; beta1y?: Series } | null;
  market?: { avgVolume10d?: number | null; avgVolume3m?: number | null; volumeLastDay?: number | null } | null;
  yf?: unknown;
  [key: string]: unknown;
}

/**
 * 單一預計算檔案（`<date>_<SYMBOL>.json`）的最小契約。
 * `indicators` 必填以對應原始碼假設（缺漏時與 .js 相同會在存取時丟出）。
 * `fundamentals` 下只固定 arithmetic 會用到的 `sharesOutstanding` / `currentPrice`，其餘 `unknown`。
 */
export interface PrecomputedFile {
  indicators: RawIndicators;
  fundamentals?: {
    defaultKeyStatistics?: { beta?: unknown; sharesOutstanding?: number | null; [key: string]: unknown } | null;
    price?: { marketCap?: unknown; averageDailyVolume10Day?: unknown; regularMarketVolume?: unknown; [key: string]: unknown } | null;
    summaryDetail?: { marketCap?: unknown; [key: string]: unknown } | null;
    financialData?: { currentPrice?: number | null; [key: string]: unknown } | null;
    quoteType?: { marketCap?: unknown; [key: string]: unknown } | null;
    [key: string]: unknown;
  } | null;
  metadata?: { generated?: unknown; [key: string]: unknown } | null;
  computedAt?: unknown;
  date?: unknown;
  [key: string]: unknown;
}

/**
 * `getTechnicalIndicators` 攤平後的輸出。欄位由靜態 JSON 展開（`...raw`）而來、
 * 形狀寬鬆，故以 index signature 容納；消費端（多為 .js/.vue）不依賴精確型別。
 */
export interface ProcessedIndicators {
  [key: string]: unknown;
}

/** 記憶體快取的紀錄。`data` 形狀因寫入點而異（單檔攤平 / 整批原始），故為 `unknown`。 */
interface CacheRecord {
  data: unknown;
  timestamp: number;
}

class PrecomputedIndicatorsAPI {
  baseUrl: string;
  cache = new Map<string, CacheRecord>();
  cacheTimeout = 60 * 60 * 1000; // 1小時緩存 (技術指標每日更新)

  // 索引緩存 - 避免重複載入 latest_index.json
  indexCache: LatestIndex | null = null;
  indexCacheTimestamp: number | null = null;
  indexCacheTimeout = 10 * 60 * 1000; // 10分鐘緩存索引

  // 正在進行的請求 PromiseMap (用於去重)
  fetchingPromises = new Map<string, Promise<ProcessedIndicators>>();

  constructor() {
    // 更強健的環境檢測和路徑設定
    this.baseUrl = this.getCorrectBaseUrl();

    // 調試日誌
    console.log('PrecomputedIndicatorsAPI initialized:', {
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      baseUrl: this.baseUrl,
      fullUrl: window.location.href
    });
  }

  // 獲取正確的基礎 URL
  getCorrectBaseUrl(): string {
    // 使用統一的 data base helper (可由 VITE_DATA_BASE_URL 覆寫至獨立 data 站台)
    const base = getDataBaseUrl();
    return `${base}data/technical-indicators/`;
  }

  // 獲取今天的日期字符串
  getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  // 獲取緩存的索引數據（避免重複載入）
  async getCachedIndex(): Promise<LatestIndex | null> {
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
  async getTechnicalIndicators(symbolInput: string): Promise<ProcessedIndicators> {
    const symbol = symbolInput.toUpperCase();
    const cacheKey = `precomputed_${symbol}`;

    // 檢查緩存
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < this.cacheTimeout) {
      console.log(`📦 Using precomputed cache for ${symbol}`);
      return cachedEntry.data as ProcessedIndicators;
    }

    // 檢查是否有正在進行的請求 (去重)
    // 檢查是否有正在進行的請求 (去重)
    const inflight = this.fetchingPromises.get(cacheKey);
    if (inflight) {
      console.log(`⏳ [Dedup] Waiting for existing precomputed request for ${symbol}`);
      return inflight;
    }

    try {
      // 創建新的請求 Promise
      const fetchPromise = (async (): Promise<ProcessedIndicators> => {
        // 🚀 性能優化：只有在需要時才載入索引
        // 使用緩存的索引數據，避免每個股票都重複載入
        const index = await this.getCachedIndex();
        let latestDate = this.getTodayString(); // 默認使用今天

        if (index) {
          // 使用索引中的最新日期
          if (typeof index.date === 'string') {
            latestDate = index.date;
          }

          // 檢查該 symbol 是否在可用列表中
          const symbols = index.symbols;
          if (!Array.isArray(symbols) || !symbols.includes(symbol)) {
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

        const data: PrecomputedFile = await response.json();

        // 轉換數據格式以匹配原有 API
        const raw = data.indicators;

        // Helper to get last valid value
        const getLast = (arr?: Series): number | null => {
          if (!arr || arr.length === 0) return null;
          for (let i = arr.length - 1; i >= 0; i--) {
            const v = arr[i];
            if (v !== null && v !== undefined) return v;
          }
          return null;
        };

        // Market Cap 由 sharesOutstanding * currentPrice 推導時所需的兩個純量
        const sharesOutstanding = data.fundamentals?.defaultKeyStatistics?.sharesOutstanding;
        const currentPrice = data.fundamentals?.financialData?.currentPrice;

        // Other fundamentals (grouped under 'yf' for compatibility)
        const yf = {
          beta: data.fundamentals?.defaultKeyStatistics?.beta || 'N/A',
          beta_10d: getLast(raw.beta?.beta10d),
          beta_3mo: getLast(raw.beta?.beta3m),
          beta_1y: getLast(raw.beta?.beta1y),

          // Market Cap with multiple fallbacks
          market_cap: data.fundamentals?.price?.marketCap
            || data.fundamentals?.summaryDetail?.marketCap
            || (sharesOutstanding && currentPrice ? sharesOutstanding * currentPrice : null)
            || data.fundamentals?.quoteType?.marketCap
            || 'N/A',

          // Volume Stats (Calculated from OHLCV in generation script)
          avg_volume_10d: raw.market?.avgVolume10d || data.fundamentals?.price?.averageDailyVolume10Day || 'N/A',
          avg_volume_3m: raw.market?.avgVolume3m || 'N/A',
          volume_last_day: raw.market?.volumeLastDay || data.fundamentals?.price?.regularMarketVolume || 'N/A',

          // Legacy fallbacks if needed (for older files without 'market' object)
          extAvgVol10D: raw.market?.avgVolume10d,
          extVolume: raw.market?.volumeLastDay
        };

        // 轉換數據格式以匹配原有 API
        // Map new hierarchical structure to flat keys expected by UI/Validation
        // Note: UI props 'ma5' usually refer to EMA in modern context if distinct from 'sma5'
        const indicators: ProcessedIndicators = {
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

          yf,
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
          precomputedDate: data.date || (typeof data.metadata?.generated === 'string' ? data.metadata.generated.split('T')[0] : null),
          symbol: symbol
        };

        // 調試：檢查 yfinance 數據
        console.log(`🔍 YFinance data check for ${symbol}:`, {
          hasYFInRaw: !!(data.indicators && data.indicators.yf),
          hasYFInProcessed: !!yf,
          yfKeys: Object.keys(yf),
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
  calculateDataAge(computedAt: unknown): string {
    const now = new Date();
    const computed = new Date(computedAt as string | number | Date);
    const diffMs = now.getTime() - computed.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m ago`;
    } else {
      return `${diffMinutes}m ago`;
    }
  }

  // 獲取可用的預計算數據索引
  async getAvailableData(): Promise<LatestIndex | null> {
    return await this.getCachedIndex();
  }

  // 檢查預計算數據是否可用
  async isPrecomputedDataAvailable(symbol: string): Promise<boolean> {
    try {
      const index = await this.getCachedIndex();
      return !!(index && Array.isArray(index.symbols) && index.symbols.includes(symbol));
    } catch (error) {
      return false;
    }
  }

  // 清除緩存
  clearCache(): void {
    this.cache.clear();
    this.indexCache = null;
    this.indexCacheTimestamp = null;
    console.log('🗑️ Cleared all precomputed caches');
  }

  // 批量獲取所有技術指標 (Load Consolidated File)
  async getAllTechnicalIndicators(): Promise<Record<string, unknown> | null> {
    console.log('📦 Loading consolidated technical indicators (latest_all.json)...');

    // Check cache first
    const cacheKey = 'ALL_INDICATORS';
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < this.cacheTimeout) {
      console.log('📦 Using cached consolidated data');
      return cachedEntry.data as Record<string, unknown>;
    }

    try {
      const timestamp = Math.floor(Date.now() / 60000); // Minute-level cache busting
      const url = `${this.baseUrl}latest_all.json?t=${timestamp}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load latest_all.json (${response.status})`);
      }

      const data: Record<string, unknown> = await response.json();

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
    const stats: {
      size: number;
      indexCached: boolean;
      indexAge: number | null;
      items: Array<{ key: string; age: number; expired: boolean }>;
    } = {
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
