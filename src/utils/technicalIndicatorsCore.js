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
 * Wilder 平滑 Helper (增強版，更好的 NaN 處理)
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

  if (values.length < period) {
    console.log(`Wilder: Insufficient data length ${values.length} < ${period}`);
    return result;
  }

  // 第一個值使用 SMA - 尋找足夠的有效值
  let sum = 0;
  let count = 0;
  let validIndices = [];

  // 收集前 period 個有效值
  for (let j = 0; j < values.length && validIndices.length < period; j++) {
    if (!isNaN(values[j])) {
      validIndices.push(j);
      sum += values[j];
      count++;
    }
  }

  console.log(`Wilder: Found ${count} valid values in first ${period} positions for SMA initialization`);

  if (count < period) {
    console.warn(`Wilder: Insufficient valid data for SMA initialization: ${count} < ${period}`);
    return result; // 返回全 NaN
  }

  // 使用最後一個有效值的位置作為初始化點
  const initIndex = Math.max(period - 1, validIndices[period - 1]);
  result[initIndex] = sum / period;

  console.log(`Wilder: Initialized at index ${initIndex} with value ${result[initIndex]}`);

  // Wilder 遞迴平滑 - 從初始化點開始
  for (let i = initIndex + 1; i < values.length; i++) {
    if (isNaN(result[i - 1]) || isNaN(values[i])) {
      result[i] = NaN;
    } else {
      result[i] = (result[i - 1] * (period - 1) + values[i]) / period;
    }
  }

  const validCount = result.filter(v => !isNaN(v)).length;
  console.log(`Wilder: Generated ${validCount} valid smoothed values`);

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
 * ADX - 平均趨向指數 (完整 Wilder 實現，增強數據驗證)
 */
