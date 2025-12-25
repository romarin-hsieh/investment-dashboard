#!/usr/bin/env node

/**
 * 每日交易所更新腳本
 * 使用 Finnhub API 獲取股票的正確交易所信息並更新 metadata
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExchangeUpdater {
  constructor() {
    this.apiKey = 'd56iuopr01qkgd81vo8gd56iuopr01qkgd81vo90';
    this.baseUrl = 'https://finnhub.io/api/v1';
    
    // TradingView 認可的交易所格式
    this.validExchanges = [
      'NYSE', 'NASDAQ', 'AMEX', 'OTC', 'TSX', 'TSXV', 'LSE', 'EURONEXT',
      'XETR', 'FWB', 'SIX', 'MIL', 'BME', 'TSE', 'TWSE', 'HKEX', 'SSE',
      'SZSE', 'KRX', 'NSE', 'BSE', 'ASX', 'SGX', 'SET', 'TADAWUL', 'JSE',
      'BMV', 'BMFBOVESPA', 'IDX', 'TASE', 'BIST', 'GPW', 'RUS'
    ];

    this.metadataPath = path.join(__dirname, '../public/data/symbols_metadata.json');
    this.exchangeCachePath = path.join(__dirname, '../public/data/exchange_cache.json');
  }

  /**
   * 主要更新流程
   */
  async updateExchanges() {
    try {
      console.log('🚀 開始更新股票交易所信息...');

      // 1. 讀取當前 metadata
      const metadata = await this.loadMetadata();
      const symbols = metadata.items.map(item => item.symbol);
      
      console.log(`📊 找到 ${symbols.length} 個股票需要更新交易所信息`);

      // 2. 讀取快取（前一天的版本）
      const exchangeCache = await this.loadExchangeCache();

      // 3. 批量獲取交易所信息
      const exchangeMap = await this.fetchExchanges(symbols, exchangeCache);

      // 4. 更新 metadata
      const updatedMetadata = await this.updateMetadata(metadata, exchangeMap);

      // 5. 保存更新後的 metadata
      await this.saveMetadata(updatedMetadata);

      // 6. 保存交易所快取
      await this.saveExchangeCache(exchangeMap);

      console.log('✅ 交易所信息更新完成！');

    } catch (error) {
      console.error('❌ 更新交易所信息失敗:', error);
      process.exit(1);
    }
  }

  /**
   * 讀取 metadata 文件
   */
  async loadMetadata() {
    try {
      const data = await fs.readFile(this.metadataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('無法讀取 metadata 文件:', error);
      throw error;
    }
  }

  /**
   * 讀取交易所快取
   */
  async loadExchangeCache() {
    try {
      const data = await fs.readFile(this.exchangeCachePath, 'utf8');
      const cache = JSON.parse(data);
      console.log(`📦 載入交易所快取，包含 ${Object.keys(cache.exchanges || {}).length} 個股票`);
      return cache;
    } catch (error) {
      console.log('📦 未找到交易所快取文件，將創建新的快取');
      return {
        lastUpdated: null,
        exchanges: {}
      };
    }
  }

  /**
   * 批量獲取交易所信息
   */
  async fetchExchanges(symbols, exchangeCache) {
    const exchangeMap = new Map();
    const failedSymbols = [];
    
    console.log('🔍 開始獲取交易所信息...');

    // 分批處理，避免 API 限制
    const batchSize = 3;
    const batches = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`處理批次 ${i + 1}/${batches.length}: ${batch.join(', ')}`);

      const batchPromises = batch.map(symbol => this.fetchSingleExchange(symbol));
      const results = await Promise.all(batchPromises);

      results.forEach((result, index) => {
        const symbol = batch[index];
        if (result.success) {
          exchangeMap.set(symbol, result.exchange);
          console.log(`  ✅ ${symbol}: ${result.rawExchange} → ${result.exchange}`);
        } else {
          failedSymbols.push(symbol);
          // 使用快取中的值作為回退
          const cachedExchange = exchangeCache.exchanges?.[symbol];
          if (cachedExchange) {
            exchangeMap.set(symbol, cachedExchange);
            console.log(`  🔄 ${symbol}: 使用快取值 ${cachedExchange}`);
          } else {
            const defaultExchange = this.getDefaultExchange(symbol);
            exchangeMap.set(symbol, defaultExchange);
            console.log(`  ⚠️ ${symbol}: 使用預設值 ${defaultExchange}`);
          }
        }
      });

      // 批次間延遲
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    if (failedSymbols.length > 0) {
      console.log(`⚠️ ${failedSymbols.length} 個股票獲取失敗: ${failedSymbols.join(', ')}`);
    }

    return exchangeMap;
  }

  /**
   * 獲取單個股票的交易所信息
   */
  async fetchSingleExchange(symbol) {
    try {
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

      const rawExchange = data.exchange;
      const mappedExchange = this.mapExchange(rawExchange);

      return {
        success: true,
        exchange: mappedExchange,
        rawExchange: rawExchange
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 映射交易所格式
   */
  mapExchange(rawExchange) {
    if (!rawExchange) return 'NASDAQ';

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
      'CBOE BZX EXCHANGE': 'NASDAQ',
      'OVER THE COUNTER': 'OTC',
      'OTC MARKETS': 'OTC'
    };

    for (const [pattern, exchange] of Object.entries(mappingRules)) {
      if (upperExchange.includes(pattern)) {
        return exchange;
      }
    }

    console.warn(`Unknown exchange format: ${rawExchange}, using default NASDAQ`);
    return 'NASDAQ';
  }

  /**
   * 預設交易所邏輯
   */
  getDefaultExchange(symbol) {
    const nyseSymbols = ['CRM', 'TSM', 'ORCL', 'RDW'];
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

    return 'NASDAQ';
  }

  /**
   * 更新 metadata 中的交易所信息
   */
  async updateMetadata(metadata, exchangeMap) {
    let updatedCount = 0;

    metadata.items.forEach(item => {
      const newExchange = exchangeMap.get(item.symbol);
      if (newExchange && item.exchange !== newExchange) {
        console.log(`📝 更新 ${item.symbol}: ${item.exchange} → ${newExchange}`);
        item.exchange = newExchange;
        item.last_verified_at = new Date().toISOString();
        updatedCount++;
      }
    });

    console.log(`📊 共更新了 ${updatedCount} 個股票的交易所信息`);

    // 更新 metadata 的最後更新時間
    metadata.last_updated = new Date().toISOString();

    return metadata;
  }

  /**
   * 保存 metadata 文件
   */
  async saveMetadata(metadata) {
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
   * 保存交易所快取
   */
  async saveExchangeCache(exchangeMap) {
    try {
      const cache = {
        lastUpdated: new Date().toISOString(),
        exchanges: Object.fromEntries(exchangeMap)
      };

      const jsonString = JSON.stringify(cache, null, 2);
      await fs.writeFile(this.exchangeCachePath, jsonString, 'utf8');
      console.log('💾 交易所快取已保存');
    } catch (error) {
      console.error('保存交易所快取失敗:', error);
      throw error;
    }
  }
}

// 執行更新
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new ExchangeUpdater();
  updater.updateExchanges();
}