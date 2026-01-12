// OHLCV API Service - 優先本地 JSON，DEV 模式可 fallback 到 Yahoo Finance
// 按照最穩架構：Production 只用站內 JSON，避免 CORS proxy 翻車

import { yahooFinanceAPI } from '@/api/yahooFinanceApi.js';
import { paths } from '../utils/baseUrl.js';

class OhlcvApi {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.inflightRequests = new Map(); // Request deduplication
  }

  /**
   * 獲取 OHLCV 數據 - 優先本地 JSON
   * @param {string} symbol - 股票代號
   * @param {string} period - 時間週期 (1d, 1w, 1m)
   * @param {string} range - 數據範圍 (3mo, 6mo, 1y)
   * @returns {Promise<Object|null>} OHLCV 數據或 null
   */
  async getOhlcv(symbol, period = '1d', range = '3mo') {
    const cacheKey = `${symbol}_${period}_${range}`;

    // 檢查記憶體快取
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
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
      console.warn(`📊 Local OHLCV failed for ${symbol}:`, error.message);
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
        console.warn(`📊 Yahoo Finance fallback failed for ${symbol}:`, error.message);
      }
    }

    // 步驟 3: 都失敗了，回傳 null（不 throw）
    console.warn(`📊 No OHLCV data available for ${symbol}`);
    return null;
  }

  /**
   * 從本地 JSON 載入 OHLCV 數據
   * @param {string} symbol - 股票代號
   * @param {string} period - 時間週期
   * @param {string} range - 數據範圍
   * @returns {Promise<Object|null>} 本地 OHLCV 數據
   */
  async fetchLocalOhlcv(symbol, period, range) {
    // Request Deduplication at FETCH level (per symbol/file)
    // 這樣不同 range 的請求 (e.g. 3mo, 1y) 可以共享同一個 fetch
    const requestId = `fetch_${symbol}`;

    if (this.inflightRequests.has(requestId)) {
      console.log(`⏳ Reusing in-flight request for ${symbol}`);
      return this.inflightRequests.get(requestId);
    }

    const fetchPromise = (async () => {
      try {
        // 使用統一的 baseUrl helper
        // Sanitize symbol for Windows compatibility (replace : with _)
        const safeSymbol = symbol.replace(/:/g, '_');
        // Use unified Cache Busting: Change every 60 seconds to allow basic CDN caching but prevent stale data
        const timestamp = Math.floor(Date.now() / 60000);
        const url = paths.ohlcv(safeSymbol) + '?t=' + timestamp;
        console.warn(`🔍 Fetching local OHLCV from: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
          // 如果是 404，不視為錯誤，而是回傳 null
          if (response.status === 404) {
            console.warn(`⚠️ Local OHLCV file not found for ${symbol}`);
            return null;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rawJson = await response.json();

        // Handle { symbol, ohlcv: { ... } } structure
        let data = rawJson;
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
   * @param {Object} data - OHLCV 數據
   * @returns {boolean} 是否有效
   */
  validateOhlcvData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const requiredFields = ['timestamps', 'open', 'high', 'low', 'close', 'volume'];

    for (const field of requiredFields) {
      if (!Array.isArray(data[field])) {
        // console.error(`📊 OHLCV validation failed: missing ${field}`);
        return false;
      }
    }

    // 檢查數組長度一致性
    const length = data.timestamps.length;
    for (const field of requiredFields) {
      if (data[field].length !== length) {
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
   * @param {Object} data - 完整 OHLCV 數據
   * @param {string} range - 範圍 (3mo, 6mo, 1y)
   * @returns {Object} 過濾後的數據
   */
  filterDataByRange(data, range) {
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
      open: data.open.slice(startIndex),
      high: data.high.slice(startIndex),
      low: data.low.slice(startIndex),
      close: data.close.slice(startIndex),
      volume: data.volume.slice(startIndex)
    };
  }

  /**
   * 檢查本地是否有某個 symbol 的數據
   * @param {string} symbol - 股票代號
   * @returns {Promise<boolean>} 是否可用
   */
  async isLocalAvailable(symbol) {
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
  clearCache() {
    this.cache.clear();
    console.log('📊 OHLCV cache cleared');
  }

  /**
   * 獲取快取統計
   * @returns {Object} 快取統計
   */
  getCacheStats() {
    const stats = {};
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