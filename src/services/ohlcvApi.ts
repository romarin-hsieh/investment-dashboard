// OHLCV API Service - 優先本地 JSON，DEV 模式可 fallback 到 Yahoo Finance
// 按照最穩架構：Production 只用站內 JSON，避免 CORS proxy 翻車

import { yahooFinanceAPI } from '@/api/yahooFinanceApi';
import { paths } from '../utils/baseUrl';

/**
 * OHLCV payload. Parallel numeric arrays keyed by timestamp; `symbol`,
 * `metadata`, the nested `ohlcv` wrapper and the `timestamp` alias are each
 * optional because the static JSON (public/data/ohlcv/*.json) and the Yahoo
 * fallback populate different subsets. The index signature mirrors
 * `OhlcvResult` and carries the extra keys the raw files sometimes include.
 */
export interface OhlcvData {
  timestamps?: number[];
  timestamp?: number[];
  open?: number[];
  high?: number[];
  low?: number[];
  close?: (number | null)[];
  volume?: number[];
  symbol?: string;
  metadata?: Record<string, unknown>;
  ohlcv?: OhlcvData;
  [key: string]: unknown;
}

/** In-memory cache entry: the payload plus the epoch-ms it was stored. */
interface CacheEntry {
  data: OhlcvData;
  timestamp: number;
}

/** Per-key cache diagnostic returned by `getCacheStats()`. */
interface CacheStatEntry {
  age: number;
  expired: boolean;
}