function calculateADX(high, low, close, period = 14) {
  const length = Math.min(high.length, low.length, close.length);

  // 增強數據驗證
  if (length < period * 2) {
    console.warn(`ADX: Insufficient data length ${length} < ${period * 2} for period ${period}`);
    return {
      adx: new Array(length).fill(NaN),
      plusDI: new Array(length).fill(NaN),
      minusDI: new Array(length).fill(NaN)
    };
  }

  // 檢查數據質量
  let validOHLCCount = 0;
  for (let i = 0; i < length; i++) {
    if (!isNaN(high[i]) && !isNaN(low[i]) && !isNaN(close[i])) {
      validOHLCCount++;
    }
  }

  console.log(`ADX: Processing ${length} data points, ${validOHLCCount} valid OHLC points`);

  if (validOHLCCount < period * 2) {
    console.warn(`ADX: Insufficient valid OHLC data ${validOHLCCount} < ${period * 2}`);
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
    // 檢查當前和前一個數據點的有效性
    if (isNaN(high[i]) || isNaN(low[i]) || isNaN(close[i]) ||
      isNaN(high[i - 1]) || isNaN(low[i - 1]) || isNaN(close[i - 1])) {
      upMove[i] = NaN;
      downMove[i] = NaN;
      plusDM[i] = NaN;
      minusDM[i] = NaN;
      tr[i] = NaN;
      continue;
    }

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

  // Step B: Wilder 平滑 - 跳過第一個 NaN 值
  const smTR = wilderSmoothing(tr.slice(1), period);
  const smPlusDM = wilderSmoothing(plusDM.slice(1), period);
  const smMinusDM = wilderSmoothing(minusDM.slice(1), period);

  console.log(`ADX: Wilder smoothing results - TR valid: ${smTR.filter(v => !isNaN(v)).length}, +DM valid: ${smPlusDM.filter(v => !isNaN(v)).length}, -DM valid: ${smMinusDM.filter(v => !isNaN(v)).length}`);

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

    if (isNaN(smTRValue) || isNaN(smPlusDMValue) || isNaN(smMinusDMValue) || smTRValue <= EPSILON) {
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

  console.log(`ADX: Final ADX smoothing - DX valid: ${dx.filter(v => !isNaN(v)).length}, ADX valid: ${adx.filter(v => !isNaN(v)).length}`);

  // 對齊結果
  const adxResult = new Array(length);
  adxResult[0] = NaN;
  for (let i = 1; i < length; i++) {
    adxResult[i] = adx[i - 1];
  }

  // 最終驗證
  const finalValidADX = adxResult.filter(v => !isNaN(v)).length;
  console.log(`ADX: Final result - ${finalValidADX} valid ADX values out of ${length} total`);

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

/**
 * Parabolic SAR - 拋物線轉向指標
 */
function calculateParabolicSAR(high, low, close, startAf = 0.02, maxAf = 0.2) {
  const length = close.length;
  const psar = new Array(length).fill(NaN);

  // 至少需要一些數據來初始化
  if (length < 5) return psar;

  // 簡化初始化: 使用前幾個點的趨勢
  let trend = 1; // 1 for up, -1 for down
  if (close[1] < close[0]) trend = -1;

  let af = startAf;
  let ep = trend === 1 ? Math.max(high[0], high[1]) : Math.min(low[0], low[1]);
  psar[1] = trend === 1 ? Math.min(low[0], low[1]) : Math.max(high[0], high[1]);

  for (let i = 2; i < length; i++) {
    const prevSar = psar[i - 1];

    // 計算新的 SAR
    let nextSar = prevSar + af * (ep - prevSar);

    // 限制 SAR 不超過前兩個週期的極值
    if (trend === 1) {
      nextSar = Math.min(nextSar, low[i - 1], low[i - 2]);
    } else {
      nextSar = Math.max(nextSar, high[i - 1], high[i - 2]);
    }

    // 檢查反轉
    let newTrend = trend;
    if (trend === 1 && low[i] < nextSar) {
      newTrend = -1;
      nextSar = ep; // 反轉時 SAR 跳到極值
      ep = low[i];
      af = startAf;
    } else if (trend === -1 && high[i] > nextSar) {
      newTrend = 1;
      nextSar = ep;
      ep = high[i];
      af = startAf;
    } else {
      // 趨勢延續，更新 EP 和 AF
      if (trend === 1) {
        if (high[i] > ep) {
          ep = high[i];
          af = Math.min(af + startAf, maxAf);
        }
      } else {
        if (low[i] < ep) {
          ep = low[i];
          af = Math.min(af + startAf, maxAf);
        }
      }
    }

    psar[i] = nextSar;
    trend = newTrend;
  }

  return psar;
}

/**
 * Stochastic Oscillator - 隨機指標 (K%D)
 */
function calculateStochastic(high, low, close, period = 14, signalPeriod = 3) {
  const length = close.length;
  const kLine = new Array(length).fill(NaN);

  // 計算 Fast %K
  for (let i = period - 1; i < length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = i - period + 1; j <= i; j++) {
      highestHigh = Math.max(highestHigh, high[j]);
      lowestLow = Math.min(lowestLow, low[j]);
    }

    if (highestHigh === lowestLow) {
      kLine[i] = 50;
    } else {
      kLine[i] = ((close[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
    }
  }

  // 計算 %D (SMA of %K)
  const dLine = sma(kLine, signalPeriod, 'skipna');

  return { k: kLine, d: dLine };
}

/**
 * CCI - 順勢指標
 */
function calculateCCI(high, low, close, period = 20) {
  const length = close.length;
  const cci = new Array(length).fill(NaN);
  const tp = new Array(length); // Typical Price

  for (let i = 0; i < length; i++) {
    tp[i] = (high[i] + low[i] + close[i]) / 3;
  }

  // 計算 TP 的 SMA
  const smaTp = sma(tp, period);

  for (let i = period - 1; i < length; i++) {
    if (isNaN(smaTp[i])) continue;

    // 計算 Mean Deviation
    let meanDev = 0;
    for (let j = i - period + 1; j <= i; j++) {
      meanDev += Math.abs(tp[j] - smaTp[i]);
    }
    meanDev /= period;

    if (meanDev === 0) {
      cci[i] = 0;
    } else {
      cci[i] = (tp[i] - smaTp[i]) / (0.015 * meanDev);
    }
  }

  return cci;
}

/**
 * ATR - 平均真實波幅
 */
function calculateATR(high, low, close, period = 14) {
  const length = close.length;
  const tr = new Array(length).fill(NaN);

  // TR 計算
  for (let i = 1; i < length; i++) {
    const t1 = high[i] - low[i];
    const t2 = Math.abs(high[i] - close[i - 1]);
    const t3 = Math.abs(low[i] - close[i - 1]);
    tr[i] = Math.max(t1, t2, t3);
  }

  // ATR 使用 Wilder 平滑
  // 先去掉 TR 的第一個 NaN 再平滑，然後補回
  const smoothedTr = wilderSmoothing(tr.slice(1), period);

  const result = new Array(length).fill(NaN);
  for (let i = 1; i < length; i++) {
    result[i] = smoothedTr[i - 1];
  }

  return result;
}

/**
 * OBV - 能量潮
 */
function calculateOBV(close, volume) {
  const length = close.length;
  const obv = new Array(length).fill(NaN);

  let currentOBV = 0;
  let startIndex = 0;

  // Find first valid index (requires valid close, volume can be 0 if missing)
  while (startIndex < length) {
    const c = Number(close[startIndex]);
    if (!isNaN(c)) {
      let v = Number(volume[startIndex]);
      if (isNaN(v)) v = 0;

      obv[startIndex] = v;
      currentOBV = v;
      break;
    }
    startIndex++;
  }

  for (let i = startIndex + 1; i < length; i++) {
    const c = Number(close[i]);
    const prevC = Number(close[i - 1]);

    if (isNaN(c) || isNaN(prevC)) {
      obv[i] = NaN;
      continue;
    }

    let v = Number(volume[i]);
    if (isNaN(v)) v = 0;

    const change = c - prevC;
    if (change > 0) {
      currentOBV += v;
    } else if (change < 0) {
      currentOBV -= v;
    }
    // if change === 0, currentOBV remains same

    obv[i] = currentOBV;
  }

  return obv;
}

/**
 * SuperTrend - 超級趨勢指標
 * @param {Array} high
 * @param {Array} low
 * @param {Array} close
 * @param {Number} period (default 10)
 * @param {Number} multiplier (default 3)
 */
function calculateSuperTrend(high, low, close, period = 10, multiplier = 3) {
  const length = close.length;
  const atr = calculateATR(high, low, close, period);
  const superTrend = new Array(length).fill(NaN);

  // Basic Upper/Lower Bands
  const basicUpper = new Array(length).fill(NaN);
  const basicLower = new Array(length).fill(NaN);

  // Final Upper/Lower Bands
  const finalUpper = new Array(length).fill(NaN);
  const finalLower = new Array(length).fill(NaN);

  let trend = 1; // 1: Bullish, -1: Bearish

  for (let i = 1; i < length; i++) {
    if (isNaN(atr[i])) continue;

    const hl2 = (high[i] + low[i]) / 2;
    basicUpper[i] = hl2 + (multiplier * atr[i]);
    basicLower[i] = hl2 - (multiplier * atr[i]);

    // Initialize Final Bands
    // If previous final band is NaN, use current basic band
    const prevFinalUpper = isNaN(finalUpper[i - 1]) ? basicUpper[i] : finalUpper[i - 1];
    const prevFinalLower = isNaN(finalLower[i - 1]) ? basicLower[i] : finalLower[i - 1];
    const prevClose = close[i - 1];

    // Final Upper Band Logic
    if (basicUpper[i] < prevFinalUpper || prevClose > prevFinalUpper) {
      finalUpper[i] = basicUpper[i];
    } else {
      finalUpper[i] = prevFinalUpper;
    }

    // Final Lower Band Logic
    if (basicLower[i] > prevFinalLower || prevClose < prevFinalLower) {
      finalLower[i] = basicLower[i];
    } else {
      finalLower[i] = prevFinalLower;
    }

    // Trend Logic
    let prevTrend = (i === 1) ? 1 : trend; // default to bullish start

    // Determine SuperTrend
    // If trend was bullish...
    if (prevTrend === 1) {
      superTrend[i] = finalLower[i];
      if (close[i] < finalLower[i]) {
        trend = -1; // Change to Bearish
        superTrend[i] = finalUpper[i];
      } else {
        trend = 1;
      }
    } else {
      // If trend was bearish...
      superTrend[i] = finalUpper[i];
      if (close[i] > finalUpper[i]) {
        trend = 1; // Change to Bullish
        superTrend[i] = finalLower[i];
      } else {
        trend = -1;
      }
    }
  }

  return { superTrend, trend: trend }; // We only return the line usually, but knowing trend direction is helpful
}

/**
 * MFI - 資金流量指標 (Money Flow Index)
 */
function calculateMFI(high, low, close, volume, period = 14) {
  const length = close.length;
  const mfi = new Array(length).fill(NaN);
  const tp = new Array(length); // Typical Price

  for (let i = 0; i < length; i++) {
    tp[i] = (high[i] + low[i] + close[i]) / 3;
  }

  // Need period + 1 data points to calculate change
  for (let i = period; i < length; i++) {
    let posMF = 0;
    let negMF = 0;

    // Loop through window
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) {
        posMF += tp[j] * volume[j];
      } else if (tp[j] < tp[j - 1]) {
        negMF += tp[j] * volume[j];
      }
    }

    if (negMF === 0) {
      mfi[i] = 100;
    } else {
      const mfr = posMF / negMF;
      mfi[i] = 100 - (100 / (1 + mfr));
    }
  }

  return mfi;
}

// =========================
// 3) 統一計算接口
// =========================

/**
 * 計算所有技術指標
 * @param {Object} ohlcv - OHLCV 數據 {open, high, low, close, volume}
 * @param {Array} benchmarkClose - Benchmark close prices (optional, for Beta)
 * @returns {Object} 所有指標結果
 */
function calculateAllIndicators(ohlcv, benchmarkClose = null) {
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
    })(),

    // New Indicators
    SAR: calculateParabolicSAR(high, low, close),
    STOCH_K: calculateStochastic(high, low, close, 14, 3).k,
    STOCH_D: calculateStochastic(high, low, close, 14, 3).d,
    CCI_20: calculateCCI(high, low, close, 20),
    ATR_14: calculateATR(high, low, close, 14),
    OBV: calculateOBV(close, volume),

    // SuperTrend & MFI
    SUPERTREND_10_3: calculateSuperTrend(high, low, close, 10, 3).superTrend,
    MFI_14: calculateMFI(high, low, close, volume, 14),

    // Base Data (Useful for client-side calculations)
    volume: volume,
    close: close,

    // Beta (Requires Benchmark)
    BETA_10D: calculateBeta(close, benchmarkClose, 14),
    BETA_3M: calculateBeta(close, benchmarkClose, 90),

    // Phase 6 New Indicators
    EMA_20: calculateMA(close, 20),
    WILLR_14: calculateWilliamsR(high, low, close, 14),
    CMF_20: calculateCMF(high, low, close, volume, 20)
  };

  // 驗證所有結果長度一致
  for (const [key, values] of Object.entries(results)) {
    if (values && values.length !== length) {
      console.error(`Length mismatch for ${key}: expected ${length}, got ${values.length}`);
    }
  }

  return results;
}

