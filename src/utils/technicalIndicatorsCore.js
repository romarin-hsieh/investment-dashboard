/**
 * 技術指標核心實現
 * 基於 YAML 規格 indicator_algorithms v2.0.0
 * 
 * 特點:
 * - 所有輸出序列與輸入對齊，長度一致
 * - 前 (period-1) 根輸出 NaN
 * - SMA: 嚴格按照 v2.0.0 規格實現
 * - EMA: 支援 sma_seed 和 first_value 初始化模式
 * - 完整的 NaN 處理策略 (strict, skipna, hold_last 等)
 */

// =========================
// 0) 共用資料模型與規約
// =========================

const EPSILON = 1e-12; // 避免除以 0

/**
 * 數值策略處理
 */
function handleNaN(value) {
  return (value === null || value === undefined || !isFinite(value)) ? NaN : value;
}

function clampRSI(rsi) {
  return Math.max(0, Math.min(100, rsi));
}

/**
 * 滾動窗口極值計算
 */
function rollingMax(values, period) {
  const result = new Array(values.length);
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result[i] = NaN;
    } else {
      let max = -Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (!isNaN(values[j])) {
          max = Math.max(max, values[j]);
        }
      }
      result[i] = max === -Infinity ? NaN : max;
    }
  }
  
  return result;
}

function rollingMin(values, period) {
  const result = new Array(values.length);
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result[i] = NaN;
    } else {
      let min = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (!isNaN(values[j])) {
          min = Math.min(min, values[j]);
        }
      }
      result[i] = min === Infinity ? NaN : min;
    }
  }
  
  return result;
}

// =========================
// 1) 共用 Helper 定義
// =========================

/**
 * SMA Helper - 基於 v2.0.0 規格
 * @param {number[]} values - 輸入序列
 * @param {number} period - 週期 N
 * @param {string} nanPolicy - NaN 處理策略: 'strict' | 'skipna'
 * @param {number} minPeriods - skipna 模式下的最小有效值數量
 * @returns {number[]} SMA 序列，與輸入對齊
 */
function sma(values, period, nanPolicy = 'strict', minPeriods = null) {
  if (period <= 0) throw new Error('Period must be positive');
  
  const L = values.length;
  const result = new Array(L).fill(NaN);
  
  // minPeriods 預設為 period
  if (minPeriods === null) minPeriods = period;
  
  for (let t = 0; t < L; t++) {
    if (t < period - 1) {
      // t < N-1: keep NaN
      continue;
    }
    
    // window = x[t-N+1 .. t]
    const window = values.slice(t - period + 1, t + 1);
    
    if (nanPolicy === 'strict') {
      // 如果 window 中有任何 NaN，則 sma[t] = NaN
      if (window.some(v => isNaN(v))) {
        result[t] = NaN;
      } else {
        result[t] = window.reduce((sum, v) => sum + v, 0) / window.length;
      }
    } else if (nanPolicy === 'skipna') {
      // 只計算有效值
      const validValues = window.filter(v => !isNaN(v));
      if (validValues.length < minPeriods) {
        result[t] = NaN;
      } else {
        result[t] = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
      }
    }
  }
  
  return result;
}

/**
 * EMA Helper - 基於 v2.0.0 規格
 * @param {number[]} values - 輸入序列
 * @param {number} period - 週期 N
 * @param {number} alpha - 平滑係數，預設 2/(period+1)
 * @param {string} initMode - 初始化策略: 'sma_seed' | 'first_value'
 * @param {string} nanPolicy - NaN 處理策略: 'strict_break' | 'strict_recover' | 'hold_last'
 * @returns {number[]} EMA 序列，與輸入對齊
 */