class OhlcvApi {
  private cache: Map<string, CacheEntry>;
  private cacheTimeout: number;
  private inflightRequests: Map<string, Promise<OhlcvData | null>>;

  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.inflightRequests = new Map(); // Request deduplication
  }

  /**
   * 獲取 OHLCV 數據 - 優先本地 JSON
   * @param symbol - 股票代號
   * @param period - 時間週期 (1d, 1w, 1m)
   * @param range - 數據範圍 (3mo, 6mo, 1y)
   * @returns OHLCV 數據或 null
   */
  async getOhlcv(symbol: string, period: string = '1d', range: string = '3mo'): Promise<OhlcvData | null> {
    const cacheKey = `${symbol}_${period}_${range}`;

    // 檢查記憶體快取
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📊 Using cached OHLCV for ${symbol}`);
        return cached.data;
      }
    }

    // 步驟 1: 優先嘗試本地 JSON（Production 主要路徑）
    try {
      let localData = await this.fetchLocalOhlcv(symbol, period, range);
      if (localData) {
        // Filter data based on range (since local JSON contains full history)
        localData = this.filterDataByRange(localData, range);

        this.cache.set(cacheKey, {
          data: localData,
          timestamp: Date.now()
        });
        console.log(`📊 Loaded local OHLCV for ${symbol}: ${localData.timestamps?.length || 0} points (${range})`);
        return localData;
      }
    } catch (error) {
      console.warn(`📊 Local OHLCV failed for ${symbol}:`, (error as Error).message);
    }

    // 步驟 2: DEV 模式 fallback 到 Yahoo Finance
    if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
      try {
        console.log(`📊 DEV mode: trying Yahoo Finance fallback for ${symbol}`);
        const yahooData = await yahooFinanceAPI.getOhlcv(symbol, period, range);

        if (yahooData && this.validateOhlcvData(yahooData)) {
          this.cache.set(cacheKey, {
            data: yahooData,
            timestamp: Date.now()
          });
          console.log(`📊 Yahoo Finance fallback success for ${symbol}`);
          return yahooData;
        }
      } catch (error) {
        console.warn(`📊 Yahoo Finance fallback failed for ${symbol}:`, (error as Error).message);
      }
    }

    // 步驟 3: 都失敗了，回傳 null（不 throw）
    console.warn(`📊 No OHLCV data available for ${symbol}`);
    return null;
  }

  /**
   * 從本地 JSON 載入 OHLCV 數據
   * @param symbol - 股票代號
   * @param period - 時間週期
   * @param range - 數據範圍
   * @returns 本地 OHLCV 數據
   */
  async fetchLocalOhlcv(symbol: string, period: string, range: string): Promise<OhlcvData | null> {
    // Request Deduplication at FETCH level (per symbol/file)
    // 這樣不同 range 的請求 (e.g. 3mo, 1y) 可以共享同一個 fetch
    const requestId = `fetch_${symbol}`;

    if (this.inflightRequests.has(requestId)) {
      console.log(`⏳ Reusing in-flight request for ${symbol}`);
      return this.inflightRequests.get(requestId)!;
    }

    const fetchPromise = (async (): Promise<OhlcvData | null> => {
      try {
        // 使用統一的 baseUrl helper
        // Sanitize symbol for Windows compatibility (replace : with _)
        const safeSymbol = symbol.replace(/:/g, '_');
        // Use unified Cache Busting: Change every 60 minutes to allow CDN caching
        const timestamp = Math.floor(Date.now() / (60 * 60 * 1000));

        // 優先嘗試 precomputed 格式 (包含 1825 天完整資料)
        // 這是 daily-data-update workflow 產生的檔案格式
        const precomputedUrl = paths.ohlcvPrecomputed(safeSymbol, period, 1825) + '?t=' + timestamp;
        console.log(`🔍 Fetching precomputed OHLCV from: ${precomputedUrl}`);

        let response = await fetch(precomputedUrl);

        // 如果 precomputed 格式不存在，嘗試舊的簡單格式
        if (!response.ok && response.status === 404) {
          const fallbackUrl = paths.ohlcv(safeSymbol) + '?t=' + timestamp;
          console.warn(`🔍 Precomputed not found, trying fallback: ${fallbackUrl}`);
          response = await fetch(fallbackUrl);
        }

        if (!response.ok) {
          // 如果是 404，不視為錯誤，而是回傳 null
          if (response.status === 404) {
            console.warn(`⚠️ Local OHLCV file not found for ${symbol}`);
            return null;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rawJson = (await response.json()) as OhlcvData;

        // Handle { symbol, ohlcv: { ... } } structure
        let data: OhlcvData = rawJson;
        if (rawJson.ohlcv) {
          // console.warn('🔍 Detected nested ohlcv object, unwrapping...');
          data = rawJson.ohlcv;
          // Copy symbol if missing in child
          if (!data.symbol && rawJson.symbol) {
            data.symbol = rawJson.symbol;
          }
        }

        // Handle timestamp vs timestamps mismatch
        if (data.timestamp && !data.timestamps) {
          data.timestamps = data.timestamp;
        }

        if (!this.validateOhlcvData(data)) {
          console.error('Data structure invalid:', Object.keys(data));
          throw new Error('Invalid local OHLCV data structure');
        }

        return {
          ...data,
          metadata: {
            ...data.metadata,
            source: 'Local JSON',
            symbol: symbol,
            period: period,
            range: range,
            loadedAt: new Date().toISOString()
          }
        };

      } finally {
        this.inflightRequests.delete(requestId);
      }
    })();

    this.inflightRequests.set(requestId, fetchPromise);
    return fetchPromise;
  }

  /**
   * 驗證 OHLCV 數據結構
   * @param data - OHLCV 數據
   * @returns 是否有效
   */
  validateOhlcvData(data: unknown): data is OhlcvData {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const rec = data as Record<string, unknown>;
    const requiredFields = ['timestamps', 'open', 'high', 'low', 'close', 'volume'];

    for (const field of requiredFields) {
      if (!Array.isArray(rec[field])) {
        // console.error(`📊 OHLCV validation failed: missing ${field}`);
        return false;
      }
    }

    // 檢查數組長度一致性
    const length = (rec.timestamps as unknown[]).length;
    for (const field of requiredFields) {
      if ((rec[field] as unknown[]).length !== length) {
        console.error(`📊 OHLCV validation failed: ${field} length mismatch`);
        return false;
      }
    }

    // 檢查最小數據點
    if (length < 20) {
      console.error(`📊 OHLCV validation failed: insufficient data (${length} < 20)`);
      return false;
    }

    return true;
  }

  /**
   * 根據時間範圍過濾 OHLCV 數據
   * @param data - 完整 OHLCV 數據
   * @param range - 範圍 (3mo, 6mo, 1y)
   * @returns 過濾後的數據
   */
  filterDataByRange(data: OhlcvData, range: string): OhlcvData {
    if (!data || !data.timestamps || data.timestamps.length === 0) return data;

    // Use the last timestamp in the dataset as "now" to handle historical/stale data correctly
    const lastTimestamp = data.timestamps[data.timestamps.length - 1];
    const cutoffDate = new Date(lastTimestamp);

    switch (range) {
      case '1w':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case '1m':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
      case '3mo':
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        break;
      case '6mo':
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        break;
      case '1y':
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
      case '5y':
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
        break;
      default:
        return data; // 'max' or unknown
    }

    const cutoffTime = cutoffDate.getTime();

    // Find the starting index
    const startIndex = data.timestamps.findIndex(t => t >= cutoffTime);

    if (startIndex === -1 || startIndex === 0) {
      return data;
    }

    // Slice all arrays
    return {
      ...data,
      timestamps: data.timestamps.slice(startIndex),
      open: data.open!.slice(startIndex),
      high: data.high!.slice(startIndex),
      low: data.low!.slice(startIndex),
      close: data.close!.slice(startIndex),
      volume: data.volume!.slice(startIndex)
    };
  }

  /**
   * 檢查本地是否有某個 symbol 的數據
   * @param symbol - 股票代號
   * @returns 是否可用
   */
  async isLocalAvailable(symbol: string): Promise<boolean> {
    try {
      const data = await this.fetchLocalOhlcv(symbol, '1d', '3mo');
      return data !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.cache.clear();
    console.log('📊 OHLCV cache cleared');
  }

  /**
   * 獲取快取統計
   * @returns 快取統計
   */
  getCacheStats(): Record<string, CacheStatEntry> {
    const stats: Record<string, CacheStatEntry> = {};
    for (const [key, value] of this.cache.entries()) {
      stats[key] = {
        age: Date.now() - value.timestamp,
        expired: Date.now() - value.timestamp > this.cacheTimeout
      };
    }
    return stats;
  }
}

// 創建單例
export const ohlcvApi = new OhlcvApi();
export default ohlcvApi;
