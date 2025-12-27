/**
 * Enhanced Metadata Service
 * 整合多個 metadata 資料來源：
 * 1. GitHub Actions + Python yfinance 靜態資料 (主要)
 * 2. YFinance API with CORS proxy (備用)
 * 3. 靜態回退資料 (最終)
 */

import { yfinanceMetadataService } from './yfinanceMetadataService.js';
import { staticSectorIndustryService } from './staticSectorIndustryService.js';
import { stocksConfig } from './stocksConfigService.js';

class EnhancedMetadataService {
  constructor() {
    this.yfinanceService = yfinanceMetadataService;
    this.staticService = staticSectorIndustryService;
    
    // 資料來源優先級設定
    this.useStaticData = true;      // 優先使用 GitHub Actions 生成的靜態資料
    this.useYFinanceAPI = false;    // CORS proxy 不穩定，預設關閉
    this.fallbackToStatic = true;   // 允許回退到內建靜態資料
    
    console.log('📊 Enhanced Metadata Service initialized:', {
      staticData: this.useStaticData,
      yfinanceAPI: this.useYFinanceAPI,
      fallback: this.fallbackToStatic
    });
  }

  /**
   * 設定是否使用靜態資料 (GitHub Actions 生成)
   * @param {boolean} useStatic - 是否使用靜態資料
   */
  setUseStaticData(useStatic) {
    this.useStaticData = useStatic;
    console.log(`Static data mode: ${useStatic ? 'enabled' : 'disabled'}`);
  }

  /**
   * 設定是否使用 YFinance API
   * @param {boolean} useAPI - 是否使用 API
   */
  setUseYFinanceAPI(useAPI) {
    this.useYFinanceAPI = useAPI;
    console.log(`YFinance API mode: ${useAPI ? 'enabled' : 'disabled'}`);
  }

  /**
   * 設定是否允許回退到靜態資料
   * @param {boolean} allowFallback - 是否允許回退
   */
  setFallbackToStatic(allowFallback) {
    this.fallbackToStatic = allowFallback;
    console.log(`Static fallback: ${allowFallback ? 'enabled' : 'disabled'}`);
  }

