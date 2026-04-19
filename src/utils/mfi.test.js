import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calculateMFI, getMFISignal, calculateMFIWithMetadata } from './mfi.js'

/**
 * Silence the informational console output from the production code during
 * tests. We keep console.error visible so real bugs during tests still show.
 */
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  // One test (`returns an error-shaped object…`) intentionally triggers an
  // internal throw that production code logs via console.error. Silence
  // that too so the test output is clean — real bugs will surface as
  // failed assertions, not silenced console.error lines.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('getMFISignal', () => {
  it('returns OVERBOUGHT at and above the 80 threshold', () => {
    expect(getMFISignal(80)).toBe('OVERBOUGHT')
    expect(getMFISignal(95.5)).toBe('OVERBOUGHT')
    expect(getMFISignal(100)).toBe('OVERBOUGHT')
  })

  it('returns OVERSOLD at and below the 20 threshold', () => {
    expect(getMFISignal(20)).toBe('OVERSOLD')
    expect(getMFISignal(5)).toBe('OVERSOLD')
    expect(getMFISignal(0)).toBe('OVERSOLD')
  })

  it('returns NEUTRAL between the thresholds', () => {
    expect(getMFISignal(50)).toBe('NEUTRAL')
    expect(getMFISignal(21)).toBe('NEUTRAL')
    expect(getMFISignal(79)).toBe('NEUTRAL')
  })

  it('returns NEUTRAL for null, undefined, and NaN', () => {
    expect(getMFISignal(null)).toBe('NEUTRAL')
    expect(getMFISignal(undefined)).toBe('NEUTRAL')
    expect(getMFISignal(NaN)).toBe('NEUTRAL')
  })
})

describe('calculateMFI', () => {
  it('throws when any required array is missing', () => {
    expect(() => calculateMFI(null, [], [], [])).toThrow(/requires high, low, close, and volume/)
    expect(() => calculateMFI([1], null, [1], [1])).toThrow(/requires high, low, close, and volume/)
  })

  it('throws when data length is below period + 1', () => {
    // default period = 14, so need 15 points
    const short = Array(10).fill(100)
    expect(() => calculateMFI(short, short, short, short)).toThrow(/Insufficient data/)
  })

  it('produces an array of the same length as input, with nulls for warmup', () => {
    // 20 data points, period 14 -> first 14 entries are null, last 6 have values
    const n = 20
    const close = Array.from({ length: n }, (_, i) => 100 + i)   // monotonically rising
    const high  = close.map(v => v + 1)
    const low   = close.map(v => v - 1)
    const volume = Array(n).fill(1_000_000)

    const result = calculateMFI(high, low, close, volume, 14)

    expect(result).toHaveLength(n)
    // Warmup: first `period` entries must be null
    for (let i = 0; i < 14; i++) expect(result[i]).toBeNull()
    // Post-warmup: all computed values should be finite numbers
    for (let i = 14; i < n; i++) {
      expect(result[i]).not.toBeNull()
      expect(Number.isFinite(result[i])).toBe(true)
      expect(result[i]).toBeGreaterThanOrEqual(0)
      expect(result[i]).toBeLessThanOrEqual(100)
    }
  })

  it('returns 100 when all money flow is positive (monotonically rising prices)', () => {
    const n = 20
    const close = Array.from({ length: n }, (_, i) => 100 + i)
    const high  = close.map(v => v + 1)
    const low   = close.map(v => v - 1)
    const volume = Array(n).fill(1_000_000)

    const result = calculateMFI(high, low, close, volume, 14)
    // Last MFI value with monotonic gains should saturate to 100
    expect(result[n - 1]).toBe(100)
  })
})

describe('calculateMFIWithMetadata', () => {
  it('returns an error-shaped object instead of throwing on bad input', () => {
    // Pass malformed ohlcv to trigger the internal calculateMFI throw
    const result = calculateMFIWithMetadata({
      high: [], low: [], close: [], volume: []
    }, 14)

    expect(result.signal).toBe('ERROR')
    expect(result.latest).toBeNull()
    expect(result.values).toEqual([])
    expect(typeof result.error).toBe('string')
    expect(result.metadata.algorithm).toBe('Standard MFI')
  })

  it('produces stats (average/min/max) on successful calculation', () => {
    const n = 30
    const close = Array.from({ length: n }, (_, i) => 100 + Math.sin(i) * 5)  // oscillating
    const high  = close.map(v => v + 1)
    const low   = close.map(v => v - 1)
    const volume = Array(n).fill(500_000)

    const result = calculateMFIWithMetadata({ high, low, close, volume }, 14)

    expect(result.signal).toMatch(/OVERBOUGHT|OVERSOLD|NEUTRAL/)
    expect(Number.isFinite(result.latest)).toBe(true)
    expect(result.statistics.validCount).toBeGreaterThan(0)
    expect(result.statistics.minimum).toBeLessThanOrEqual(result.statistics.average)
    expect(result.statistics.average).toBeLessThanOrEqual(result.statistics.maximum)
  })
})
