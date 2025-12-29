/**
 * Static Sector Industry Service
 * 使用 GitHub Actions 生成的靜態 JSON 資料，完全避免 CORS 問題
 */

import { paths } from './baseUrl.js';

class StaticSectorIndustryService {
  constructor() {
    this.cache = new Map();
    this.lastFetch = null;
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24小時快取
    // 使用統一的 paths helper，不再 hardcode 路徑
  }

  /**
   * 獲取所有 sector 和 industry 資料
   * @returns {Promise<Object>} 完整的資料物件
   */
  async fetchSectorIndustryData() {
    try {
      // 檢查快取
      if (this.isCacheValid()) {
        console.log('📦 Using cached sector industry data');
        return this.cache.get('data');
      }

      console.log('🔄 Fetching sector industry data from static JSON...');
      
      // 嘗試主要資料來源
      let data = await this.fetchFromUrl(paths.sectorIndustry());
      
      // 如果主要來源失敗，嘗試回退來源
      if (!data) {
        console.log('⚠️ Primary data source failed, trying fallback...');
        data = await this.fetchFromUrl(paths.symbolsMetadata());
      }

      if (!data) {
        throw new Error('Both primary and fallback data sources failed');
      }

      // 驗證資料格式
      if (!this.validateDataFormat(data)) {
        throw new Error('Invalid data format received');
      }

      // 更新快取
      this.cache.set('data', data);
      this.lastFetch = Date.now();

      console.log('✅ Sector industry data loaded successfully:', {
        symbols: data.items?.length || 0,
        sectors: Object.keys(data.sector_grouping || {}).length,
        lastUpdate: data.as_of,
        source: data.refresh_metadata?.update_source || 'unknown'
      });

      return data;

    } catch (error) {
      console.error('❌ Failed to fetch sector industry data:', error);
      
      // 返回最小可用的回退資料
      return this.getMinimalFallbackData();
    }
  }

  /**
   * 從指定 URL 獲取資料
   * @param {string} url - 資料 URL
   * @returns {Promise<Object|null>} 資料物件或 null
   */
  async fetchFromUrl(url) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Successfully fetched data from ${url}`);
      return data;

    } catch (error) {
      console.warn(`❌ Failed to fetch from ${url}:`, error.message);
      return null;
    }
  }

  /**
   * 驗證資料格式
   * @param {Object} data - 要驗證的資料
   * @returns {boolean} 是否有效
   */
  validateDataFormat(data) {
    if (!data || typeof data !== 'object') return false;
    
    // 檢查必要欄位
    if (!Array.isArray(data.items)) return false;
    if (!data.sector_grouping || typeof data.sector_grouping !== 'object') return false;
    
    // 檢查 items 格式
    if (data.items.length > 0) {
      const firstItem = data.items[0];
      if (!firstItem.symbol || !firstItem.sector || !firstItem.industry) {
        return false;
      }
    }

    return true;
  }

  /**
   * 獲取單個股票的 metadata
   * @param {string} symbol - 股票代號
   * @returns {Promise<Object|null>} metadata 物件或 null
   */
  async getSymbolMetadata(symbol) {
    try {
      const data = await this.fetchSectorIndustryData();
      
      if (!data.items) return null;

      const metadata = data.items.find(item => 
        item.symbol && item.symbol.toUpperCase() === symbol.toUpperCase()
      );

      if (metadata) {
        console.log(`✅ Found metadata for ${symbol}:`, {
          sector: metadata.sector,
          industry: metadata.industry,
          exchange: metadata.exchange,
          confidence: metadata.confidence
        });
      } else {
        console.warn(`⚠️ No metadata found for ${symbol}`);
      }

      return metadata || null;

    } catch (error) {
      console.error(`❌ Failed to get metadata for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * 批量獲取多個股票的 metadata
   * @param {string[]} symbols - 股票代號陣列
   * @returns {Promise<Map<string, Object>>} symbol 到 metadata 的映射
   */
  async getBatchMetadata(symbols) {
    try {
      const data = await this.fetchSectorIndustryData();
      const results = new Map();

      if (!data.items) return results;

      // 建立快速查找映射
      const metadataMap = new Map();
      data.items.forEach(item => {
        if (item.symbol) {
          metadataMap.set(item.symbol.toUpperCase(), item);
        }
      });

      // 查找每個請求的股票
      symbols.forEach(symbol => {
        const upperSymbol = symbol.toUpperCase();
        const metadata = metadataMap.get(upperSymbol);
        
        if (metadata) {
          results.set(symbol, metadata);
        }
      });

      console.log(`✅ Batch metadata lookup completed: ${results.size}/${symbols.length} found`);
      return results;

    } catch (error) {
      console.error('❌ Failed to get batch metadata:', error);
      return new Map();
    }
  }

