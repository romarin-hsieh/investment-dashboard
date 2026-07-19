/**
 * Base URL Helper - 統一解決路徑問題
 * 
 * 使用 Vite 的 import.meta.env.BASE_URL 統一處理路徑
 * 避免到處寫 hostname 判斷和 hardcode 路徑
 * 
 * 本地開發: BASE_URL = '/'
 * GitHub Pages: BASE_URL = '/investment-dashboard/'
 */

/** Cache-busting 參數：`?v=` 後面接的版本值（見 dataVersionService）。 */
export interface CacheBustOptions {
  v?: string | number;
}

/**
 * 將相對路徑轉換為正確的絕對路徑
 * @param path - 相對路徑 (如 'data/ohlcv/AAPL.json')
 * @returns 完整路徑
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const cleanPath = String(path).replace(/^\/+/, ''); // 去掉開頭的 /
  return `${base}${cleanPath}`;
}

/**
 * 資料來源 base URL。預設等同 app 的 BASE_URL（與舊行為一致），但可由
 * VITE_DATA_BASE_URL 覆寫，讓 public/data 改由獨立的 data repo / 站台供應。
 * 一律以 '/' 結尾，方便串接相對路徑。
 * @returns data base URL（結尾含 '/'）
 */
export function getDataBaseUrl(): string {
  const base = import.meta.env.VITE_DATA_BASE_URL || import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * 將「資料」相對路徑轉換為完整 URL（使用 getDataBaseUrl）。
 * 對應 withBase，但走可覆寫的資料來源而非 app base。
 * @param path - 相對路徑 (如 'data/ohlcv/AAPL.json')
 * @returns 完整路徑
 */
export function withDataBase(path: string): string {
  const cleanPath = String(path).replace(/^\/+/, '');
  return `${getDataBaseUrl()}${cleanPath}`;
}

/**
 * 獲取當前的 base URL
 * @returns base URL
 */
export function getBaseUrl(): string {
  return import.meta.env.BASE_URL || '/';
}

/**
 * 檢查是否為生產環境
 * @returns 是否為生產環境
 */
export function isProduction(): boolean {
  return import.meta.env.PROD;
}

/**
 * 檢查是否為開發環境
 * @returns 是否為開發環境
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * 獲取環境資訊
 * @returns 環境資訊
 */
export function getEnvironmentInfo() {
  return {
    baseUrl: getBaseUrl(),
    mode: import.meta.env.MODE,
    prod: isProduction(),
    dev: isDevelopment(),
    viteEnv: import.meta.env
  };
}

// 常用路徑 helpers
// 資料檔（data/*）走 withDataBase（可由 VITE_DATA_BASE_URL 覆寫到獨立 data 站台）；
// 設定檔（config/*）與 app 資產（package.json）留在 app repo，走 withBase。
export const paths = {
  // OHLCV 數據路徑
  ohlcv: (symbol: string): string => withDataBase(`data/ohlcv/${symbol.toUpperCase()}.json`),
  ohlcvPrecomputed: (symbol: string, period = '1d', days = 90): string =>
    withDataBase(`data/ohlcv/${symbol.toLowerCase()}_${period}_${days}d.json`),
  ohlcvIndex: (options: CacheBustOptions = {}): string => {
    const url = withDataBase('data/ohlcv/index.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },

  // 技術指標路徑
  technicalIndicators: (date: string, symbol: string): string =>
    withDataBase(`data/technical-indicators/${date}_${symbol}.json`),
  technicalIndicatorsIndex: (options: CacheBustOptions = {}): string => {
    const url = withDataBase('data/technical-indicators/latest_index.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },

  // Metadata 路徑
  symbolsMetadata: (options: CacheBustOptions = {}): string => {
    const url = withDataBase('data/symbols_metadata.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },
  sectorIndustry: (): string => withDataBase('data/sector_industry.json'),

  // 配置文件路徑 (app repo, not the data store)
  stocks: (): string => withBase('config/stocks.json'),

  // 狀態和索引文件 (需要 cache busting)
  status: (options: CacheBustOptions = {}): string => {
    const url = withDataBase('data/status.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },

  // 其他常用路徑
  packageJson: (): string => withBase('package.json'),
  quotesLatest: (): string => withDataBase('data/quotes/latest.json'),
  daily: (date: string): string => withDataBase(`data/daily/${date}.json`)
};

// Debug helper
export function debugPaths(): void {
  console.log('🔍 Base URL Debug Info:', {
    baseUrl: getBaseUrl(),
    environment: import.meta.env.MODE,
    samplePaths: {
      ohlcv: paths.ohlcv('AAPL'),
      technicalIndicators: paths.technicalIndicators('2025-01-29', 'AAPL'),
      metadata: paths.symbolsMetadata()
    }
  });
}

export default {
  withBase,
  withDataBase,
  getBaseUrl,
  getDataBaseUrl,
  isProduction,
  isDevelopment,
  getEnvironmentInfo,
  paths,
  debugPaths
};