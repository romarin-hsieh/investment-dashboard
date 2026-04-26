import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calculateMFIVolumeProfile } from './mfiVolumeProfile.js'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Small helper: generate synthetic OHLCV with predictable shape. Enough
 * samples to clear the internal `mfiPeriod + 10` minimum.
 */
function makeOhlcv (n = 30) {
  const close = Array.from({ length: n }, (_, i) => 100 + Math.sin(i / 3) * 5)
  return {
    high:   close.map(v => v + 1),
    low:    close.map(v => v - 1),
    close,
    volume: Array(n).fill(1_000_000)
  }
}

describe('calculateMFIVolumeProfile', () => {
  it('throws when OHLCV is missing or incomplete', () => {
    expect(() => calculateMFIVolumeProfile(null)).toThrow(/Invalid OHLCV data/)
    expect(() => calculateMFIVolumeProfile({})).toThrow(/Invalid OHLCV data/)
    expect(() => calculateMFIVolumeProfile({ high: [] })).toThrow(/Invalid OHLCV data/)
  })

  it('throws when data length is below mfiPeriod + 10', () => {
    // default mfiPeriod = 14, so need 24 samples; 20 should fail
    expect(() => calculateMFIVolumeProfile(makeOhlcv(20))).toThrow(/Insufficient data/)
  })

  it('throws on flat-market input where all valid prices are identical (PR-F5)', () => {
    // 30 candles where every high/low/close is exactly 100 — priceRange = 0
    // would silently produce binSize = 0 and downstream NaN bins without
    // the PR-F5 guard.
    const flat = {
      high:   Array(30).fill(100),
      low:    Array(30).fill(100),
      close:  Array(30).fill(100),
      volume: Array(30).fill(1_000_000)
    }
    expect(() => calculateMFIVolumeProfile(flat)).toThrow(/No price variation/)
  })

  it('returns a structured profile with bins, totals, and POC on happy path', () => {
    const profile = calculateMFIVolumeProfile(makeOhlcv(30), 10, 14)

    // Shape: volumeProfile + statistics.totalVolume + pointOfControl are the keys
    expect(Array.isArray(profile.volumeProfile)).toBe(true)
    expect(profile.volumeProfile).toHaveLength(10)
    expect(Number.isFinite(profile.statistics.totalVolume)).toBe(true)
    expect(profile.statistics.totalVolume).toBeGreaterThan(0)

    // POC — the bin with highest volume
    expect(profile.pointOfControl).toBeDefined()
    expect(Number.isFinite(profile.pointOfControl.priceLevel)).toBe(true)

    // Market-sentiment classification must be one of the known enum values
    expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(profile.marketSentiment)

    // Every bin has the expected shape and sane MFI average
    profile.volumeProfile.forEach(bin => {
      expect(Number.isFinite(bin.priceLevel)).toBe(true)
      expect(bin.minPrice).toBeLessThanOrEqual(bin.maxPrice)
      expect(bin.volume).toBeGreaterThanOrEqual(0)
      // mfiAverage must be clamped to [0, 100]
      expect(bin.mfiAverage).toBeGreaterThanOrEqual(0)
      expect(bin.mfiAverage).toBeLessThanOrEqual(100)
      // Classification volumes must sum to the bin's total (within float epsilon)
      const classified = bin.positiveVolume + bin.negativeVolume + bin.neutralVolume
      expect(Math.abs(classified - bin.volume)).toBeLessThan(1e-6)
    })
  })

  it('honours the legacy mfiAvgMode option', () => {
    const weighted = calculateMFIVolumeProfile(makeOhlcv(30), 10, 14, { mfiAvgMode: 'weighted' })
    const legacy   = calculateMFIVolumeProfile(makeOhlcv(30), 10, 14, { mfiAvgMode: 'legacy' })

    // Same inputs — the two modes should produce (possibly) different mfiAverage
    // values in bins that saw variable volume across candles. At minimum, every
    // bin in both modes must still be clamped to [0, 100].
    weighted.volumeProfile.forEach(bin => {
      expect(bin.mfiAverage).toBeGreaterThanOrEqual(0)
      expect(bin.mfiAverage).toBeLessThanOrEqual(100)
    })
    legacy.volumeProfile.forEach(bin => {
      expect(bin.mfiAverage).toBeGreaterThanOrEqual(0)
      expect(bin.mfiAverage).toBeLessThanOrEqual(100)
    })
  })
})