/**
 * Beta - 波動率係數
 * @param {Array} close - Stock Close Prices
 * @param {Array} benchmarkClose - Benchmark Close Prices (Must be aligned or same length)
 * @param {Number} period - Calculation window (e.g., 14 for 10D, 60 for 3M)
 */
function calculateBeta(close, benchmarkClose, period = 14) {
  if (!benchmarkClose || benchmarkClose.length === 0 || close.length !== benchmarkClose.length) {
    return new Array(close.length).fill(NaN);
  }

  const length = close.length;
  const beta = new Array(length).fill(NaN);

  // Need percent change
  const stockReturns = new Array(length).fill(NaN);
  const benchReturns = new Array(length).fill(NaN);

  for (let i = 1; i < length; i++) {
    if (close[i - 1] && close[i]) stockReturns[i] = (close[i] - close[i - 1]) / close[i - 1];
    if (benchmarkClose[i - 1] && benchmarkClose[i]) benchReturns[i] = (benchmarkClose[i] - benchmarkClose[i - 1]) / benchmarkClose[i - 1];
  }

  // Calculate Beta over rolling window
  for (let i = period; i < length; i++) {
    let sumXY = 0;
    let sumX = 0;
    let sumY = 0;
    let sumX2 = 0;
    let count = 0;

    for (let j = i - period + 1; j <= i; j++) {
      const x = benchReturns[j];
      const y = stockReturns[j];
      if (!isNaN(x) && !isNaN(y)) {
        sumXY += x * y;
        sumX += x;
        sumY += y;
        sumX2 += x * x;
        count++;
      }
    }

    if (count < period * 0.5) continue; // Require at least 50% valid data

    // Covariance / Variance
    // Beta = Cov(X,Y) / Var(X)
    // Cov(X,Y) = E[XY] - E[X]E[Y]
    // Var(X) = E[X^2] - (E[X])^2

    const meanX = sumX / count;
    const meanY = sumY / count;
    const meanXY = sumXY / count;
    const meanX2 = sumX2 / count;

    const covXY = meanXY - meanX * meanY;
    const varX = meanX2 - meanX * meanX;

    if (varX > EPSILON) {
      beta[i] = covXY / varX;
    }
  }

  return beta;
}


