#!/usr/bin/env node

// 簡化的預計算測試腳本
// 只處理 2-3 支股票來快速測試功能

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 導入 Yahoo Finance API
import('../src/utils/yahooFinanceApi.js').then(async ({ yahooFinanceAPI }) => {

class TestPrecomputer {
  constructor() {
    this.outputDir = path.join(__dirname, '../public/data/technical-indicators');
    this.testSymbols = ['ONDS', 'AAPL', 'TSLA']; // 只測試3支股票
  }

  // 確保輸出目錄存在
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // 計算單個股票的技術指標
  async computeIndicators(symbol) {
    try {
      console.log(`🔄 Computing indicators for ${symbol}...`);
      
      const startTime = Date.now();
      const indicators = await yahooFinanceAPI.fetchTechnicalIndicatorsFromAPI(symbol);
      const duration = Date.now() - startTime;
      
      if (indicators && !indicators.error) {
        console.log(`✅ ${symbol} completed in ${duration}ms`);
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
      console.error(`❌ ${symbol} failed: ${error.message}`);
      return {
        symbol,
        success: false,
        error: error.message,
        computedAt: new Date().toISOString()
      };
    }
  }

  // 保存結果
  async saveResults(results) {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    
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
      failedSymbols: failed.map(r => ({ symbol: r.symbol, error: r.error })),
      testMode: true
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
        source: 'Precomputed (Test)',
        indicators: result.data
      };
      fs.writeFileSync(symbolFile, JSON.stringify(symbolData, null, 2));
    }
    
    // 創建最新數據的符號鏈接
    const latestIndexFile = path.join(this.outputDir, 'latest_index.json');
    fs.writeFileSync(latestIndexFile, JSON.stringify(index, null, 2));
    
    console.log(`\n📊 Test Results:`);
    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);
    console.log(`📁 Files saved to: ${this.outputDir}`);
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed symbols:`);
      failed.forEach(f => console.log(`  - ${f.symbol}: ${f.error}`));
    }
  }

  // 主執行函數
  async run() {
    console.log('🧪 Starting Technical Indicators Test Precomputation');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`📈 Testing symbols: ${this.testSymbols.join(', ')}`);
    
    try {
      this.ensureOutputDir();
      
      const startTime = Date.now();
      const results = [];
      
      // 串行處理，避免 API 限制
      for (const symbol of this.testSymbols) {
        const result = await this.computeIndicators(symbol);
        results.push(result);
        
        // 每個請求間延遲 2 秒
        if (this.testSymbols.indexOf(symbol) < this.testSymbols.length - 1) {
          console.log('⏳ Waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      const totalDuration = Date.now() - startTime;
      
      await this.saveResults(results);
      
      console.log(`\n🎉 Test precomputation completed in ${Math.round(totalDuration / 1000)}s`);
      
    } catch (error) {
      console.error('❌ Test precomputation failed:', error);
      process.exit(1);
    }
  }
}

// 執行測試預計算
const testPrecomputer = new TestPrecomputer();
testPrecomputer.run().catch(console.error);

});