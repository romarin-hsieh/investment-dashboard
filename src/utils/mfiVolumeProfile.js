// MFI Volume Profile Calculation
// Combines Money Flow Index with Volume Profile analysis for advanced trading insights

import { calculateMFIWithMetadata } from './mfi.js';

/**
 * Calculate Volume Profile with MFI integration
 * @param {Object} ohlcv - OHLCV data object
 * @param {number} bins - Number of price bins for volume profile (default: 20)
 * @param {number} mfiPeriod - Period for MFI calculation (default: 14)
 * @param {Object} options - Additional options
 * @param {string} options.mfiAvgMode - 'weighted' (default) or 'legacy' for MFI averaging method
 * @returns {Object} Volume profile with MFI data
 */
export function calculateMFIVolumeProfile(ohlcv, bins = 20, mfiPeriod = 14, options = {}) {
  const { mfiAvgMode = 'weighted' } = options;

  console.log(`📊 Calculating MFI Volume Profile with ${bins} bins, MFI period=${mfiPeriod}, avgMode=${mfiAvgMode}`);

  if (!ohlcv || !ohlcv.high || !ohlcv.low || !ohlcv.close || !ohlcv.volume) {
    throw new Error('Invalid OHLCV data for MFI Volume Profile calculation');
  }

  const length = Math.min(ohlcv.high.length, ohlcv.low.length, ohlcv.close.length, ohlcv.volume.length);

  if (length < mfiPeriod + 10) {
    throw new Error(`Insufficient data for MFI Volume Profile: need at least ${mfiPeriod + 10} data points, got ${length}`);
  }

  try {
    // Step 1: Calculate MFI
    const mfiResult = calculateMFIWithMetadata(ohlcv, mfiPeriod);

    // Step 2: Find price range for binning
    const validPrices = [];
    for (let i = 0; i < length; i++) {
      if (ohlcv.high[i] != null && ohlcv.low[i] != null) {
        validPrices.push(ohlcv.high[i], ohlcv.low[i]);
      }
    }

    if (validPrices.length === 0) {
      throw new Error('No valid price data found');
    }

    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    const priceRange = maxPrice - minPrice;
    const binSize = priceRange / bins;

    console.log(`📊 Price range: ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}, bin size: ${binSize.toFixed(4)}`);

    // Step 3: Initialize volume profile bins
    const volumeProfile = new Array(bins).fill(0).map((_, index) => ({
      priceLevel: minPrice + (index + 0.5) * binSize,
      minPrice: minPrice + index * binSize,
      maxPrice: minPrice + (index + 1) * binSize,
      volume: 0,
      positiveVolume: 0, // Volume when MFI indicates buying pressure
      negativeVolume: 0, // Volume when MFI indicates selling pressure
      neutralVolume: 0,  // Volume when MFI is neutral
      mfiAverage: 0,     // Volume-weighted average MFI for this price level
      mfiCount: 0,       // Count of MFI values for averaging (legacy)
      candleCount: 0,    // Number of candles in this bin
      // New fields for volume-weighted MFI calculation
      mfiWeightedSum: 0,     // Σ(mfi * volumeAllocation)
      mfiWeightedVolume: 0,  // Σ(volumeAllocation) for MFI calculation
      mfiAverageLegacy: 0,   // Legacy count-based average (for rollback)
      mfiCountLegacy: 0      // Legacy count (for rollback)
    }));

    // Step 4: Distribute volume across price bins with MFI classification
    for (let i = 0; i < length; i++) {
      if (ohlcv.high[i] == null || ohlcv.low[i] == null ||
        ohlcv.close[i] == null || ohlcv.volume[i] == null || ohlcv.volume[i] <= 0) {
        continue;
      }

      const high = ohlcv.high[i];
      const low = ohlcv.low[i];
      const volume = ohlcv.volume[i];
      const mfiValue = mfiResult.values[i];

      // Determine which bins this candle spans
      const startBin = Math.max(0, Math.floor((low - minPrice) / binSize));
      const endBin = Math.min(bins - 1, Math.floor((high - minPrice) / binSize));

      // Distribute volume proportionally across bins
      const candleRange = high - low;
      const binsSpanned = endBin - startBin + 1;

      for (let binIndex = startBin; binIndex <= endBin; binIndex++) {
        const bin = volumeProfile[binIndex];

        // Calculate overlap between candle and bin
        const binLow = bin.minPrice;
        const binHigh = bin.maxPrice;
        const overlapLow = Math.max(low, binLow);
        const overlapHigh = Math.min(high, binHigh);
        const overlapRange = Math.max(0, overlapHigh - overlapLow);

        // Proportional volume allocation
        let volumeAllocation;
        if (candleRange > 0) {
          volumeAllocation = volume * (overlapRange / candleRange);
        } else {
          // If high === low, distribute equally across spanned bins
          volumeAllocation = volume / binsSpanned;
        }

        bin.volume += volumeAllocation;
        bin.candleCount++;

        // Classify volume based on MFI
        if (mfiValue != null && !isNaN(mfiValue)) {
          if (mfiValue >= 60) {
            bin.positiveVolume += volumeAllocation;
          } else if (mfiValue <= 40) {
            bin.negativeVolume += volumeAllocation;
          } else {
            bin.neutralVolume += volumeAllocation;
          }

          // Legacy MFI averaging (count-based)
          bin.mfiAverageLegacy = (bin.mfiAverageLegacy * bin.mfiCountLegacy + mfiValue) / (bin.mfiCountLegacy + 1);
          bin.mfiCountLegacy++;

          // New volume-weighted MFI calculation
          bin.mfiWeightedSum += mfiValue * volumeAllocation;
          bin.mfiWeightedVolume += volumeAllocation;

          // Keep legacy fields for backward compatibility (but don't use for final mfiAverage)
          bin.mfiCount++;
        } else {
          bin.neutralVolume += volumeAllocation;
        }
      }
    }

    // Step 4.5: Calculate final MFI averages based on selected mode
    volumeProfile.forEach(bin => {
      if (mfiAvgMode === 'legacy') {
        // Use legacy count-based average
        bin.mfiAverage = bin.mfiAverageLegacy;
      } else {
        // Use volume-weighted average (default)
        if (bin.mfiWeightedVolume > 0) {
          bin.mfiAverage = bin.mfiWeightedSum / bin.mfiWeightedVolume;
        } else {
          bin.mfiAverage = 0;
        }
      }

      // Ensure MFI average is within valid range [0, 100]
      bin.mfiAverage = Math.max(0, Math.min(100, bin.mfiAverage));
    });

    // Step 5: Calculate additional metrics
    const totalVolume = volumeProfile.reduce((sum, bin) => sum + bin.volume, 0);
    const maxVolumeInBin = Math.max(...volumeProfile.map(bin => bin.volume));

    // Find Point of Control (POC) - price level with highest volume
    let pocIndex = 0;
    let maxVolume = 0;
    for (let i = 0; i < volumeProfile.length; i++) {
      if (volumeProfile[i].volume > maxVolume) {
        maxVolume = volumeProfile[i].volume;
        pocIndex = i;
      }
    }

    const poc = volumeProfile[pocIndex];

    // Calculate Value Area (70% of total volume around POC)
    const targetVolume = totalVolume * 0.7;
    let valueAreaVolume = poc.volume;
    let valueAreaLow = pocIndex;
    let valueAreaHigh = pocIndex;

    // Expand value area up and down from POC
    while (valueAreaVolume < targetVolume && (valueAreaLow > 0 || valueAreaHigh < bins - 1)) {
      const volumeAbove = valueAreaHigh < bins - 1 ? volumeProfile[valueAreaHigh + 1].volume : 0;
      const volumeBelow = valueAreaLow > 0 ? volumeProfile[valueAreaLow - 1].volume : 0;

      if (volumeAbove >= volumeBelow && valueAreaHigh < bins - 1) {
        valueAreaHigh++;
        valueAreaVolume += volumeProfile[valueAreaHigh].volume;
      } else if (valueAreaLow > 0) {
        valueAreaLow--;
        valueAreaVolume += volumeProfile[valueAreaLow].volume;
      } else {
        break;
      }
    }

    // Step 6: Calculate MFI-based insights
    const mfiInsights = {
      buyingPressureLevels: volumeProfile
        .filter(bin => bin.positiveVolume > bin.negativeVolume && bin.volume > totalVolume / bins)
        .map(bin => ({
          priceLevel: bin.priceLevel,
          volume: bin.volume,
          mfiAverage: bin.mfiAverage,
          buyingRatio: bin.positiveVolume / bin.volume
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5),

      sellingPressureLevels: volumeProfile
        .filter(bin => bin.negativeVolume > bin.positiveVolume && bin.volume > totalVolume / bins)
        .map(bin => ({
          priceLevel: bin.priceLevel,
          volume: bin.volume,
          mfiAverage: bin.mfiAverage,
          sellingRatio: bin.negativeVolume / bin.volume
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5),

      totalBuyingVolume: volumeProfile.reduce((sum, bin) => sum + bin.positiveVolume, 0),
      totalSellingVolume: volumeProfile.reduce((sum, bin) => sum + bin.negativeVolume, 0),
      totalNeutralVolume: volumeProfile.reduce((sum, bin) => sum + bin.neutralVolume, 0)
    };

    // Calculate overall market sentiment
    const buyingRatio = mfiInsights.totalBuyingVolume / totalVolume;
    const sellingRatio = mfiInsights.totalSellingVolume / totalVolume;

    let marketSentiment = 'NEUTRAL';
    if (buyingRatio > 0.4) {
      marketSentiment = 'BULLISH';
    } else if (sellingRatio > 0.4) {
      marketSentiment = 'BEARISH';
    }

    const result = {
      volumeProfile: volumeProfile,
      mfi: mfiResult,
      pointOfControl: {
        priceLevel: poc.priceLevel,
        volume: poc.volume,
        percentage: (poc.volume / totalVolume) * 100
      },
      valueArea: {
        low: volumeProfile[valueAreaLow].priceLevel,
        high: volumeProfile[valueAreaHigh].priceLevel,
        volume: valueAreaVolume,
        percentage: (valueAreaVolume / totalVolume) * 100
      },
      mfiInsights: mfiInsights,
      marketSentiment: marketSentiment,
      statistics: {
        totalVolume: totalVolume,
        maxVolumeInBin: maxVolumeInBin,
        priceRange: {
          min: minPrice,
          max: maxPrice,
          range: priceRange
        },
        bins: bins,
        buyingRatio: buyingRatio,
        sellingRatio: sellingRatio,
        neutralRatio: mfiInsights.totalNeutralVolume / totalVolume
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        dataPoints: length,
        mfiPeriod: mfiPeriod,
        mfiAvgMode: mfiAvgMode,
        algorithm: `MFI Volume Profile v2.0 (${mfiAvgMode} averaging)`
      }
    };

    console.log(`📊 MFI Volume Profile calculation complete:`, {
      bins: bins,
      totalVolume: totalVolume.toLocaleString(),
      poc: poc.priceLevel.toFixed(2),
      marketSentiment: marketSentiment,
      buyingRatio: (buyingRatio * 100).toFixed(1) + '%'
    });

    return result;

  } catch (error) {
    console.error('📊 MFI Volume Profile calculation failed:', error);
    throw error;
  }
}

/**
 * Get trading signals based on MFI Volume Profile
 * @param {Object} mfiVolumeProfile - Result from calculateMFIVolumeProfile
 * @param {number} currentPrice - Current stock price
 * @returns {Object} Trading signals and recommendations
 */
export function getMFIVolumeProfileSignals(mfiVolumeProfile, currentPrice) {
  if (!mfiVolumeProfile || !currentPrice) {
    return {
      signal: 'NEUTRAL',
      confidence: 0,
      recommendations: [],
      supportLevels: [],
      resistanceLevels: []
    };
  }

  const { volumeProfile, pointOfControl, valueArea, mfiInsights, marketSentiment } = mfiVolumeProfile;

  // Find support and resistance levels
  const supportLevels = volumeProfile
    .filter(bin => bin.priceLevel < currentPrice && bin.volume > mfiVolumeProfile.statistics.totalVolume / 30)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3)
    .map(bin => ({
      price: bin.priceLevel,
      strength: bin.volume / mfiVolumeProfile.statistics.maxVolumeInBin,
      type: bin.positiveVolume > bin.negativeVolume ? 'BUYING_SUPPORT' : 'SELLING_SUPPORT'
    }));

  const resistanceLevels = volumeProfile
    .filter(bin => bin.priceLevel > currentPrice && bin.volume > mfiVolumeProfile.statistics.totalVolume / 30)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3)
    .map(bin => ({
      price: bin.priceLevel,
      strength: bin.volume / mfiVolumeProfile.statistics.maxVolumeInBin,
      type: bin.negativeVolume > bin.positiveVolume ? 'SELLING_RESISTANCE' : 'BUYING_RESISTANCE'
    }));

  // Generate trading signal
  let signal = 'NEUTRAL';
  let confidence = 0;
  const recommendations = [];

  // Check position relative to POC and Value Area
  const pocDistance = (currentPrice - pointOfControl.priceLevel) / pointOfControl.priceLevel;
  const inValueArea = currentPrice >= valueArea.low && currentPrice <= valueArea.high;

  if (marketSentiment === 'BULLISH') {
    if (currentPrice < valueArea.low) {
      signal = 'BUY';
      confidence = 0.7;
      recommendations.push('Price below value area with bullish sentiment - potential buying opportunity');
    } else if (inValueArea) {
      signal = 'HOLD';
      confidence = 0.5;
      recommendations.push('Price in value area with bullish sentiment - monitor for breakout');
    }
  } else if (marketSentiment === 'BEARISH') {
    if (currentPrice > valueArea.high) {
      signal = 'SELL';
      confidence = 0.7;
      recommendations.push('Price above value area with bearish sentiment - potential selling opportunity');
    } else if (inValueArea) {
      signal = 'HOLD';
      confidence = 0.5;
      recommendations.push('Price in value area with bearish sentiment - monitor for breakdown');
    }
  }

  // Adjust confidence based on MFI
  if (mfiInsights.totalBuyingVolume > mfiInsights.totalSellingVolume * 1.5) {
    confidence = Math.min(confidence + 0.2, 1.0);
  } else if (mfiInsights.totalSellingVolume > mfiInsights.totalBuyingVolume * 1.5) {
    confidence = Math.min(confidence + 0.2, 1.0);
  }

  // Fallback for empty recommendations (Neutral state)
  if (recommendations.length === 0) {
    if (inValueArea) {
      recommendations.push(`Price is consolidating within the Value Area ($${valueArea.low.toFixed(2)} - $${valueArea.high.toFixed(2)}). Market is in equilibrium.`);
    } else {
      const relation = currentPrice > pointOfControl.priceLevel ? 'above' : 'below';
      recommendations.push(`Price is ranging ${relation} the Point of Control. No clear direction detected yet.`);
    }
    // Add a secondary note about volume balance
    const balance = mfiInsights.totalBuyingVolume / (mfiInsights.totalSellingVolume || 1);
    if (balance > 1.2) {
      recommendations.push("Underlying buy volume is slightly higher, suggesting potential accumulation.");
    } else if (balance < 0.8) {
      recommendations.push("Underlying sell volume is slightly higher, suggesting potential distribution.");
    }
  }

  return {
    signal: signal,
    confidence: confidence,
    recommendations: recommendations,
    supportLevels: supportLevels,
    resistanceLevels: resistanceLevels,
    marketContext: {
      pocDistance: pocDistance,
      inValueArea: inValueArea,
      marketSentiment: marketSentiment,
      volumeBalance: mfiInsights.totalBuyingVolume / mfiInsights.totalSellingVolume
    }
  };
}

export default {
  calculateMFIVolumeProfile,
  getMFIVolumeProfileSignals
};