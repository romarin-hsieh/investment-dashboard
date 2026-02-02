// 技術指標每日緩存系統
// 為股票提供每日緩存，避免重複計算
// 使用 latest_index.json timestamp 決定 cache bust

class TechnicalIndicatorsCache {
  constructor() {
    this.cachePrefix = 'technical_indicators_v3_';
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 小時緩存
    this.memoryCache = new Map(); // 內存緩存，提高性能
    this.indexCache = null; // latest_index.json 緩存
    this.indexCacheTimestamp = null;
    this.indexCacheTimeout = 5 * 60 * 1000; // 5分鐘緩存索引
  }

  // 獲取 latest_index.json 的完整數據
  async getLatestIndex() {
    // 檢查索引緩存
    if (this.indexCache && this.indexCacheTimestamp &&
      (Date.now() - this.indexCacheTimestamp < this.indexCacheTimeout)) {
      return this.indexCache;
    }

    // 檢查是否有正在進行的索引請求
    if (this._indexFetchPromise) {
      return this._indexFetchPromise;
    }

    try {
      this._indexFetchPromise = (async () => {
        const baseUrl = import.meta.env.BASE_URL || '/';
        // 移除 ?t= 時間戳，允許瀏覽器緩存，依賴 DataVersionService 進行版本控制
        const response = await fetch(`${baseUrl}data/technical-indicators/latest_index.json`);

        if (response.ok) {
          const index = await response.json();
          this.indexCache = index;
          this.indexCacheTimestamp = Date.now();
          return index;
        }
        return null;
      })();

      return await this._indexFetchPromise;

    } catch (error) {
      console.warn('Failed to get latest_index:', error);
      return null;
    } finally {
      this._indexFetchPromise = null;
    }
  }

  // 獲取 latest_index.json 的 timestamp (兼容舊 API)
  async getLatestIndexTimestamp() {
    const index = await this.getLatestIndex();
    if (index) {
      // 優先使用 yf_updated，其次是 generatedAt
      return index.yf_updated || index.generatedAt;
    }
    return null;
  }

  // 生成緩存鍵（包含 timestamp）
  async getCacheKey(symbol) {
    const latestTimestamp = await this.getLatestIndexTimestamp();
    if (latestTimestamp) {
      // 使用 timestamp 的日期部分作為緩存鍵
      const dateKey = new Date(latestTimestamp).toISOString().split('T')[0];
      return `${this.cachePrefix}${symbol}_${dateKey}`;
    } else {
      // 回退到使用今天日期
      const today = new Date().toISOString().split('T')[0];
      return `${this.cachePrefix}${symbol}_${today}`;
    }
  }

  // 從緩存獲取技術指標數據
  async getTechnicalIndicators(symbol) {
    const cacheKey = await this.getCacheKey(symbol);
    const latestTimestamp = await this.getLatestIndexTimestamp();

    // 1. 先檢查內存緩存
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);

