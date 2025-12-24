// 技術指標每日緩存系統
// 為股票提供每日緩存，避免重複計算

class TechnicalIndicatorsCache {
  constructor() {
    this.cachePrefix = 'technical_indicators_';
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 小時緩存
    this.memoryCache = new Map(); // 內存緩存，提高性能
  }

  // 生成緩存鍵
  getCacheKey(symbol) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${this.cachePrefix}${symbol}_${today}`;
  }

  // 從緩存獲取技術指標數據
  async getTechnicalIndicators(symbol) {
    const cacheKey = this.getCacheKey(symbol);
    
    // 1. 先檢查內存緩存
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`Using memory cache for ${symbol}`);
        // 標記數據來源
        const dataWithSource = { ...cached.data, source: 'Daily Cache (Memory)' };
        return dataWithSource;
      } else {
        this.memoryCache.delete(cacheKey);
      }
    }

    // 2. 檢查 localStorage 緩存
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (Date.now() - parsed.timestamp < this.cacheTimeout) {
          console.log(`Using localStorage cache for ${symbol}`);
          
          // 同時存入內存緩存
          this.memoryCache.set(cacheKey, parsed);
          
          // 標記數據來源
          const dataWithSource = { ...parsed.data, source: 'Daily Cache (LocalStorage)' };
          return dataWithSource;
        } else {
          // 過期的緩存，清除
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn(`Failed to read cache for ${symbol}:`, error);
    }

    // 3. 緩存未命中，返回 null
    return null;
  }

  // 將技術指標數據存入緩存
  async setTechnicalIndicators(symbol, data) {
    const cacheKey = this.getCacheKey(symbol);
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      symbol: symbol,
      date: new Date().toISOString().split('T')[0]
    };

    try {
      // 1. 存入 localStorage
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      
      // 2. 存入內存緩存
      this.memoryCache.set(cacheKey, cacheData);
      
      console.log(`Cached technical indicators for ${symbol}`);
      
      // 3. 清理舊的緩存條目
      this.cleanupOldCache();
      
    } catch (error) {
      console.warn(`Failed to cache technical indicators for ${symbol}:`, error);
    }
  }

  // 清理過期的緩存條目
  cleanupOldCache() {
    try {
      const keysToRemove = [];
      
      // 檢查 localStorage 中的所有技術指標緩存
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cachePrefix)) {
          try {
            const cached = JSON.parse(localStorage.getItem(key));
            if (Date.now() - cached.timestamp > this.cacheTimeout) {
              keysToRemove.push(key);
            }
          } catch (error) {
            // 無效的緩存條目，標記為刪除
            keysToRemove.push(key);
          }
        }
      }
      
      // 刪除過期的緩存條目
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removed expired cache: ${key}`);
      });
      
      // 清理內存緩存中的過期條目
      for (const [key, cached] of this.memoryCache.entries()) {
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
          this.memoryCache.delete(key);
        }
      }
      
    } catch (error) {
      console.warn('Failed to cleanup old cache:', error);
    }
  }

  // 強制清除指定股票的緩存
  clearSymbolCache(symbol) {
    const cacheKey = this.getCacheKey(symbol);
    
    // 清除 localStorage
    localStorage.removeItem(cacheKey);
    
    // 清除內存緩存
    this.memoryCache.delete(cacheKey);
    
    console.log(`Cleared cache for ${symbol}`);
  }

  // 清除所有技術指標緩存
  clearAllCache() {
    try {
      // 清除 localStorage 中的所有技術指標緩存
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cachePrefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 清除內存緩存
      this.memoryCache.clear();
      
      console.log(`Cleared all technical indicators cache (${keysToRemove.length} items)`);
      
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }

  // 獲取緩存統計信息
  getCacheStats() {
    const stats = {
      memoryCache: this.memoryCache.size,
      localStorageCache: 0,
      totalSize: 0
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cachePrefix)) {
          stats.localStorageCache++;
          const value = localStorage.getItem(key);
          if (value) {
            stats.totalSize += value.length;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }

    return stats;
  }
}

// 創建單例實例
export const technicalIndicatorsCache = new TechnicalIndicatorsCache();
export default technicalIndicatorsCache;