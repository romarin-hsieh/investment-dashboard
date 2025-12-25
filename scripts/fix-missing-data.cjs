#!/usr/bin/env node

/**
 * 修復缺失的技術指標數據
 * 當今天的數據不存在時，複製最新的數據並更新日期
 */

const fs = require('fs').promises;
const path = require('path');

class DataFixer {
  constructor() {
    this.dataDir = path.join(__dirname, '../public/data/technical-indicators');
    this.today = new Date().toISOString().split('T')[0];
  }

  async run() {
    try {
      console.log('🔧 Starting data fix process...');
      
      // 讀取最新索引
      const indexPath = path.join(this.dataDir, 'latest_index.json');
      const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
      
      console.log(`📊 Latest data date: ${indexData.date}`);
      console.log(`📅 Today's date: ${this.today}`);
      
      if (indexData.date === this.today) {
        console.log('✅ Data is already up to date');
        return;
      }
      
      console.log(`🔄 Copying data from ${indexData.date} to ${this.today}...`);
      
      let copiedCount = 0;
      
      // 複製每個 symbol 的數據
      for (const symbol of indexData.symbols) {
        const sourceFile = `${indexData.date}_${symbol}.json`;
        const targetFile = `${this.today}_${symbol}.json`;
        
        const sourcePath = path.join(this.dataDir, sourceFile);
        const targetPath = path.join(this.dataDir, targetFile);
        
        try {
          // 檢查目標文件是否已存在
          try {
            await fs.access(targetPath);
            console.log(`⏭️  Skipping ${symbol} (already exists)`);
            continue;
          } catch {
            // 文件不存在，繼續複製
          }
          
          // 讀取源數據
          const sourceData = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
          
          // 更新日期和時間戳
          const updatedData = {
            ...sourceData,
            date: this.today,
            computedAt: new Date().toISOString(),
            note: `Data copied from ${indexData.date} due to missing current data`
          };
          
          // 寫入新文件
          await fs.writeFile(targetPath, JSON.stringify(updatedData, null, 2));
          copiedCount++;
          
          console.log(`✅ Copied ${symbol}`);
          
        } catch (error) {
          console.error(`❌ Failed to copy ${symbol}:`, error.message);
        }
      }
      
      // 更新索引文件
      if (copiedCount > 0) {
        const newIndex = {
          generatedAt: new Date().toISOString(),
          date: this.today,
          totalSymbols: indexData.symbols.length,
          successful: copiedCount,
          failed: indexData.symbols.length - copiedCount,
          symbols: indexData.symbols,
          failedSymbols: [],
          note: `Data copied from ${indexData.date}`
        };
        
        await fs.writeFile(indexPath, JSON.stringify(newIndex, null, 2));
        console.log(`📝 Updated index file`);
      }
      
      console.log(`🎉 Fix completed! Copied ${copiedCount} files`);
      
    } catch (error) {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    }
  }
}

// 執行修復
if (require.main === module) {
  const fixer = new DataFixer();
  fixer.run();
}

module.exports = DataFixer;