      // 只要 key (包含日期) 匹配且未過期，就視為有效
      if (Date.now() - cached.timestamp < this.cacheTimeout) {

        // [New] Validate Data Completeness
        if (this._isValidData(cached.data)) {
          console.log(`Using memory cache for ${symbol}`);
          const dataWithSource = { ...cached.data, source: 'Daily Cache (Memory)' };
          return dataWithSource;
        } else {
          console.warn(`Memory cache for ${symbol} is invalid/incomplete. Clearing.`);
          this.memoryCache.delete(cacheKey);
        }
      } else {
        this.memoryCache.delete(cacheKey);
      }
    }

    // 2. 檢查 localStorage 緩存
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);

        // 同樣移除對 indexTimestamp 的嚴格檢查
        // 只要緩存未過期且 Key 匹配 (即日期匹配)
        if (Date.now() - parsed.timestamp < this.cacheTimeout) {

          // [New] Validate Data Completeness
          if (this._isValidData(parsed.data)) {
            console.log(`Using localStorage cache for ${symbol}`);
            // 同時存入內存緩存
            this.memoryCache.set(cacheKey, parsed);
            const dataWithSource = { ...parsed.data, source: 'Daily Cache (LocalStorage)' };
            return dataWithSource;
          } else {
            console.warn(`LocalStorage cache for ${symbol} is invalid/incomplete. Clearing.`);
            localStorage.removeItem(cacheKey);
          }
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn(`Failed to read cache for ${symbol}:`, error);
    }

    // 3. 緩存未命中，返回 null (讓 YahooFinanceAPI 處理獲取和映射)
    // 我們移除這裡的網絡請求，因為這裡獲取的數據是原始 JSON，缺少必要的格式映射
    // YahooFinanceAPI._fetchStaticTechnicalIndicators 會處理映射，然後存回緩存
    console.log(`Cache miss for ${symbol}, delegating to API`);
    return null;
  }

  // 驗證數據完整性
  _isValidData(data) {
    if (!data) return false;

    // 檢查關鍵指標是否存在 (OBV, Beta)且有值
    // 這是為了解決靜態文件可能缺少新指標的問題
    const obvObj = data.obv || (data.indicators && data.indicators.obv);
    const hasOBV = obvObj && (obvObj.value !== undefined && obvObj.value !== null);

    // 檢查 Beta (通常在 yf 或 indicators.yf 中)
    const yf = data.yf || (data.indicators && data.indicators.yf);
    // Beta 可能是數字或對象
    const hasBeta = yf && (
      (yf.beta_10d !== undefined && yf.beta_10d !== null) ||
      (yf.beta_3mo !== undefined && yf.beta_3mo !== null)
    );

    // 如果缺少關鍵數據，視為無效，強制走 Live API
    if (!hasOBV) {
      // Relaxed check: Log warning but allow if other data exists to prevent infinite loops
      // console.warn('Cache validation failed: Missing OBV');
      // return false; 

      // Changed strategy: If we have basic indicators, treat as valid to avoid hammering the API
      // The UI will handle missing OBV gracefully (show N/A)
      console.warn(`Cache partial usage: Missing OBV for data, but using what we have to prevent fetch loop.`);
    }

    // 我們暫時不強制 Beta，因為如果 Benchmark Fetch 失敗，Beta 可能為 null，但我們不想因此無限重試
    // 只記錄警告
    if (!hasBeta) {
      console.warn('Cache partial warning: Missing Beta fields in static/cached data. Assuming live fetch needed if critical.');
      // 決定: 強制失效以觸發 Live Calculation (包含 Beta)
      return false;
    }

    return true;
  }

  // 將技術指標數據存入緩存 (Merge Strategy)
  async setTechnicalIndicators(symbol, data) {
    const cacheKey = await this.getCacheKey(symbol);
    const latestTimestamp = await this.getLatestIndexTimestamp();

    // 嘗試獲取現有緩存以進行合併
    let existingData = {};
    try {
      if (this.memoryCache.has(cacheKey)) {
        existingData = this.memoryCache.get(cacheKey).data || {};
      } else {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          existingData = JSON.parse(cached).data || {};
        }
      }
    } catch (e) {
      // Ignore read errors
    }

    // 合併數據：保留這兩個來源的數據
    // 如果 data 是實時計算的 (沒有 yf)，而 existing 是 JSON (有 yf)，我們希望保留 yf
    // 如果 data 是 JSON (有 yf)，我們希望更新 yf
    const mergedData = { ...existingData, ...data };

    // 特別處理 indicators 對象 (如果存在)
    if (data.indicators && existingData.indicators) {
      mergedData.indicators = { ...existingData.indicators, ...data.indicators };
    }

    // 特別處理 yf (如果 data 沒有 yf 但 existing 有)
    if (!data.yf && !data.indicators?.yf && (existingData.yf || existingData.indicators?.yf)) {
      // 嘗試從不同結構中保留 YF 數據
      const existingYf = existingData.yf || existingData.indicators?.yf;
      // 根據新數據的結構決定放在哪裡
      if (data.indicators) {
        mergedData.indicators = mergedData.indicators || {}; // Ensure indicators object exists
        mergedData.indicators.yf = existingYf;
      } else {
        mergedData.yf = existingYf;
      }
    }

    const cacheData = {
      data: mergedData,
      timestamp: Date.now(),
      symbol: symbol,
      date: new Date().toISOString().split('T')[0],
      indexTimestamp: latestTimestamp // 記錄 index timestamp
    };

    try {
      // 1. 優先存入內存緩存 (保證當次 Session 可用，即使 Storage 滿了)
      this.memoryCache.set(cacheKey, cacheData);
      console.log(`Cached technical indicators for ${symbol} (Merged - Memory)`);

      // 2. 嘗試存入 localStorage (可能失敗)
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`Cached technical indicators for ${symbol} (Merged - Memory + LS)`);
      } catch (storageError) {
        if (this._isQuotaExceeded(storageError)) {
          console.warn(`LocalStorage quota exceeded. Pruning old cache and retrying...`);
          if (this.pruneCache()) {
            // Retry once
            try {
              localStorage.setItem(cacheKey, JSON.stringify(cacheData));
              console.log(`Cached technical indicators for ${symbol} after pruning.`);
            } catch (retryError) {
              console.error(`Retry failed. Cached ${symbol} in memory only.`, retryError);
            }
          }
        } else {
          console.warn(`Failed to write to localStorage for ${symbol}:`, storageError);
        }
      }

    } catch (error) {
      console.warn(`Failed to cache technical indicators for ${symbol}:`, error);
    }
  }

  // 檢查是否是 QuotaExceededError
  _isQuotaExceeded(e) {
    return e instanceof DOMException && (
      // everything except Firefox
      e.code === 22 ||
      // Firefox
      e.code === 1014 ||
      // test name field too, because code might not be present
      // everything except Firefox
      e.name === 'QuotaExceededError' ||
      // Firefox
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
      // acknowledge QuotaExceededError only if there's something already stored
      (localStorage.length !== 0);
  }

  // [New] Prune Cache Strategy (LRU-like)
  // Returns true if space was made, false otherwise
  pruneCache() {
    try {
      const items = [];
      // 1. Collect all cache items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cachePrefix)) {
          try {
            // We only need metadata, but have to parse full JSON (costly but necessary)
            // Optimization: If keys contain timestamp? No, they contain Date string.
            // We need to check the actual timestamp inside value to be accurate.
            const val = localStorage.getItem(key);
            const parsed = JSON.parse(val);
            items.push({ key, timestamp: parsed.timestamp || 0, size: val.length });
          } catch (e) {
            items.push({ key, timestamp: 0, size: 0, invalid: true });
          }
        }
      }

      if (items.length === 0) return false;

      // 2. Sort by timestamp (Oldest first)
      // Invalid items (timestamp 0) come first -> deleted immediately
      items.sort((a, b) => a.timestamp - b.timestamp);

      // 3. Remove oldest 20% or at least 5 items
      const targetCount = Math.max(5, Math.floor(items.length * 0.2));
      let deletedCount = 0;
      let deletedSize = 0;

      for (let i = 0; i < Math.min(items.length, targetCount); i++) {
        localStorage.removeItem(items[i].key);
        // Also remove from memory cache to keep sync? 
        // No, memory is separate. Keep it for performance.
        deletedCount++;
        deletedSize += items[i].size;
      }

      console.log(`Pruned ${deletedCount} cache items (~${(deletedSize / 1024).toFixed(2)} KB) to free space.`);
      return true;

    } catch (e) {
      console.error('Prune cache failed:', e);
      return false;
    }
  }

  // 清理過期的緩存條目 (保留原有邏輯但改進)
  cleanupOldCache() {
    try {
      // 只有在空閒時或偶爾執行，避免每次 setItem 都遍歷
      // 這裡簡化為只刪除 > 24h 的，因為 setItem 已經有 pruneCache 保護
      for (let i = 0; i < localStorage.length; i++) {
        // ... (Logic optimized in pruneCache, strictly only expire here)
        const key = localStorage.key(i);
        if (key && key.startsWith(this.cachePrefix)) {
          // Check expiry...
          // Implementation skipped to save token/complexity, 
          // relying on existing loop if kept, or use pruneCache logic.
          // Let's keep the existing loop but wrapped safely.
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp > this.cacheTimeout) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      // console.warn('Failed to cleanup old cache:', error);
    }
  }

  // 強制清除指定股票的緩存
  async clearSymbolCache(symbol) {
    const cacheKey = await this.getCacheKey(symbol);

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