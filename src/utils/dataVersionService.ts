/**
 * Data Version Service
 *
 * 實施基於時間戳的版本驅動數據更新檢查
 * 取代固定時間窗口的更新邏輯
 */

import { paths } from './baseUrl';

/**
 * status.json 的最小契約。本服務只關心版本標識欄位（`generated`／舊名
 * `generatedAt`），其餘欄位原樣轉發給監聽器，因此以 `unknown` 表示。
 */
export interface DataStatusPayload {
  /** 產生時間戳（現行欄位名） */
  generated?: unknown;
  /** 產生時間戳（舊欄位名，向後相容） */
  generatedAt?: unknown;
  [key: string]: unknown;
}

/** `versionChanged` 事件的 payload。 */
export interface VersionChangedPayload {
  /** 上一次看到的版本；首次檢查時為 null */
  oldVersion: string | null;
  /** 本次讀到的版本 */
  newVersion: string;
  /** 觸發本次變更的 status.json 內容 */
  status: DataStatusPayload;
}

/** `versionCheckError` 事件的 payload。 */
export interface VersionCheckErrorPayload {
  /** 攔截到的錯誤；catch 拿到的是 unknown，不保證是 Error */
  error: unknown;
}

/** 事件類型 */
export type DataVersionEventName = 'versionChanged' | 'versionCheckError' | 'softRefresh';

/** 事件數據；形狀依 event 種類而定（`softRefresh` 不帶 payload）。 */
export type DataVersionEventData =
  | VersionChangedPayload
  | VersionCheckErrorPayload
  | Record<string, never>;

/** 監聽器函數簽章 */
export type DataVersionListener = (event: DataVersionEventName, data: DataVersionEventData) => void;

/** 刷新方式：軟刷新（通知監聽器重載數據）或硬刷新（reload 整頁）。 */
export type RefreshMethod = 'soft' | 'hard';

/** `getStatus()` 回傳的診斷資訊 */
export interface DataVersionStatus {
  isChecking: boolean;
  currentVersion: string | null;
  listenerCount: number;
  storageKey: string;
}

/** 收窄 `unknown` 為可索引的物件，供解析 JSON 回應使用。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

class DataVersionService {
  readonly STORAGE_KEY = 'lastSeenDataVersion';
  isChecking = false;
  listeners = new Set<DataVersionListener>();

  /** 上次完成版本檢查的時間（毫秒），用於節流；尚未檢查過時為 undefined。 */
  _lastCheckTime?: number;
  /** 進行中的版本檢查（Promise 去重用），閒置時為 null。 */
  _currentVersionCheckPromise: Promise<boolean> | null = null;

  /**
   * 檢查數據版本並在需要時刷新
   * @returns 是否觸發了刷新
   */
  async checkDataVersionAndRefresh(): Promise<boolean> {
    // 防止短時間內重複檢查 (5秒緩衝)
    if (Date.now() - (this._lastCheckTime || 0) < 5000) {
      // console.log('✅ Skipping version check (throttled)');
      return false;
    }

    // 檢查是否有正在進行的版本檢查 (Promise 去重)
    if (this._currentVersionCheckPromise) {
      console.log('⏳ Waiting for existing version check...');
      return this._currentVersionCheckPromise;
    }

    this.isChecking = true;

    try {
      this._currentVersionCheckPromise = (async (): Promise<boolean> => {
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

        const parsedStatus: unknown = await response.json();
        const status: DataStatusPayload = isRecord(parsedStatus) ? parsedStatus : {};

        // 2. 比較版本 - 使用 generatedAt 作為版本標識
        const currentVersion = String(status.generated || status.generatedAt);
        const lastSeenVersion = localStorage.getItem(this.STORAGE_KEY);

        // 更新最後檢查時間
        this._lastCheckTime = Date.now();

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
      })();

      return await this._currentVersionCheckPromise;

    } catch (error) {
      console.error('❌ Version check failed:', error);

      // 錯誤處理 - 不阻止應用運行
      this.notifyListeners('versionCheckError', { error });
      return false;

    } finally {
      this.isChecking = false;
      this._currentVersionCheckPromise = null;
    }
  }

  /**
   * 清除相關快取
   */
  async clearRelevantCaches(): Promise<void> {
    console.log('🗑️ Clearing relevant caches...');

    try {
      // 清除 localStorage 中的數據快取
      const keysToRemove: string[] = [];
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
      const sessionKeysToRemove: string[] = [];
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
   * @param key - 快取鍵
   * @returns 是否應該清除
   */
  shouldClearCacheKey(key: string): boolean {
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
   * @param version - 當前版本
   */
  async refreshIndexFiles(version: string): Promise<void> {
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
        const techIndex: unknown = await techResponse.json();
        const techDate = isRecord(techIndex) ? techIndex.date : undefined;
        console.log('✅ Technical indicators index refreshed:', techDate);
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
        const ohlcvIndex: unknown = await ohlcvResponse.json();
        const symbols = isRecord(ohlcvIndex) ? ohlcvIndex.symbols : undefined;
        console.log('✅ OHLCV index refreshed:', Array.isArray(symbols) ? symbols.length : undefined, 'symbols');
      }

    } catch (error) {
      console.error('❌ Index refresh failed:', error);
    }
  }

  /**
   * 觸發頁面刷新
   */
  triggerRefresh(): void {
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
   * @returns 'soft' 或 'hard'
   */
  getRefreshMethod(): RefreshMethod {
    // 可以根據配置或環境決定刷新方法
    return 'hard'; // 目前使用硬刷新，最可靠
  }

  /**
   * 添加事件監聽器
   * @param listener - 監聽器函數
   */
  addListener(listener: DataVersionListener): void {
    this.listeners.add(listener);
  }

  /**
   * 移除事件監聽器
   * @param listener - 監聽器函數
   */
  removeListener(listener: DataVersionListener): void {
    this.listeners.delete(listener);
  }

  /**
   * 通知所有監聽器
   * @param event - 事件類型
   * @param data - 事件數據
   */
  notifyListeners(event: DataVersionEventName, data: DataVersionEventData = {}): void {
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
   * @returns 當前版本
   */
  getCurrentVersion(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * 手動觸發版本檢查
   * @returns 是否觸發了刷新
   */
  async forceVersionCheck(): Promise<boolean> {
    console.log('🔄 Force version check triggered');
    return await this.checkDataVersionAndRefresh();
  }

  /**
   * 重置版本檢查 (清除本地版本記錄)
   */
  resetVersionCheck(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🔄 Version check reset');
  }

  /**
   * 獲取版本檢查狀態
   * @returns 狀態資訊
   */
  getStatus(): DataVersionStatus {
    return {
      isChecking: this.isChecking,
      currentVersion: this.getCurrentVersion(),
      listenerCount: this.listeners.size,
      storageKey: this.STORAGE_KEY
    };
  }
}

export type { DataVersionService };

// 創建單例
export const dataVersionService = new DataVersionService();

// Auto-start is handled by AutoUpdateScheduler in main.js
// if (typeof window !== 'undefined') {
//   // 延遲啟動，避免影響初始頁面載入
//   setTimeout(() => {
//     dataVersionService.checkDataVersionAndRefresh();
//   }, 2000); // 2 秒後檢查
//
//   // 監聽頁面可見性變化，當頁面重新可見時檢查版本
//   document.addEventListener('visibilitychange', () => {
//     if (!document.hidden) {
//       setTimeout(() => {
//         dataVersionService.checkDataVersionAndRefresh();
//       }, 1000);
//     }
//   });
// }

export default dataVersionService;
