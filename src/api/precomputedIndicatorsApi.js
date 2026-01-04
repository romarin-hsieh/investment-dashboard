// 從靜態文件讀取預計算的技術指標數據
import { technicalIndicatorsCache } from '../utils/technicalIndicatorsCache.js';

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
    // 使用統一的 baseUrl helper
    const base = import.meta.env.BASE_URL || '/';
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
  async getTechnicalIndicators(symbol) {
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
    if (this.fetchingPromises.has(cacheKey)) {
      console.log(`⏳ Waiting for existing request for ${symbol}...`);
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
        const dataUrl = `${this.baseUrl}${latestDate}_${symbol}.json`;

        console.log(`🔍 Fetching precomputed data for ${symbol} from ${dataUrl}`);

        const response = await fetch(dataUrl);

        if (!response.ok) {
          throw new Error(`Precomputed data not found for ${symbol} (${response.status})`);
        }

        const data = await response.json();

        // 轉換數據格式以匹配原有 API
        const indicators = {
          ...data.indicators,
          source: 'Precomputed',
          lastUpdated: data.computedAt,
          dataAge: this.calculateDataAge(data.computedAt),
          precomputedDate: data.date,
          symbol: symbol // 確保包含 symbol 信息

          // yfinance 資料已經包含在 ...data.indicators 中
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