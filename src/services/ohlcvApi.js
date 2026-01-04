// OHLCV API Service - 優先本地 JSON，DEV 模式可 fallback 到 Yahoo Finance
// 按照最穩架構：Production 只用站內 JSON，避免 CORS proxy 翻車

import { yahooFinanceAPI } from '@/api/yahooFinanceApi.js';
import { paths } from '../utils/baseUrl.js';

class OhlcvApi {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
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
      const localData = await this.fetchLocalOhlcv(symbol, period, range);
      if (localData) {
        this.cache.set(cacheKey, {
          data: localData,
          timestamp: Date.now()
        });
        console.log(`📊 Loaded local OHLCV for ${symbol}: ${localData.timestamps?.length || 0} points`);
        return localData;
      }
    } catch (error) {
      console.warn(`📊 Local OHLCV failed for ${symbol}:`, error.message);
    }

    // 步驟 2: DEV 模式 fallback 到 Yahoo Finance（已修正 headers）
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
    // 使用統一的 baseUrl helper
    const url = paths.ohlcv(symbol);

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`📊 Local OHLCV not found for ${symbol} (404)`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!this.validateOhlcvData(data)) {
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
        console.error(`📊 OHLCV validation failed: missing ${field}`);
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