  /**
   * 獲取單個股票的 metadata
   * @param {string} symbol - 股票代號
   * @returns {Promise<Object|null>} metadata 物件
   */
  async getSymbolMetadata(symbol) {
    try {
      // 1. 優先使用 GitHub Actions 生成的靜態資料
      if (this.useStaticData) {
        const staticMetadata = await this.staticService.getSymbolMetadata(symbol);
        if (staticMetadata) {
          console.log(`✅ Using static data for ${symbol}: ${staticMetadata.sector} - ${staticMetadata.industry}`);
          return staticMetadata;
        }
        console.log(`⚠️ No static data found for ${symbol}, trying other sources...`);
      }

      // 2. 嘗試 YFinance API (如果啟用)
      if (this.useYFinanceAPI) {
        // 從快取獲取
        const cached = this.yfinanceService.getSymbolMetadata(symbol);
        if (cached) {
          console.log(`📦 Using cached YFinance data for ${symbol}`);
          return cached;
        }

        // 檢查是否需要更新
        const symbols = await stocksConfig.getEnabledSymbols();
        const updateResult = await this.yfinanceService.autoUpdate(symbols);
        
        if (updateResult.success) {
          // 更新後重新獲取
          const updated = this.yfinanceService.getSymbolMetadata(symbol);
          if (updated) {
            console.log(`🔄 Using updated YFinance data for ${symbol}`);
            return updated;
          }
        }
      }

      // 3. 回退到內建靜態資料
      if (this.fallbackToStatic) {
        console.log(`🔄 Using fallback static data for ${symbol}`);
        return await this.getBuiltinStaticMetadata(symbol);
      }

      return null;

    } catch (error) {
      console.error(`Failed to get metadata for ${symbol}:`, error);
      
      if (this.fallbackToStatic) {
        return await this.getBuiltinStaticMetadata(symbol);
      }
      
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
      // 1. 優先使用 GitHub Actions 生成的靜態資料
      if (this.useStaticData) {
        const staticResults = await this.staticService.getBatchMetadata(symbols);
        if (staticResults.size === symbols.length) {
          console.log(`✅ Using complete static data for ${staticResults.size} symbols`);
          return staticResults;
        } else if (staticResults.size > 0) {
          console.log(`⚠️ Partial static data: ${staticResults.size}/${symbols.length} symbols found`);
          
          // 對於缺失的股票，嘗試其他來源
          const missingSymbols = symbols.filter(symbol => !staticResults.has(symbol));
          console.log(`🔍 Missing symbols: ${missingSymbols.join(', ')}`);
          
          // 嘗試從其他來源獲取缺失的股票
          const additionalResults = await this.getBatchFromOtherSources(missingSymbols);
          
          // 合併結果
          for (const [symbol, metadata] of additionalResults) {
            staticResults.set(symbol, metadata);
          }
          
          return staticResults;
        }
        console.log(`⚠️ No static data available, trying other sources...`);
      }

      // 2. 嘗試 YFinance API (如果啟用)
      if (this.useYFinanceAPI) {
        // 從快取獲取
        const cached = this.yfinanceService.getBatchMetadata(symbols);
        
        // 檢查是否所有股票都有快取資料
        if (cached.size === symbols.length) {
          console.log(`📦 Using cached YFinance metadata for ${cached.size} symbols`);
          return cached;
        }

        // 需要更新，執行自動更新
        console.log(`🔄 Cache incomplete (${cached.size}/${symbols.length}), triggering update...`);
        const updateResult = await this.yfinanceService.autoUpdate(symbols);
        
        if (updateResult.success) {
          // 更新後重新獲取
          const updated = this.yfinanceService.getBatchMetadata(symbols);
          if (updated.size > 0) {
            console.log(`✅ Updated YFinance metadata for ${updated.size} symbols`);
            return updated;
          }
        }
      }

      // 3. 回退到內建靜態資料
      if (this.fallbackToStatic) {
        console.log('🔄 Falling back to builtin static metadata...');
        return await this.getBuiltinStaticBatchMetadata(symbols);
      }

      return new Map();

    } catch (error) {
      console.error('Failed to get batch metadata:', error);
      
      if (this.fallbackToStatic) {
        return await this.getBuiltinStaticBatchMetadata(symbols);
      }
      
      return new Map();
    }
  }

  /**
   * 從其他來源獲取缺失的股票資料
   * @param {string[]} symbols - 缺失的股票代號
   * @returns {Promise<Map<string, Object>>} 獲取到的 metadata
   */
  async getBatchFromOtherSources(symbols) {
    const results = new Map();

    // 嘗試 YFinance API
    if (this.useYFinanceAPI) {
      try {
        const yfinanceResults = await this.yfinanceService.fetchBatchMetadata(symbols);
        for (const [symbol, metadata] of yfinanceResults) {
          results.set(symbol, metadata);
        }
      } catch (error) {
        console.warn('Failed to get missing symbols from YFinance API:', error);
      }
    }

    // 對於仍然缺失的股票，使用內建回退資料
    const stillMissing = symbols.filter(symbol => !results.has(symbol));
    if (stillMissing.length > 0) {
      const fallbackResults = await this.getBuiltinStaticBatchMetadata(stillMissing);
      for (const [symbol, metadata] of fallbackResults) {
        results.set(symbol, metadata);
      }
    }

    return results;
  }

