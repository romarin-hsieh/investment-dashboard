// 預計算技術指標 API
// 從靜態文件讀取預計算的技術指標數據

class PrecomputedIndicatorsAPI {
  constructor() {
    // 更強健的環境檢測和路徑設定
    this.baseUrl = this.getCorrectBaseUrl();
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1小時緩存 (技術指標每日更新)
    
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
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // GitHub Pages 檢測
    if (hostname === 'romarin-hsieh.github.io') {
      // 如果路徑包含 investment-dashboard，使用完整路徑
      if (pathname.includes('/investment-dashboard/')) {
        return '/investment-dashboard/data/technical-indicators/';
      }
      // 否則也使用完整路徑（防止直接訪問根域名的情況）
      return '/investment-dashboard/data/technical-indicators/';
    }
    
    // 本地開發環境
    return '/data/technical-indicators/';
  }

  // 獲取今天的日期字符串
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  // 獲取預計算的技術指標數據
  async getTechnicalIndicators(symbol) {
    const cacheKey = `precomputed_${symbol}`;
    
    // 檢查緩存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`Using precomputed cache for ${symbol}`);
        return cached.data;
      }
    }

    try {
      // 首先獲取最新的索引文件
      const indexResponse = await fetch(`${this.baseUrl}latest_index.json`);
      let latestDate = this.getTodayString(); // 默認使用今天
      
      if (indexResponse.ok) {
        const index = await indexResponse.json();
        latestDate = index.date; // 使用索引中的最新日期
        
        // 檢查該 symbol 是否在可用列表中
        if (!index.symbols.includes(symbol)) {
          throw new Error(`Symbol ${symbol} not found in precomputed data`);
        }
      }
      
      // 使用最新日期構建 URL
      const dataUrl = `${this.baseUrl}${latestDate}_${symbol}.json`;
      
      console.log(`Fetching precomputed data for ${symbol} from ${dataUrl}`);
      
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
        precomputedDate: data.date
      };
      
      // 緩存結果
      this.cache.set(cacheKey, {
        data: indicators,
        timestamp: Date.now()
      });
      
      console.log(`✅ Loaded precomputed data for ${symbol} (date: ${latestDate}, age: ${indicators.dataAge})`);
      return indicators;
      
    } catch (error) {
      console.error(`Failed to load precomputed data for ${symbol}:`, error);
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
    try {
      const response = await fetch(`${this.baseUrl}latest_index.json`);
      if (!response.ok) {
        throw new Error('Index not found');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load precomputed index:', error);
      return null;
    }
  }

  // 檢查預計算數據是否可用
  async isPrecomputedDataAvailable(symbol) {
    try {
      const index = await this.getAvailableData();
      return index && index.symbols.includes(symbol);
    } catch (error) {
      return false;
    }
  }

  // 清除緩存
  clearCache() {
    this.cache.clear();
  }

  // 獲取緩存統計
  getCacheStats() {
    const stats = {
      size: this.cache.size,
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