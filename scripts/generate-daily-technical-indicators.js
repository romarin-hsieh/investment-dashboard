#!/usr/bin/env node

/**
 * Daily Technical Indicators Generator
 * 
 * 為所有 universe symbols 生成技術指標數據：
 * 1. latest_index.json (包含 date, generatedAt, symbols)
 * 2. YYYY-MM-DD_SYMBOL.json (每個股票的技術指標)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  outputDir: path.join(__dirname, '../public/data/technical-indicators'),
  universeFile: path.join(__dirname, '../config/universe.json'),
  ohlcvDir: path.join(__dirname, '../public/data/ohlcv'),
  fundamentalsDir: path.join(__dirname, '../public/data/fundamentals')
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
 * 載入 OHLCV 數據
 */
function loadOhlcvData(symbol) {
  try {
    const filename = `${symbol.toUpperCase()}.json`;
    const filepath = path.join(CONFIG.ohlcvDir, filename);
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`⚠️ Failed to load OHLCV for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * 計算簡單移動平均線
 */
function calculateSMA(prices, period) {
  const sma = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

/**
 * 計算 RSI
 */
function calculateRSI(prices, period = 14) {
  const rsi = [];
  const gains = [];
  const losses = [];

  // 計算價格變化
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // 計算 RSI
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      rsi.push(null);
    } else {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }

  return [null, ...rsi]; // 加回第一個 null 因為沒有價格變化
}

/**
 * 計算 MACD
 */
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const ema12 = calculateEMA(prices, fastPeriod);
  const ema26 = calculateEMA(prices, slowPeriod);

  const macdLine = [];
  for (let i = 0; i < prices.length; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      macdLine.push(ema12[i] - ema26[i]);
    } else {
      macdLine.push(null);
    }
  }

  const signalLine = calculateEMA(macdLine.filter(v => v !== null), signalPeriod);

  // 補齊 signal line 長度
  const fullSignalLine = [];
  let signalIndex = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null && signalIndex < signalLine.length) {
      fullSignalLine.push(signalLine[signalIndex]);
      signalIndex++;
    } else {
      fullSignalLine.push(null);
    }
  }

  const histogram = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null && fullSignalLine[i] !== null) {
      histogram.push(macdLine[i] - fullSignalLine[i]);
    } else {
      histogram.push(null);
    }
  }

  return {
    macd: macdLine,
    signal: fullSignalLine,
    histogram: histogram
  };
}

/**
 * 計算 EMA
 */
function calculateEMA(prices, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);

  // 找到第一個非 null 值作為初始值
  let firstValidIndex = 0;
  for (let i = 0; i < prices.length; i++) {
    if (prices[i] !== null) {
      firstValidIndex = i;
      break;
    }
  }

  for (let i = 0; i < prices.length; i++) {
    if (i < firstValidIndex) {
      ema.push(null);
    } else if (i === firstValidIndex) {
      ema.push(prices[i]);
    } else if (prices[i] !== null) {
      ema.push((prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
    } else {
      ema.push(ema[i - 1]); // 保持前一個值
    }
  }

  return ema;
}


/**
 * 載入基本面數據
 */
function loadFundamentals(symbol) {
  try {
    const filename = `${symbol.toUpperCase()}.json`;
    const filepath = path.join(CONFIG.fundamentalsDir, filename);
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.warn(`⚠️ Failed to load Fundamentals for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * 生成技術指標數據
 */
function generateTechnicalIndicators(symbol, ohlcvData) {
  const { timestamps, open, high, low, close, volume } = ohlcvData;
  const fundamentals = loadFundamentals(symbol);

  // 計算各種技術指標
  const sma5 = calculateSMA(close, 5);
  const sma10 = calculateSMA(close, 10);
  const sma20 = calculateSMA(close, 20);
  const sma50 = calculateSMA(close, 50);
  const rsi = calculateRSI(close, 14);
  const macd = calculateMACD(close);

  return {
    symbol: symbol,
    timestamps: timestamps,
    indicators: {
      sma: {
        sma5: sma5,
        sma10: sma10,
        sma20: sma20,
        sma50: sma50
      },
      rsi: {
        rsi14: rsi
      },
      macd: {
        macd: macd.macd,
        signal: macd.signal,
        histogram: macd.histogram
      }
    },
    fundamentals: fundamentals, // Embed fundamental data
    metadata: {
      generated: new Date().toISOString(),
      source: 'GitHub Actions Daily Update',
      dataPoints: timestamps.length,
      indicators: ['SMA5', 'SMA10', 'SMA20', 'SMA50', 'RSI14', 'MACD']
    }
  };
}

/**
 * 生成所有技術指標文件
 */
async function generateAllTechnicalIndicators() {
  console.log('🚀 Starting daily technical indicators generation...');

  // 確保輸出目錄存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const symbols = loadUniverse();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const generatedFiles = [];

  console.log(`📊 Generating technical indicators for ${symbols.length} symbols...`);

  for (const symbol of symbols) {
    // 載入 OHLCV 數據
    const ohlcvData = loadOhlcvData(symbol);
    if (!ohlcvData) {
      console.warn(`⚠️ Skipping ${symbol}: No OHLCV data available`);
      continue;
    }

    try {
      // 生成技術指標
      const indicators = generateTechnicalIndicators(symbol, ohlcvData);

      // 保存文件
      const filename = `${today}_${symbol}.json`;
      const filepath = path.join(CONFIG.outputDir, filename);
      fs.writeFileSync(filepath, JSON.stringify(indicators, null, 2));
      generatedFiles.push(filename);

      console.log(`✅ Generated ${filename}`);
    } catch (err) {
      console.error(`❌ Error generating for ${symbol}:`, err.message);
    }
  }

  // 生成 latest_index.json
  const indexData = {
    date: today,
    generatedAt: new Date().toISOString(),
    symbols: symbols,
    files: generatedFiles,
    totalFiles: generatedFiles.length,
    source: 'GitHub Actions Daily Update',
    indicators: ['SMA5', 'SMA10', 'SMA20', 'SMA50', 'RSI14', 'MACD'],
    note: 'Technical indicators for autoUpdateScheduler and precomputedIndicatorsApi'
  };

  const indexPath = path.join(CONFIG.outputDir, 'latest_index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

  console.log(`📋 Generated latest_index.json with ${generatedFiles.length} files`);
  console.log('🎉 Daily technical indicators generation completed!');

  return {
    totalFiles: generatedFiles.length,
    symbols: symbols.length,
    date: today,
    indexFile: 'latest_index.json'
  };
}

// 主執行函數
async function main() {
  try {
    console.log('🚀 Daily Technical Indicators Generator');
    console.log('='.repeat(50));

    const result = await generateAllTechnicalIndicators();
    console.log('\n📊 Generation Summary:');
    console.log(`- Date: ${result.date}`);
    console.log(`- Total files: ${result.totalFiles}`);
    console.log(`- Symbols: ${result.symbols}`);
    console.log(`- Index file: ${result.indexFile}`);

    console.log('\n🎉 Technical indicators ready for autoUpdateScheduler!');

  } catch (error) {
    console.error('❌ Error generating daily technical indicators:', error);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-daily-technical-indicators.js')) {
  main();
}

export { generateAllTechnicalIndicators };