function ema(values, period, alpha = null, initMode = 'sma_seed', nanPolicy = 'strict_recover') {
  if (period <= 0) throw new Error('Period must be positive');
  
  const L = values.length;
  const result = new Array(L).fill(NaN);
  
  // 預設 alpha = 2/(N+1)
  if (alpha === null) alpha = 2 / (period + 1);
  
  // 驗證 alpha 範圍
  if (alpha <= 0 || alpha > 1) {
    throw new Error('Alpha must be in (0, 1]');
  }
  
  if (initMode === 'first_value') {
    // 找到第一個非 NaN 值作為初始值
    let firstValidIndex = -1;
    for (let k = 0; k < L; k++) {
      if (!isNaN(values[k])) {
        firstValidIndex = k;
        break;
      }
    }
    
    if (firstValidIndex === -1) {
      // 沒有找到有效值，返回全 NaN
      return result;
    }
    
    // 設置初始值
    result[firstValidIndex] = values[firstValidIndex];
    
    // 從下一個點開始計算
    for (let t = firstValidIndex + 1; t < L; t++) {
      if (isNaN(values[t])) {
        // 處理 NaN 輸入
        if (nanPolicy === 'hold_last') {
          result[t] = result[t - 1];
        } else {
          result[t] = NaN;
        }
      } else {
        // 有效輸入
        if (isNaN(result[t - 1])) {
          if (nanPolicy === 'strict_recover') {
            result[t] = NaN; // 等待重新 seed
          } else {
            result[t] = NaN;
          }
        } else {
          result[t] = alpha * values[t] + (1 - alpha) * result[t - 1];
        }
      }
    }
    
  } else if (initMode === 'sma_seed') {
    // sma_seed 模式：在 t = N-1 處用 SMA 初始化
    
    for (let t = 0; t < L; t++) {
      if (t < period - 1) {
        // t < N-1: keep NaN
        continue;
      }
      
      if (t === period - 1) {
        // 首次 seed 點
        const window = values.slice(0, period);
        if (window.some(v => isNaN(v))) {
          result[t] = NaN;
        } else {
          result[t] = window.reduce((sum, v) => sum + v, 0) / window.length;
        }
      } else {
        // t > N-1
        if (isNaN(values[t])) {
          // 輸入是 NaN
          if (nanPolicy === 'hold_last') {
            result[t] = result[t - 1];
          } else if (nanPolicy === 'strict_break') {
            result[t] = NaN;
            // 標記為 broken，後續都是 NaN (簡化實現)
          } else if (nanPolicy === 'strict_recover') {
            result[t] = NaN;
          }
        } else {
          // 輸入有效
          if (isNaN(result[t - 1])) {
            if (nanPolicy === 'strict_recover') {
              // re-seed: 檢查最近 N 根是否都有效
              const recentWindow = values.slice(t - period + 1, t + 1);
              if (recentWindow.some(v => isNaN(v))) {
                result[t] = NaN;
              } else {
                // 重新 seed
                result[t] = recentWindow.reduce((sum, v) => sum + v, 0) / recentWindow.length;
              }
            } else {
              result[t] = NaN;
            }
          } else {
            // 正常 EMA 計算
            result[t] = alpha * values[t] + (1 - alpha) * result[t - 1];
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Wilder 平滑 Helper
 * @param {number[]} values - 輸入序列
 * @param {number} period - 週期
 * @returns {number[]} Wilder 平滑序列
 */
function wilderSmoothing(values, period) {
  if (period <= 0) throw new Error('Period must be positive');
  
  const result = new Array(values.length);
  
  // 初始化階段
  for (let i = 0; i < period - 1; i++) {
    result[i] = NaN;
  }
  
  if (values.length < period) return result;
  
  // 第一個值使用 SMA
  let sum = 0;
  let count = 0;
  
  for (let j = 0; j < period; j++) {
    if (!isNaN(values[j])) {
      sum += values[j];
      count++;
    }
  }
  
  result[period - 1] = count === period ? sum / period : NaN;
  
  // Wilder 遞迴平滑
  for (let i = period; i < values.length; i++) {
    if (isNaN(result[i - 1]) || isNaN(values[i])) {
      result[i] = NaN;
    } else {
      result[i] = (result[i - 1] * (period - 1) + values[i]) / period;
    }
  }
  
  return result;
}

// =========================
// 2) 技術指標實現
// =========================

/**
 * MA (EMA) - 指數移動平均線 - v2.0.0 規格
 */
function calculateMA(close, period = 5, alpha = null, initMode = 'sma_seed', nanPolicy = 'strict_recover') {
  return ema(close, period, alpha, initMode, nanPolicy);
}

/**
 * SMA - 簡單移動平均線 - v2.0.0 規格
 */
function calculateSMA(close, period = 5, nanPolicy = 'strict', minPeriods = null) {
  return sma(close, period, nanPolicy, minPeriods);
}

/**
 * Ichimoku Base Line (Kijun-sen)
 */
function calculateIchimokuBaseLine(high, low, period = 26) {
  const hh = rollingMax(high, period);
  const ll = rollingMin(low, period);
  
  const result = new Array(high.length);
  for (let i = 0; i < high.length; i++) {
    if (isNaN(hh[i]) || isNaN(ll[i])) {
      result[i] = NaN;
    } else {
      result[i] = (hh[i] + ll[i]) / 2;
    }
  }
  
  return result;
}

/**
 * Ichimoku Conversion Line (Tenkan-sen)
 */
function calculateIchimokuConversionLine(high, low, period = 9) {
  return calculateIchimokuBaseLine(high, low, period);
}

/**
 * Ichimoku Lagging Span (Chikou Span)
 */
function calculateIchimokuLaggingSpan(close, shift = 26) {
  if (shift < 0) throw new Error('Shift must be non-negative');
  
  const result = new Array(close.length);
  
  for (let i = 0; i < close.length; i++) {
    if (i + shift < close.length) {
      result[i] = close[i];
    } else {
      result[i] = NaN; // 最後 shift 根無未來資料
    }
  }
  
  return result;
}

/**
 * VWMA - 成交量加權移動平均線
 */
function calculateVWMA(close, volume, period = 20) {
  const result = new Array(close.length);
  
  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      result[i] = NaN;
    } else {
      let numerator = 0;
      let denominator = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        if (!isNaN(close[j]) && !isNaN(volume[j])) {
          numerator += close[j] * volume[j];
          denominator += volume[j];
        }
      }
      
      result[i] = denominator <= EPSILON ? NaN : numerator / denominator;
    }
  }
  
  return result;
}

/**
 * RSI - 相對強弱指數 (Wilder 平滑)
 */
function calculateRSI(close, period = 14) {
  if (close.length < period + 1) {
    return new Array(close.length).fill(NaN);
  }
  
  // Step A: 計算價格變化和收益/損失
  const delta = new Array(close.length);
  const gain = new Array(close.length);
  const loss = new Array(close.length);
  
  delta[0] = NaN;
  gain[0] = NaN;
  loss[0] = NaN;
  
  for (let i = 1; i < close.length; i++) {
    if (isNaN(close[i]) || isNaN(close[i - 1])) {
      delta[i] = NaN;
      gain[i] = NaN;
      loss[i] = NaN;
    } else {
      delta[i] = close[i] - close[i - 1];
      gain[i] = Math.max(delta[i], 0);
      loss[i] = Math.max(-delta[i], 0);
    }
  }
  
  // Step B: Wilder 平滑
  const avgGain = wilderSmoothing(gain.slice(1), period); // 去掉第一個 NaN
  const avgLoss = wilderSmoothing(loss.slice(1), period);
  
  // Step C: 計算 RSI
  const result = new Array(close.length);
  result[0] = NaN; // 第一個點沒有 delta
  
  for (let i = 1; i < close.length; i++) {
    const avgGainValue = avgGain[i - 1];
    const avgLossValue = avgLoss[i - 1];
    
    if (isNaN(avgGainValue) || isNaN(avgLossValue)) {
      result[i] = NaN;
    } else if (avgLossValue <= EPSILON) {
      result[i] = 100; // 沒有下跌
    } else {
      const rs = avgGainValue / avgLossValue;
      const rsi = 100 - (100 / (1 + rs));
      result[i] = clampRSI(rsi);
    }
  }
  
  return result;
}

/**
 * ADX - 平均趨向指數 (完整 Wilder 實現)
 */
function calculateADX(high, low, close, period = 14) {
  const length = Math.min(high.length, low.length, close.length);
  if (length < period * 2) {
    return {
      adx: new Array(length).fill(NaN),
      plusDI: new Array(length).fill(NaN),
      minusDI: new Array(length).fill(NaN)
    };
  }
  
  // Step A: 計算 DM 和 TR
  const upMove = new Array(length);
  const downMove = new Array(length);
  const plusDM = new Array(length);
  const minusDM = new Array(length);
  const tr = new Array(length);
  
  upMove[0] = NaN;
  downMove[0] = NaN;
  plusDM[0] = NaN;
  minusDM[0] = NaN;
  tr[0] = NaN;
  
  for (let i = 1; i < length; i++) {
    // Up/Down Move
    upMove[i] = high[i] - high[i - 1];
    downMove[i] = low[i - 1] - low[i];
    
    // +DM / -DM
    if (upMove[i] > downMove[i] && upMove[i] > 0) {
      plusDM[i] = upMove[i];
    } else {
      plusDM[i] = 0;
    }
    
    if (downMove[i] > upMove[i] && downMove[i] > 0) {
      minusDM[i] = downMove[i];
    } else {
      minusDM[i] = 0;
    }
    
    // True Range
    const tr1 = high[i] - low[i];
    const tr2 = Math.abs(high[i] - close[i - 1]);
    const tr3 = Math.abs(low[i] - close[i - 1]);
    tr[i] = Math.max(tr1, tr2, tr3);
  }
  
  // Step B: Wilder 平滑
  const smTR = wilderSmoothing(tr.slice(1), period);
  const smPlusDM = wilderSmoothing(plusDM.slice(1), period);
  const smMinusDM = wilderSmoothing(minusDM.slice(1), period);
  
  // Step C: 計算 DI
  const plusDI = new Array(length);
  const minusDI = new Array(length);
  const dx = new Array(length);
  
  plusDI[0] = NaN;
  minusDI[0] = NaN;
  dx[0] = NaN;
  
  for (let i = 1; i < length; i++) {
    const smTRValue = smTR[i - 1];
    const smPlusDMValue = smPlusDM[i - 1];
    const smMinusDMValue = smMinusDM[i - 1];
    
    if (isNaN(smTRValue) || smTRValue <= EPSILON) {
      plusDI[i] = NaN;
      minusDI[i] = NaN;
      dx[i] = NaN;
    } else {
      plusDI[i] = 100 * smPlusDMValue / smTRValue;
      minusDI[i] = 100 * smMinusDMValue / smTRValue;
      
      const diSum = plusDI[i] + minusDI[i];
      if (diSum <= EPSILON) {
        dx[i] = NaN;
      } else {
        dx[i] = 100 * Math.abs(plusDI[i] - minusDI[i]) / diSum;
      }
    }
  }
  
  // Step D: ADX Wilder 平滑
  const adx = wilderSmoothing(dx.slice(1), period);
  
  // 對齊結果
  const adxResult = new Array(length);
  adxResult[0] = NaN;
  for (let i = 1; i < length; i++) {
    adxResult[i] = adx[i - 1];
  }
  
  return {
    adx: adxResult,
    plusDI: plusDI,
    minusDI: minusDI
  };
}

/**
 * MACD - 移動平均收斂發散
 */
function calculateMACD(close, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (slowPeriod <= fastPeriod) {
    console.warn('Slow period should be greater than fast period');
  }
  
  const emaFast = ema(close, fastPeriod);
  const emaSlow = ema(close, slowPeriod);
  
  // MACD Line
  const macd = new Array(close.length);
  for (let i = 0; i < close.length; i++) {
    if (isNaN(emaFast[i]) || isNaN(emaSlow[i])) {
      macd[i] = NaN;
    } else {
      macd[i] = emaFast[i] - emaSlow[i];
    }
  }
  
  // Signal Line
  const signal = ema(macd, signalPeriod);
  
  // Histogram
  const histogram = new Array(close.length);
  for (let i = 0; i < close.length; i++) {
    if (isNaN(macd[i]) || isNaN(signal[i])) {
      histogram[i] = NaN;
    } else {
      histogram[i] = macd[i] - signal[i];
    }
  }
  
  return {
    macd: macd,
    signal: signal,
    histogram: histogram
  };
}

// =========================
// 3) 統一計算接口
// =========================

/**
 * 計算所有技術指標
 * @param {Object} ohlcv - OHLCV 數據 {open, high, low, close, volume}
 * @returns {Object} 所有指標結果
 */
function calculateAllIndicators(ohlcv) {
  const { open, high, low, close, volume } = ohlcv;
  
  // 驗證數據長度一致
  const length = close.length;
  if (high.length !== length || low.length !== length || 
      open.length !== length || volume.length !== length) {
    throw new Error('All OHLCV arrays must have the same length');
  }
  
  // 計算所有指標
  const results = {
    // MA (EMA)
    MA_5: calculateMA(close, 5),
    MA_10: calculateMA(close, 10),
    MA_30: calculateMA(close, 30),
    
    // SMA
    SMA_5: calculateSMA(close, 5),
    SMA_10: calculateSMA(close, 10),
    SMA_30: calculateSMA(close, 30),
    
    // Ichimoku
    ICHIMOKU_BASELINE_26: calculateIchimokuBaseLine(high, low, 26),
    ICHIMOKU_CONVERSIONLINE_9: calculateIchimokuConversionLine(high, low, 9),
    ICHIMOKU_LAGGINGSPAN_26: calculateIchimokuLaggingSpan(close, 26),
    
    // VWMA
    VWMA_20: calculateVWMA(close, volume, 20),
    
    // RSI
    RSI_14: calculateRSI(close, 14),
    
    // MACD
    ...(() => {
      const macdResult = calculateMACD(close, 12, 26, 9);
      return {
        MACD_12_26_9: macdResult.macd,
        MACD_SIGNAL_9: macdResult.signal,
        MACD_HIST: macdResult.histogram
      };
    })(),
    
    // ADX
    ...(() => {
      const adxResult = calculateADX(high, low, close, 14);
      return {
        ADX_14: adxResult.adx,
        ADX_14_PLUS_DI: adxResult.plusDI,
        ADX_14_MINUS_DI: adxResult.minusDI
      };
    })()
  };
  
  // 驗證所有結果長度一致
  for (const [key, values] of Object.entries(results)) {
    if (values.length !== length) {
      console.error(`Length mismatch for ${key}: expected ${length}, got ${values.length}`);
    }
  }
  
  return results;
}

// =========================
// 4) 導出
// =========================

export {
  // Helper 函數
  sma,
  ema,
  wilderSmoothing,
  rollingMax,
  rollingMin,
  
  // 個別指標
  calculateMA,
  calculateSMA,
  calculateIchimokuBaseLine,
  calculateIchimokuConversionLine,
  calculateIchimokuLaggingSpan,
  calculateVWMA,
  calculateRSI,
  calculateADX,
  calculateMACD,
  
  // 統一接口
  calculateAllIndicators,
  
  // 常數
  EPSILON
};

export default {
  calculateAllIndicators,
  calculateMA,
  calculateSMA,
  calculateIchimokuBaseLine,
  calculateIchimokuConversionLine,
  calculateIchimokuLaggingSpan,
  calculateVWMA,
  calculateRSI,
  calculateADX,
  calculateMACD
};