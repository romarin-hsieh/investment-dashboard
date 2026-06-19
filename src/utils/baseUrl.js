/**
 * Base URL Helper - 統一解決路徑問題
 * 
 * 使用 Vite 的 import.meta.env.BASE_URL 統一處理路徑
 * 避免到處寫 hostname 判斷和 hardcode 路徑
 * 
 * 本地開發: BASE_URL = '/'
 * GitHub Pages: BASE_URL = '/investment-dashboard/'
 */

/**
 * 將相對路徑轉換為正確的絕對路徑
 * @param {string} path - 相對路徑 (如 'data/ohlcv/AAPL.json')
 * @returns {string} 完整路徑
 */
export function withBase(path) {
  const base = import.meta.env.BASE_URL || '/';
  const cleanPath = String(path).replace(/^\/+/, ''); // 去掉開頭的 /
  return `${base}${cleanPath}`;
}

/**
 * 資料來源 base URL。預設等同 app 的 BASE_URL（與舊行為一致），但可由
 * VITE_DATA_BASE_URL 覆寫，讓 public/data 改由獨立的 data repo / 站台供應。
 * 一律以 '/' 結尾，方便串接相對路徑。
 * @returns {string} data base URL（結尾含 '/'）
 */
export function getDataBaseUrl() {
  const base = import.meta.env.VITE_DATA_BASE_URL || import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * 將「資料」相對路徑轉換為完整 URL（使用 getDataBaseUrl）。
 * 對應 withBase，但走可覆寫的資料來源而非 app base。
 * @param {string} path - 相對路徑 (如 'data/ohlcv/AAPL.json')
 * @returns {string} 完整路徑
 */
export function withDataBase(path) {
  const cleanPath = String(path).replace(/^\/+/, '');
  return `${getDataBaseUrl()}${cleanPath}`;
}

/**
 * 獲取當前的 base URL
 * @returns {string} base URL
 */
export function getBaseUrl() {
  return import.meta.env.BASE_URL || '/';
}

/**
 * 檢查是否為生產環境
 * @returns {boolean} 是否為生產環境
 */
export function isProduction() {
  return import.meta.env.PROD;
}

/**
 * 檢查是否為開發環境
 * @returns {boolean} 是否為開發環境
 */
export function isDevelopment() {
  return import.meta.env.DEV;
}

/**
 * 獲取環境資訊
 * @returns {Object} 環境資訊
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
  ohlcv: (symbol) => withDataBase(`data/ohlcv/${symbol.toUpperCase()}.json`),
  ohlcvPrecomputed: (symbol, period = '1d', days = 90) =>
    withDataBase(`data/ohlcv/${symbol.toLowerCase()}_${period}_${days}d.json`),
  ohlcvIndex: (options = {}) => {
    const url = withDataBase('data/ohlcv/index.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },

  // 技術指標路徑
  technicalIndicators: (date, symbol) =>
    withDataBase(`data/technical-indicators/${date}_${symbol}.json`),
  technicalIndicatorsIndex: (options = {}) => {
    const url = withDataBase('data/technical-indicators/latest_index.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },

  // Metadata 路徑
  symbolsMetadata: (options = {}) => {
    const url = withDataBase('data/symbols_metadata.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },
  sectorIndustry: () => withDataBase('data/sector_industry.json'),

  // 配置文件路徑 (app repo, not the data store)
  stocks: () => withBase('config/stocks.json'),

  // 狀態和索引文件 (需要 cache busting)
  status: (options = {}) => {
    const url = withDataBase('data/status.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },

  // 其他常用路徑
  packageJson: () => withBase('package.json'),
  quotesLatest: () => withDataBase('data/quotes/latest.json'),
  daily: (date) => withDataBase(`data/daily/${date}.json`)
};

// Debug helper
export function debugPaths() {
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