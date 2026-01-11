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
export const paths = {
  // OHLCV 數據路徑
  ohlcv: (symbol) => withBase(`data/ohlcv/${symbol.toUpperCase()}.json`),
  ohlcvPrecomputed: (symbol, period = '1d', days = 90) =>
    withBase(`data/ohlcv/${symbol.toLowerCase()}_${period}_${days}d.json`),
  ohlcvIndex: (options = {}) => {
    const url = withBase('data/ohlcv/index.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },

  // 技術指標路徑
  technicalIndicators: (date, symbol) =>
    withBase(`data/technical-indicators/${date}_${symbol}.json`),
  technicalIndicatorsIndex: (options = {}) => {
    const url = withBase('data/technical-indicators/latest_index.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },

  // Metadata 路徑
  symbolsMetadata: (options = {}) => {
    const url = withBase('data/symbols_metadata.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },
  sectorIndustry: () => withBase('data/sector_industry.json'),

  // 配置文件路徑
  universe: () => withBase('config/universe.json'),
  stocks: () => withBase('config/stocks.json'),

  // 狀態和索引文件 (需要 cache busting)
  status: (options = {}) => {
    const url = withBase('data/status.json');
    return options.v ? `${url}?v=${options.v}` : url;
  },

  // 其他常用路徑
  packageJson: () => withBase('package.json'),
  quotesLatest: () => withBase('data/quotes/latest.json'),
  daily: (date) => withBase(`data/daily/${date}.json`)
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
  getBaseUrl,
  isProduction,
  isDevelopment,
  getEnvironmentInfo,
  paths,
  debugPaths
};