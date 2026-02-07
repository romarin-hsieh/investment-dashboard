/**
 * Data Transformers - Utility functions for data format conversion
 * 資料轉換器 - 資料格式轉換的工具函式
 *
 * This module handles data transformation and formatting for Yahoo Finance data.
 * 此模組處理 Yahoo Finance 資料的轉換與格式化。
 *
 * @module api/dataTransformers
 */

/**
 * Get default exchange for a symbol based on known lists
 * 根據已知清單取得股票代號的預設交易所
 *
 * @param {string} symbol - Stock symbol
 * @returns {string} Exchange name (NASDAQ or NYSE)
 */
export function getDefaultExchange(symbol) {
    const nasdaqSymbols = [
        'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
        'RKLB', 'ASTS', 'RIVN', 'MDB', 'ONDS', 'PL', 'AVAV', 'CRM', 'AVGO',
        'LEU', 'SMR', 'CRWV', 'IONQ', 'PLTR', 'HIMS', 'FTNT', 'WDC', 'CSCO'
    ];
    const nyseSymbols = ['TSM', 'ORCL', 'RDW', 'GLW'];

    if (nasdaqSymbols.includes(symbol)) {
        return 'NASDAQ';
    } else if (nyseSymbols.includes(symbol)) {
        return 'NYSE';
    }

    return 'NASDAQ'; // Default
}

/**
 * Categorize market cap into size buckets
 * 將市值分類至規模區間
 *
 * @param {number} marketCap - Market capitalization in USD
 * @returns {string} Category: mega_cap, large_cap, mid_cap, small_cap, micro_cap, or unknown
 */
export function getMarketCapCategory(marketCap) {
    if (!marketCap || marketCap <= 0) {
        return 'unknown';
    }

    // Market cap categories (USD)
    // 市值分類（美元）
    if (marketCap >= 200_000_000_000) { // >= $200B
        return 'mega_cap';
    } else if (marketCap >= 10_000_000_000) { // >= $10B
        return 'large_cap';
    } else if (marketCap >= 2_000_000_000) { // >= $2B
        return 'mid_cap';
    } else if (marketCap >= 300_000_000) { // >= $300M
        return 'small_cap';
    } else {
        return 'micro_cap';
    }
}

/**
 * Get raw value from Yahoo Finance API response (handles both formats)
 * 從 Yahoo Finance API 回應取得原始值（處理兩種格式）
 *
 * @param {object|number} val - Value in { raw, fmt } format or plain number
 * @returns {number|null} Raw numeric value
 */
export function getRawValue(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object' && val.raw !== undefined) return val.raw;
    if (typeof val === 'number') return val;
    return null;
}

/**
 * Get formatted value from Yahoo Finance API response
 * 從 Yahoo Finance API 回應取得格式化值
 *
 * @param {object|number|string} val - Value in { raw, fmt } format or plain value
 * @returns {string|null} Formatted string value
 */
export function getFormattedValue(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object' && val.fmt !== undefined) return val.fmt;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return val.toLocaleString();
    return null;
}

/**
 * Format percentage value
 * 格式化百分比值
 *
 * @param {object|number} val - Value to format
 * @returns {string} Formatted percentage string
 */
export function formatPercentValue(val) {
    const raw = getRawValue(val);
    if (raw === null) return 'N/A';

    // Yahoo Finance returns percentages as decimals (e.g., 0.12 for 12%)
    // Yahoo Finance 以小數回傳百分比（例如 0.12 代表 12%）
    const percent = raw * 100;
    return `${percent.toFixed(2)}%`;
}

/**
 * Create { raw, fmt } structure expected by frontend components
 * 建立前端元件預期的 { raw, fmt } 結構
 *
 * @param {number} value - Raw numeric value
 * @param {function} formatter - Formatting function
 * @returns {object} { raw, fmt } object
 */
export function createFmtObject(value, formatter = null) {
    if (value === null || value === undefined) {
        return { raw: null, fmt: 'N/A' };
    }

    const fmt = formatter ? formatter(value) : value.toLocaleString();
    return { raw: value, fmt };
}

/**
 * Create fallback stock info when API fails
 * 當 API 失敗時建立後備股票資訊
 *
 * @param {string} symbol - Stock symbol
 * @param {string} errorMessage - Error message
 * @returns {object} Fallback stock info object
 */
export function createFallbackStockInfo(symbol, errorMessage) {
    return {
        symbol,
        name: symbol,
        currency: 'USD',
        exchange: getDefaultExchange(symbol),
        marketCap: { raw: null, fmt: 'N/A' },
        regularMarketPrice: { raw: null, fmt: 'N/A' },
        regularMarketChange: { raw: null, fmt: 'N/A' },
        regularMarketChangePercent: { raw: null, fmt: 'N/A' },
        fiftyTwoWeekHigh: { raw: null, fmt: 'N/A' },
        fiftyTwoWeekLow: { raw: null, fmt: 'N/A' },
        volume: { raw: null, fmt: 'N/A' },
        averageVolume: { raw: null, fmt: 'N/A' },
        trailingPE: { raw: null, fmt: 'N/A' },
        forwardPE: { raw: null, fmt: 'N/A' },
        dividendYield: { raw: null, fmt: 'N/A' },
        beta: { raw: null, fmt: 'N/A' },
        error: errorMessage,
        source: 'fallback'
    };
}

export default {
    getDefaultExchange,
    getMarketCapCategory,
    getRawValue,
    getFormattedValue,
    formatPercentValue,
    createFmtObject,
    createFallbackStockInfo,
};
