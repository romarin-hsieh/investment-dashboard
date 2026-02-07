#!/usr/bin/env node

/**
 * Daily Technical Indicators Generator
 * 
 * 為所有 universe symbols 生成完整技術指標數據：
 * 1. latest_index.json (包含 date, generatedAt, symbols)
 * 2. YYYY-MM-DD_SYMBOL.json (每個股票的完整技術指標)
 * 
 * Update 2026-01-13: Added ADX, Ichimoku, VWMA, Stochastic, CCI, Parabolic SAR, SuperTrend, OBV
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  outputDir: path.join(__dirname, '../public/data/technical-indicators'),
  universeFile: path.join(__dirname, '../public/config/stocks.json'),
  ohlcvDir: path.join(__dirname, '../public/data/ohlcv'),
  fundamentalsDir: path.join(__dirname, '../public/data/fundamentals')
};

/**
 * 載入 universe 配置
 */
function loadUniverse() {
  try {
    const stocksPath = CONFIG.universeFile;
    const data = fs.readFileSync(stocksPath, 'utf8');
    const config = JSON.parse(data);
    return config.stocks.map(s => s.symbol) || [];
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
    // console.warn(`⚠️ Failed to load Fundamentals for ${symbol}:`, error.message);
    return null;
  }
}

// ---------------------- Math Utilities ----------------------

function average(data) {
  if (!data || data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
}

function standardDeviation(data) {
  if (!data || data.length === 0) return 0;
  const avg = average(data);
  const squareDiffs = data.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = average(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

function variance(data) {
  if (!data || data.length === 0) return 0;
  const avg = average(data);
  return data.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / data.length;
}

function covariance(data1, data2) {
  if (!data1 || !data2 || data1.length !== data2.length || data1.length === 0) return 0;
  const avg1 = average(data1);
  const avg2 = average(data2);
  let sum = 0;
  for (let i = 0; i < data1.length; i++) {
    sum += (data1[i] - avg1) * (data2[i] - avg2);
  }
  return sum / data1.length;
}

// ---------------------- Indicators ----------------------

/**
 * 計算 Beta
 * @param {Array} stockPrices - Stock closing prices
 * @param {Array} marketPrices - Market closing prices (e.g., SPY/SPX)
 * @param {Array} stockDates - Stock timestamps (epoch ms)
 * @param {Array} marketDates - Market timestamps (epoch ms)
 * @param {Number} period - Calculation period (e.g., 10 or 63)
 */
function calculateBeta(stockPrices, marketPrices, stockDates, marketDates, period) {
  if (!stockPrices || !marketPrices || stockPrices.length < period + 1) return null;

  // 1. Calculate Daily Returns
  const getReturns = (prices, dates) => {
    const returns = [];
    const validDates = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] !== 0) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        validDates.push(dates[i]);
      }
    }
    return { returns, dates: validDates };
  };

  const stockRetObj = getReturns(stockPrices, stockDates);
  const marketRetObj = getReturns(marketPrices, marketDates);

  // 2. Map Dates to Returns for easy lookup
  const stockRetMap = new Map();
  stockRetObj.dates.forEach((date, i) => stockRetMap.set(date, stockRetObj.returns[i]));

  const marketRetMap = new Map();
  marketRetObj.dates.forEach((date, i) => marketRetMap.set(date, marketRetObj.returns[i]));

  // 3. Rolling Beta Calculation
  const betas = new Array(stockPrices.length).fill(null);

  // Iterate through stock dates to maintain alignment with output array
  // Note: stockPrices[i] corresponds to stockDates[i]
  // Valid returns start from index 1.

  for (let i = period; i < stockPrices.length; i++) {
    const currentDate = stockDates[i];

    // Collect matched returns looking back 'period' valid trading days
    const matchedStockRet = [];
    const matchedMarketRet = [];

    let lookbackIdx = i;
    while (matchedStockRet.length < period && lookbackIdx > 0) {
      const date = stockDates[lookbackIdx];
      if (stockRetMap.has(date) && marketRetMap.has(date)) {
        matchedStockRet.unshift(stockRetMap.get(date));
        matchedMarketRet.unshift(marketRetMap.get(date));
      }
      lookbackIdx--;
    }

    if (matchedStockRet.length === period) {
      const cov = covariance(matchedStockRet, matchedMarketRet);
      const marketVar = variance(matchedMarketRet);
      if (marketVar !== 0) {
        betas[i] = cov / marketVar;
      }
    }
  }

  return betas;
}

/**
 * 載入 Benchmark 數據 (SPX)
 */
