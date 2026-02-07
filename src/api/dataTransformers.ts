/**
 * Data Transformers - Utility functions for data format conversion
 * 資料轉換器 - 資料格式轉換的工具函式
 *
 * This module handles data transformation and formatting for Yahoo Finance data.
 * 此模組處理 Yahoo Finance 資料的轉換與格式化。
 *
 * @module api/dataTransformers
 */

// Type Definitions / 型別定義
export type Exchange = 'NASDAQ' | 'NYSE';
export type MarketCapCategory = 'mega_cap' | 'large_cap' | 'mid_cap' | 'small_cap' | 'micro_cap' | 'unknown';

export interface RawFmtValue {
    raw: number | null;
    fmt: string;
}

export interface YahooFinanceValue {
    raw?: number;
    fmt?: string;
}

export interface FallbackStockInfo {
    symbol: string;
    name: string;
    currency: string;
    exchange: Exchange;
    marketCap: RawFmtValue;
    regularMarketPrice: RawFmtValue;
    regularMarketChange: RawFmtValue;
    regularMarketChangePercent: RawFmtValue;
    fiftyTwoWeekHigh: RawFmtValue;
    fiftyTwoWeekLow: RawFmtValue;
    volume: RawFmtValue;
    averageVolume: RawFmtValue;
    trailingPE: RawFmtValue;
    forwardPE: RawFmtValue;
    dividendYield: RawFmtValue;
    beta: RawFmtValue;
    error: string;
    source: 'fallback';
}

// Known symbol lists for exchange determination
// 用於判斷交易所的已知股票清單
const NASDAQ_SYMBOLS: readonly string[] = [
    'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
    'RKLB', 'ASTS', 'RIVN', 'MDB', 'ONDS', 'PL', 'AVAV', 'CRM', 'AVGO',
    'LEU', 'SMR', 'CRWV', 'IONQ', 'PLTR', 'HIMS', 'FTNT', 'WDC', 'CSCO'
] as const;

const NYSE_SYMBOLS: readonly string[] = ['TSM', 'ORCL', 'RDW', 'GLW'] as const;

/**
 * Get default exchange for a symbol based on known lists
 * 根據已知清單取得股票代號的預設交易所
 *
 * @param symbol - Stock symbol / 股票代號
 * @returns Exchange name / 交易所名稱
 */
export function getDefaultExchange(symbol: string): Exchange {
    if (NASDAQ_SYMBOLS.includes(symbol)) {
        return 'NASDAQ';
    } else if (NYSE_SYMBOLS.includes(symbol)) {
        return 'NYSE';
    }
    return 'NASDAQ'; // Default
}

/**
 * Categorize market cap into size buckets
 * 將市值分類至規模區間
 *
 * @param marketCap - Market capitalization in USD / 市值（美元）
 * @returns Category / 分類
 */
export function getMarketCapCategory(marketCap: number | null | undefined): MarketCapCategory {
    if (!marketCap || marketCap <= 0) {
        return 'unknown';
    }

    // Market cap categories (USD) / 市值分類（美元）
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
 * @param val - Value in { raw, fmt } format or plain number
 * @returns Raw numeric value / 原始數值
 */
export function getRawValue(val: YahooFinanceValue | number | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object' && val.raw !== undefined) return val.raw;
    if (typeof val === 'number') return val;
    return null;
}

/**
 * Get formatted value from Yahoo Finance API response
 * 從 Yahoo Finance API 回應取得格式化值
 *
 * @param val - Value in { raw, fmt } format or plain value
 * @returns Formatted string value / 格式化字串值
 */
export function getFormattedValue(val: YahooFinanceValue | number | string | null | undefined): string | null {
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
 * @param val - Value to format / 要格式化的值
 * @returns Formatted percentage string / 格式化的百分比字串
 */
export function formatPercentValue(val: YahooFinanceValue | number | null | undefined): string {
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
 * @param value - Raw numeric value / 原始數值
 * @param formatter - Formatting function / 格式化函式
 * @returns { raw, fmt } object
 */
export function createFmtObject(
    value: number | null | undefined,
    formatter: ((val: number) => string) | null = null
): RawFmtValue {
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
 * @param symbol - Stock symbol / 股票代號
 * @param errorMessage - Error message / 錯誤訊息
 * @returns Fallback stock info object / 後備股票資訊物件
 */
export function createFallbackStockInfo(symbol: string, errorMessage: string): FallbackStockInfo {
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
