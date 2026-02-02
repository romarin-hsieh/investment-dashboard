/**
 * Finnhub Exchange Service
 * 使用 Finnhub API 獲取股票的正確交易所信息
 */

class FinnhubExchangeService {
  constructor() {
    this.apiKey = 'd56iuopr01qkgd81vo8gd56iuopr01qkgd81vo90';
    this.baseUrl = 'https://finnhub.io/api/v1';
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 小時緩存
    
    // TradingView 認可的交易所格式
    this.validExchanges = [
      'NYSE', 'NASDAQ', 'AMEX', 'OTC', 'TSX', 'TSXV', 'LSE', 'EURONEXT',
      'XETR', 'FWB', 'SIX', 'MIL', 'BME', 'TSE', 'TWSE', 'HKEX', 'SSE',
      'SZSE', 'KRX', 'NSE', 'BSE', 'ASX', 'SGX', 'SET', 'TADAWUL', 'JSE',
      'BMV', 'BMFBOVESPA', 'IDX', 'TASE', 'BIST', 'GPW', 'RUS'
    ];
  }

  /**
   * 獲取股票的交易所信息
   * @param {string} symbol - 股票代號
   * @returns {Promise<string>} - 交易所代號
   */
  async getExchange(symbol) {
    try {
      // 檢查快取
      const cacheKey = `exchange_${symbol}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log(`Using cached exchange for ${symbol}: ${cached.exchange}`);
          return cached.exchange;
        }
      }

      // 從 Finnhub API 獲取
      console.log(`Fetching exchange info for ${symbol} from Finnhub...`);
      const response = await fetch(
        `${this.baseUrl}/stock/profile2?symbol=${symbol}&token=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || !data.exchange) {
        throw new Error(`No exchange data found for ${symbol}`);
      }

      // 解析和匹配交易所
      const rawExchange = data.exchange;
      const mappedExchange = this.mapExchange(rawExchange);
      
      console.log(`${symbol}: ${rawExchange} → ${mappedExchange}`);

      // 快取結果
      this.cache.set(cacheKey, {
        exchange: mappedExchange,
        rawExchange: rawExchange,
        timestamp: Date.now()
      });

      return mappedExchange;

    } catch (error) {
      console.error(`Failed to get exchange for ${symbol}:`, error);
      
      // 回退到預設邏輯
      return this.getDefaultExchange(symbol);
    }
  }

  /**
   * 將 Finnhub 返回的交易所字串映射到 TradingView 格式
   * @param {string} rawExchange - Finnhub 返回的原始交易所字串
   * @returns {string} - TradingView 格式的交易所代號
   */
  mapExchange(rawExchange) {
    if (!rawExchange) return 'NASDAQ'; // 預設值

    const upperExchange = rawExchange.toUpperCase();

    // 直接匹配
    for (const validExchange of this.validExchanges) {
      if (upperExchange.includes(validExchange)) {
        return validExchange;
      }
    }

    // 特殊映射規則
    const mappingRules = {
      'NASDAQ/NMS (GLOBAL MARKET)': 'NASDAQ',
      'NASDAQ/NMS (GLOBAL SELECT MARKET)': 'NASDAQ',
      'NASDAQ/NMS (CAPITAL MARKET)': 'NASDAQ',
      'NASDAQ GLOBAL MARKET': 'NASDAQ',
      'NASDAQ GLOBAL SELECT MARKET': 'NASDAQ',
      'NASDAQ CAPITAL MARKET': 'NASDAQ',
      'NEW YORK STOCK EXCHANGE': 'NYSE',
      'NYSE AMERICAN': 'AMEX',
      'NYSE ARCA': 'NYSE',
      'CBOE BZX EXCHANGE': 'NASDAQ', // 通常歸類為 NASDAQ
      'OVER THE COUNTER': 'OTC',
      'OTC MARKETS': 'OTC'
    };

    for (const [pattern, exchange] of Object.entries(mappingRules)) {
      if (upperExchange.includes(pattern)) {
        return exchange;
      }
    }

    // 如果都沒匹配到，記錄警告並返回預設值
    console.warn(`Unknown exchange format: ${rawExchange}, using default NASDAQ`);
    return 'NASDAQ';
  }

  /**
   * 預設交易所邏輯（作為回退）
   * @param {string} symbol - 股票代號
   * @returns {string} - 交易所代號
   */
  getDefaultExchange(symbol) {
    // 已知的 NYSE 股票
    const nyseSymbols = ['CRM', 'TSM', 'ORCL', 'RDW'];
    
    // 已知的 NASDAQ 股票
    const nasdaqSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'NVDA', 'META', 
      'NFLX', 'RKLB', 'ASTS', 'RIVN', 'MDB', 'ONDS', 'PL', 'AVAV', 
      'AVGO', 'LEU', 'SMR', 'CRWV', 'IONQ', 'PLTR', 'HIMS'
    ];

    if (nyseSymbols.includes(symbol)) {
      return 'NYSE';
    } else if (nasdaqSymbols.includes(symbol)) {
      return 'NASDAQ';
    }

    return 'NASDAQ'; // 預設值
  }

  /**
   * 批量獲取多個股票的交易所信息
   * @param {string[]} symbols - 股票代號陣列
   * @param {number} maxConcurrent - 最大並發請求數
   * @returns {Promise<Map<string, string>>} - 股票代號到交易所的映射
   */
  async getBatchExchanges(symbols, maxConcurrent = 3) {
    const results = new Map();
    const batches = [];

    // 分批處理
    for (let i = 0; i < symbols.length; i += maxConcurrent) {
      batches.push(symbols.slice(i, i + maxConcurrent));
    }

    console.log(`Processing ${symbols.length} symbols in ${batches.length} batches`);

    for (const batch of batches) {
      const batchPromises = batch.map(async symbol => {
        try {
          const exchange = await this.getExchange(symbol);
          return { symbol, exchange, success: true };
        } catch (error) {
          console.error(`Failed to get exchange for ${symbol}:`, error);
          return { 
            symbol, 
            exchange: this.getDefaultExchange(symbol), 
            success: false 
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(result => {
        results.set(result.symbol, result.exchange);
      });

      // 批次間延遲，避免 API 限制
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.cache.clear();
    console.log('Exchange cache cleared');
  }

  /**
   * 獲取快取統計
   */
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      entries: []
    };

    for (const [key, value] of this.cache.entries()) {
      stats.entries.push({
        symbol: key.replace('exchange_', ''),
        exchange: value.exchange,
        rawExchange: value.rawExchange,
        age: Date.now() - value.timestamp,
        expired: Date.now() - value.timestamp > this.cacheTimeout
      });
    }

    return stats;
  }

  /**
   * 驗證交易所格式是否有效
   * @param {string} exchange - 交易所代號
   * @returns {boolean} - 是否為有效格式
   */
  isValidExchange(exchange) {
    return this.validExchanges.includes(exchange);
  }
}

// 創建單例實例
export const finnhubExchangeService = new FinnhubExchangeService();
export default finnhubExchangeService;