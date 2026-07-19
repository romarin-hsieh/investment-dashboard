// 性能優化緩存服務
// 提供多層緩存和預載入功能

/** 一筆緩存項目：資料本體 + 寫入時間 + 存活時間（毫秒）。 */
interface CacheItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

/** getStats() 回傳的緩存占用快照。 */
export interface PerformanceCacheStats {
  memoryCache: number;
  localStorage: number;
  totalSize: number;
}

/** batchPreload 的單筆項目。 */
export interface BatchPreloadItem<T> {
  key: string;
  loader: () => Promise<T>;
  ttl?: number;
}

/**
 * 判斷 localStorage 反序列化出來的值是否為一筆合法的 CacheItem。
 * JSON.parse 回傳 unknown，必須先窄化才能安全讀取欄位。
 */
function isCacheItem(value: unknown): value is CacheItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    typeof (value as { timestamp?: unknown }).timestamp === 'number'
  );
}

class PerformanceCache {
  private memoryCache = new Map<string, CacheItem>();
  private localStoragePrefix = 'investment_dashboard_cache_v3_';
  private defaultTTL = 24 * 60 * 60 * 1000; // 24 hours

  // 設置緩存項
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // 內存緩存
    this.memoryCache.set(key, cacheItem);

    // 本地存儲緩存（用於跨會話持久化）
    try {
      localStorage.setItem(
        this.localStoragePrefix + key,
        JSON.stringify(cacheItem)
      );
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  // 獲取緩存項。呼叫端以泛型宣告它期望的型別（等同於一次讀取斷言，
  // 因為異質緩存無法在編譯期得知每個 key 存的是什麼）。
  get<T = unknown>(key: string): T | null {
    // 首先檢查內存緩存
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key);
      if (item && this.isValid(item)) {
        return item.data as T;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // 檢查本地存儲緩存
    try {
      const stored = localStorage.getItem(this.localStoragePrefix + key);
      if (stored) {
        const item: unknown = JSON.parse(stored);
        if (isCacheItem(item) && this.isValid(item)) {
          // 恢復到內存緩存
          this.memoryCache.set(key, item);
          return item.data as T;
        } else {
          localStorage.removeItem(this.localStoragePrefix + key);
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
    }

    return null;
  }

  // 檢查緩存項是否有效
  isValid(item: { timestamp?: number; ttl?: number } | null | undefined): boolean {
    if (!item || !item.timestamp) return false;
    // 原本以 `Date.now() - item.timestamp < item.ttl` 判斷；ttl 缺失時
    // JS 會得到 `x < undefined` === false。以 typeof 檢查保持相同語意。
    return typeof item.ttl === 'number' && Date.now() - item.timestamp < item.ttl;
  }

  // 檢查是否有緩存
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // 清除特定緩存
  delete(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(this.localStoragePrefix + key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  // 清除所有緩存
  clear(): void {
    this.memoryCache.clear();
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.localStoragePrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  // 獲取緩存統計信息
  getStats(): PerformanceCacheStats {
    const memorySize = this.memoryCache.size;
    let localStorageSize = 0;

    try {
      const keys = Object.keys(localStorage);
      localStorageSize = keys.filter(key =>
        key.startsWith(this.localStoragePrefix)
      ).length;
    } catch (error) {
      console.warn('Failed to get localStorage stats:', error);
    }

    return {
      memoryCache: memorySize,
      localStorage: localStorageSize,
      totalSize: memorySize + localStorageSize
    };
  }

  // 預載入數據
  async preload<T>(key: string, dataLoader: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T | null> {
    if (this.has(key)) {
      return this.get<T>(key);
    }

    try {
      const data = await dataLoader();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error(`Failed to preload data for key ${key}:`, error);
      throw error;
    }
  }

  // 批量預載入
  async batchPreload<T>(items: Array<BatchPreloadItem<T>>): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    const promises = items.map(async ({ key, loader, ttl }) => {
      try {
        const data = await this.preload(key, loader, ttl);
        results.set(key, data);
      } catch (error) {
        console.error(`Failed to preload ${key}:`, error);
        results.set(key, null);
      }
    });

    await Promise.all(promises);
    return results;
  }
}

// 創建全局實例
export const performanceCache = new PerformanceCache();

// 專用的股票數據緩存鍵
export const CACHE_KEYS = {
  QUOTES_SNAPSHOT: 'quotes_snapshot',
  DAILY_SNAPSHOT: 'daily_snapshot',
  METADATA_BATCH: 'metadata_batch',
  SYMBOLS_CONFIG: 'symbols_config',
  STOCK_OVERVIEW_DATA: 'stock_overview_data'
} as const;

// 緩存 TTL 配置
// 注意：股價現在使用 TradingView Widget 實時顯示，Yahoo Finance API 數據改為每日更新
export const CACHE_TTL = {
  QUOTES: 24 * 60 * 60 * 1000,     // 24 hours - 改為每日更新 (美股收盤後半小時觸發)
  DAILY_DATA: 24 * 60 * 60 * 1000, // 24 hours - 改為每日更新 (美股收盤後半小時觸發)
  METADATA: 24 * 60 * 60 * 1000,   // 24 hours - 元數據變化很少
  CONFIG: 60 * 60 * 1000,          // 1 hour - 配置數據保持不變
  TECHNICAL_INDICATORS: 24 * 60 * 60 * 1000 // 24 hours - 技術指標每日更新
} as const;
