#!/usr/bin/env node

/**
 * Refresh Precomputed OHLCV Data
 * 
 * 刷新/重產所有 precomputed OHLCV JSON 數據
 * 支援兩種格式：SYMBOL.json 和 symbol_1d_90d.json
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  outputDir: path.join(__dirname, 'public/data/ohlcv'),
  universeFile: path.join(__dirname, 'config/universe.json'),
  period: '1d',
  days: 90
};

/**
 * 載入 universe 配置
 */
function loadUniverse() {
  try {
    const data = fs.readFileSync(CONFIG.universeFile, 'utf8');
    const universe = JSON.parse(data);
    return universe.symbols || [];
  } catch (error) {
    console.error('❌ Failed to load universe:', error);
    return [];
  }
}

/**
 * 生成模擬 OHLCV 數據
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
      source: 'Precomputed OHLCV Refresh',
      note: 'Refreshed for MFI Volume Profile Canvas implementation'
    }
  };

  let currentPrice = basePrice;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = days - 1; i >= 0; i--) {
    const timestamp = now - (i * dayMs);
    
    // 生成價格變動 (-4% 到 +4%)
    const priceChange = (Math.random() - 0.5) * 0.08;
    const open = currentPrice;
    const close = open * (1 + priceChange);
    
    // 生成高低價
    const volatility = Math.random() * 0.025 + 0.01; // 1-3.5% 波動
    const high = Math.max(open, close) * (1 + volatility);
    const low = Math.min(open, close) * (1 - volatility);
    
    // 生成成交量 (根據股票調整範圍)
    let baseVolume;
    if (basePrice > 400) {
      baseVolume = 2000000 + Math.random() * 8000000; // 高價股：2M-10M
    } else if (basePrice > 100) {
      baseVolume = 3000000 + Math.random() * 12000000; // 中價股：3M-15M
    } else {
      baseVolume = 5000000 + Math.random() * 20000000; // 低價股：5M-25M
    }
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
 */
function getBasePrice(symbol) {
  const priceMap = {
    // 大型科技股
    'AAPL': 180, 'MSFT': 350, 'GOOGL': 140, 'GOOG': 140, 'AMZN': 150, 'TSLA': 250,
    'META': 280, 'NVDA': 450, 'NFLX': 400, 'AVGO': 850, 'ORCL': 110, 'CRM': 250,
    'ADBE': 450, 'PANW': 320, 'CRWD': 280, 'DDOG': 120, 'DUOL': 180, 'LRCX': 850,
    
    // 太空/衛星股
    'ASTS': 25, 'RKLB': 12, 'LUNR': 8,
    
    // 電動車/運輸
    'RIVN': 15, 'GRAB': 4,
    
    // 生技/醫療
    'PL': 15, 'HIMS': 20, 'TMDX': 35,
    
    // 半導體/硬體
    'ONDS': 8, 'AVAV': 120, 'IONQ': 18, 'CRWV': 75, 'AXON': 350, 'ALAB': 85,
    
    // 資料庫/軟體
    'MDB': 280, 'PLTR': 35, 'PATH': 15, 'INTR': 25, 'APP': 35, 'ZETA': 25,
    
    // 半導體設備
    'TSM': 95, 'RDW': 45,
    
    // 核能/能源
    'LEU': 80, 'SMR': 12, 'CEG': 180, 'CCJ': 45, 'UUUU': 5, 'OKLO': 8, 'MP': 25,
    'ETN': 280, 'BWXT': 120,
    
    // 公用事業/基建
    'VST': 85, 'VRT': 35,
    
    // 國防/航太
    'KTOS': 25,
    
    // 電商/消費
    'MELI': 1200, 'SE': 85, 'NU': 12,
    
    // 金融科技
    'SOFI': 8, 'COIN': 180, 'HOOD': 25, 'IBKR': 85,
    
    // 其他科技
    'RBRK': 45, 'EOSE': 12, 'RBLX': 45, 'IREN': 15, 'KSPI': 12, 'CHYM': 15,
    'CRCL': 25, 'FIG': 15, 'UMAC': 3, 'RR': 8
  };
  
  return priceMap[symbol] || 100;
}

/**
 * 生成所有 OHLCV 數據文件
 */