function loadBenchmarkData() {
  try {
    const filepath = path.join(CONFIG.ohlcvDir, 'FOREXCOM_SPXUSD.json');
    if (fs.existsSync(filepath)) {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      console.log('✅ Loaded Benchmark Data: FOREXCOM_SPXUSD');
      return data;
    } else {
      console.warn('⚠️ Benchmark data (FOREXCOM_SPXUSD.json) not found.');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to load benchmark data:', error.message);
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
 * 計算 EMA
 */
function calculateEMA(prices, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);

  let firstValidIndex = 0;
  for (let i = 0; i < prices.length; i++) {
    if (prices[i] !== null) {
      firstValidIndex = i;
      break;
    }
  }

  // First EMA is SMA
  let initialSma = null;
  if (prices.length >= firstValidIndex + period) {
    const chunk = prices.slice(firstValidIndex, firstValidIndex + period);
    initialSma = chunk.reduce((a, b) => a + b, 0) / period;
  }

  for (let i = 0; i < prices.length; i++) {
    if (i < firstValidIndex + period - 1) {
      ema.push(null);
    } else if (i === firstValidIndex + period - 1) {
      ema.push(initialSma);
    } else if (prices[i] !== null) {
      const prevEma = ema[i - 1];
      if (prevEma !== null) {
        ema.push((prices[i] - prevEma) * multiplier + prevEma);
      } else {
        ema.push(prices[i]); // Should not happen given logic
      }
    } else {
      ema.push(null);
    }
  }

  return ema;
}

/**
 * 計算 RSI
 */
function calculateRSI(prices, period = 14) {
  const rsi = [];
  const gains = [];
  const losses = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // Wilder's Smoothing for RSI
  // First avg is SMA
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Pad initial nulls
  for (let k = 0; k < period; k++) rsi.push(null);

  // Push first value
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - (100 / (1 + rs)));

  for (let i = period; i < gains.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  // prices is length N+1 (gains calculated from index 1), loop produces gains length N
  // rsi array length should match prices length.
  // The above logic pushes `period` nulls, then `gains.length - period + 1` values.
  // gains.length = prices.length - 1
  // Total rsi = period + (prices.length - 1 - period + 1) = prices.length. Correct.
  // But wait, my manual loop is a bit off. simpler is to map timestamps logic.

  // Re-impl with standard simple array mapping
  const res = new Array(prices.length).fill(null);

  if (prices.length <= period) return res;

  // First Avg Gain/Loss
  let ag = 0;
  let al = 0;
  for (let i = 1; i <= period; i++) {
    let diff = prices[i] - prices[i - 1];
    if (diff > 0) ag += diff;
    else al -= diff;
  }
  ag /= period;
  al /= period;

  res[period] = (al === 0) ? 100 : (100 - 100 / (1 + ag / al));

  for (let i = period + 1; i < prices.length; i++) {
    let diff = prices[i] - prices[i - 1];
    let currentGain = diff > 0 ? diff : 0;
    let currentLoss = diff < 0 ? -diff : 0;

    ag = (ag * (period - 1) + currentGain) / period;
    al = (al * (period - 1) + currentLoss) / period;

    res[i] = (al === 0) ? 100 : (100 - 100 / (1 + ag / al));
  }
  return res;
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

  const signalInput = macdLine.map(v => v === null ? 0 : v); // Avoid nulls for signal calculation logic, but better to handle properly
  // Actually calculateEMA handles nulls at start

  // We need to calculate Signal line on macdLine
  // But calculateEMA expects prices.
  // Let's filter nulls for calculation but we need to map back to original indices.

  // Simplification: Calculate Signal on the valid tail
  let firstValid = macdLine.findIndex(x => x !== null);
  const signalLine = new Array(prices.length).fill(null);

  if (firstValid !== -1) {
    const validMacd = macdLine.slice(firstValid);
    const pineSignal = calculateEMA(validMacd, signalPeriod);
    // Fill back
    for (let i = 0; i < pineSignal.length; i++) {
      signalLine[firstValid + i] = pineSignal[i];
    }
  }

  const histogram = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram.push(macdLine[i] - signalLine[i]);
    } else {
      histogram.push(null);
    }
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

/**
 * 計算 True Range (TR)
 */
function calculateTR(high, low, close) {
  const tr = new Array(close.length).fill(0);
  tr[0] = high[0] - low[0];
  for (let i = 1; i < close.length; i++) {
    const hl = high[i] - low[i];
    const hc = Math.abs(high[i] - close[i - 1]);
    const lc = Math.abs(low[i] - close[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }
  return tr;
}

/**
 * 計算 ATR
 */
function calculateATR(tr, period) {
  const atr = new Array(tr.length).fill(null);

  // First ATR is SMA of TR
  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  atr[period - 1] = sum / period;

  // Wilder's Smoothing
  for (let i = period; i < tr.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

/**
 * 計算 ADX (Average Directional Index)
 */
function calculateADX(high, low, close, period = 14) {
  // 1. Calculate TR, +DM, -DM
  const tr = calculateTR(high, low, close);
  const dmPlus = new Array(close.length).fill(0);
  const dmMinus = new Array(close.length).fill(0);

  for (let i = 1; i < close.length; i++) {
    const up = high[i] - high[i - 1];
    const down = low[i - 1] - low[i];

    if (up > down && up > 0) dmPlus[i] = up;
    if (down > up && down > 0) dmMinus[i] = down;
  }

  // 2. Smoothed TR, +DM, -DM (ATR logic)
  // First value is Sum/Period
  const smoothTR = new Array(close.length).fill(0);
  const smoothDMPlus = new Array(close.length).fill(0);
  const smoothDMMinus = new Array(close.length).fill(0);

  // Initial sum
  let trSum = 0, dpSum = 0, dmSum = 0;
  for (let i = 0; i < period; i++) {
    trSum += tr[i];
    dpSum += dmPlus[i];
    dmSum += dmMinus[i];
  }
  smoothTR[period - 1] = trSum; // Usually text books say sum, not avg for ADX smoothing start? 
  // Wilder's ADX usually starts with SUM for the first period.
  smoothDMPlus[period - 1] = dpSum;
  smoothDMMinus[period - 1] = dmSum;

  // Wilder's Smoothing: Current = Prev - (Prev/N) + CurrentRaw
  for (let i = period; i < close.length; i++) {
    smoothTR[i] = smoothTR[i - 1] - (smoothTR[i - 1] / period) + tr[i];
    smoothDMPlus[i] = smoothDMPlus[i - 1] - (smoothDMPlus[i - 1] / period) + dmPlus[i];
    smoothDMMinus[i] = smoothDMMinus[i - 1] - (smoothDMMinus[i - 1] / period) + dmMinus[i];
  }

  // 3. DI+ and DI-
  const diPlus = new Array(close.length).fill(null);
  const diMinus = new Array(close.length).fill(null);
  const dx = new Array(close.length).fill(null);

  for (let i = period - 1; i < close.length; i++) {
    diPlus[i] = (smoothDMPlus[i] / smoothTR[i]) * 100;
    diMinus[i] = (smoothDMMinus[i] / smoothTR[i]) * 100;

    const sumDI = diPlus[i] + diMinus[i];
    const diffDI = Math.abs(diPlus[i] - diMinus[i]);

    if (sumDI === 0) dx[i] = 0;
    else dx[i] = (diffDI / sumDI) * 100;
  }

  // 4. ADX = SMA(DX)
  const adx = new Array(close.length).fill(null);
  // First ADX is average of DX
  // Start index for DX is `period - 1`. The first DX is at `period-1`.
  // We need `period` count of DX to compute first ADX.
  // So logic starts at `(period - 1) + period - 1` = `2*period - 2` ?
  // Standard: First ADX is the average of the first 'period' DX values.

  let dxSum = 0;
  const firstAdxIdx = 2 * period - 1;

  if (close.length > firstAdxIdx) {
    for (let i = period - 1; i < 2 * period - 1; i++) {
      dxSum += dx[i];
    }
    adx[firstAdxIdx - 1] = dxSum / period;

    // Smoothing for subsequent ADX
    for (let i = firstAdxIdx; i < close.length; i++) {
      adx[i] = ((adx[i - 1] * (period - 1)) + dx[i]) / period;
    }
  }

  return {
    adx: adx,
    pdi: diPlus,
    mdi: diMinus
  };
}

/**
 * 計算 Ichimoku Cloud
 */
function calculateIchimoku(high, low, close) {
  const conversionPeriod = 9;
  const basePeriod = 26;
  const spanBPeriod = 52;
  const displacement = 26;

  const conversionLine = new Array(close.length).fill(null);
  const baseLine = new Array(close.length).fill(null);
  const leadingSpanA = new Array(close.length).fill(null);
  const leadingSpanB = new Array(close.length).fill(null);
  const laggingSpan = new Array(close.length).fill(null);

  // Helpers
  const getDonchian = (h, l, idx, period) => {
    if (idx < period - 1) return null;
    let maxH = -Infinity;
    let minL = Infinity;
    for (let i = idx - period + 1; i <= idx; i++) {
      if (h[i] > maxH) maxH = h[i];
      if (l[i] < minL) minL = l[i];
    }
    return (maxH + minL) / 2;
  };

  for (let i = 0; i < close.length; i++) {
    // Conversion (Tenkan)
    conversionLine[i] = getDonchian(high, low, i, conversionPeriod);

    // Base (Kijun)
    baseLine[i] = getDonchian(high, low, i, basePeriod);

    // Lagging (Chikou) - shifted BACKWARDS by 26
    // Current Close is plotted 26 bars ago.
    if (i >= displacement) {
      // In trading view terms: lagging span at time T is Close[T+displacement]? No.
      // Chikou Span at T = Close[T] plotted at T-26.
      // So Array logic: laggingSpan[i - displacement] = close[i]
      laggingSpan[i - displacement + 1] = close[i];
    }

    // Leading Span A (Senkou A) - shifted FORWARD by 26
    // (Conversion + Base) / 2 plotted 26 bars ahead.
    if (conversionLine[i] !== null && baseLine[i] !== null) {
      // Logic: Write to i + displacement
      // We need to extend the array potentially, usually frontend handles projection.
      // But standard array format usually aligns with Timestamp[i].
      // So LeadingSpanA[i] = (Tenkan[i-26] + Kijun[i-26]) / 2
      if (i >= displacement - 1) {
        const prevConv = conversionLine[i - displacement + 1];
        const prevBase = baseLine[i - displacement + 1];
        if (prevConv !== null && prevBase !== null) {
          leadingSpanA[i] = (prevConv + prevBase) / 2;
        }
      }
    }

    // Leading Span B (Senkou B)
    // (MaxH52 + MinL52) / 2 plotted 26 bars ahead.
    // So SpanB[i] = Donchian52[i-26]
    if (i >= displacement - 1) {
      const donchian52 = getDonchian(high, low, i - displacement + 1, spanBPeriod);
      if (donchian52 !== null) {
        leadingSpanB[i] = donchian52;
      }
    }
  }

  // Note: Leading Spans are usually projected into the future (requiring future timestamps).
  // Here we map them to EXISTING timestamps. This means the cloud is "current".
  // Frontend usually wants the 'forward' projection. 
  // For standard charts, we just provide the data aligned to index.

  return {
    conversion: conversionLine,
    base: baseLine,
    spanA: leadingSpanA,
    spanB: leadingSpanB,
    lagging: laggingSpan
  };
}

/**
 * 計算 VWMA
 */
function calculateVWMA(close, volume, period = 20) {
  const vwma = new Array(close.length).fill(null);
  for (let i = period - 1; i < close.length; i++) {
    let sumPV = 0;
    let sumV = 0;
    for (let j = 0; j < period; j++) {
      sumPV += close[i - j] * volume[i - j];
      sumV += volume[i - j];
    }
    vwma[i] = (sumV === 0) ? close[i] : sumPV / sumV;
  }
  return {
    vwma: vwma
  };
}

/**
 * 計算 Stochastic (%K, %D)
 */
function calculateStochastic(high, low, close, kPeriod = 14, dPeriod = 3, smooth = 1) {
  const kLine = new Array(close.length).fill(null);
  const dLine = new Array(close.length).fill(null);

  // Fast %K
  for (let i = kPeriod - 1; i < close.length; i++) {
    let maxH = -Infinity;
    let minL = Infinity;
    for (let j = 0; j < kPeriod; j++) {
      if (high[i - j] > maxH) maxH = high[i - j];
      if (low[i - j] < minL) minL = low[i - j];
    }

    if (maxH === minL) {
      kLine[i] = 50;
    } else {
      kLine[i] = ((close[i] - minL) / (maxH - minL)) * 100;
    }
  }

  // Smooth %K? (User requirement said %K, %D). Usually Fast Stoch is just Raw %.
  // If smooth > 1, apply SMA to K.
  let finalK = kLine;
  if (smooth > 1) {
    finalK = calculateSMA(kLine, smooth);
  }

  // %D is SMA of %K
  const finalD = calculateSMA(finalK, dPeriod);

  return {
    k: finalK,
    d: finalD
  };
}

/**
 * 計算 CCI
 */
function calculateCCI(high, low, close, period = 20) {
  const tp = close.map((c, i) => (high[i] + low[i] + c) / 3);
  const smaTP = calculateSMA(tp, period);
  const cci = new Array(close.length).fill(null);

  for (let i = period - 1; i < close.length; i++) {
    let meanDev = 0;
    for (let j = 0; j < period; j++) {
      meanDev += Math.abs(tp[i - j] - smaTP[i]);
    }
    meanDev /= period;

    if (meanDev === 0) cci[i] = 0;
    else cci[i] = (tp[i] - smaTP[i]) / (0.015 * meanDev);
  }
  return { cci };
}

/**
 * 計算 Parabolic SAR
 */
function calculatePSAR(high, low, close, start = 0.02, step = 0.02, max = 0.2) {
  const psar = new Array(close.length).fill(null);
  const trend = new Array(close.length).fill(null); // 1 = Up, -1 = Down

  // Initial Values (Need at least 2 bars to determine trend)
  if (close.length < 2) return { psar, trend };

  // Assume trend based on first bar
  let isUp = close[1] > close[0];
  let af = start;
  let ep = isUp ? high[0] : low[0]; // Extreme Point
  let sar = isUp ? low[0] : high[0]; // SAR value

  psar[0] = null; // No SAR on first bar
  if (isUp) {
    // If uptrend, previous SAR was Low of previous.
    // But logic usually starts applying SAR from bar 1 or 2.
    // Let's simplified start.
    sar = low[0];
    ep = high[0];
  } else {
    sar = high[0];
    ep = low[0];
  }

  // First valid SAR at index 1
  psar[1] = sar;
  trend[1] = isUp ? 1 : -1;

  for (let i = 2; i < close.length; i++) {
    let prevSar = psar[i - 1];

    // Calculate new SAR
    let nextSar = prevSar + af * (ep - prevSar);

    // Constrain SAR
    if (isUp) {
      // SAR cannot be higher than prev Low or current Low (wait, standard: prev Low and prev-1 Low?)
      // "SAR must not rise above the low of the prior 2 periods"
      let low1 = low[i - 1];
      let low2 = low[i - 2];
      if (nextSar > low1) nextSar = low1;
      if (nextSar > low2) nextSar = low2;
    } else {
      // "SAR must not fall below the high of the prior 2 periods"
      let high1 = high[i - 1];
      let high2 = high[i - 2];
      if (nextSar < high1) nextSar = high1;
      if (nextSar < high2) nextSar = high2;
    }

    // Check for Reversal
    let reversed = false;
    if (isUp) {
      if (low[i] < nextSar) {
        isUp = false;
        reversed = true;
        nextSar = ep; // Reset SAR to EP
        ep = low[i];
        af = start;
      }
    } else {
      if (high[i] > nextSar) {
        isUp = true;
        reversed = true;
        nextSar = ep; // Reset SAR to EP
        ep = high[i];
        af = start;
      }
    }

    if (!reversed) {
      if (isUp) {
        if (high[i] > ep) {
          ep = high[i];
          af = Math.min(af + step, max);
        }
      } else {
        if (low[i] < ep) {
          ep = low[i];
          af = Math.min(af + step, max);
        }
      }
    }

    psar[i] = nextSar;
    trend[i] = isUp ? 1 : -1;
  }

  return { psar, trend };
}

/**
 * 計算 SuperTrend
 */
function calculateSuperTrend(high, low, close, period = 10, multiplier = 3) {
  const atr = calculateATR(calculateTR(high, low, close), period);
  const supertrend = new Array(close.length).fill(null);
  const direction = new Array(close.length).fill(1); // 1 = Buy, -1 = Sell

  // Needs valid ATR
  let basicUpper, basicLower;
  let finalUpper = new Array(close.length).fill(0);
  let finalLower = new Array(close.length).fill(0);

  for (let i = period; i < close.length; i++) {
    if (atr[i] === null) continue;

    let h = high[i];
    let l = low[i];
    let c = close[i];
    let prevC = close[i - 1];

    basicUpper = (h + l) / 2 + multiplier * atr[i];
    basicLower = (h + l) / 2 - multiplier * atr[i];

    if (basicUpper < finalUpper[i - 1] || prevC > finalUpper[i - 1]) {
      finalUpper[i] = basicUpper;
    } else {
      finalUpper[i] = finalUpper[i - 1];
    }

    if (basicLower > finalLower[i - 1] || prevC < finalLower[i - 1]) {
      finalLower[i] = basicLower;
    } else {
      finalLower[i] = finalLower[i - 1];
    }

    // Determing Trend
    let prevTrend = direction[i - 1];
    let currTrend = prevTrend;

    if (prevTrend === 1) { // Previous Upl
      if (c < finalLower[i - 1]) currTrend = -1;
    } else { // Previous Down
      if (c > finalUpper[i - 1]) currTrend = 1;
    }

    direction[i] = currTrend;
    supertrend[i] = (currTrend === 1) ? finalLower[i] : finalUpper[i];
  }

  // Fill initial nulls
  return { supertrend, direction };
}

/**
 * 計算 MFI (Money Flow Index)
 */
function calculateMFI(high, low, close, volume, period = 14) {
  const tp = high.map((h, i) => (h + low[i] + close[i]) / 3);
  const rawMoneyFlow = tp.map((p, i) => p * volume[i]);

  const mfi = new Array(close.length).fill(null);

  // Need at least period + 1 data points (start from index 1 for direction)
  if (close.length <= period) return mfi;

  for (let i = period; i < close.length; i++) {
    let posMF = 0;
    let negMF = 0;

    // Look back 'period' days. Since we need direction, loop from j=0 to period-1
    // relative to current i. Comparison is current vs prev.
    // Range: [i-period+1, i]

    for (let j = 0; j < period; j++) {
      const idx = i - j;
      const prevIdx = idx - 1;

      if (prevIdx < 0) continue;

      if (tp[idx] > tp[prevIdx]) {
        posMF += rawMoneyFlow[idx];
      } else if (tp[idx] < tp[prevIdx]) {
        negMF += rawMoneyFlow[idx];
      }
      // If equal, discarded
    }

    if (negMF === 0) {
      if (posMF === 0) mfi[i] = 50; // No volume/move?
      else mfi[i] = 100;
    } else {
      const mfr = posMF / negMF;
      mfi[i] = 100 - (100 / (1 + mfr));
    }
  }

  return mfi;
}

/**
 * 計算 OBV
 */
/**
 * 計算 OBV
 */
function calculateOBV(close, volume) {
  const obv = new Array(close.length).fill(0);
  obv[0] = volume[0]; // Or 0? Usually acc from start.

  for (let i = 1; i < close.length; i++) {
    if (close[i] > close[i - 1]) {
      obv[i] = obv[i - 1] + volume[i];
    } else if (close[i] < close[i - 1]) {
      obv[i] = obv[i - 1] - volume[i];
    } else {
      obv[i] = obv[i - 1];
    }
  }
  return { obv };
}

/**
 * 計算 Williams %R
 */
function calculateWilliamsR(high, low, close, period = 14) {
  const result = new Array(close.length).fill(null);
  for (let i = period - 1; i < close.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = 0; j < period; j++) {
      if (high[i - j] > highestHigh) highestHigh = high[i - j];
      if (low[i - j] < lowestLow) lowestLow = low[i - j];
    }
    if (highestHigh === lowestLow) {
      result[i] = 0; // Avoid division by zero
    } else {
      result[i] = ((highestHigh - close[i]) / (highestHigh - lowestLow)) * -100;
    }
  }
  return result;
}

/**
 * 計算 Chaikin Money Flow (CMF)
 */
function calculateCMF(high, low, close, volume, period = 20) {
  const ad = new Array(close.length).fill(0);
  for (let i = 0; i < close.length; i++) {
    if (high[i] === low[i]) {
      ad[i] = 0;
    } else {
      const moneyFlowMultiplier = ((close[i] - low[i]) - (high[i] - close[i])) / (high[i] - low[i]);
      ad[i] = moneyFlowMultiplier * volume[i];
    }
  }

  const cmf = new Array(close.length).fill(null);
  for (let i = period - 1; i < close.length; i++) {
    let sumAD = 0;
    let sumVol = 0;
    for (let j = 0; j < period; j++) {
      sumAD += ad[i - j];
      sumVol += volume[i - j];
    }
    if (sumVol === 0) cmf[i] = 0;
    else cmf[i] = sumAD / sumVol;
  }
  return cmf;
}


/**
 * 生成單個股票的技術指標
 */
function generateTechnicalIndicators(symbol, ohlcvData, benchmarkData = null) {
  const { timestamps, open, high, low, close, volume } = ohlcvData;
  const fundamentals = loadFundamentals(symbol);

  // 計算各種技術指標
  const sma5 = calculateSMA(close, 5);
  const sma10 = calculateSMA(close, 10);
  const sma20 = calculateSMA(close, 20);
  const sma30 = calculateSMA(close, 30);
  const sma50 = calculateSMA(close, 50);
  const sma60 = calculateSMA(close, 60);

  // Beta Calculation (10D, 3M/63D)
  let beta10d = null;
  let beta3m = null;

  if (benchmarkData && benchmarkData.close && benchmarkData.timestamps) {
    beta10d = calculateBeta(close, benchmarkData.close, timestamps, benchmarkData.timestamps, 10);
    beta3m = calculateBeta(close, benchmarkData.close, timestamps, benchmarkData.timestamps, 63);
  }

  // EMA Calculations
  const ema5 = calculateEMA(close, 5);
  const ema10 = calculateEMA(close, 10);
  const ema20 = calculateEMA(close, 20);
  const ema30 = calculateEMA(close, 30);
  const ema50 = calculateEMA(close, 50);
  const ema60 = calculateEMA(close, 60);

  const rsi = calculateRSI(close, 14);
  const macd = calculateMACD(close);
  const adx = calculateADX(high, low, close, 14);
  const ichimoku = calculateIchimoku(high, low, close);
  const vwma = calculateVWMA(close, volume, 20);
  const stoch = calculateStochastic(high, low, close, 14, 3, 3);
  const cci = calculateCCI(high, low, close, 20);

  // ATR & MFI
  const tr = calculateTR(high, low, close);
  const atr = calculateATR(tr, 14);

  // MFI Calculation
  const mfi = calculateMFI(high, low, close, volume, 14);

  const psar = calculatePSAR(high, low, close);
  const supertrend = calculateSuperTrend(high, low, close, 10, 3);
  const obv = calculateOBV(close, volume);
  const williamsR = calculateWilliamsR(high, low, close, 14);
  const cmf = calculateCMF(high, low, close, volume, 20);

  return {
    symbol: symbol,
    timestamps: timestamps,
    indicators: {
      sma: {
        sma5: sma5,
        sma10: sma10,
        sma20: sma20,
        sma30: sma30,
        sma50: sma50,
        sma60: sma60
      },
      ema: {
        ema5: ema5,
        ema10: ema10,
        ema20: ema20,
        ema30: ema30,
        ema50: ema50,
        ema60: ema60
      },
      rsi: {
        rsi14: rsi
      },
      macd: {
        macd: macd.macd,
        signal: macd.signal,
        histogram: macd.histogram
      },
      adx: adx, // Should be { adx, pdi, mdi }
      ichimoku: ichimoku, // { conversion, base, spanA, spanB, lagging }
      vwma: vwma, // { vwma }
      stoch: stoch, // { k, d }
      cci: {
        cci20: cci.cci
      },
      psar: {
        sar: psar.psar,
        trend: psar.trend
      },
      supertrend: supertrend, // { supertrend, direction }
      obv: {
        value: obv.obv
      },
      atr: {
        atr14: atr
      },
      mfi: {
        mfi14: mfi
      },
      williamsR: {
        r14: williamsR
      },
      cmf: {
        cmf20: cmf
      },
      // Custom Beta
      beta: {
        beta10d: beta10d,
        beta3m: beta3m
      },
      // Market volume stats
      market: {
        volumeLastDay: volume[volume.length - 1],
        avgVolume10d: calculateSMA(volume, 10).slice(-1)[0],
        avgVolume3m: calculateSMA(volume, 63).slice(-1)[0]
      },
      // Pass through fundamentals
      fundamentals: fundamentals
    },
    fundamentals: fundamentals, // Embed fundamental data
    metadata: {
      generated: new Date().toISOString(),
      source: 'GitHub Actions Daily Update',
      dataPoints: timestamps.length,
      indicators: [
        'SMA (5,10,20,30,50,60)', 'RSI14', 'MACD',
        'ADX14', 'Ichimoku', 'VWMA20', 'Stoch',
        'CCI20', 'PSAR', 'SuperTrend', 'OBV', 'WilliamsR14', 'CMF20',
        'Beta (10D, 3M vs SPX)'
      ]
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

  // Load Benchmark Data (SPX)
  const benchmarkData = loadBenchmarkData();

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
      const indicators = generateTechnicalIndicators(symbol, ohlcvData, benchmarkData);

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
    indicators: [
      'SMA', 'RSI', 'MACD', 'ADX', 'Ichimoku',
      'VWMA', 'Stochastic', 'CCI', 'PSAR', 'SuperTrend', 'OBV',
      'WilliamsR', 'CMF'
    ],
    note: 'Extended Technical indicators for optimized precomputed loading'
  };

  const indexPath = path.join(CONFIG.outputDir, 'latest_index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

  // --------------------------------------------------------------------------
  // New: Generate latest_all.json (Bulk Compact File)
  // --------------------------------------------------------------------------
  console.log('📦 Generating latest_all.json (Compact Bulk Data)...');

  const allIndicators = {};

  for (const filename of generatedFiles) {
    try {
      const filepath = path.join(CONFIG.outputDir, filename);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      const symbol = content.symbol;
      const raw = content.indicators;

      // Helper to get latest and change %
      const getCompact = (arr) => {
        if (!arr || !Array.isArray(arr) || arr.length === 0) return { value: 'N/A', change: null };

        // Get valid values for change calc
        let latest = null;
        let prev = null;
        let latestIdx = -1;

        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i] !== null && arr[i] !== undefined) {
            if (latest === null) {
              latest = arr[i];
              latestIdx = i;
            } else {
              prev = arr[i];
              break;
            }
          }
        }

        let change = null;
        let changePct = null;
        if (latest !== null && prev !== null && prev !== 0) {
          change = latest - prev;
          changePct = ((latest - prev) / Math.abs(prev)) * 100;
        }

        return {
          value: latest,
          change: changePct !== null ? changePct.toFixed(2) : null, // Store as string to save space? Or number? Number is better for JSON
          // signal: 'N/A' // Signals not calculated here yet, UI does it or API does it? 
          // API uses "signal: N/A" usually. TechnicalIndicators.vue calculates text based on value/signal.
        };
      };

      const getValOnly = (arr) => {
        if (!arr || !Array.isArray(arr)) return null;
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i] !== null && arr[i] !== undefined) return arr[i];
        }
        return null;
      };

      // Construct Compact Object (matching structure expected by UI after API processing)
      // We map directly to the keys UI expects: ma5, rsi14, etc.
      const compact = {
        symbol: symbol,
        date: content.date,

        // Trend
        ma5: getCompact(raw.ema?.ema5),
        ma10: getCompact(raw.ema?.ema10),
        ema20: getCompact(raw.ema?.ema20),
        ma30: getCompact(raw.ema?.ema30),

        sma5: getCompact(raw.sma?.sma5),
        sma10: getCompact(raw.sma?.sma10),
        sma30: getCompact(raw.sma?.sma30),

        superTrend: getCompact(raw.supertrend?.supertrend),
        parabolicSAR: getCompact(raw.psar?.sar),
        vwma20: getCompact(raw.vwma?.vwma),

        // Oscillators
        rsi14: getCompact(raw.rsi?.rsi14),
        willr14: getCompact(raw.williamsR?.r14),
        stochK: getCompact(raw.stoch?.k),
        stochD: getCompact(raw.stoch?.d),
        cci20: getCompact(raw.cci?.cci20),
        adx14: getCompact(raw.adx?.adx),

        // MACD
        macd: {
          value: getValOnly(raw.macd?.macd),
          signal: getValOnly(raw.macd?.signal),
          histogram: getValOnly(raw.macd?.histogram),
          // Change of MACD itself?
          ...getCompact(raw.macd?.macd) // Overwrites value, adds change
        },

        // Ichimoku
        ichimokuConversionLine: getCompact(raw.ichimoku?.conversion),
        ichimokuBaseLine: getCompact(raw.ichimoku?.base),
        ichimokuLaggingSpan: getCompact(raw.ichimoku?.lagging),

        // Market
        atr14: getCompact(raw.atr?.atr14),
        mfi14: getCompact(raw.mfi?.mfi14),
        cmf20: getCompact(raw.cmf?.cmf20),
        obv: getCompact(raw.obv?.value),

        // Beta
        beta: { value: content.fundamentals?.defaultKeyStatistics?.beta || 'N/A' }, // Static
        beta_10d: getCompact(raw.beta?.beta10d),
        beta_3mo: getCompact(raw.beta?.beta3m),

        // Volume/Market Cap (latest values)
        market: {
          volume: getCompact(raw.market?.volumeLastDay ? [raw.market.volumeLastDay] : []), // It's a single value in raw usually? No, raw.market produced by script is object with single values
          avgVol10D: raw.market?.avgVolume10d,
          avgVol3M: raw.market?.avgVolume3m,
          marketCap: content.fundamentals?.price?.marketCap || content.fundamentals?.summaryDetail?.marketCap
        },

        lastUpdated: new Date().toISOString()
      };

      allIndicators[symbol] = compact;

    } catch (e) {
      console.warn(`⚠️ Failed to compact data for ${filename}:`, e.message);
    }
  }

  const allPath = path.join(CONFIG.outputDir, 'latest_all.json');
  fs.writeFileSync(allPath, JSON.stringify(allIndicators, null, 2)); // Pretty print for debug, minified for prod? 2 is fine for 50 items.
  console.log(`✅ Generated latest_all.json (${(fs.statSync(allPath).size / 1024).toFixed(2)} KB)`);

  console.log(`📋 Generated latest_index.json with ${generatedFiles.length} files`);
  console.log('🎉 Daily technical indicators generation completed!');

  return {
    totalFiles: generatedFiles.length,
    symbols: symbols.length,
    date: today,
    indexFile: 'latest_index.json',
    bulkFile: 'latest_all.json'
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