// 預計算技術指標 API
// 從靜態文件讀取預計算的技術指標數據

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
    // 檢查索引緩存是否有效
    if (this.indexCache && this.indexCacheTimestamp && 
        (Date.now() - this.indexCacheTimestamp < this.indexCacheTimeout)) {
      console.log('📦 Using cached index data');
      return this.indexCache;
    }

    try {
      console.log('🔄 Loading latest_index.json...');
      const indexResponse = await fetch(`${this.baseUrl}latest_index.json`);
      
      if (indexResponse.ok) {
        const index = await indexResponse.json();
        
        // 更新索引緩存
        this.indexCache = index;
        this.indexCacheTimestamp = Date.now();
        
        console.log(`✅ Loaded latest_index.json: ${index.symbols.length} symbols, date: ${index.date}`);
        return index;
      } else {
        console.warn('⚠️ latest_index.json not found, using fallback');
        return null;
      }
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

    try {
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
      };
      
      // 緩存結果
      this.cache.set(cacheKey, {
        data: indicators,
        timestamp: Date.now()
      });
      
      console.log(`✅ Loaded precomputed data for ${symbol} (date: ${latestDate}, age: ${indicators.dataAge})`);
      return indicators;
      
    } catch (error) {
      console.error(`❌ Failed to load precomputed data for ${symbol}:`, error);
      throw error;
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