  /**
   * 強制更新所有 metadata
   * @param {string[]} symbols - 股票代號陣列
   * @returns {Promise<Object>} 更新結果
   */
  async forceUpdate(symbols) {
    const results = [];

    // 1. 強制重新載入靜態資料
    if (this.useStaticData) {
      try {
        console.log('🔄 Force reloading static data...');
        const staticData = await this.staticService.forceReload();
        results.push({
          source: 'static_data',
          success: true,
          symbolsCount: staticData.items?.length || 0
        });
      } catch (error) {
        console.error('Failed to force reload static data:', error);
        results.push({
          source: 'static_data',
          success: false,
          error: error.message
        });
      }
    }

    // 2. 強制更新 YFinance API 資料
    if (this.useYFinanceAPI) {
      try {
        console.log('🔄 Force updating YFinance API data...');
        const yfinanceResult = await this.yfinanceService.forceUpdate(symbols);
        results.push({
          source: 'yfinance_api',
          ...yfinanceResult
        });
      } catch (error) {
        console.error('Failed to force update YFinance API:', error);
        results.push({
          source: 'yfinance_api',
          success: false,
          error: error.message
        });
      }
    }

    // 統計結果
    const successCount = results.filter(r => r.success).length;
    const totalSources = results.length;

    return {
      success: successCount > 0,
      totalSources,
      successCount,
      results,
      message: `Updated ${successCount}/${totalSources} data sources`
    };
  }

  /**
   * 檢查更新狀態
   * @returns {Promise<Object>} 更新狀態資訊
   */
  async getUpdateStatus() {
    const yfinanceStats = this.yfinanceService.getCacheStats();
    const staticStats = await this.staticService.getDataStats();
    
    return {
      useStaticData: this.useStaticData,
      useYFinanceAPI: this.useYFinanceAPI,
      fallbackToStatic: this.fallbackToStatic,
      
      // 靜態資料狀態
      staticData: {
        available: staticStats.totalSymbols > 0,
        symbolsCount: staticStats.totalSymbols,
        sectorsCount: staticStats.totalSectors,
        lastUpdate: staticStats.lastUpdate,
        nextRefresh: staticStats.nextRefresh,
        updateSource: staticStats.updateSource,
        cacheValid: staticStats.cacheValid
      },
      
      // YFinance API 狀態
      yfinanceAPI: {
        hasCachedData: yfinanceStats.hasCachedData,
        symbolsCount: yfinanceStats.symbolsCount,
        lastUpdate: yfinanceStats.lastUpdate,
        cacheAge: yfinanceStats.cacheAge,
        needsUpdate: yfinanceStats.needsUpdate,
        isNewDeployment: yfinanceStats.isNewDeployment,
        cacheAgeHours: yfinanceStats.cacheAge ? Math.round(yfinanceStats.cacheAge / (60 * 60 * 1000)) : null,
        cacheAgeDays: yfinanceStats.cacheAge ? Math.round(yfinanceStats.cacheAge / (24 * 60 * 60 * 1000)) : null
      },
      
      // 整體狀態
      overall: {
        primarySource: this.useStaticData ? 'static_data' : (this.useYFinanceAPI ? 'yfinance_api' : 'fallback'),
        dataAvailable: staticStats.totalSymbols > 0 || yfinanceStats.hasCachedData,
        recommendedAction: this.getRecommendedAction(staticStats, yfinanceStats)
      }
    };
  }

  /**
   * 獲取推薦操作
   * @param {Object} staticStats - 靜態資料統計
   * @param {Object} yfinanceStats - YFinance 統計
   * @returns {string} 推薦操作
   */
  getRecommendedAction(staticStats, yfinanceStats) {
    if (staticStats.totalSymbols > 0 && staticStats.cacheValid) {
      return 'no_action_needed';
    }
    
    if (this.useStaticData && staticStats.totalSymbols === 0) {
      return 'check_github_actions';
    }
    
    if (this.useYFinanceAPI && yfinanceStats.needsUpdate) {
      return 'update_yfinance_cache';
    }
    
    return 'use_fallback_data';
  }

  /**
   * 清除所有快取
   */
  clearAllCache() {
    // 清除靜態服務快取
    this.staticService.clearCache();
    
    // 清除 YFinance 服務快取
    this.yfinanceService.clearCache();
    
    // 清除其他相關快取
    const cacheKeys = [
      'metadata_cache',
      'dynamic_metadata_cache',
      'static_metadata_cache'
    ];
    
    cacheKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('🗑️ All metadata cache cleared');
  }

