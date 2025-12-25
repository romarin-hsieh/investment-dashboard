/**
 * YFinance Metadata Service
 * 使用 yfinance API 獲取準確的 Sector 和 Industry 資料
 * 每七日或 GitHub 部署時更新，並快取結果
 */

class YFinanceMetadataService {
  constructor() {
    this.baseUrl = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary';
    this.cache = new Map();
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7天快取
    this.lastUpdateKey = 'yfinance_last_update';
    this.cacheKey = 'yfinance_metadata_cache';
    
    // CORS 代理服務列表
    this.corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      'https://cors-anywhere.herokuapp.com/',
      'https://thingproxy.freeboard.io/fetch/',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://yacdn.org/proxy/'
    ];
  }

  /**
   * 檢查是否需要更新資料
   * @returns {boolean} 是否需要更新
   */
  needsUpdate() {
    const lastUpdate = localStorage.getItem(this.lastUpdateKey);
    if (!lastUpdate) return true;
    
    const lastUpdateTime = new Date(lastUpdate).getTime();
    const now = Date.now();
    const daysSinceUpdate = (now - lastUpdateTime) / (24 * 60 * 60 * 1000);
    
    return daysSinceUpdate >= 7;
  }

  /**
   * 檢查是否為新的 GitHub 部署版本
   * @returns {boolean} 是否為新版本
   */
  isNewDeployment() {
    // 檢查是否有版本標記或部署時間戳
    const currentVersion = process.env.VITE_APP_VERSION || 
                          document.querySelector('meta[name="version"]')?.content ||
                          'unknown';
    
    const lastVersion = localStorage.getItem('last_deployment_version');
    
    if (lastVersion !== currentVersion) {
      localStorage.setItem('last_deployment_version', currentVersion);
      return true;
    }
    
    return false;
  }

  /**
   * 從 yfinance API 獲取單個股票的 metadata
   * @param {string} symbol - 股票代號
   * @returns {Promise<Object>} metadata 物件
   */
  async fetchSymbolMetadata(symbol) {
    const modules = 'summaryProfile,defaultKeyStatistics,financialData';
    const url = `${this.baseUrl}/${symbol}?modules=${modules}`;
    
    for (const proxy of this.corsProxies) {
      try {
        console.log(`Fetching ${symbol} metadata via ${proxy}...`);
        
        const response = await fetch(`${proxy}${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.quoteSummary || !data.quoteSummary.result || !data.quoteSummary.result[0]) {
          throw new Error(`Invalid response structure for ${symbol}`);
        }

        const result = data.quoteSummary.result[0];
        const profile = result.summaryProfile || {};
        const keyStats = result.defaultKeyStatistics || {};
        const financialData = result.financialData || {};

        // 提取 sector 和 industry
        const sector = profile.sector || 'Unknown';
        const industry = profile.industry || 'Unknown Industry';
        
        // 提取其他有用資訊
        const marketCap = keyStats.marketCap?.raw || financialData.marketCap?.raw;
        const exchange = profile.exchange || this.getDefaultExchange(symbol);
        const country = profile.country || 'US';
        const website = profile.website || '';
        const employeeCount = profile.fullTimeEmployees || null;
        const businessSummary = profile.longBusinessSummary || '';

        // 判斷市值分類
        const marketCapCategory = this.categorizeMarketCap(marketCap);

        const metadata = {
          symbol: symbol,
          sector: sector,
          industry: industry,
          confidence: 1.0, // yfinance 資料絕對正確
          sources: ['yfinance_api'],
          last_verified_at: new Date().toISOString(),
          market_cap_category: marketCapCategory,
          exchange: exchange,
          country: country,
          website: website,
          employee_count: employeeCount,
          business_summary: businessSummary,
          market_cap: marketCap,
          api_source: 'yfinance'
        };

        console.log(`✅ Successfully fetched ${symbol}:`, {
          sector: metadata.sector,
          industry: metadata.industry,
          exchange: metadata.exchange
        });

        return metadata;

      } catch (error) {
        console.warn(`Failed to fetch ${symbol} via ${proxy}:`, error.message);
        continue;
      }
    }

    // 所有代理都失敗，使用回退資料
    console.error(`All proxies failed for ${symbol}, using fallback data`);
    return this.getFallbackMetadata(symbol);
  }

  /**
   * 批量獲取多個股票的 metadata
   * @param {string[]} symbols - 股票代號陣列
   * @returns {Promise<Map<string, Object>>} symbol 到 metadata 的映射
   */
  async fetchBatchMetadata(symbols) {
    const results = new Map();
    const batchSize = 3; // 避免 API 限制
    const delay = 1000; // 1秒延遲

    console.log(`🚀 Starting batch fetch for ${symbols.length} symbols...`);

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}: ${batch.join(', ')}`);

      const batchPromises = batch.map(symbol => this.fetchSymbolMetadata(symbol));
      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach((metadata, index) => {
        const symbol = batch[index];
        results.set(symbol, metadata);
      });

      // 批次間延遲
      if (i + batchSize < symbols.length) {
        console.log(`Waiting ${delay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`✅ Batch fetch completed: ${results.size}/${symbols.length} symbols`);
    return results;
  }

  /**
   * 更新並快取所有股票的 metadata
   * @param {string[]} symbols - 股票代號陣列
   * @returns {Promise<Object>} 更新結果
   */
  async updateMetadataCache(symbols) {
    try {
      console.log('🔄 Starting metadata cache update...');
      
      const startTime = Date.now();
      const metadataMap = await this.fetchBatchMetadata(symbols);
      const endTime = Date.now();

      // 轉換為快取格式
      const cacheData = {
        last_updated: new Date().toISOString(),
        update_duration_ms: endTime - startTime,
        symbols_count: metadataMap.size,
        items: Array.from(metadataMap.values()),
        sector_grouping: this.generateSectorGrouping(metadataMap),
        confidence_distribution: this.generateConfidenceDistribution(metadataMap),
        data_sources: {
          yfinance_api: metadataMap.size
        }
      };

      // 保存到 localStorage
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      localStorage.setItem(this.lastUpdateKey, new Date().toISOString());

      console.log('✅ Metadata cache updated successfully:', {
        symbols: cacheData.symbols_count,
        duration: `${cacheData.update_duration_ms}ms`,
        sectors: Object.keys(cacheData.sector_grouping).length
      });

      return {
        success: true,
        symbolsUpdated: cacheData.symbols_count,
        duration: cacheData.update_duration_ms,
        sectors: Object.keys(cacheData.sector_grouping)
      };

    } catch (error) {
      console.error('❌ Failed to update metadata cache:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 從快取獲取 metadata
   * @returns {Object|null} 快取的 metadata 或 null
   */
  getCachedMetadata() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const lastUpdate = new Date(data.last_updated).getTime();
      const now = Date.now();

      // 檢查快取是否過期
      if (now - lastUpdate > this.cacheExpiry) {
        console.log('📦 Cache expired, needs refresh');
        return null;
      }

      console.log('📦 Using cached metadata:', {
        symbols: data.symbols_count,
        lastUpdate: data.last_updated,
        age: Math.round((now - lastUpdate) / (60 * 60 * 1000)) + ' hours'
      });

      return data;
    } catch (error) {
      console.error('Failed to load cached metadata:', error);
      return null;
    }
  }

  /**
   * 獲取單個股票的 metadata (優先使用快取)
   * @param {string} symbol - 股票代號
   * @returns {Object|null} metadata 物件或 null
   */
  getSymbolMetadata(symbol) {
    const cached = this.getCachedMetadata();
    if (!cached) return null;

    return cached.items.find(item => item.symbol === symbol) || null;
  }

  /**
   * 獲取所有股票的 metadata (優先使用快取)
   * @param {string[]} symbols - 股票代號陣列
   * @returns {Map<string, Object>} symbol 到 metadata 的映射
   */
  getBatchMetadata(symbols) {
    const cached = this.getCachedMetadata();
    if (!cached) return new Map();

    const results = new Map();
    symbols.forEach(symbol => {
      const metadata = cached.items.find(item => item.symbol === symbol);
      if (metadata) {
        results.set(symbol, metadata);
      }
    });

    return results;
  }

  /**
   * 強制更新 metadata (忽略快取)
   * @param {string[]} symbols - 股票代號陣列
   * @returns {Promise<Object>} 更新結果
   */
  async forceUpdate(symbols) {
    // 清除快取
    localStorage.removeItem(this.cacheKey);
    localStorage.removeItem(this.lastUpdateKey);
    
    return await this.updateMetadataCache(symbols);
  }

  /**
   * 自動更新邏輯 (檢查是否需要更新)
   * @param {string[]} symbols - 股票代號陣列
   * @returns {Promise<Object>} 更新結果或快取資料
   */
  async autoUpdate(symbols) {
    // 檢查是否需要更新
    const needsUpdate = this.needsUpdate();
    const isNewDeployment = this.isNewDeployment();

    if (needsUpdate || isNewDeployment) {
      console.log('🔄 Auto-update triggered:', {
        needsUpdate,
        isNewDeployment,
        lastUpdate: localStorage.getItem(this.lastUpdateKey)
      });
      
      return await this.updateMetadataCache(symbols);
    }

    // 使用快取資料
    const cached = this.getCachedMetadata();
    if (cached) {
      return {
        success: true,
        fromCache: true,
        symbolsCount: cached.symbols_count,
        lastUpdate: cached.last_updated
      };
    }

    // 快取不存在，強制更新
    return await this.updateMetadataCache(symbols);
  }

  /**
   * 市值分類
   * @param {number} marketCap - 市值
   * @returns {string} 市值分類
   */
  categorizeMarketCap(marketCap) {
    if (!marketCap) return 'unknown';
    
    if (marketCap >= 200000000000) return 'mega_cap';      // >= 200B
    if (marketCap >= 10000000000) return 'large_cap';      // >= 10B
    if (marketCap >= 2000000000) return 'mid_cap';         // >= 2B
    if (marketCap >= 300000000) return 'small_cap';        // >= 300M
    return 'micro_cap';                                     // < 300M
  }

  /**
   * 預設 exchange 邏輯
   * @param {string} symbol - 股票代號
   * @returns {string} exchange
   */
  getDefaultExchange(symbol) {
    const nyseSymbols = ['CRM', 'TSM', 'ORCL', 'RDW'];
    return nyseSymbols.includes(symbol) ? 'NYSE' : 'NASDAQ';
  }

  /**
   * 回退 metadata (當 API 完全失敗時)
   * @param {string} symbol - 股票代號
   * @returns {Object} 回退 metadata
   */
  getFallbackMetadata(symbol) {
    const fallbackData = {
      'ASTS': { sector: 'Communication Services', industry: 'Satellite Communications' },
      'RIVN': { sector: 'Consumer Cyclical', industry: 'Electric Vehicles' },
      'PL': { sector: 'Technology', industry: 'Satellite Imaging & Analytics' },
      'ONDS': { sector: 'Technology', industry: 'Industrial IoT Solutions' },
      'RDW': { sector: 'Industrials', industry: 'Space Infrastructure' },
      'AVAV': { sector: 'Industrials', industry: 'Aerospace & Defense' },
      'MDB': { sector: 'Technology', industry: 'Database Software' },
      'ORCL': { sector: 'Technology', industry: 'Enterprise Software' },
      'TSM': { sector: 'Technology', industry: 'Semiconductors' },
      'RKLB': { sector: 'Industrials', industry: 'Aerospace & Defense' },
      'CRM': { sector: 'Technology', industry: 'Enterprise Software' },
      'NVDA': { sector: 'Technology', industry: 'Semiconductors' },
      'AVGO': { sector: 'Technology', industry: 'Semiconductors' },
      'AMZN': { sector: 'Consumer Cyclical', industry: 'Internet Retail' },
      'GOOG': { sector: 'Communication Services', industry: 'Internet Content & Information' },
      'META': { sector: 'Communication Services', industry: 'Internet Content & Information' },
      'NFLX': { sector: 'Communication Services', industry: 'Entertainment' },
      'LEU': { sector: 'Energy', industry: 'Uranium' },
      'SMR': { sector: 'Energy', industry: 'Nuclear Energy' },
      'CRWV': { sector: 'Technology', industry: 'Software - Application' },
      'IONQ': { sector: 'Technology', industry: 'Quantum Computing' },
      'PLTR': { sector: 'Technology', industry: 'Software - Infrastructure' },
      'HIMS': { sector: 'Healthcare', industry: 'Health Information Services' },
      'TSLA': { sector: 'Consumer Cyclical', industry: 'Auto Manufacturers' }
    };

    const fallback = fallbackData[symbol] || { sector: 'Unknown', industry: 'Unknown Industry' };

    return {
      symbol: symbol,
      sector: fallback.sector,
      industry: fallback.industry,
      confidence: 0.8, // 回退資料信心度
      sources: ['fallback_data'],
      last_verified_at: new Date().toISOString(),
      market_cap_category: 'unknown',
      exchange: this.getDefaultExchange(symbol),
      api_source: 'fallback'
    };
  }

  /**
   * 生成 sector 分組統計
   * @param {Map} metadataMap - metadata 映射
   * @returns {Object} sector 分組
   */
  generateSectorGrouping(metadataMap) {
    const grouping = {};
    
    for (const [symbol, metadata] of metadataMap) {
      const sector = metadata.sector || 'Unknown';
      if (!grouping[sector]) {
        grouping[sector] = [];
      }
      grouping[sector].push(symbol);
    }

    return grouping;
  }

  /**
   * 生成信心度分佈統計
   * @param {Map} metadataMap - metadata 映射
   * @returns {Object} 信心度分佈
   */
  generateConfidenceDistribution(metadataMap) {
    const distribution = {
      high_confidence_1_0: 0,
      fallback_confidence_0_8: 0
    };

    for (const [symbol, metadata] of metadataMap) {
      if (metadata.confidence === 1.0) {
        distribution.high_confidence_1_0++;
      } else {
        distribution.fallback_confidence_0_8++;
      }
    }

    return distribution;
  }

  /**
   * 清除快取
   */
  clearCache() {
    localStorage.removeItem(this.cacheKey);
    localStorage.removeItem(this.lastUpdateKey);
    localStorage.removeItem('last_deployment_version');
    console.log('🗑️ YFinance metadata cache cleared');
  }

  /**
   * 獲取快取統計
   * @returns {Object} 快取統計
   */
  getCacheStats() {
    const cached = this.getCachedMetadata();
    const lastUpdate = localStorage.getItem(this.lastUpdateKey);
    
    return {
      hasCachedData: !!cached,
      symbolsCount: cached?.symbols_count || 0,
      lastUpdate: lastUpdate,
      cacheAge: lastUpdate ? Date.now() - new Date(lastUpdate).getTime() : null,
      needsUpdate: this.needsUpdate(),
      isNewDeployment: this.isNewDeployment()
    };
  }
}

// 創建單例實例
export const yfinanceMetadataService = new YFinanceMetadataService();
export default yfinanceMetadataService;