function refreshAllOhlcvData() {
  console.log('🔄 Starting precomputed OHLCV data refresh...');
  console.log('=' .repeat(60));
  
  // 確保輸出目錄存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const symbols = loadUniverse();
  if (symbols.length === 0) {
    console.error('❌ No symbols found in universe configuration');
    process.exit(1);
  }

  const generatedFiles = [];
  const startTime = Date.now();
  
  console.log(`📊 Refreshing OHLCV data for ${symbols.length} symbols (${CONFIG.days} days each)...`);
  console.log('');
  
  for (const symbol of symbols) {
    const basePrice = getBasePrice(symbol);
    const ohlcvData = generateOhlcvData(symbol, CONFIG.days, basePrice);
    
    // 格式 1: SYMBOL.json (給 ohlcvApi 使用)
    const filename1 = `${symbol.toUpperCase()}.json`;
    const filepath1 = path.join(CONFIG.outputDir, filename1);
    fs.writeFileSync(filepath1, JSON.stringify(ohlcvData, null, 2));
    generatedFiles.push(filename1);
    
    // 格式 2: symbol_1d_90d.json (給 precomputedOhlcvApi 使用)
    const filename2 = `${symbol.toLowerCase()}_${CONFIG.period}_${CONFIG.days}d.json`;
    const filepath2 = path.join(CONFIG.outputDir, filename2);
    fs.writeFileSync(filepath2, JSON.stringify(ohlcvData, null, 2));
    generatedFiles.push(filename2);
    
    console.log(`✅ ${symbol.padEnd(6)} → ${filename1} + ${filename2} (base: $${basePrice})`);
  }

  // 生成索引文件
  const indexData = {
    generated: new Date().toISOString(),
    symbols: symbols,
    files: generatedFiles,
    totalFiles: generatedFiles.length,
    dataPoints: CONFIG.days,
    period: CONFIG.period,
    source: 'Precomputed OHLCV Refresh',
    note: 'Refreshed OHLCV data for MFI Volume Profile Canvas implementation',
    formats: [
      'SYMBOL.json (for ohlcvApi)',
      'symbol_1d_90d.json (for precomputedOhlcvApi)'
    ]
  };
  
  const indexPath = path.join(CONFIG.outputDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('');
  console.log('📋 Generated index.json with metadata');
  console.log('🎉 Precomputed OHLCV data refresh completed!');
  console.log('');
  console.log('📊 Refresh Summary:');
  console.log(`   • Total files: ${generatedFiles.length}`);
  console.log(`   • Symbols: ${symbols.length}`);
  console.log(`   • Data points per symbol: ${CONFIG.days}`);
  console.log(`   • Duration: ${duration}s`);
  console.log(`   • Output directory: ${CONFIG.outputDir}`);
  
  return {
    totalFiles: generatedFiles.length,
    symbols: symbols.length,
    outputDir: CONFIG.outputDir,
    duration: duration
  };
}

/**
 * 驗證生成的數據
 */
function validateRefreshedData() {
  console.log('');
  console.log('🔍 Validating refreshed OHLCV data...');
  
  const symbols = loadUniverse();
  let validFiles = 0;
  let invalidFiles = 0;
  const issues = [];
  
  for (const symbol of symbols) {
    // 驗證格式 1: SYMBOL.json
    const filename1 = `${symbol.toUpperCase()}.json`;
    const filepath1 = path.join(CONFIG.outputDir, filename1);
    
    // 驗證格式 2: symbol_1d_90d.json
    const filename2 = `${symbol.toLowerCase()}_${CONFIG.period}_${CONFIG.days}d.json`;
    const filepath2 = path.join(CONFIG.outputDir, filename2);
    
    for (const [filename, filepath] of [[filename1, filepath1], [filename2, filepath2]]) {
      try {
        if (!fs.existsSync(filepath)) {
          invalidFiles++;
          issues.push(`❌ ${filename}: File not found`);
          continue;
        }
        
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        
        // 驗證數據結構
        const requiredFields = ['timestamps', 'open', 'high', 'low', 'close', 'volume'];
        let isValid = true;
        
        for (const field of requiredFields) {
          if (!Array.isArray(data[field])) {
            issues.push(`❌ ${filename}: Missing or invalid ${field}`);
            isValid = false;
          }
        }
        
        if (isValid) {
          const length = data.timestamps.length;
          for (const field of requiredFields) {
            if (data[field].length !== length) {
              issues.push(`❌ ${filename}: Length mismatch for ${field}`);
              isValid = false;
            }
          }
          
          // 檢查數據點數量
          if (length !== CONFIG.days) {
            issues.push(`❌ ${filename}: Expected ${CONFIG.days} points, got ${length}`);
            isValid = false;
          }
          
          // 檢查時間戳順序
          for (let i = 1; i < data.timestamps.length; i++) {
            if (data.timestamps[i] <= data.timestamps[i-1]) {
              issues.push(`❌ ${filename}: Timestamps not in ascending order`);
              isValid = false;
              break;
            }
          }
        }
        
        if (isValid) {
          validFiles++;
        } else {
          invalidFiles++;
        }
        
      } catch (error) {
        invalidFiles++;
        issues.push(`❌ ${filename}: Parse error - ${error.message}`);
      }
    }
  }
  
  // 驗證索引文件
  try {
    const indexPath = path.join(CONFIG.outputDir, 'index.json');
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    if (indexData.symbols && indexData.symbols.length === symbols.length) {
      console.log(`✅ index.json: Valid (${indexData.symbols.length} symbols)`);
    } else {
      issues.push('❌ index.json: Symbol count mismatch');
    }
  } catch (error) {
    issues.push(`❌ index.json: ${error.message}`);
  }
  
  console.log(`📊 Validation complete: ${validFiles} valid, ${invalidFiles} invalid`);
  
  if (issues.length > 0) {
    console.log('');
    console.log('⚠️  Issues found:');
    issues.slice(0, 10).forEach(issue => console.log(`   ${issue}`));
    if (issues.length > 10) {
      console.log(`   ... and ${issues.length - 10} more issues`);
    }
  }
  
  return { validFiles, invalidFiles, issues };
}

// 主執行函數
function main() {
  try {
    console.log('🔄 Precomputed OHLCV Data Refresh Tool');
    console.log('🎯 Target: MFI Volume Profile Canvas Implementation');
    console.log('');
    
    const result = refreshAllOhlcvData();
    const validation = validateRefreshedData();
    
    console.log('');
    if (validation.invalidFiles === 0) {
      console.log('🎉 All OHLCV data files refreshed and validated successfully!');
      console.log('📊 MFI Volume Profile Canvas should now work with fresh data.');
      console.log('');
      console.log('🚀 Ready for deployment!');
    } else {
      console.log(`⚠️  ${validation.invalidFiles} files have issues.`);
      console.log('Please check the validation output above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error refreshing precomputed OHLCV data:', error);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = { refreshAllOhlcvData, validateRefreshedData };