  /**
   * 獲取所有 sector 分組
   * @returns {Promise<Object>} sector 分組物件
   */
  async getSectorGrouping() {
    try {
      const data = await this.fetchSectorIndustryData();
      return data.sector_grouping || {};
    } catch (error) {
      console.error('❌ Failed to get sector grouping:', error);
      return {};
    }
  }

  /**
   * 獲取資料統計
   * @returns {Promise<Object>} 統計資訊
   */
  async getDataStats() {
    try {
      const data = await this.fetchSectorIndustryData();
      
      return {
        totalSymbols: data.items?.length || 0,
        totalSectors: Object.keys(data.sector_grouping || {}).length,
        lastUpdate: data.as_of,
        nextRefresh: data.next_refresh,
        confidenceDistribution: data.confidence_distribution || {},
        dataSources: data.data_sources || {},
        updateSource: data.refresh_metadata?.update_source || 'unknown',
        cacheAge: this.lastFetch ? Date.now() - this.lastFetch : null,
        cacheValid: this.isCacheValid()
      };
    } catch (error) {
      console.error('❌ Failed to get data stats:', error);
      return {
        totalSymbols: 0,
        totalSectors: 0,
        lastUpdate: null,
        error: error.message
      };
    }
  }

  /**
   * 檢查快取是否有效
   * @returns {boolean} 快取是否有效
   */
  isCacheValid() {
    if (!this.lastFetch || !this.cache.has('data')) return false;
    return (Date.now() - this.lastFetch) < this.cacheExpiry;
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.cache.clear();
    this.lastFetch = null;
    console.log('🗑️ Static sector industry cache cleared');
  }

  /**
   * 強制重新載入資料
   * @returns {Promise<Object>} 新的資料物件
   */
  async forceReload() {
    this.clearCache();
    return await this.fetchSectorIndustryData();
  }

