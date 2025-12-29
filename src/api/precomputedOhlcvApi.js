// Precomputed OHLCV API
// Provides precomputed OHLCV data for MFI Volume Profile calculations

class PrecomputedOhlcvApi {
  constructor() {
    this.baseUrl = './data/ohlcv'; // Static data directory (相對路徑支援 GitHub Pages)
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes cache
  }

  /**
   * Get OHLCV data for a symbol
   * @param {string} symbol - Stock symbol (e.g., 'AAPL')
   * @param {string} period - Time period ('1d', '1w', '1m')
   * @param {number} days - Number of days of data (default: 90)
   * @returns {Promise<Object>} OHLCV data with timestamps
   */
  async getOhlcv(symbol, period = '1d', days = 90) {
    const cacheKey = `${symbol}_${period}_${days}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📊 Using cached OHLCV data for ${symbol}`);
        return cached.data;
      }
    }

    try {
      // Try to fetch precomputed data
      const filename = `${symbol.toLowerCase()}_${period}_${days}d.json`;
      const url = `${this.baseUrl}/${filename}`;
      
      console.log(`📊 Fetching precomputed OHLCV data: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Precomputed data not found: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Validate data structure
      if (!this.validateOhlcvData(data)) {
        throw new Error('Invalid OHLCV data structure');
      }
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });
      
      console.log(`📊 Successfully loaded ${data.timestamps.length} OHLCV data points for ${symbol}`);
      return data;
      
    } catch (error) {
      console.warn(`📊 Precomputed OHLCV data failed for ${symbol}:`, error.message);
      // 不要 throw，回傳 null 讓上層 fallback
      return null;
    }
  }

  /**
   * Validate OHLCV data structure
   * @param {Object} data - OHLCV data object
   * @returns {boolean} True if valid
   */
  validateOhlcvData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }
    
    const requiredFields = ['timestamps', 'open', 'high', 'low', 'close', 'volume'];
    
    for (const field of requiredFields) {
      if (!Array.isArray(data[field])) {
        console.error(`Missing or invalid field: ${field}`);
        return false;
      }
    }
    
    // Check that all arrays have the same length
    const length = data.timestamps.length;
    for (const field of requiredFields) {
      if (data[field].length !== length) {
        console.error(`Length mismatch for field ${field}: expected ${length}, got ${data[field].length}`);
        return false;
      }
    }
    
    // Check for minimum data points
    if (length < 20) {
      console.error(`Insufficient data points: ${length} < 20`);
      return false;
    }
    
    return true;
  }

  /**
   * Get available symbols with precomputed data
   * @returns {Promise<Array>} Array of available symbols
   */
  async getAvailableSymbols() {
    try {
      const response = await fetch(`${this.baseUrl}/index.json`);
      if (!response.ok) {
        throw new Error('Index file not found');
      }
      
      const index = await response.json();
      return index.symbols || [];
      
    } catch (error) {
      console.warn('📊 Could not load precomputed data index:', error.message);
      return [];
    }
  }

  /**
   * Check if precomputed data is available for a symbol
   * @param {string} symbol - Stock symbol
   * @param {string} period - Time period
   * @param {number} days - Number of days
   * @returns {Promise<boolean>} True if available
   */
  async isAvailable(symbol, period = '1d', days = 90) {
    try {
      await this.getOhlcv(symbol, period, days);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('📊 Precomputed OHLCV cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const stats = {};
    for (const [key, value] of this.cache.entries()) {
      stats[key] = {
        age: Date.now() - value.timestamp,
        expired: Date.now() - value.timestamp > this.cacheTimeout
      };
    }
    return stats;
  }
}

// Create singleton instance
export const precomputedOhlcvApi = new PrecomputedOhlcvApi();
export default precomputedOhlcvApi;