/**
 * Williams %R - 威廉指標
 * @param {Array} high 
 * @param {Array} low 
 * @param {Array} close 
 * @param {Number} period 
 */
function calculateWilliamsR(high, low, close, period = 14) {
  const length = close.length;
  const result = new Array(length).fill(NaN);

  for (let i = period - 1; i < length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = i - period + 1; j <= i; j++) {
      highestHigh = Math.max(highestHigh, high[j]);
      lowestLow = Math.min(lowestLow, low[j]);
    }

    if (highestHigh === lowestLow) {
      result[i] = -50; // Avoid division by zero, neutral value
    } else {
      // Formula: ((Highest High - Close) / (Highest High - Lowest Low)) * -100
      result[i] = ((highestHigh - close[i]) / (highestHigh - lowestLow)) * -100;
    }
  }

  return result;
}

/**
 * Chaikin Money Flow (CMF) - 蔡金資金流向
 * @param {Array} high 
 * @param {Array} low 
 * @param {Array} close 
 * @param {Array} volume 
 * @param {Number} period 
 */
function calculateCMF(high, low, close, volume, period = 20) {
  const length = close.length;
  const cmf = new Array(length).fill(NaN);

  // Money Flow Multiplier (MFM) = ((Close - Low) - (High - Close)) / (High - Low)
  // Money Flow Volume (MFV) = MFM * Volume
  const mfv = new Array(length).fill(0);

  for (let i = 0; i < length; i++) {
    const range = high[i] - low[i];
    if (range === 0) {
      mfv[i] = 0;
    } else {
      const mfm = ((close[i] - low[i]) - (high[i] - close[i])) / range;
      mfv[i] = mfm * volume[i];
    }
  }

  // CMF = Sum(MFV, period) / Sum(Volume, period)
  for (let i = period - 1; i < length; i++) {
    let sumMFV = 0;
    let sumVol = 0;

    for (let j = i - period + 1; j <= i; j++) {
      sumMFV += mfv[j];
      sumVol += volume[j];
    }

    if (sumVol === 0) {
      cmf[i] = 0;
    } else {
      cmf[i] = sumMFV / sumVol;
    }
  }

  return cmf;
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
  calculateParabolicSAR,
  calculateStochastic,
  calculateCCI,
  calculateATR,
  calculateOBV,
  calculateSuperTrend,
  calculateMFI,
  calculateBeta,
  calculateWilliamsR,
  calculateCMF,

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
  calculateMACD,
  calculateBeta,
  calculateWilliamsR,
  calculateCMF
};