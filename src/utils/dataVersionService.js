/**
 * Data Version Service
 * 
 * 實施基於時間戳的版本驅動數據更新檢查
 * 取代固定時間窗口的更新邏輯
 */

import { paths } from './baseUrl.js';

class DataVersionService {
  constructor() {
    this.STORAGE_KEY = 'lastSeenDataVersion';
    this.isChecking = false;
    this.listeners = new Set();
  }

  /**
   * 檢查數據版本並在需要時刷新
   * @returns {Promise<boolean>} 是否觸發了刷新
   */
  async checkDataVersionAndRefresh() {
    if (this.isChecking) {
      console.log('🔄 Version check already in progress');
      return false;
    }

    this.isChecking = true;

    try {
      console.log('🔍 Checking data version...');

      // 1. 強制 no-cache 讀取 status.json
      const statusUrl = paths.status() + '?v=' + Date.now();
      const response = await fetch(statusUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Status fetch failed: ${response.status}`);
      }

      const status = await response.json();
      
      // 2. 比較版本 - 使用 generatedAt 作為版本標識
      const currentVersion = status.generated || status.generatedAt;
      const lastSeenVersion = localStorage.getItem(this.STORAGE_KEY);

      console.log('📊 Version check:', {
        current: currentVersion,
        lastSeen: lastSeenVersion,
        changed: currentVersion !== lastSeenVersion
      });

      if (currentVersion !== lastSeenVersion) {
        console.log('🔄 Data version changed - triggering refresh');
        
        // 3. 版本變更 - 清除相關快取
        await this.clearRelevantCaches();
        
        // 4. 更新本地存儲
        localStorage.setItem(this.STORAGE_KEY, currentVersion);
        
        // 5. 重新讀取索引文件 (no-cache)
        await this.refreshIndexFiles(currentVersion);
        
        // 6. 通知監聽器
        this.notifyListeners('versionChanged', {
          oldVersion: lastSeenVersion,
          newVersion: currentVersion,
          status: status
        });
        
        // 7. 觸發頁面刷新 (可選擇軟刷新或硬刷新)
        this.triggerRefresh();
        
        return true;
      } else {
        console.log('✅ Data version unchanged - no refresh needed');
        return false;
      }

    } catch (error) {
      console.error('❌ Version check failed:', error);
      
      // 錯誤處理 - 不阻止應用運行
      this.notifyListeners('versionCheckError', { error });
      return false;
      
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 清除相關快取
   */
  async clearRelevantCaches() {
    console.log('🗑️ Clearing relevant caches...');
    
    try {
      // 清除 localStorage 中的數據快取
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && this.shouldClearCacheKey(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Cleared cache key: ${key}`);
      });
      
      // 清除 sessionStorage 中的相關快取
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && this.shouldClearCacheKey(key)) {
          sessionKeysToRemove.push(key);
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Cleared session cache key: ${key}`);
      });
      
      console.log(`✅ Cleared ${keysToRemove.length + sessionKeysToRemove.length} cache entries`);
      
    } catch (error) {
      console.error('❌ Cache clearing failed:', error);
    }
  }

  /**
   * 判斷是否應該清除某個快取鍵
   * @param {string} key - 快取鍵
   * @returns {boolean} 是否應該清除
   */
  shouldClearCacheKey(key) {
    const cachePatterns = [
      'technical_indicators_',
      'precomputed_',
      'ohlcv_',
      'latest_index_',
      'status_',
      'metadata_',
      'TECHNICAL_INDICATORS',
      'OHLCV_DATA',
      'hybrid_technical_'
    ];
    
    return cachePatterns.some(pattern => key.includes(pattern));
  }

  /**
   * 重新讀取索引文件
   * @param {string} version - 當前版本
   */
  async refreshIndexFiles(version) {
    console.log('🔄 Refreshing index files...');
    
    try {
      // 重新讀取技術指標索引
      const techIndexUrl = paths.technicalIndicatorsIndex() + '?v=' + version;
      const techResponse = await fetch(techIndexUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (techResponse.ok) {
        const techIndex = await techResponse.json();
        console.log('✅ Technical indicators index refreshed:', techIndex.date);
      }
      
      // 重新讀取 OHLCV 索引
      const ohlcvIndexUrl = paths.ohlcvIndex() + '?v=' + version;
      const ohlcvResponse = await fetch(ohlcvIndexUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (ohlcvResponse.ok) {
        const ohlcvIndex = await ohlcvResponse.json();
        console.log('✅ OHLCV index refreshed:', ohlcvIndex.symbols?.length, 'symbols');
      }
      
    } catch (error) {
      console.error('❌ Index refresh failed:', error);
    }
  }

  /**
   * 觸發頁面刷新
   */
  triggerRefresh() {
    console.log('🔄 Triggering page refresh...');
    
    // 可以選擇軟刷新或硬刷新
    const refreshMethod = this.getRefreshMethod();
    
    if (refreshMethod === 'hard') {
      // 硬刷新 - 重新載入整個頁面
      window.location.reload();
    } else {
      // 軟刷新 - 通知應用重新載入數據
      this.notifyListeners('softRefresh');
      
      // 如果沒有監聽器處理軟刷新，則回退到硬刷新
      setTimeout(() => {
        if (this.listeners.size === 0) {
          console.log('🔄 No soft refresh handlers, falling back to hard refresh');
          window.location.reload();
        }
      }, 1000);
    }
  }

  /**
   * 獲取刷新方法
   * @returns {string} 'soft' 或 'hard'
   */
  getRefreshMethod() {
    // 可以根據配置或環境決定刷新方法
    return 'hard'; // 目前使用硬刷新，最可靠
  }

  /**
   * 添加事件監聽器
   * @param {Function} listener - 監聽器函數
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * 移除事件監聽器
   * @param {Function} listener - 監聽器函數
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * 通知所有監聽器
   * @param {string} event - 事件類型
   * @param {Object} data - 事件數據
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('❌ Listener error:', error);
      }
    });
  }

  /**
   * 獲取當前版本
   * @returns {string|null} 當前版本
   */
  getCurrentVersion() {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * 手動觸發版本檢查
   * @returns {Promise<boolean>} 是否觸發了刷新
   */
  async forceVersionCheck() {
    console.log('🔄 Force version check triggered');
    return await this.checkDataVersionAndRefresh();
  }

  /**
   * 重置版本檢查 (清除本地版本記錄)
   */
  resetVersionCheck() {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🔄 Version check reset');
  }

  /**
   * 獲取版本檢查狀態
   * @returns {Object} 狀態資訊
   */
  getStatus() {
    return {
      isChecking: this.isChecking,
      currentVersion: this.getCurrentVersion(),
      listenerCount: this.listeners.size,
      storageKey: this.STORAGE_KEY
    };
  }
}

// 創建單例
export const dataVersionService = new DataVersionService();

// 自動啟動版本檢查 (在頁面載入後)
if (typeof window !== 'undefined') {
  // 延遲啟動，避免影響初始頁面載入
  setTimeout(() => {
    dataVersionService.checkDataVersionAndRefresh();
  }, 2000); // 2 秒後檢查
  
  // 監聽頁面可見性變化，當頁面重新可見時檢查版本
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      setTimeout(() => {
        dataVersionService.checkDataVersionAndRefresh();
      }, 1000);
    }
  });
}

export default dataVersionService;