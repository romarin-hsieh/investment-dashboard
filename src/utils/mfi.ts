// Money Flow Index (MFI) Calculation
// MFI is a momentum oscillator that uses price and volume to identify overbought/oversold conditions

/** MFI series tolerate gaps: null marks a missing bar or the warm-up window. */
export type MFISeries = (number | null)[];

/** The three states getMFISignal can report. */
export type MFISignal = 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';

/** OHLCV bundle accepted by calculateMFIWithMetadata. */
export interface MFIInput {
  high: MFISeries;
  low: MFISeries;
  close: MFISeries;
  volume: MFISeries;
}

/**
 * Calculate Money Flow Index (MFI)
 * @param {Array} high - Array of high prices
 * @param {Array} low - Array of low prices  
 * @param {Array} close - Array of close prices
 * @param {Array} volume - Array of volume data
 * @param {number} period - Period for MFI calculation (default: 14)
 * @returns {Array} Array of MFI values
 */
export function calculateMFI(
  high: MFISeries,
  low: MFISeries,
  close: MFISeries,
  volume: MFISeries,
  period = 14
): MFISeries {
  if (!high || !low || !close || !volume) {
    throw new Error('MFI calculation requires high, low, close, and volume arrays');
  }
  
  const length = Math.min(high.length, low.length, close.length, volume.length);
  
  if (length < period + 1) {
    throw new Error(`Insufficient data for MFI calculation: need at least ${period + 1} data points, got ${length}`);
  }
  
  console.log(`📊 Calculating MFI with ${length} data points, period=${period}`);
  
  // Step 1: Calculate Typical Price (TP)
  const typicalPrice: MFISeries = new Array(length);
  for (let i = 0; i < length; i++) {
    // Bind before use: TS does not carry `high[i] != null` narrowing across
    // separate indexed reads, and the locals read better anyway.
    const h = high[i];
    const l = low[i];
    const c = close[i];
    if (h != null && l != null && c != null) {
      typicalPrice[i] = (h + l + c) / 3;
    } else {
      typicalPrice[i] = null;
    }
  }
  
  // Step 2: Calculate Raw Money Flow (RMF)
  const rawMoneyFlow: MFISeries = new Array(length);
  for (let i = 0; i < length; i++) {
    const tp = typicalPrice[i];
    const v = volume[i];
    if (tp != null && v != null) {
      rawMoneyFlow[i] = tp * v;
    } else {
      rawMoneyFlow[i] = null;
    }
  }
  
  // Step 3: Calculate Positive and Negative Money Flow
  const positiveMoneyFlow: MFISeries = new Array(length);
  const negativeMoneyFlow: MFISeries = new Array(length);
  
  positiveMoneyFlow[0] = 0;
  negativeMoneyFlow[0] = 0;
  
  for (let i = 1; i < length; i++) {
    const tp = typicalPrice[i];
    const tpPrev = typicalPrice[i - 1];
    const rmf = rawMoneyFlow[i];
    if (tp != null && tpPrev != null && rmf != null) {
      if (tp > tpPrev) {
        positiveMoneyFlow[i] = rmf;
        negativeMoneyFlow[i] = 0;
      } else if (tp < tpPrev) {
        positiveMoneyFlow[i] = 0;
        negativeMoneyFlow[i] = rmf;
      } else {
        positiveMoneyFlow[i] = 0;
        negativeMoneyFlow[i] = 0;
      }
    } else {
      positiveMoneyFlow[i] = 0;
      negativeMoneyFlow[i] = 0;
    }
  }
  
  // Step 4: Calculate MFI using rolling sums
  const mfi = new Array(length).fill(null);
  
  for (let i = period; i < length; i++) {
    let positiveMFSum = 0;
    let negativeMFSum = 0;
    let validPeriods = 0;
    
    // Sum over the period
    for (let j = i - period + 1; j <= i; j++) {
      const pmf = positiveMoneyFlow[j];
      const nmf = negativeMoneyFlow[j];
      if (pmf != null && nmf != null) {
        positiveMFSum += pmf;
        negativeMFSum += nmf;
        validPeriods++;
      }
    }
    
    // Calculate MFI if we have enough valid data
    if (validPeriods >= Math.floor(period * 0.7)) { // At least 70% of period data
      if (negativeMFSum === 0) {
        mfi[i] = 100; // All positive money flow
      } else {
        const moneyFlowRatio = positiveMFSum / negativeMFSum;
        mfi[i] = 100 - (100 / (1 + moneyFlowRatio));
      }
    }
  }
  
  // Count valid MFI values
  const validCount = mfi.filter(value => value !== null).length;
  console.log(`📊 MFI calculation complete: ${validCount}/${length} valid values`);
  
  return mfi;
}

/**
 * Get MFI signal based on current value
 * @param {number} mfiValue - Current MFI value
 * @returns {string} Signal: 'OVERBOUGHT', 'OVERSOLD', or 'NEUTRAL'
 */
export function getMFISignal(mfiValue: number | null | undefined): MFISignal {
  if (mfiValue == null || isNaN(mfiValue)) {
    return 'NEUTRAL';
  }
  
  if (mfiValue >= 80) {
    return 'OVERBOUGHT';
  } else if (mfiValue <= 20) {
    return 'OVERSOLD';
  } else {
    return 'NEUTRAL';
  }
}

/**
 * Calculate MFI with additional metadata
 * @param {Object} ohlcv - OHLCV data object
 * @param {number} period - Period for MFI calculation
 * @returns {Object} MFI results with metadata
 */
export function calculateMFIWithMetadata(ohlcv: MFIInput, period = 14) {
  try {
    const mfiValues = calculateMFI(ohlcv.high, ohlcv.low, ohlcv.close, ohlcv.volume, period);
    
    // Get the latest valid MFI value
    let latestMFI = null;
    for (let i = mfiValues.length - 1; i >= 0; i--) {
      const v = mfiValues[i];
      if (v != null && !isNaN(v)) {
        latestMFI = v;
        break;
      }
    }
    
    const signal = getMFISignal(latestMFI);
    
    // Calculate statistics
    const validValues = mfiValues.filter((v): v is number => v != null && !isNaN(v));
    const avgMFI = validValues.length > 0 ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length : null;
    const maxMFI = validValues.length > 0 ? Math.max(...validValues) : null;
    const minMFI = validValues.length > 0 ? Math.min(...validValues) : null;
    
    return {
      values: mfiValues,
      latest: latestMFI,
      signal: signal,
      period: period,
      statistics: {
        average: avgMFI,
        maximum: maxMFI,
        minimum: minMFI,
        validCount: validValues.length,
        totalCount: mfiValues.length
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        dataPoints: ohlcv.close.length,
        algorithm: 'Standard MFI'
      }
    };
  } catch (error) {
    console.error('📊 MFI calculation failed:', error);
    return {
      values: [],
      latest: null,
      signal: 'ERROR',
      period: period,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        calculatedAt: new Date().toISOString(),
        algorithm: 'Standard MFI'
      }
    };
  }
}

export default {
  calculateMFI,
  getMFISignal,
  calculateMFIWithMetadata
};