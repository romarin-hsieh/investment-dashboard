#!/usr/bin/env node

// 技術指標預計算腳本
// 在美股收盤後運行，預計算所有股票的技術指標

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 導入我們的 Yahoo Finance API
import('../src/api/yahooFinanceApi.js').then(async ({ yahooFinanceAPI }) => {

  class TechnicalIndicatorsPrecomputer {
    constructor() {
      this.outputDir = path.join(__dirname, '../public/data/technical-indicators');
      this.symbolsFile = path.join(__dirname, '../public/data/symbols_metadata.json');
      this.maxConcurrent = 3; // 限制並發請求數量
      this.retryAttempts = 3;
      this.retryDelay = 5000; // 5秒重試延遲
    }

    // 確保輸出目錄存在
    ensureOutputDir() {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
    }

    // 讀取股票列表
    async getSymbolsList() {
      try {
        const symbolsData = JSON.parse(fs.readFileSync(this.symbolsFile, 'utf8'));
        // 從 items 數組中提取 symbol
        if (symbolsData.items && Array.isArray(symbolsData.items)) {
          const symbols = symbolsData.items.map(item => item.symbol);
          console.log(`Found ${symbols.length} symbols in metadata:`, symbols);
          return symbols;
        } else {
          // 舊格式兼容 (直接是 key-value 對象)
          return Object.keys(symbolsData);
        }
      } catch (error) {
        console.error('Failed to read symbols list:', error);
        // 備用股票列表 (包含當前的10支股票)
        return ['ONDS', 'PL', 'RKLB', 'ASTS', 'RIVN', 'MDB', 'ORCL', 'TSM', 'AVAV', 'RDW'];
      }
    }

    // 計算單個股票的技術指標 (帶重試)
    async computeIndicatorsWithRetry(symbol, attempt = 1) {
      try {
        console.log(`Computing indicators for ${symbol} (attempt ${attempt}/${this.retryAttempts})`);

        const startTime = Date.now();

        // Fetch technicals and fundamentals in parallel
        const [indicators, stockInfo] = await Promise.all([
          yahooFinanceAPI.fetchTechnicalIndicatorsFromAPI(symbol).catch(e => ({ error: e.message })),
          yahooFinanceAPI.getStockInfo(symbol).catch(e => null)
        ]);

        const duration = Date.now() - startTime;

        if (indicators && !indicators.error) {
          // Attach fundamentals if available
          if (stockInfo) {
            indicators.fundamentals = stockInfo;
            // Also backfill N/A fields in yf object if possible
            if (indicators.yf) {
              if (stockInfo.marketCap) indicators.yf.marketCap = stockInfo.marketCap;
              if (stockInfo.beta) indicators.yf.beta = stockInfo.beta;
            }
          }

          console.log(`✅ ${symbol} completed in ${duration}ms (Foundamentals: ${!!stockInfo})`);
          return {
            symbol,
            success: true,
            data: indicators,
            computedAt: new Date().toISOString(),
            duration
          };
        } else {
          throw new Error(indicators?.error || 'Unknown error');
        }

      } catch (error) {
        console.error(`❌ ${symbol} failed (attempt ${attempt}): ${error.message}`);

        if (attempt < this.retryAttempts) {
          console.log(`⏳ Retrying ${symbol} in ${this.retryDelay}ms...`);
          await this.sleep(this.retryDelay);
          return this.computeIndicatorsWithRetry(symbol, attempt + 1);
        } else {
          return {
            symbol,
            success: false,
            error: error.message,
            computedAt: new Date().toISOString()
          };
        }
      }
    }

    // 批量處理股票 (控制並發)
    async processBatch(symbols) {
      const results = [];
      const batches = [];

      // 分批處理
      for (let i = 0; i < symbols.length; i += this.maxConcurrent) {
        batches.push(symbols.slice(i, i + this.maxConcurrent));
      }

      console.log(`Processing ${symbols.length} symbols in ${batches.length} batches`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`\n📦 Processing batch ${i + 1}/${batches.length}: [${batch.join(', ')}]`);

        // 並發處理當前批次
        const batchPromises = batch.map(symbol => this.computeIndicatorsWithRetry(symbol));
        const batchResults = await Promise.all(batchPromises);

        results.push(...batchResults);

        // 批次間延遲，避免過度請求
        if (i < batches.length - 1) {
          console.log(`⏳ Waiting 3 seconds before next batch...`);
          await this.sleep(3000);
        }
      }

      return results;
    }

    // 保存結果到文件
    async saveResults(results) {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString();

      // 分離成功和失敗的結果
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      // 創建索引文件
      const index = {
        generatedAt: timestamp,
        date: today,
        totalSymbols: results.length,
        successful: successful.length,
        failed: failed.length,
        symbols: successful.map(r => r.symbol),
        failedSymbols: failed.map(r => ({ symbol: r.symbol, error: r.error }))
      };

      // 保存索引
      const indexFile = path.join(this.outputDir, `${today}_index.json`);
      fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));

      // 保存每個成功的股票數據
      for (const result of successful) {
        const symbolFile = path.join(this.outputDir, `${today}_${result.symbol}.json`);
        const symbolData = {
          symbol: result.symbol,
          date: today,
          computedAt: result.computedAt,
          duration: result.duration,
          source: 'Precomputed',
          indicators: result.data
        };
        fs.writeFileSync(symbolFile, JSON.stringify(symbolData, null, 2));
      }

      // 創建最新數據的符號鏈接
      const latestIndexFile = path.join(this.outputDir, 'latest_index.json');
      fs.writeFileSync(latestIndexFile, JSON.stringify(index, null, 2));

      console.log(`\n📊 Results Summary:`);
      console.log(`✅ Successful: ${successful.length}/${results.length}`);
      console.log(`❌ Failed: ${failed.length}/${results.length}`);
      console.log(`📁 Files saved to: ${this.outputDir}`);

      if (failed.length > 0) {
        console.log(`\n❌ Failed symbols:`);
        failed.forEach(f => console.log(`  - ${f.symbol}: ${f.error}`));
      }
    }

    // 清理舊文件 (保留最近7天)
    cleanupOldFiles() {
      try {
        const files = fs.readdirSync(this.outputDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        let deletedCount = 0;

        files.forEach(file => {
          const match = file.match(/^(\d{4}-\d{2}-\d{2})_/);
          if (match) {
            const fileDate = new Date(match[1]);
            if (fileDate < cutoffDate) {
              fs.unlinkSync(path.join(this.outputDir, file));
              deletedCount++;
            }
          }
        });

        if (deletedCount > 0) {
          console.log(`🗑️ Cleaned up ${deletedCount} old files`);
        }
      } catch (error) {
        console.warn('Failed to cleanup old files:', error);
      }
    }

    // 主執行函數
    async run() {
      console.log('🚀 Starting Technical Indicators Precomputation');
      console.log(`📅 Date: ${new Date().toISOString()}`);

      try {
        this.ensureOutputDir();

        const symbols = await this.getSymbolsList();
        console.log(`📈 Found ${symbols.length} symbols to process`);

        const startTime = Date.now();
        const results = await this.processBatch(symbols);
        const totalDuration = Date.now() - startTime;

        await this.saveResults(results);
        this.cleanupOldFiles();

        console.log(`\n🎉 Precomputation completed in ${Math.round(totalDuration / 1000)}s`);

      } catch (error) {
        console.error('❌ Precomputation failed:', error);
        process.exit(1);
      }
    }

    // 輔助函數
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // 執行預計算
  const precomputer = new TechnicalIndicatorsPrecomputer();
  precomputer.run().catch(console.error);

});