  /**
   * 從內建靜態資料獲取 metadata
   * @param {string} symbol - 股票代號
   * @returns {Promise<Object|null>} metadata 物件
   */
  async getBuiltinStaticMetadata(symbol) {
    const staticData = {
      'ASTS': { sector: 'Communication Services', industry: 'Satellite Communications', exchange: 'NASDAQ' },
      'RIVN': { sector: 'Consumer Cyclical', industry: 'Electric Vehicles', exchange: 'NASDAQ' },
      'PL': { sector: 'Technology', industry: 'Satellite Imaging & Analytics', exchange: 'NYSE' },
      'ONDS': { sector: 'Technology', industry: 'Industrial IoT Solutions', exchange: 'NASDAQ' },
      'RDW': { sector: 'Industrials', industry: 'Space Infrastructure', exchange: 'NYSE' },
      'AVAV': { sector: 'Industrials', industry: 'Aerospace & Defense', exchange: 'NASDAQ' },
      'MDB': { sector: 'Technology', industry: 'Database Software', exchange: 'NASDAQ' },
      'ORCL': { sector: 'Technology', industry: 'Enterprise Software', exchange: 'NYSE' },
      'TSM': { sector: 'Technology', industry: 'Semiconductors', exchange: 'NYSE' },
      'RKLB': { sector: 'Industrials', industry: 'Aerospace & Defense', exchange: 'NASDAQ' },
      'CRM': { sector: 'Technology', industry: 'Enterprise Software', exchange: 'NYSE' },
      'NVDA': { sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ' },
      'AVGO': { sector: 'Technology', industry: 'Semiconductors', exchange: 'NASDAQ' },
      'AMZN': { sector: 'Consumer Cyclical', industry: 'Internet Retail', exchange: 'NASDAQ' },
      'GOOG': { sector: 'Communication Services', industry: 'Internet Content & Information', exchange: 'NASDAQ' },
      'META': { sector: 'Communication Services', industry: 'Internet Content & Information', exchange: 'NASDAQ' },
      'NFLX': { sector: 'Communication Services', industry: 'Entertainment', exchange: 'NASDAQ' },
      'LEU': { sector: 'Energy', industry: 'Uranium', exchange: 'NASDAQ' },
      'SMR': { sector: 'Energy', industry: 'Nuclear Energy', exchange: 'NASDAQ' },
      'CRWV': { sector: 'Technology', industry: 'Software - Application', exchange: 'NASDAQ' },
      'IONQ': { sector: 'Technology', industry: 'Quantum Computing', exchange: 'NASDAQ' },
      'PLTR': { sector: 'Technology', industry: 'Software - Infrastructure', exchange: 'NASDAQ' },
      'HIMS': { sector: 'Healthcare', industry: 'Health Information Services', exchange: 'NASDAQ' },
      'TSLA': { sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', exchange: 'NASDAQ' }
    };

    const data = staticData[symbol];
    if (!data) return null;

    return {
      symbol: symbol,
      sector: data.sector,
      industry: data.industry,
      confidence: 0.8,
      sources: ['builtin_static'],
      last_verified_at: new Date().toISOString(),
      market_cap_category: 'unknown',
      exchange: data.exchange,
      api_source: 'builtin_static'
    };
  }

  /**
   * 從內建靜態資料批量獲取 metadata
   * @param {string[]} symbols - 股票代號陣列
   * @returns {Promise<Map<string, Object>>} symbol 到 metadata 的映射
   */
  async getBuiltinStaticBatchMetadata(symbols) {
    const results = new Map();

    for (const symbol of symbols) {
      const metadata = await this.getBuiltinStaticMetadata(symbol);
      if (metadata) {
        results.set(symbol, metadata);
      }
    }

    console.log(`📄 Loaded builtin static metadata for ${results.size}/${symbols.length} symbols`);
    return results;
  }

  /**
   * 獲取 sector 分組 (用於 StockOverview)
   * @param {string[]} symbols - 股票代號陣列
   * @returns {Promise<Object>} sector 分組
   */
  async getSectorGrouping(symbols) {
    // 優先使用靜態服務的分組功能
    if (this.useStaticData) {
      try {
        const grouping = await this.staticService.getSectorGrouping();
        if (Object.keys(grouping).length > 0) {
          // 過濾只包含請求的股票
          const filteredGrouping = {};
          for (const [sector, sectorSymbols] of Object.entries(grouping)) {
            const matchingSymbols = sectorSymbols.filter(s => symbols.includes(s));
            if (matchingSymbols.length > 0) {
              filteredGrouping[sector] = matchingSymbols;
            }
          }
          return filteredGrouping;
        }
      } catch (error) {
        console.warn('Failed to get sector grouping from static service:', error);
      }
    }

    // 回退到基於 metadata 的分組
    const metadataMap = await this.getBatchMetadata(symbols);
    const grouping = {};

    for (const [symbol, metadata] of metadataMap) {
      // 根據信心度決定分類
      let sector = 'Unknown';
      if (metadata.confidence >= 0.7) {
        sector = metadata.sector || 'Unknown';
      }

      if (!grouping[sector]) {
        grouping[sector] = [];
      }

      grouping[sector].push(symbol);
    }

    return grouping;
  }

  /**
   * 獲取詳細統計資訊
   * @returns {Promise<Object>} 統計資訊
   */
  async getDetailedStats() {
    const symbols = await stocksConfig.getEnabledSymbols();
    const metadataMap = await this.getBatchMetadata(symbols);
    const updateStatus = await this.getUpdateStatus();

    // 統計 sector 分佈
    const sectorStats = {};
    const industryStats = {};
    const confidenceStats = { high: 0, medium: 0, low: 0 };
    const sourceStats = { static: 0, yfinance: 0, builtin: 0, fallback: 0 };

    for (const [, metadata] of metadataMap) {
      // Sector 統計
      const sector = metadata.sector || 'Unknown';
      sectorStats[sector] = (sectorStats[sector] || 0) + 1;

      // Industry 統計
      const industry = metadata.industry || 'Unknown Industry';
      industryStats[industry] = (industryStats[industry] || 0) + 1;

      // 信心度統計
      if (metadata.confidence >= 0.9) {
        confidenceStats.high++;
      } else if (metadata.confidence >= 0.7) {
        confidenceStats.medium++;
      } else {
        confidenceStats.low++;
      }

      // 來源統計
      const apiSource = metadata.api_source || 'unknown';
      if (apiSource === 'yfinance_python' || apiSource === 'yfinance') {
        sourceStats.yfinance++;
      } else if (apiSource === 'static_file' || metadata.sources?.includes('yfinance_python')) {
        sourceStats.static++;
      } else if (apiSource === 'builtin_static') {
        sourceStats.builtin++;
      } else {
        sourceStats.fallback++;
      }
    }

    return {
      updateStatus,
      totalSymbols: metadataMap.size,
      sectorCount: Object.keys(sectorStats).length,
      industryCount: Object.keys(industryStats).length,
      sectorStats,
      industryStats,
      confidenceStats,
      sourceStats,
      dataQuality: {
        completeness: (metadataMap.size / symbols.length * 100).toFixed(1) + '%',
        highConfidence: (confidenceStats.high / metadataMap.size * 100).toFixed(1) + '%',
        staticData: (sourceStats.static / metadataMap.size * 100).toFixed(1) + '%',
        yfinanceData: (sourceStats.yfinance / metadataMap.size * 100).toFixed(1) + '%'
      }
    };
  }
}

// 創建單例實例
export const enhancedMetadataService = new EnhancedMetadataService();
export default enhancedMetadataService;