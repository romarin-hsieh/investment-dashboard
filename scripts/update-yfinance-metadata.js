#!/usr/bin/env node

/**
 * YFinance Metadata 更新腳本
 * 每七日或 GitHub 部署時執行，更新 Sector 和 Industry 資料
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class YFinanceMetadataUpdater {
  constructor() {
    this.baseUrl = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary';
    this.metadataPath = path.join(__dirname, '../public/data/symbols_metadata.json');
    this.backupPath = path.join(__dirname, '../public/data/symbols_metadata_backup.json');
    
    // CORS 代理服務列表
    this.corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      'https://cors-anywhere.herokuapp.com/',
      'https://thingproxy.freeboard.io/fetch/',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://yacdn.org/proxy/'
    ];

    // 配置的股票列表
    this.symbols = [
      'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
      'CRM', 'NVDA', 'AVGO', 'AMZN', 'GOOG', 'META', 'NFLX', 'LEU', 'SMR', 'CRWV',
      'IONQ', 'PLTR', 'HIMS', 'TSLA'
    ];
  }

  /**
   * 主要更新流程
   */
  async updateMetadata() {
    try {
      console.log('🚀 開始更新 YFinance Metadata...');
      console.log(`📊 將更新 ${this.symbols.length} 個股票的資料`);

      // 1. 備份現有 metadata
      await this.backupCurrentMetadata();

      // 2. 批量獲取新資料
      const metadataMap = await this.fetchAllMetadata();

      // 3. 生成新的 metadata 文件
      const newMetadata = this.generateMetadataFile(metadataMap);

      // 4. 保存新的 metadata 文件
      await this.saveMetadataFile(newMetadata);

      // 5. 驗證更新結果
      await this.validateUpdate(newMetadata);

      console.log('✅ YFinance Metadata 更新完成！');

    } catch (error) {
      console.error('❌ 更新 YFinance Metadata 失敗:', error);
      
      // 嘗試恢復備份
      await this.restoreBackup();
      process.exit(1);
    }
  }

  /**
   * 備份現有 metadata
   */
  async backupCurrentMetadata() {
    try {
      const exists = await fs.access(this.metadataPath).then(() => true).catch(() => false);
      if (exists) {
        await fs.copyFile(this.metadataPath, this.backupPath);
        console.log('💾 已備份現有 metadata 文件');
      }
    } catch (error) {
      console.warn('⚠️ 備份失敗:', error.message);
    }
  }

  /**
   * 批量獲取所有股票的 metadata
   */
  async fetchAllMetadata() {
    const results = new Map();
    const batchSize = 3;
    const delay = 1000;

    console.log('🔍 開始批量獲取 metadata...');

    for (let i = 0; i < this.symbols.length; i += batchSize) {
      const batch = this.symbols.slice(i, i + batchSize);
      console.log(`處理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(this.symbols.length/batchSize)}: ${batch.join(', ')}`);

      const batchPromises = batch.map(symbol => this.fetchSymbolMetadata(symbol));
      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach((metadata, index) => {
        const symbol = batch[index];
        results.set(symbol, metadata);
      });

      // 批次間延遲
      if (i + batchSize < this.symbols.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`✅ 批量獲取完成: ${results.size}/${this.symbols.length} 個股票`);
    return results;
  }

  /**
   * 獲取單個股票的 metadata
   */
  async fetchSymbolMetadata(symbol) {
    const modules = 'summaryProfile,defaultKeyStatistics,financialData';
    const url = `${this.baseUrl}/${symbol}?modules=${modules}`;
    
    for (const proxy of this.corsProxies) {
      try {
        const response = await fetch(`${proxy}${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.quoteSummary?.result?.[0]) {
          throw new Error('Invalid response structure');
        }

        const result = data.quoteSummary.result[0];
        const profile = result.summaryProfile || {};
        const keyStats = result.defaultKeyStatistics || {};
        const financialData = result.financialData || {};

        const metadata = {
          symbol: symbol,
          sector: profile.sector || 'Unknown',
          industry: profile.industry || 'Unknown Industry',
          confidence: 1.0, // yfinance 資料絕對正確
          sources: ['yfinance_api'],
          last_verified_at: new Date().toISOString(),
          market_cap_category: this.categorizeMarketCap(keyStats.marketCap?.raw || financialData.marketCap?.raw),
          exchange: profile.exchange || this.getDefaultExchange(symbol),
          country: profile.country || 'US',
          website: profile.website || '',
          employee_count: profile.fullTimeEmployees || null,
          business_summary: profile.longBusinessSummary || '',
          market_cap: keyStats.marketCap?.raw || financialData.marketCap?.raw || null
        };

        console.log(`  ✅ ${symbol}: ${metadata.sector} - ${metadata.industry}`);
        return metadata;

      } catch (error) {
        console.warn(`  ⚠️ ${symbol} via ${proxy}: ${error.message}`);
        continue;
      }
    }

    // 所有代理都失敗，使用回退資料
    console.error(`  ❌ ${symbol}: 所有代理失敗，使用回退資料`);
    return this.getFallbackMetadata(symbol);
  }

  /**
   * 生成 metadata 文件結構
   */
  generateMetadataFile(metadataMap) {
    const items = Array.from(metadataMap.values());
    
    // 生成 sector 分組
    const sectorGrouping = {};
    items.forEach(item => {
      const sector = item.sector;
      if (!sectorGrouping[sector]) {
        sectorGrouping[sector] = [];
      }
      sectorGrouping[sector].push(item.symbol);
    });

    // 生成信心度分佈
    const confidenceDistribution = {
      high_confidence_1_0: items.filter(item => item.confidence === 1.0).length,
      fallback_confidence_0_8: items.filter(item => item.confidence < 1.0).length
    };

    // 生成資料來源統計
    const dataSources = {
      yfinance_api: items.filter(item => item.sources.includes('yfinance_api')).length,
      fallback_data: items.filter(item => item.sources.includes('fallback_data')).length
    };

    return {
      ttl_days: 7,
      as_of: new Date().toISOString(),
      next_refresh: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      update_source: 'yfinance_api',
      items: items,
      sector_grouping: sectorGrouping,
      confidence_distribution: confidenceDistribution,
      data_sources: dataSources,
      refresh_metadata: {
        last_refresh_duration_ms: 0, // 將在保存時計算
        symbols_updated: items.length,
        symbols_failed: this.symbols.length - items.length,
        api_success_rate: (dataSources.yfinance_api / items.length * 100).toFixed(1) + '%'
      }
    };
  }

  /**
   * 保存 metadata 文件
   */
  async saveMetadataFile(metadata) {
    try {
      const jsonString = JSON.stringify(metadata, null, 2);
      await fs.writeFile(this.metadataPath, jsonString, 'utf8');
      console.log('💾 Metadata 文件已保存');
    } catch (error) {
      console.error('保存 metadata 文件失敗:', error);
      throw error;
    }
  }

  /**
   * 驗證更新結果
   */
  async validateUpdate(metadata) {
    console.log('🔍 驗證更新結果...');
    
    const stats = {
      totalSymbols: metadata.items.length,
      sectorsCount: Object.keys(metadata.sector_grouping).length,
      highConfidence: metadata.confidence_distribution.high_confidence_1_0,
      apiSuccessRate: metadata.refresh_metadata.api_success_rate
    };

    console.log('📊 更新統計:');
    console.log(`  - 總股票數: ${stats.totalSymbols}`);
    console.log(`  - Sector 數量: ${stats.sectorsCount}`);
    console.log(`  - 高信心度資料: ${stats.highConfidence}`);
    console.log(`  - API 成功率: ${stats.apiSuccessRate}`);

    // 檢查關鍵股票
    const keySymbols = ['CRM', 'NVDA', 'TSLA', 'AAPL'];
    console.log('🔑 關鍵股票檢查:');
    
    keySymbols.forEach(symbol => {
      const item = metadata.items.find(item => item.symbol === symbol);
      if (item) {
        console.log(`  ✅ ${symbol}: ${item.sector} - ${item.industry}`);
      } else {
        console.log(`  ❌ ${symbol}: 未找到資料`);
      }
    });
  }

  /**
   * 恢復備份
   */
  async restoreBackup() {
    try {
      const exists = await fs.access(this.backupPath).then(() => true).catch(() => false);
      if (exists) {
        await fs.copyFile(this.backupPath, this.metadataPath);
        console.log('🔄 已恢復備份文件');
      }
    } catch (error) {
      console.error('恢復備份失敗:', error);
    }
  }

  /**
   * 市值分類
   */
  categorizeMarketCap(marketCap) {
    if (!marketCap) return 'unknown';
    
    if (marketCap >= 200000000000) return 'mega_cap';
    if (marketCap >= 10000000000) return 'large_cap';
    if (marketCap >= 2000000000) return 'mid_cap';
    if (marketCap >= 300000000) return 'small_cap';
    return 'micro_cap';
  }

  /**
   * 預設 exchange 邏輯
   */
  getDefaultExchange(symbol) {
    const nyseSymbols = ['CRM', 'TSM', 'ORCL', 'RDW'];
    return nyseSymbols.includes(symbol) ? 'NYSE' : 'NASDAQ';
  }

  /**
   * 回退 metadata
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

    const fallback = fallbackData[symbol] || { sector: 'Unknown', industry: 'Unknown Industry' };

    return {
      symbol: symbol,
      sector: fallback.sector,
      industry: fallback.industry,
      confidence: 0.8,
      sources: ['fallback_data'],
      last_verified_at: new Date().toISOString(),
      market_cap_category: 'unknown',
      exchange: this.getDefaultExchange(symbol)
    };
  }
}

// 執行更新
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new YFinanceMetadataUpdater();
  updater.updateMetadata();
}