  /**
   * 獲取最小回退資料
   * @returns {Object} 最小可用的資料結構
   */
  getMinimalFallbackData() {
    const fallbackSymbols = [
      'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 
      'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
      'CRM', 'NVDA', 'AVGO', 'AMZN', 'GOOG',
      'META', 'NFLX', 'LEU', 'SMR', 'CRWV',
      'IONQ', 'PLTR', 'HIMS', 'TSLA',
      'VST', 'KTOS', 'MELI', 'SOFI', 'RBRK',
      'EOSE', 'CEG', 'TMDX', 'GRAB', 'RBLX',
      'IREN', 'OKLO', 'PATH', 'INTR', 'SE',
      'KSPI', 'LUNR', 'HOOD', 'APP', 'CHYM',
      'NU', 'COIN', 'CRCL', 'IBKR', 'CCJ',
      'UUUU', 'VRT', 'ETN', 'MSFT', 'ADBE',
      'FIG', 'PANW', 'CRWD', 'DDOG', 'DUOL',
      'ZETA', 'AXON', 'ALAB', 'LRCX', 'BWXT',
      'UMAC', 'MP', 'RR'
    ];

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
      'TSLA': { sector: 'Consumer Cyclical', industry: 'Auto Manufacturers' },
      'VST': { sector: 'Utilities', industry: 'Utilities - Independent Power Producers' },
      'KTOS': { sector: 'Industrials', industry: 'Aerospace & Defense' },
      'MELI': { sector: 'Consumer Cyclical', industry: 'Internet Retail' },
      'SOFI': { sector: 'Financial Services', industry: 'Credit Services' },
      'RBRK': { sector: 'Financial Services', industry: 'Asset Management' },
      'EOSE': { sector: 'Industrials', industry: 'Electrical Equipment & Parts' },
      'CEG': { sector: 'Utilities', industry: 'Utilities - Independent Power Producers' },
      'TMDX': { sector: 'Healthcare', industry: 'Medical Devices' },
      'GRAB': { sector: 'Technology', industry: 'Software - Application' },
      'RBLX': { sector: 'Communication Services', industry: 'Electronic Gaming & Multimedia' },
      'IREN': { sector: 'Technology', industry: 'Information Technology Services' },
      'OKLO': { sector: 'Energy', industry: 'Nuclear Energy' },
      'PATH': { sector: 'Technology', industry: 'Software - Infrastructure' },
      'INTR': { sector: 'Financial Services', industry: 'Banks - Regional' },
      'SE': { sector: 'Consumer Cyclical', industry: 'Internet Retail' },
      'KSPI': { sector: 'Financial Services', industry: 'Credit Services' },
      'LUNR': { sector: 'Industrials', industry: 'Aerospace & Defense' },
      'HOOD': { sector: 'Financial Services', industry: 'Capital Markets' },
      'APP': { sector: 'Technology', industry: 'Software - Application' },
      'CHYM': { sector: 'Technology', industry: 'Software - Application' },
      'NU': { sector: 'Financial Services', industry: 'Credit Services' },
      'COIN': { sector: 'Financial Services', industry: 'Capital Markets' },
      'CRCL': { sector: 'Financial Services', industry: 'Capital Markets' },
      'IBKR': { sector: 'Financial Services', industry: 'Capital Markets' },
      'CCJ': { sector: 'Energy', industry: 'Uranium' },
      'UUUU': { sector: 'Energy', industry: 'Uranium' },
      'VRT': { sector: 'Technology', industry: 'Information Technology Services' },
      'ETN': { sector: 'Industrials', industry: 'Electrical Equipment & Parts' },
      'MSFT': { sector: 'Technology', industry: 'Software - Infrastructure' },
      'ADBE': { sector: 'Technology', industry: 'Software - Infrastructure' },
      'FIG': { sector: 'Financial Services', industry: 'Asset Management' },
      'PANW': { sector: 'Technology', industry: 'Software - Infrastructure' },
      'CRWD': { sector: 'Technology', industry: 'Software - Infrastructure' },
      'DDOG': { sector: 'Technology', industry: 'Software - Infrastructure' },
      'DUOL': { sector: 'Consumer Cyclical', industry: 'Education & Training Services' },
      'ZETA': { sector: 'Technology', industry: 'Software - Application' },
      'AXON': { sector: 'Industrials', industry: 'Aerospace & Defense' },
      'ALAB': { sector: 'Technology', industry: 'Semiconductors' },
      'LRCX': { sector: 'Technology', industry: 'Semiconductor Equipment & Materials' },
      'BWXT': { sector: 'Energy', industry: 'Nuclear Energy' },
      'UMAC': { sector: 'Industrials', industry: 'Aerospace & Defense' },
      'MP': { sector: 'Basic Materials', industry: 'Other Industrial Metals & Mining' },
      'RR': { sector: 'Technology', industry: 'Information Technology Services' }
    };

    const items = fallbackSymbols.map(symbol => {
      const data = fallbackData[symbol] || { sector: 'Unknown', industry: 'Unknown Industry' };
      return {
        symbol: symbol,
        sector: data.sector,
        industry: data.industry,
        confidence: 0.7, // 回退資料較低信心度
        sources: ['minimal_fallback'],
        last_verified_at: new Date().toISOString(),
        market_cap_category: 'unknown',
        exchange: ['CRM', 'TSM', 'ORCL', 'RDW', 'PL'].includes(symbol) ? 'NYSE' : 'NASDAQ',
        api_source: 'minimal_fallback'
      };
    });

    // 生成 sector 分組
    const sector_grouping = {};
    items.forEach(item => {
      if (!sector_grouping[item.sector]) {
        sector_grouping[item.sector] = [];
      }
      sector_grouping[item.sector].push(item.symbol);
    });

    return {
      ttl_days: 1,
      as_of: new Date().toISOString(),
      next_refresh: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      items: items,
      sector_grouping: sector_grouping,
      confidence_distribution: {
        fallback_confidence_0_7: items.length
      },
      data_sources: {
        minimal_fallback: items.length
      },
      refresh_metadata: {
        symbols_updated: items.length,
        update_source: 'minimal_fallback',
        note: 'This is minimal fallback data used when all other sources fail'
      }
    };
  }

  /**
   * 檢查資料是否需要更新
   * @returns {Promise<boolean>} 是否需要更新
   */
  async needsUpdate() {
    try {
      const data = await this.fetchSectorIndustryData();
      
      if (!data.next_refresh) return false;
      
      const nextRefresh = new Date(data.next_refresh).getTime();
      const now = Date.now();
      
      return now >= nextRefresh;
    } catch (error) {
      console.error('❌ Failed to check update status:', error);
      return true; // 如果無法檢查，假設需要更新
    }
  }
}

// 創建並導出單例
export const staticSectorIndustryService = new StaticSectorIndustryService();
export default staticSectorIndustryService;