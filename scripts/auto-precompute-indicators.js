#!/usr/bin/env node

// 自動技術指標預計算腳本
// 支援自動調度和錯誤處理

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 導入 Yahoo Finance API
import { yahooFinanceAPI } from '../src/utils/yahooFinanceApi.js';

class AutoTechnicalIndicatorsPrecomputer {
  constructor() {
    this.outputDir = path.join(__dirname, '../public/data/technical-indicators');
    this.symbolsFile = path.join(__dirname, '../public/data/symbols_metadata.json');
    this.logFile = path.join(__dirname, '../logs/precompute.log');
    this.maxConcurrent = 2; // 降低並發數避免 API 限制
    this.retryAttempts = 3;
    this.retryDelay = 10000; // 10秒重試延遲
    this.requestDelay = 3000; // 請求間隔增加到 3 秒
    
    // 確保日誌目錄存在
    this.ensureLogDir();
  }

  // 確保輸出目錄存在
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // 確保日誌目錄存在
  ensureLogDir() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  // 記錄日誌
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    console.log(logMessage);
    
    // 寫入日誌文件
    try {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  // 讀取股票列表
  async getSymbolsList() {
    try {
      const symbolsData = JSON.parse(fs.readFileSync(this.symbolsFile, 'utf8'));
      
      if (symbolsData.items && Array.isArray(symbolsData.items)) {
        const symbols = symbolsData.items.map(item => item.symbol);
        this.log(`Found ${symbols.length} symbols in metadata: ${symbols.join(', ')}`);
        return symbols;
      } else {
        return Object.keys(symbolsData);
      }
    } catch (error) {
      this.log(`Failed to read symbols list: ${error.message}`, 'ERROR');
      
      // 備用股票列表
      const fallbackSymbols = [
        'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
        'CRM', 'NVDA', 'AVGO', 'AMZN', 'GOOG', 'META', 'NFLX', 'LEU', 'SMR', 'CRWV',
        'IONQ', 'PLTR', 'HIMS', 'TSLA'
      ];
      
      this.log(`Using fallback symbols: ${fallbackSymbols.join(', ')}`, 'WARN');
      return fallbackSymbols;
    }
  }

  // 計算單個股票的技術指標 (帶重試和更好的錯誤處理)
  async computeIndicatorsWithRetry(symbol, attempt = 1) {
    try {
      this.log(`Computing indicators for ${symbol} (attempt ${attempt}/${this.retryAttempts})`);
      
      const startTime = Date.now();
      const indicators = await yahooFinanceAPI.fetchTechnicalIndicatorsFromAPI(symbol);
      const duration = Date.now() - startTime;
      
      if (indicators && !indicators.error) {
        this.log(`✅ ${symbol} completed in ${duration}ms`);
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
      this.log(`❌ ${symbol} failed (attempt ${attempt}): ${error.message}`, 'ERROR');
      
      if (attempt < this.retryAttempts) {
        this.log(`⏳ Retrying ${symbol} in ${this.retryDelay}ms...`);
        await this.sleep(this.retryDelay);
        return this.computeIndicatorsWithRetry(symbol, attempt + 1);
      } else {
        this.log(`💀 ${symbol} failed after ${this.retryAttempts} attempts`, 'ERROR');
        return {
          symbol,
          success: false,
          error: error.message,
          computedAt: new Date().toISOString()
        };
      }
    }
  }

  // 批量處理股票 (改進的並發控制)
  async processBatch(symbols) {
    const results = [];
    
    this.log(`Processing ${symbols.length} symbols with max concurrency: ${this.maxConcurrent}`);
    
    // 串行處理以避免 API 限制
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      
      try {
        const result = await this.computeIndicatorsWithRetry(symbol);
        results.push(result);
        
        // 進度報告
        const progress = ((i + 1) / symbols.length * 100).toFixed(1);
        this.log(`Progress: ${progress}% (${i + 1}/${symbols.length})`);
        
        // 請求間延遲 (除了最後一個)
        if (i < symbols.length - 1) {
          this.log(`⏳ Waiting ${this.requestDelay}ms before next request...`);
          await this.sleep(this.requestDelay);
        }
        
      } catch (error) {
        this.log(`Unexpected error processing ${symbol}: ${error.message}`, 'ERROR');
        results.push({
          symbol,
          success: false,
          error: error.message,
          computedAt: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  // 保存結果 (改進的文件處理)
  async saveResults(results) {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    this.log(`Saving results: ${successful.length} successful, ${failed.length} failed`);
    
    // 創建索引文件
    const index = {
      generatedAt: timestamp,
      date: today,
      totalSymbols: results.length,
      successfulSymbols: successful.length,
      failedSymbols: failed.length,
      symbols: successful.map(r => r.symbol),
      failedSymbols: failed.map(r => ({ symbol: r.symbol, error: r.error })),
      version: '2.0',
      autoGenerated: true
    };
    
    // 保存索引文件
    const indexFile = path.join(this.outputDir, `${today}_index.json`);
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
    this.log(`Saved index file: ${indexFile}`);
    
    // 保存每個成功的股票數據
    for (const result of successful) {
      const filename = `${today}_${result.symbol}.json`;
      const filepath = path.join(this.outputDir, filename);
      
      const data = {
        date: today,
        symbol: result.symbol,
        computedAt: result.computedAt,
        duration: result.duration,
        source: 'Auto Precomputed',
        version: '2.0',
        indicators: result.data
      };
      
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    }
    
    // 創建最新數據的符號鏈接
    const latestIndexFile = path.join(this.outputDir, 'latest_index.json');
    fs.writeFileSync(latestIndexFile, JSON.stringify(index, null, 2));
    this.log(`Updated latest index: ${latestIndexFile}`);
    
    // 清理舊文件 (保留最近 7 天)
    await this.cleanupOldFiles();
    
    return {
      successful: successful.length,
      failed: failed.length,
      total: results.length,
      indexFile,
      latestIndexFile
    };
  }

  // 清理舊文件
  async cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.outputDir);
      const now = new Date();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 天
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (file === 'latest_index.json') continue; // 保留最新索引
        
        const filepath = path.join(this.outputDir, file);
        const stats = fs.statSync(filepath);
        const age = now - stats.mtime;
        
        if (age > maxAge) {
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        this.log(`Cleaned up ${deletedCount} old files`);
      }
      
    } catch (error) {
      this.log(`Failed to cleanup old files: ${error.message}`, 'ERROR');
    }
  }

  // 檢查是否需要更新
  async shouldUpdate() {
    try {
      const latestIndexFile = path.join(this.outputDir, 'latest_index.json');
      
      if (!fs.existsSync(latestIndexFile)) {
        this.log('No existing data found, update needed');
        return true;
      }
      
      const index = JSON.parse(fs.readFileSync(latestIndexFile, 'utf8'));
      const lastUpdate = new Date(index.generatedAt);
      const now = new Date();
      const ageHours = (now - lastUpdate) / (1000 * 60 * 60);
      
      this.log(`Last update: ${lastUpdate.toISOString()} (${ageHours.toFixed(1)} hours ago)`);
      
      // 如果數據超過 12 小時，需要更新
      const needsUpdate = ageHours > 12;
      
      if (needsUpdate) {
        this.log('Data is stale, update needed');
      } else {
        this.log('Data is fresh, no update needed');
      }
      
      return needsUpdate;
      
    } catch (error) {
      this.log(`Error checking update status: ${error.message}`, 'ERROR');
      return true; // 出錯時假設需要更新
    }
  }

  // 發送通知 (可以擴展為 email、Slack 等)
  async sendNotification(results) {
    const { successful, failed, total } = results;
    const successRate = (successful / total * 100).toFixed(1);
    
    const message = `
📊 Technical Indicators Auto Update Complete
✅ Successful: ${successful}/${total} (${successRate}%)
❌ Failed: ${failed}/${total}
📅 Date: ${new Date().toISOString()}
    `.trim();
    
    this.log(message);
    
    // 這裡可以添加其他通知方式
    // 例如: 發送到 Slack、Discord、Email 等
  }

  // 工具函數：延遲
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 主執行函數
  async run(force = false) {
    const startTime = Date.now();
    
    this.log('🚀 Starting Auto Technical Indicators Precomputation');
    this.log(`📅 Date: ${new Date().toISOString()}`);
    this.log(`🔧 Force update: ${force}`);
    
    try {
      // 確保輸出目錄存在
      this.ensureOutputDir();
      
      // 檢查是否需要更新 (除非強制更新)
      if (!force && !(await this.shouldUpdate())) {
        this.log('✅ No update needed, exiting');
        return {
          success: true,
          skipped: true,
          message: 'No update needed'
        };
      }
      
      // 獲取股票列表
      const symbols = await this.getSymbolsList();
      this.log(`📈 Processing ${symbols.length} symbols: ${symbols.join(', ')}`);
      
      // 批量處理
      const results = await this.processBatch(symbols);
      
      // 保存結果
      const saveResults = await this.saveResults(results);
      
      // 計算總時間
      const totalDuration = Date.now() - startTime;
      
      // 發送通知
      await this.sendNotification(saveResults);
      
      this.log(`🎉 Auto precomputation completed in ${Math.round(totalDuration / 1000)}s`);
      this.log(`📊 Results: ${saveResults.successful}/${saveResults.total} successful`);
      
      return {
        success: true,
        results: saveResults,
        duration: totalDuration,
        symbols: symbols.length
      };
      
    } catch (error) {
      this.log(`❌ Auto precomputation failed: ${error.message}`, 'ERROR');
      this.log(`Stack trace: ${error.stack}`, 'ERROR');
      
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  const precomputer = new AutoTechnicalIndicatorsPrecomputer();
  const force = process.argv.includes('--force');
  
  precomputer.run(force)
    .then(result => {
      if (result.success) {
        console.log('✅ Script completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Script failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💀 Unexpected error:', error);
      process.exit(1);
    });
}

// 導出類以供其他模塊使用
export default AutoTechnicalIndicatorsPrecomputer;