#!/usr/bin/env node

/**
 * OHLCV Data Generator for MFI Volume Profile (CommonJS version)
 * 
 * 為 MFI Volume Profile 生成必要的 OHLCV 數據
 * 使用模擬數據確保 Production 環境穩定運行
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  outputDir: path.join(__dirname, '../public/data/ohlcv'),
  symbols: [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
    'ASTS', 'RIVN', 'ONDS', 'AVAV', 'MDB', 'RKLB', 'AVGO', 'CRWV',
    'PLTR', 'ORCL', 'TSM', 'RDW', 'CRM', 'PL', 'LEU', 'SMR',
    'IONQ', 'HIMS', 'PANW', 'UUUU', 'UMAC'
  ],
  periods: ['1d'],
  ranges: ['3mo', '6mo', '1y'],
  dataPoints: {
    '3mo': 90,
    '6mo': 180,
    '1y': 365
  }
};

/**
 * 生成模擬 OHLCV 數據
 * @param {string} symbol - 股票代號
 * @param {number} days - 天數
 * @param {number} basePrice - 基礎價格
 * @returns {Object} OHLCV 數據
 */
function generateOhlcvData(symbol, days, basePrice = 100) {
  const data = {
    timestamps: [],
    open: [],
    high: [],
    low: [],
    close: [],
    volume: [],
    metadata: {
      symbol: symbol,
      period: '1d',
      days: days,
      generated: new Date().toISOString(),
      source: 'Simulated Data',
      note: 'This is simulated data for MFI Volume Profile demonstration'
    }
  };

  let currentPrice = basePrice;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = days - 1; i >= 0; i--) {
    const timestamp = now - (i * dayMs);
    
    // 生成價格變動 (-5% 到 +5%)
    const priceChange = (Math.random() - 0.5) * 0.1;
    const open = currentPrice;
    const close = open * (1 + priceChange);
    
    // 生成高低價
    const volatility = Math.random() * 0.03 + 0.01; // 1-4% 波動
    const high = Math.max(open, close) * (1 + volatility);
    const low = Math.min(open, close) * (1 - volatility);
    
    // 生成成交量 (1M - 10M)
    const baseVolume = 1000000 + Math.random() * 9000000;
    const volume = Math.floor(baseVolume);
    
    data.timestamps.push(timestamp);
    data.open.push(parseFloat(open.toFixed(2)));
    data.high.push(parseFloat(high.toFixed(2)));
    data.low.push(parseFloat(low.toFixed(2)));
    data.close.push(parseFloat(close.toFixed(2)));
    data.volume.push(volume);
    
    currentPrice = close;
  }

  return data;
}

/**
 * 獲取股票基礎價格
 * @param {string} symbol - 股票代號
 * @returns {number} 基礎價格
 */
function getBasePrice(symbol) {
  const priceMap = {
    'AAPL': 180,
    'MSFT': 350,
    'GOOGL': 140,
    'AMZN': 150,
    'TSLA': 250,
    'META': 280,
    'NVDA': 450,
    'NFLX': 400,
    'ASTS': 25,
    'RIVN': 15,
    'ONDS': 8,
    'AVAV': 120,
    'MDB': 280,
    'RKLB': 12,
    'AVGO': 850,
    'CRWV': 75,
    'PLTR': 35,
    'ORCL': 110,
    'TSM': 95,
    'RDW': 45,
    'CRM': 250,
    'PL': 15,
    'LEU': 80,
    'SMR': 12,
    'IONQ': 18,
    'HIMS': 20,
    'PANW': 320,
    'UUUU': 5,
    'UMAC': 3
  };
  
  return priceMap[symbol] || 100;
}

/**
 * 生成所有 OHLCV 數據文件
 */
function generateAllOhlcvData() {
  console.log('🚀 Starting OHLCV data generation...');
  
  // 確保輸出目錄存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const generatedFiles = [];
  
  for (const symbol of CONFIG.symbols) {
    console.log(`📊 Generating OHLCV data for ${symbol}...`);
    
    // 使用 3mo 作為預設範圍
    const days = CONFIG.dataPoints['3mo'];
    const basePrice = getBasePrice(symbol);
    
    // 生成數據
    const ohlcvData = generateOhlcvData(symbol, days, basePrice);
    
    // 保存文件
    const filename = `${symbol.toUpperCase()}.json`;
    const filepath = path.join(CONFIG.outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(ohlcvData, null, 2));
    generatedFiles.push(filename);
    
    console.log(`✅ Generated ${filename} (${days} days, base price: $${basePrice})`);
  }

  // 生成索引文件
  const indexData = {
    generated: new Date().toISOString(),
    symbols: CONFIG.symbols,
    files: generatedFiles,
    totalFiles: generatedFiles.length,
    note: 'OHLCV data for MFI Volume Profile calculations'
  };
  
  const indexPath = path.join(CONFIG.outputDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  
  console.log(`📋 Generated index.json with ${generatedFiles.length} files`);
  console.log('🎉 OHLCV data generation completed!');
  
  return {
    totalFiles: generatedFiles.length,
    symbols: CONFIG.symbols.length,
    outputDir: CONFIG.outputDir
  };
}

/**
 * 驗證生成的數據
 */
function validateGeneratedData() {
  console.log('🔍 Validating generated OHLCV data...');
  
  let validFiles = 0;
  let invalidFiles = 0;
  
  for (const symbol of CONFIG.symbols) {
    const filename = `${symbol.toUpperCase()}.json`;
    const filepath = path.join(CONFIG.outputDir, filename);
    
    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // 驗證數據結構
      const requiredFields = ['timestamps', 'open', 'high', 'low', 'close', 'volume'];
      let isValid = true;
      
      for (const field of requiredFields) {
        if (!Array.isArray(data[field])) {
          console.error(`❌ ${filename}: Missing ${field}`);
          isValid = false;
        }
      }
      
      if (isValid) {
        const length = data.timestamps.length;
        for (const field of requiredFields) {
          if (data[field].length !== length) {
            console.error(`❌ ${filename}: Length mismatch for ${field}`);
            isValid = false;
          }
        }
      }
      
      if (isValid && data.timestamps.length >= 90) {
        validFiles++;
        console.log(`✅ ${filename}: Valid (${data.timestamps.length} points)`);
      } else {
        invalidFiles++;
        console.error(`❌ ${filename}: Invalid or insufficient data`);
      }
      
    } catch (error) {
      invalidFiles++;
      console.error(`❌ ${filename}: Parse error - ${error.message}`);
    }
  }
  
  console.log(`📊 Validation complete: ${validFiles} valid, ${invalidFiles} invalid`);
  return { validFiles, invalidFiles };
}

// 主執行函數
function main() {
  try {
    console.log('🚀 OHLCV Data Generator for MFI Volume Profile');
    console.log('=' .repeat(50));
    
    const result = generateAllOhlcvData();
    console.log('\n📊 Generation Summary:');
    console.log(`- Total files: ${result.totalFiles}`);
    console.log(`- Symbols: ${result.symbols}`);
    console.log(`- Output directory: ${result.outputDir}`);
    
    console.log('\n🔍 Validating data...');
    const validation = validateGeneratedData();
    
    if (validation.invalidFiles === 0) {
      console.log('\n🎉 All OHLCV data files generated and validated successfully!');
      console.log('📊 MFI Volume Profile should now work in production.');
    } else {
      console.log(`\n⚠️  ${validation.invalidFiles} files have issues. Please check the logs above.`);
    }
    
  } catch (error) {
    console.error('❌ Error generating OHLCV data:', error);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = { generateAllOhlcvData, validateGeneratedData };