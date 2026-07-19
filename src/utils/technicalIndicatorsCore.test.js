import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  sma,
  ema,
  wilderSmoothing,
  rollingMax,
  rollingMin,
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
  calculateAllIndicators,
  EPSILON
} from './technicalIndicatorsCore'

/**
 * CHARACTERIZATION (golden-master) test suite for technicalIndicatorsCore.js.
 *
 * These tests lock in the CURRENT behaviour of the pure indicator library so an
 * upcoming .js -> .ts migration has a regression net. Every expected value below
 * was produced by RUNNING the current implementation on the fixed inputs and
 * pasting the real output — the goal is to detect any drift, NOT to judge
 * mathematical correctness against textbook formulas.
 *
 * Notable / surprising behaviours that are deliberately pinned here (see the
 * individual tests): wilderSmoothing can leave `undefined` holes in its output
 * array when the warm-up window contains a NaN; calculateADX propagates those
 * holes into its `adx` array; calculateMACD with the default 12/26/9 periods on
 * only 30 points never warms up its signal/histogram (all NaN); ema in
 * 'first_value' mode never recovers after a NaN under 'strict_recover'.
 */

// The indicator code is chatty (console.log/warn in Wilder/ADX). Silence it so
// test output stays clean; real failures still surface as assertion errors.
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

// ===================================================================
// Shared fixed datasets (identical to the generator that produced the
// golden values below).
// ===================================================================
const closeBasic = [10, 12, 11, 13, 15, 14, 16, 18, 17, 19]
const closeNaN = [10, 12, NaN, 13, 15, 14, 16, NaN, 17, 19]

const close = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113, 115, 117, 116, 118, 120, 119, 121, 123, 122, 124, 126, 125, 127, 129, 128]
const high = close.map((c, i) => c + 1 + (i % 3) * 0.5)
const low = close.map((c, i) => c - 1 - (i % 2) * 0.5)
const open = close.map((c, i) => (i === 0 ? c : close[i - 1]))
const volume = close.map((c, i) => 1000000 + (i % 5) * 50000)
const benchmark = [50, 51, 50.5, 51.5, 52, 51.8, 52.5, 53, 52.7, 53.5, 54, 53.6, 54.5, 55, 54.6, 55.5, 56, 55.7, 56.5, 57, 56.6, 57.5, 58, 57.6, 58.5, 59, 58.6, 59.5, 60, 59.6]

const H = undefined // sentinel for an array "hole" (unset slot -> undefined)

/**
 * Assert an output series matches an expected golden series element-by-element.
 * - expected NaN  -> assert Number.isNaN(actual)
 * - expected `H`  -> assert actual is an unset/undefined slot
 * - otherwise     -> assert toBeCloseTo(expected, precision)
 */
function assertSeries(actual, expected, precision = 6) {
  expect(actual).toHaveLength(expected.length)
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i]
    if (typeof e === 'number' && Number.isNaN(e)) {
      expect(Number.isNaN(actual[i])).toBe(true)
    } else if (e === undefined) {
      expect(actual[i]).toBeUndefined()
    } else {
      expect(actual[i]).toBeCloseTo(e, precision)
    }
  }
}

const nanArray = (n) => Array(n).fill(NaN)

// ===================================================================
// rollingMax / rollingMin
// ===================================================================
describe('rollingMax / rollingMin', () => {
  it('rollingMax over high with period 3 (warm-up NaN then window max)', () => {
    assertSeries(rollingMax(high, 3), [
      NaN, NaN, 103.5, 104, 106.5, 106.5, 107, 109.5, 109.5, 110,
      112.5, 112.5, 113, 115.5, 115.5, 116, 118.5, 118.5, 119, 121.5,
      121.5, 122, 124.5, 124.5, 125, 127.5, 127.5, 128, 130.5, 130.5
    ])
  })

  it('rollingMin over low with period 3', () => {
    assertSeries(rollingMin(low, 3), [
      NaN, NaN, 99, 100, 100, 101.5, 102.5, 102.5, 105, 106,
      106, 107.5, 108.5, 108.5, 111, 112, 112, 113.5, 114.5, 114.5,
      117, 118, 118, 119.5, 120.5, 120.5, 123, 124, 124, 125.5
    ])
  })

  it('period 1 returns the input unchanged (no warm-up)', () => {
    assertSeries(rollingMax(closeBasic, 1), [10, 12, 11, 13, 15, 14, 16, 18, 17, 19])
  })
})

// ===================================================================
// sma helper
// ===================================================================
describe('sma', () => {
  it('throws on non-positive period', () => {
    expect(() => sma(closeBasic, 0)).toThrow('Period must be positive')
    expect(() => sma(closeBasic, -3)).toThrow('Period must be positive')
  })

  it('strict mode: warm-up NaN then rolling mean (period 3)', () => {
    assertSeries(sma(closeBasic, 3), [NaN, NaN, 11, 12, 13, 14, 15, 16, 17, 18])
  })

  it('strict mode: first valid index at period-1 (period 10)', () => {
    assertSeries(sma(closeBasic, 10), [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 14.5])
  })

  it('insufficient data (period > length) returns all NaN, same length', () => {
    assertSeries(sma(closeBasic, 11), nanArray(10))
  })

  it('strict mode: any NaN in the window yields NaN', () => {
    assertSeries(sma(closeNaN, 3, 'strict'), [NaN, NaN, NaN, NaN, NaN, 14, 15, NaN, NaN, NaN])
  })

  it('skipna default minPeriods equals period (behaves like strict for isolated NaN)', () => {
    assertSeries(sma(closeNaN, 3, 'skipna'), [NaN, NaN, NaN, NaN, NaN, 14, 15, NaN, NaN, NaN])
  })

  it('skipna with minPeriods=1 averages the valid subset', () => {
    assertSeries(sma(closeNaN, 3, 'skipna', 1), [NaN, NaN, 11, 12.5, 14, 14, 15, 15, 16.5, 18])
  })

  it('skipna with minPeriods=2 (isolated NaN keeps 2 valid so matches min=1 here)', () => {
    assertSeries(sma(closeNaN, 3, 'skipna', 2), [NaN, NaN, 11, 12.5, 14, 14, 15, 15, 16.5, 18])
  })

  it('skipna minPeriods actually gates when a window drops below the floor (adjacent NaNs)', () => {
    const closeNaN2 = [10, NaN, NaN, 13, 15, 16]
    // min=1: the [10,NaN,NaN] window (1 valid) still produces a value
    assertSeries(sma(closeNaN2, 3, 'skipna', 1), [NaN, NaN, 10, 13, 14, 14.666666666666666])
    // min=2: that same window (only 1 valid) is now gated to NaN
    assertSeries(sma(closeNaN2, 3, 'skipna', 2), [NaN, NaN, NaN, NaN, 14, 14.666666666666666])
  })
})

// ===================================================================
// ema helper
// ===================================================================
describe('ema', () => {
  it('throws on non-positive period', () => {
    expect(() => ema(closeBasic, 0)).toThrow('Period must be positive')
    expect(() => ema(closeBasic, -1)).toThrow('Period must be positive')
  })

  it('throws when alpha is out of (0,1]', () => {
    expect(() => ema(closeBasic, 3, 0)).toThrow('Alpha must be in (0, 1]')
    expect(() => ema(closeBasic, 3, -0.5)).toThrow('Alpha must be in (0, 1]')
    expect(() => ema(closeBasic, 3, 1.5)).toThrow('Alpha must be in (0, 1]')
  })

  it('accepts alpha exactly 1 (upper bound is inclusive)', () => {
    // alpha=1 means output tracks the input from the seed point onward
    const out = ema(closeBasic, 3, 1)
    expect(out).toHaveLength(10)
    // seed at index 2 is the SMA of first 3; from index 3 alpha=1 copies input
    expect(out[3]).toBeCloseTo(13, 6)
    expect(out[9]).toBeCloseTo(19, 6)
  })

  it('sma_seed mode: seed = SMA at period-1 then recursive EMA (period 3, default alpha)', () => {
    assertSeries(ema(closeBasic, 3), [
      NaN, NaN, 11, 12, 13.5, 13.75, 14.875, 16.4375, 16.71875, 17.859375
    ])
  })

  it('default alpha for period 3 equals 2/(N+1)=0.5 (explicit 0.5 is identical to default)', () => {
    assertSeries(ema(closeBasic, 3, 0.5), [
      NaN, NaN, 11, 12, 13.5, 13.75, 14.875, 16.4375, 16.71875, 17.859375
    ])
  })

  it('custom alpha=0.3 changes the smoothing', () => {
    assertSeries(ema(closeBasic, 3, 0.3), [
      NaN, NaN, 11, 11.6, 12.62, 13.033999999999999, 13.9238,
      15.146659999999997, 15.702661999999997, 16.691863399999995
    ])
  })

  it('first_value mode: seeds at the first valid index (index 0 here)', () => {
    assertSeries(ema(closeBasic, 3, null, 'first_value'), [
      10, 11, 11, 12, 13.5, 13.75, 14.875, 16.4375, 16.71875, 17.859375
    ])
  })

  it('sma_seed + strict_recover with an isolated NaN: re-seeds from a fully-valid window', () => {
    assertSeries(ema(closeNaN, 3, null, 'sma_seed', 'strict_recover'), [
      NaN, NaN, NaN, NaN, NaN, 14, 15, NaN, NaN, NaN
    ])
  })

  it('sma_seed + hold_last: never seeds here because the seed window contains a NaN (all NaN)', () => {
    assertSeries(ema(closeNaN, 3, null, 'sma_seed', 'hold_last'), nanArray(10))
  })

  it('sma_seed + strict_break with an early NaN in the seed window yields all NaN', () => {
    assertSeries(ema(closeNaN, 3, null, 'sma_seed', 'strict_break'), nanArray(10))
  })

  it('first_value + hold_last: carries the last EMA across a NaN input', () => {
    assertSeries(ema(closeNaN, 3, null, 'first_value', 'hold_last'), [
      10, 11, 11, 12, 13.5, 13.75, 14.875, 14.875, 15.9375, 17.46875
    ])
  })

  it('first_value + strict_recover NEVER recovers after a NaN (surprising: stays NaN forever)', () => {
    assertSeries(ema(closeNaN, 3, null, 'first_value', 'strict_recover'), [
      10, 11, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN
    ])
  })

  it('all-NaN input in first_value mode returns all NaN', () => {
    assertSeries(ema([NaN, NaN, NaN], 2, null, 'first_value'), nanArray(3))
  })
})

// ===================================================================
// wilderSmoothing helper
// ===================================================================
describe('wilderSmoothing', () => {
  it('throws on non-positive period', () => {
    expect(() => wilderSmoothing(closeBasic, 0)).toThrow('Period must be positive')
  })

  it('period 3: SMA seed then Wilder recursion', () => {
    assertSeries(wilderSmoothing(closeBasic, 3), [
      NaN, NaN, 11, 11.666666666666666, 12.777777777777777, 13.185185185185185,
      14.123456790123456, 15.415637860082304, 15.943758573388203, 16.962505715592133
    ])
  })

  it('SURPRISING: a NaN inside the seed window leaves an undefined hole and later NaNs', () => {
    // closeNaN = [10,12,NaN,13,...]; seed uses first 3 VALID values (10,12,13 at
    // indices 0,1,3) and initialises at index 3, so index 2 is never assigned.
    const out = wilderSmoothing(closeNaN, 3)
    expect(out).toHaveLength(10)
    expect(Number.isNaN(out[0])).toBe(true)
    expect(Number.isNaN(out[1])).toBe(true)
    expect(out[2]).toBeUndefined() // the hole
    expect(out[3]).toBeCloseTo(11.666666666666666, 6)
    // once a later NaN input appears (index 7), the recursion breaks to NaN
    assertSeries(out, [
      NaN, NaN, H, 11.666666666666666, 12.777777777777777, 13.185185185185185,
      14.123456790123456, NaN, NaN, NaN
    ])
  })

  it('insufficient data (length < period) returns all NaN, same length', () => {
    assertSeries(wilderSmoothing(closeBasic, 11), nanArray(10))
  })
})

// ===================================================================
// calculateMA / calculateSMA (thin wrappers)
// ===================================================================
describe('calculateMA / calculateSMA', () => {
  it('calculateMA delegates to ema (sma_seed, period 5)', () => {
    assertSeries(calculateMA(closeBasic, 5), [
      NaN, NaN, NaN, NaN, 12.2, 12.8, 13.866666666666667,
      15.244444444444445, 15.82962962962963, 16.88641975308642
    ])
  })

  it('calculateSMA delegates to sma (strict, period 5)', () => {
    assertSeries(calculateSMA(closeBasic, 5), [
      NaN, NaN, NaN, NaN, 12.2, 13, 13.8, 15.2, 16, 16.8
    ])
  })

  it('wrappers propagate the non-positive-period throw', () => {
    expect(() => calculateSMA(closeBasic, 0)).toThrow('Period must be positive')
    expect(() => calculateMA(closeBasic, -2)).toThrow('Period must be positive')
  })
})

// ===================================================================
// Ichimoku
// ===================================================================
describe('Ichimoku', () => {
  it('base line (period 5): midpoint of rolling high/low', () => {
    assertSeries(calculateIchimokuBaseLine(high, low, 5), [
      NaN, NaN, NaN, NaN, 102.75, 103.25, 103.5, 105.5, 106, 106.25,
      108.75, 109.25, 109.5, 111.5, 112, 112.25, 114.75, 115.25, 115.5, 117.5,
      118, 118.25, 120.75, 121.25, 121.5, 123.5, 124, 124.25, 126.75, 127.25
    ])
  })

  it('conversion line (period 3) equals base-line logic with a shorter period', () => {
    assertSeries(calculateIchimokuConversionLine(high, low, 3), [
      NaN, NaN, 101.25, 102, 103.25, 104, 104.75, 106, 107.25, 108,
      109.25, 110, 110.75, 112, 113.25, 114, 115.25, 116, 116.75, 118,
      119.25, 120, 121.25, 122, 122.75, 124, 125.25, 126, 127.25, 128
    ])
  })

  it('lagging span (shift 5): close shifted back, last `shift` entries NaN', () => {
    assertSeries(calculateIchimokuLaggingSpan(close, 5), [
      100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113,
      115, 117, 116, 118, 120, 119, 121, 123, 122, 124, NaN, NaN, NaN, NaN, NaN
    ])
  })

  it('lagging span throws on negative shift', () => {
    expect(() => calculateIchimokuLaggingSpan(close, -1)).toThrow('Shift must be non-negative')
  })
})

// ===================================================================
// VWMA
// ===================================================================
describe('calculateVWMA', () => {
  it('period 5: volume-weighted average with warm-up NaN', () => {
    assertSeries(calculateVWMA(close, volume, 5), [
      NaN, NaN, NaN, NaN, 102.3, 103.02727272727273, 103.7909090909091,
      105.19090909090909, 106.02727272727273, 106.9, 108.17272727272727,
      108.93636363636364, 109.73636363636363, 111.2, 112.07272727272728, 112.8,
      114.13636363636364, 114.93636363636364, 115.77272727272727, 117.3,
      118.02727272727273, 118.7909090909091, 120.19090909090909, 121.02727272727273,
      121.9, 123.17272727272727, 123.93636363636364, 124.73636363636363, 126.2,
      127.07272727272728
    ])
  })
})

// ===================================================================
// RSI
// ===================================================================
describe('calculateRSI', () => {
  it('insufficient data (length < period + 1) returns all NaN', () => {
    assertSeries(calculateRSI(closeBasic, 14), nanArray(10))
  })

  it('period 14: warm-up (14 NaN) then Wilder-smoothed RSI', () => {
    assertSeries(calculateRSI(close, 14), [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
      78.26086956521739, 80.1223241590214, 81.80055998276976, 78.24350664786144,
      80.1066909206829, 81.78644716631482, 78.22960135370543, 80.09417113541711,
      81.77514522589814, 78.21846570710007, 80.08414520951531, 81.76609470182275,
      78.2095484168493, 80.07611668333165, 81.75884734668382, 78.20240779368754
    ])
  })

  it('period 5: first valid RSI at index 5', () => {
    assertSeries(calculateRSI(close, 5), [
      NaN, NaN, NaN, NaN, NaN,
      75, 80.95238095238095, 85.3211009174312, 74.62387161484453, 80.67964872088584,
      85.11874126902434, 74.4304163686482, 80.53952555269106, 85.01485644849932,
      74.33113601693287, 80.46765502634452, 84.96159466287249, 74.28024368578943,
      80.43082383319187, 84.93430552506415, 74.25417085386368, 80.41195747538303,
      84.92032847450378, 74.24081737751746, 80.40229559548845, 84.91317091019744,
      74.23397929978461, 80.39734810865093, 84.90950589263116, 74.23047791613807
    ])
  })
})

// ===================================================================
// ADX
// ===================================================================
describe('calculateADX', () => {
  it('insufficient data (length < period*2) returns all-NaN adx/plusDI/minusDI', () => {
    const r = calculateADX(high.slice(0, 20), low.slice(0, 20), close.slice(0, 20), 14)
    assertSeries(r.adx, nanArray(20))
    assertSeries(r.plusDI, nanArray(20))
    assertSeries(r.minusDI, nanArray(20))
  })

  it('period 5: DI lines and (hole-punctuated) ADX line', () => {
    const r = calculateADX(high, low, close, 5)
    expect(r.adx).toHaveLength(30)
    expect(r.plusDI).toHaveLength(30)
    expect(r.minusDI).toHaveLength(30)

    // adx: indices 0-4 are real NaN, 5-8 are undefined HOLES, 9+ numeric
    for (let i = 0; i <= 4; i++) expect(Number.isNaN(r.adx[i])).toBe(true)
    for (let i = 5; i <= 8; i++) expect(r.adx[i]).toBeUndefined()
    expect(r.adx[9]).toBeCloseTo(59.66245079750551, 6)
    expect(r.adx[29]).toBeCloseTo(55.06740008480578, 6)

    // plusDI / minusDI: indices 0-4 NaN, first valid at index 5
    for (let i = 0; i <= 4; i++) {
      expect(Number.isNaN(r.plusDI[i])).toBe(true)
      expect(Number.isNaN(r.minusDI[i])).toBe(true)
    }
    expect(r.plusDI[5]).toBeCloseTo(36.36363636363637, 6)
    expect(r.minusDI[5]).toBeCloseTo(12.121212121212121, 6)
    expect(r.plusDI[9]).toBeCloseTo(34.95330856511698, 6)
    expect(r.plusDI[29]).toBeCloseTo(32.80909735995958, 6)
    expect(r.minusDI[29]).toBeCloseTo(14.414909393403137, 6)
  })
})

// ===================================================================
// MACD
// ===================================================================
describe('calculateMACD', () => {
  it('SURPRISING: default 12/26/9 on 30 points warms up macd but signal/hist stay all NaN', () => {
    const r = calculateMACD(close, 12, 26, 9)
    expect(r.macd).toHaveLength(30)
    // macd only becomes valid at index 25 (slow EMA seed)
    for (let i = 0; i <= 24; i++) expect(Number.isNaN(r.macd[i])).toBe(true)
    expect(r.macd[25]).toBeCloseTo(7.078184265652979, 6)
    expect(r.macd[29]).toBeCloseTo(6.978941537085518, 6)
    // signal + histogram never warm up (only 5 valid macd points < signal seed need)
    assertSeries(r.signal, nanArray(30))
    assertSeries(r.histogram, nanArray(30))
  })

  it('small 3/6/4 periods: full macd / signal / histogram lines', () => {
    const r = calculateMACD(close, 3, 6, 4)
    assertSeries(r.macd, [
      NaN, NaN, NaN, NaN, NaN, 1.25, 1.375, 1.6517857142857224, 1.3003826530612344,
      1.4176840379008837, 1.68562252707207, 1.3262259121943316, 1.4369805622816614,
      1.6998242855583356, 1.336579288791654, 1.4444804629761734, 1.7052336733312075,
      1.3404692951249757, 1.4472721178906056, 1.7072342520368124, 1.341901549655205,
      1.44829679171103, 1.7079669793436807, 1.342425335020522, 1.4486711284736202,
      1.7082344649249137, 1.3426164472396636, 1.4488076627464181, 1.7083320021779116,
      1.3426861230923208
    ])
    assertSeries(r.signal, [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 1.3942920918367392, 1.4036488702623968,
      1.516438332986266, 1.4403533646694924, 1.43900424371436, 1.5433322604519502,
      1.4606310717878317, 1.4541708282631682, 1.554595966290384, 1.4689452978242208,
      1.4602760258507748, 1.5590593163251898, 1.4721962096571959, 1.4626364424787295,
      1.5607686572247101, 1.4734313283430347, 1.4635272483952688, 1.5614101350071268,
      1.4738926599001414, 1.4638586610386521, 1.5616479974943558, 1.4740632477335418
    ])
    assertSeries(r.histogram, [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, -0.09390943877550484, 0.01403516763848689,
      0.16918419408580387, -0.11412745247516076, -0.0020236814326985986, 0.1564920251063855,
      -0.12405178299617758, -0.009690365286994851, 0.15063770704082335, -0.12847600269924508,
      -0.013003907960169148, 0.14817493571162266, -0.13029466000199097, -0.014339650767699386,
      0.14719832211897055, -0.13100599332251273, -0.014856119921648592, 0.14682432991778693,
      -0.13127621266047784, -0.015050998292233997, 0.1466840046835558, -0.13137712464122098
    ])
  })
})

// ===================================================================
// Parabolic SAR
// ===================================================================
describe('calculateParabolicSAR', () => {
  it('length < 5 returns all NaN', () => {
    assertSeries(calculateParabolicSAR([1, 2, 3, 4], [0, 1, 2, 3], [0.5, 1.5, 2.5, 3.5]), nanArray(4))
  })

  it('default AF: index 0 NaN, seeded at index 1, then trailing stop', () => {
    assertSeries(calculateParabolicSAR(high, low, close), [
      NaN, 99, 99, 99.09, 99.2864, 99.719216, 100.12606304, 100.6759779968,
      101.55838019712, 102.352542177408, 103.27023711611903, 104.56240391986238,
      105.67366737108165, 106.84588059170858, 108.40362208520104, 109.68097010986484,
      110.94477608789188, 112.4558208703135, 113.6646566962508, 114.5, 115.9,
      117.02000000000001, 118, 119.3, 120.34, 120.5, 121.9, 123.02000000000001, 124, 125.3
    ])
  })
})

// ===================================================================
// Stochastic
// ===================================================================
describe('calculateStochastic', () => {
  it('period 14 / signal 3: %K warm-up 13 NaN, %D warm-up 15 NaN', () => {
    const r = calculateStochastic(high, low, close, 14, 3)
    assertSeries(r.k, [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
      90.9090909090909, 83.87096774193549, 93.75, 91.17647058823529, 84.375,
      93.93939393939394, 90.9090909090909, 83.87096774193549, 93.75, 91.17647058823529,
      84.375, 93.93939393939394, 90.9090909090909, 83.87096774193549, 93.75,
      91.17647058823529, 84.375
    ])
    assertSeries(r.d, [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
      89.51001955034212, 89.59914611005694, 89.7671568627451, 89.83028817587642,
      89.74116161616162, 89.57315086347346, 89.51001955034212, 89.59914611005694,
      89.7671568627451, 89.83028817587642, 89.74116161616162, 89.57315086347346,
      89.51001955034212, 89.59914611005694, 89.7671568627451
    ])
  })

  it('period 5 / signal 3: %K and %D (SMA-of-K via skipna)', () => {
    const r = calculateStochastic(high, low, close, 5, 3)
    assertSeries(r.k, [
      NaN, NaN, NaN, NaN, 80, 61.53846153846154, 85.71428571428571, 81.25,
      64.28571428571429, 86.66666666666667, 80, 61.53846153846154, 85.71428571428571,
      81.25, 64.28571428571429, 86.66666666666667, 80, 61.53846153846154, 85.71428571428571,
      81.25, 64.28571428571429, 86.66666666666667, 80, 61.53846153846154, 85.71428571428571,
      81.25, 64.28571428571429, 86.66666666666667, 80, 61.53846153846154
    ])
    assertSeries(r.d, [
      NaN, NaN, NaN, NaN, NaN, NaN, 75.75091575091575, 76.16758241758241, 77.08333333333333,
      77.40079365079366, 76.98412698412699, 76.06837606837608, 75.75091575091575,
      76.16758241758241, 77.08333333333333, 77.40079365079366, 76.98412698412699,
      76.06837606837608, 75.75091575091575, 76.16758241758241, 77.08333333333333,
      77.40079365079366, 76.98412698412699, 76.06837606837608, 75.75091575091575,
      76.16758241758241, 77.08333333333333, 77.40079365079366, 76.98412698412699,
      76.06837606837608
    ])
  })
})

// ===================================================================
// CCI
// ===================================================================
describe('calculateCCI', () => {
  it('period 20: warm-up 19 NaN then CCI', () => {
    assertSeries(calculateCCI(high, low, close, 20), [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
      NaN, NaN, NaN, NaN,
      136.73805601317954, 116.36161952301711, 123.17880794701965, 138.93465129049983,
      114.90787269681765, 125.38631346578369, 136.73805601317954, 116.36161952301711,
      123.17880794701965, 138.93465129049966, 114.90787269681748
    ])
  })

  it('period 5: first valid CCI at index 4', () => {
    assertSeries(calculateCCI(high, low, close, 5), [
      NaN, NaN, NaN, NaN, 139.42307692307713, 56.73758865248271, 96.33027522935737,
      130.50314465408715, 65.21739130434638, 91.90031152647947, 139.4230769230781,
      56.73758865248271, 96.33027522935737, 130.50314465408715, 65.21739130434638,
      91.90031152647947, 139.4230769230781, 56.73758865248271, 96.33027522935737,
      130.50314465408715, 65.21739130434638, 91.90031152647947, 139.4230769230781,
      56.73758865248271, 96.33027522935737, 130.50314465408715, 65.21739130434638,
      91.90031152647947, 139.4230769230777, 56.73758865248309
    ], 4)
  })
})

// ===================================================================
// ATR
// ===================================================================
describe('calculateATR', () => {
  it('period 14: warm-up 14 NaN then Wilder-smoothed TR', () => {
    assertSeries(calculateATR(high, low, close, 14), [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
      3.25, 3.232142857142857, 3.251275510204082, 3.2690415451895047, 3.249824291961683,
      3.2676939853929916, 3.2485729864363497, 3.2308177731194676, 3.250045075039506,
      3.2678989982509696, 3.2487633555187574, 3.2667088301245606, 3.2476581994013776,
      3.229968328015565, 3.2492563045858818, 3.267166568544033
    ])
  })

  it('period 5: first valid ATR at index 5', () => {
    assertSeries(calculateATR(high, low, close, 5), [
      NaN, NaN, NaN, NaN, NaN,
      3.3, 3.2399999999999998, 3.2920000000000003, 3.2336, 3.18688, 3.2495040000000004,
      3.2996032, 3.23968256, 3.2917460480000003, 3.2333968384, 3.18671747072, 3.249373976576,
      3.2994991812608, 3.23959934500864, 3.2916794760069124, 3.23334358080553,
      3.186674864644424, 3.2493398917155387, 3.299471913372431, 3.2395775306979444,
      3.291662024558356, 3.2333296196466845, 3.1866636957173475, 3.2493309565738784,
      3.2994647652591027
    ])
  })
})

// ===================================================================
// OBV
// ===================================================================
describe('calculateOBV', () => {
  it('running on-balance volume seeded with the first volume', () => {
    assertSeries(calculateOBV(close, volume), [
      1000000, 2050000, 950000, 2100000, 3300000, 2300000, 3350000, 4450000, 3300000,
      4500000, 5500000, 4450000, 5550000, 6700000, 5500000, 6500000, 7550000, 6450000,
      7600000, 8800000, 7800000, 8850000, 9950000, 8800000, 10000000, 11000000, 9950000,
      11050000, 12200000, 11000000
    ])
  })

  it('NaN close produces NaN entries at those indices', () => {
    // [10, NaN, 12, 11, 13] -> seed at 0, NaN wherever current/prev close is NaN
    assertSeries(calculateOBV([10, NaN, 12, 11, 13], [100, 200, 300, 400, 500]), [
      100, NaN, NaN, -300, 200
    ])
  })
})

// ===================================================================
// SuperTrend
// ===================================================================
describe('calculateSuperTrend', () => {
  it('period 10 / multiplier 3: superTrend line + final trend direction', () => {
    const r = calculateSuperTrend(high, low, close, 10, 3)
    expect(r.trend).toBe(1)
    assertSeries(r.superTrend, [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
      101.5, 101.5, 102.2575, 104.18175, 104.18175, 105.08721750000001, 107.50349575,
      107.50349575, 108.2603315575, 110.18429840175, 110.18429840175, 111.0892817054175,
      113.50535353487575, 113.50535353487575, 114.26183636324936, 116.18565272692443,
      116.18565272692443, 117.09037870880879, 119.50634083792791, 119.50634083792791
    ])
  })

  it('period 5 / multiplier 2: superTrend line', () => {
    const r = calculateSuperTrend(high, low, close, 5, 2)
    expect(r.trend).toBe(1)
    assertSeries(r.superTrend, [
      NaN, NaN, NaN, NaN, NaN,
      97.65, 99.52, 101.416, 101.416, 102.37624, 104.750992, 104.750992, 105.52063488,
      107.416507904, 107.416507904, 108.37656505856, 110.751252046848, 110.751252046848,
      111.52080130998272, 113.41664104798618, 113.41664104798618, 114.37665027071115,
      116.75132021656893, 116.75132021656893, 117.52084493860411, 119.41667595088329,
      119.41667595088329, 120.3766726085653, 122.75133808685224, 122.75133808685224
    ])
  })
})

// ===================================================================
// MFI
// ===================================================================
describe('calculateMFI', () => {
  it('period 14: warm-up 14 NaN then Money Flow Index', () => {
    assertSeries(calculateMFI(high, low, close, volume, 14), [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
      64.5937387621369, 64.7570894483554, 71.60286573413453, 64.23353005292772,
      64.43260714599587, 71.20766815843965, 64.53851195395093, 64.70096016111418,
      71.89549849041897, 64.17911841613747, 64.9188754138543, 71.42850646840824,
      64.41067702321624, 64.57264129264237, 72.11530715455741, 64.59621066659653
    ])
  })

  it('period 5: first valid MFI at index 5', () => {
    assertSeries(calculateMFI(high, low, close, volume, 5), [
      NaN, NaN, NaN, NaN, NaN,
      61.98228112190177, 62.2617294033573, 82.00066237562457, 61.02072272649427,
      61.312255651878296, 79.2653564029341, 60.12701324328456, 60.4174426464705,
      81.09087441594355, 59.21925003713356, 59.46011248775118, 78.34940765995835,
      58.311053747579976, 58.611942835475475, 80.19911932955411, 61.972788243290026,
      62.1967543311704, 81.95723663487344, 60.99797353080984, 61.27698154449937,
      79.26781278437738, 60.125786163522015, 60.360086925906586, 81.04997900042,
      59.19699767677369
    ])
  })
})

// ===================================================================
// Beta
// ===================================================================
describe('calculateBeta', () => {
  it('null benchmark returns all NaN', () => {
    assertSeries(calculateBeta(close, null, 14), nanArray(30))
  })

  it('length-mismatched benchmark returns all NaN', () => {
    assertSeries(calculateBeta(close, benchmark.slice(0, 20), 14), nanArray(30))
  })

  it('period 14: rolling beta vs benchmark, warm-up 14 NaN', () => {
    assertSeries(calculateBeta(close, benchmark, 14), [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
      1.2247810450319363, 1.2527544229462515, 1.2806000783109182, 1.3899842119903698,
      1.3496328922218286, 1.3118046443049296, 1.3148678793405482, 1.2597224152189033,
      1.235248536150816, 1.259002035755342, 1.2106980179944544, 1.2042675223163835,
      1.250377879758142, 1.2023957925104636, 1.196289409750036, 1.2422456732213714
    ])
  })
})

// ===================================================================
// Williams %R
// ===================================================================
describe('calculateWilliamsR', () => {
  it('period 14: warm-up 13 NaN then %R (negative range)', () => {
    assertSeries(calculateWilliamsR(high, low, close, 14), [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
      -9.090909090909092, -16.129032258064516, -6.25, -8.823529411764707, -15.625,
      -6.0606060606060606, -9.090909090909092, -16.129032258064516, -6.25,
      -8.823529411764707, -15.625, -6.0606060606060606, -9.090909090909092,
      -16.129032258064516, -6.25, -8.823529411764707, -15.625
    ])
  })

  it('period 5: first valid %R at index 4', () => {
    assertSeries(calculateWilliamsR(high, low, close, 5), [
      NaN, NaN, NaN, NaN, -20, -38.46153846153847, -14.285714285714285, -18.75,
      -35.714285714285715, -13.333333333333334, -20, -38.46153846153847, -14.285714285714285,
      -18.75, -35.714285714285715, -13.333333333333334, -20, -38.46153846153847,
      -14.285714285714285, -18.75, -35.714285714285715, -13.333333333333334, -20,
      -38.46153846153847, -14.285714285714285, -18.75, -35.714285714285715,
      -13.333333333333334, -20, -38.46153846153847
    ])
  })
})

// ===================================================================
// CMF
// ===================================================================
describe('calculateCMF', () => {
  it('period 20: warm-up 19 NaN then Chaikin Money Flow', () => {
    assertSeries(calculateCMF(high, low, close, volume, 20), [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
      NaN, NaN, NaN, NaN,
      -0.07181818181818181, -0.08696969696969696, -0.07742424242424241, -0.07075757575757576,
      -0.08867965367965368, -0.07777056277056277, -0.07127705627705627, -0.08718614718614717,
      -0.07718614718614718, -0.07021645021645022, -0.08891774891774892
    ])
  })

  it('period 5: first valid CMF at index 4', () => {
    assertSeries(calculateCMF(high, low, close, volume, 5), [
      NaN, NaN, NaN, NaN, -0.06848484848484848, -0.09445887445887445, -0.09445887445887445,
      -0.02779220779220779, -0.13930735930735932, -0.05203463203463204, -0.062424242424242424,
      -0.08969696969696969, -0.08969696969696969, -0.02, -0.13636363636363635,
      -0.06363636363636363, -0.07454545454545454, -0.10311688311688312, -0.10311688311688312,
      -0.030389610389610387, -0.12735930735930737, -0.05099567099567098, -0.062424242424242424,
      -0.09229437229437229, -0.09229437229437229, -0.03168831168831169, -0.13350649350649352,
      -0.053506493506493516, -0.06545454545454546, -0.09662337662337661
    ], 8)
  })
})

// ===================================================================
// calculateAllIndicators (integration / shape)
// ===================================================================
describe('calculateAllIndicators', () => {
  const ohlcv = { open, high, low, close, volume }

  it('throws when OHLCV arrays differ in length', () => {
    expect(() => calculateAllIndicators({
      open, high, low, close, volume: volume.slice(0, 29)
    })).toThrow('All OHLCV arrays must have the same length')
  })

  it('returns exactly the documented key set', () => {
    const all = calculateAllIndicators(ohlcv, benchmark)
    expect(Object.keys(all)).toEqual([
      'MA_5', 'MA_10', 'MA_30', 'SMA_5', 'SMA_10', 'SMA_30',
      'ICHIMOKU_BASELINE_26', 'ICHIMOKU_CONVERSIONLINE_9', 'ICHIMOKU_LAGGINGSPAN_26',
      'VWMA_20', 'RSI_14', 'MACD_12_26_9', 'MACD_SIGNAL_9', 'MACD_HIST',
      'ADX_14', 'ADX_14_PLUS_DI', 'ADX_14_MINUS_DI', 'SAR', 'STOCH_K', 'STOCH_D',
      'CCI_20', 'ATR_14', 'OBV', 'SUPERTREND_10_3', 'MFI_14', 'volume', 'close',
      'BETA_10D', 'BETA_3M', 'EMA_20', 'WILLR_14', 'CMF_20'
    ])
  })

  it('every series has the input length (30)', () => {
    const all = calculateAllIndicators(ohlcv, benchmark)
    for (const [key, series] of Object.entries(all)) {
      expect(series, `series ${key}`).toHaveLength(30)
    }
  })

  it('passes through raw close/volume unchanged', () => {
    const all = calculateAllIndicators(ohlcv, benchmark)
    expect(all.close).toBe(close)
    expect(all.volume).toBe(volume)
  })

  it('representative last-bar values match the wrapped indicators', () => {
    const all = calculateAllIndicators(ohlcv, benchmark)
    const last = 29
    expect(all.MA_5[last]).toBeCloseTo(126.84210276197089, 6)
    expect(all.SMA_5[last]).toBeCloseTo(127, 6)
    expect(all.EMA_20[last]).toBeCloseTo(119.45892333703534, 6)
    expect(all.RSI_14[last]).toBeCloseTo(78.20240779368754, 6)
    expect(all.MACD_12_26_9[last]).toBeCloseTo(6.978941537085518, 6)
    expect(all.ADX_14[last]).toBeCloseTo(57.26970549410703, 6)
    expect(all.SAR[last]).toBeCloseTo(125.3, 6)
    expect(all.STOCH_K[last]).toBeCloseTo(84.375, 6)
    expect(all.STOCH_D[last]).toBeCloseTo(89.7671568627451, 6)
    expect(all.CCI_20[last]).toBeCloseTo(114.90787269681748, 4)
    expect(all.ATR_14[last]).toBeCloseTo(3.267166568544033, 6)
    expect(all.OBV[last]).toBeCloseTo(11000000, 6)
    expect(all.MFI_14[last]).toBeCloseTo(64.59621066659653, 6)
    expect(all.SUPERTREND_10_3[last]).toBeCloseTo(119.50634083792791, 6)
    expect(all.BETA_10D[last]).toBeCloseTo(1.2422456732213714, 6)
    expect(all.WILLR_14[last]).toBeCloseTo(-15.625, 6)
    expect(all.CMF_20[last]).toBeCloseTo(-0.08891774891774892, 8)
    expect(all.ICHIMOKU_CONVERSIONLINE_9[last]).toBeCloseTo(125, 6)
  })

  it('series that cannot warm up at 30 points are all NaN (MA_30, MACD signal/hist, BETA_3M, lagging span)', () => {
    const all = calculateAllIndicators(ohlcv, benchmark)
    // MA_30/SMA_30 need 30 points -> only the very last is valid
    expect(Number.isNaN(all.MA_30[28])).toBe(true)
    expect(all.MA_30[29]).toBeCloseTo(114.5, 6)
    expect(all.SMA_30[29]).toBeCloseTo(114.5, 6)
    // signal/hist of the default MACD never warm up
    assertSeries(all.MACD_SIGNAL_9, nanArray(30))
    assertSeries(all.MACD_HIST, nanArray(30))
    // BETA_3M uses period 90 > 30 -> all NaN
    assertSeries(all.BETA_3M, nanArray(30))
    // lagging span shift 26 pushes the last 26 entries to NaN; last is NaN
    expect(Number.isNaN(all.ICHIMOKU_LAGGINGSPAN_26[29])).toBe(true)
    expect(all.ICHIMOKU_LAGGINGSPAN_26[3]).toBeCloseTo(103, 6)
  })

  it('without a benchmark, BETA series are all NaN', () => {
    const all = calculateAllIndicators(ohlcv) // no benchmark
    assertSeries(all.BETA_10D, nanArray(30))
    assertSeries(all.BETA_3M, nanArray(30))
  })
})

// ===================================================================
// Edge-branch characterization: division guards, flat windows, NaN
// inputs, and downtrend paths (the branches most likely to drift).
// ===================================================================
describe('edge branches / division guards', () => {
  const flat = Array(8).fill(100)
  const flatVol = Array(8).fill(1000)

  it('Stochastic: flat window (high===low) yields %K = 50', () => {
    const r = calculateStochastic(flat, flat, flat, 3, 3)
    assertSeries(r.k, [NaN, NaN, 50, 50, 50, 50, 50, 50])
    assertSeries(r.d, [NaN, NaN, NaN, NaN, 50, 50, 50, 50])
  })

  it('CCI: flat window (meanDev === 0) yields 0', () => {
    assertSeries(calculateCCI(flat, flat, flat, 3), [NaN, NaN, 0, 0, 0, 0, 0, 0])
  })

  it('Williams %R: flat window (high===low) yields -50', () => {
    assertSeries(calculateWilliamsR(flat, flat, flat, 3), [NaN, NaN, -50, -50, -50, -50, -50, -50])
  })

  it('CMF: flat range (high===low) forces MFV 0 -> CMF 0', () => {
    assertSeries(calculateCMF(flat, flat, flat, flatVol, 3), [NaN, NaN, 0, 0, 0, 0, 0, 0])
  })

  it('CMF: zero volume window (sumVol === 0) yields 0', () => {
    const zc = [10, 11, 12, 11, 13, 14]
    const zh = zc.map(c => c + 1)
    const zl = zc.map(c => c - 1)
    assertSeries(calculateCMF(zh, zl, zc, Array(6).fill(0), 3), [NaN, NaN, 0, 0, 0, 0])
  })

  it('RSI: monotonic rising input saturates to 100 (avgLoss <= EPSILON branch)', () => {
    const mono = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109]
    assertSeries(calculateRSI(mono, 5), [NaN, NaN, NaN, NaN, NaN, 100, 100, 100, 100, 100])
  })

  it('RSI: a NaN inside the input delays the first valid value', () => {
    const rsiNaN = [100, 101, NaN, 103, 104, 105, 106, 104, 107, 108, 109, 110]
    assertSeries(calculateRSI(rsiNaN, 5), [
      NaN, NaN, NaN, NaN, NaN, NaN, NaN,
      66.66666666666666, 79.48717948717949, 82.32044198895028, 84.92343934040046,
      87.26684904252673
    ])
  })

  it('MFI: monotonic rising (negMF === 0) saturates to 100', () => {
    const mono = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109]
    const monoH = mono.map(c => c + 1)
    const monoL = mono.map(c => c - 1)
    assertSeries(calculateMFI(monoH, monoL, mono, Array(10).fill(1000), 5), [
      NaN, NaN, NaN, NaN, NaN, 100, 100, 100, 100, 100
    ])
  })

  it('OBV: leading NaN closes are skipped; NaN volume treated as 0 at seed and after', () => {
    // close[0..1] NaN -> seed at index 2 (volume NaN -> 0). Then normal accumulation.
    assertSeries(calculateOBV([NaN, NaN, 10, 12, 11], [NaN, 100, NaN, 200, 300]), [
      NaN, NaN, 0, 200, -100
    ])
  })

  it('wilderSmoothing: length >= period but < period valid values returns NaN/holes', () => {
    // 5 points, period 3, only 1 valid -> early return; indices 2..4 are holes
    assertSeries(wilderSmoothing([10, NaN, NaN, NaN, NaN], 3), [NaN, NaN, H, H, H])
  })

  it('MACD: slowPeriod <= fastPeriod still returns full-length arrays (only warns)', () => {
    const mono = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109]
    const r = calculateMACD(mono, 6, 3, 2)
    expect(r.macd).toHaveLength(10)
    expect(r.signal).toHaveLength(10)
    expect(r.histogram).toHaveLength(10)
  })

  it('Parabolic SAR: downtrend seed (close[1] < close[0]) and bearish trailing stop', () => {
    const dC = [120, 118, 119, 117, 115, 116, 114, 112, 113, 111, 110, 108, 109, 107, 105]
    const dH = dC.map(c => c + 1)
    const dL = dC.map(c => c - 1)
    assertSeries(calculateParabolicSAR(dH, dL, dC), [
      NaN, 121, 121, 120.92, 120.7232, 120.31980800000001, 119.94061952000001,
      119.3853699584, 118.54683296256, 117.792149666304, 116.85709170634752,
      115.75709886745886, 114.35596304866544, 113.17900896087897, 111.88678734792076
    ])
  })

  it('SuperTrend: sustained downtrend flips trend to -1 (bearish branches)', () => {
    const dC = [120, 118, 119, 117, 115, 116, 114, 112, 113, 111, 110, 108, 109, 107, 105]
    const dH = dC.map(c => c + 1)
    const dL = dC.map(c => c - 1)
    const r = calculateSuperTrend(dH, dL, dC, 5, 2)
    expect(r.trend).toBe(-1)
    assertSeries(r.superTrend, [
      NaN, NaN, NaN, NaN, NaN, 110.8, 110.8, 110.8, 110.8, 110.8,
      115.081856, 113.2654848, 113.2654848, 112.209910272, 110.3679282176
    ])
  })

  it('OBV: NaN volume mid-series is treated as 0 in the accumulation loop', () => {
    assertSeries(calculateOBV([10, 12, 11, 13], [100, NaN, 200, NaN]), [100, 100, -100, -100])
  })

  it('Parabolic SAR: whipsaw series triggers reversals in both directions', () => {
    const wC = [100, 102, 104, 106, 103, 100, 98, 96, 99, 103, 107, 110, 112, 111, 113]
    const wH = wC.map(c => c + 1.5)
    const wL = wC.map(c => c - 1.5)
    assertSeries(calculateParabolicSAR(wH, wL, wC), [
      NaN, 98.5, 98.5, 98.78, 99.3032, 107.5, 107.32, 106.88719999999999,
      106.14396799999999, 105.44532991999999, 94.5, 94.78, 95.4488, 96.531872, 97.54995968
    ])
  })

  it('SuperTrend: whipsaw series flips bearish then back bullish (up-flip branch)', () => {
    const wC = [100, 102, 104, 106, 103, 100, 98, 96, 99, 103, 107, 110, 112, 111, 113]
    const wH = wC.map(c => c + 1.5)
    const wL = wC.map(c => c - 1.5)
    const r = calculateSuperTrend(wH, wL, wC, 3, 2)
    expect(r.trend).toBe(1)
    assertSeries(r.superTrend, [
      NaN, NaN, NaN, 99, 99, 99, 105.74074074074075, 103.49382716049382,
      103.49382716049382, 103.49382716049382, 97.33516232281664, 100.55677488187776,
      103.37118325458518, 103.37118325458518, 105.49830366870452
    ])
  })

  it('ADX: length >= period*2 but too few VALID OHLC rows returns all NaN', () => {
    const n = 12
    const aH = Array.from({ length: n }, (_, i) => (i < 4 ? 10 + i : NaN))
    const aL = Array.from({ length: n }, (_, i) => (i < 4 ? 8 + i : NaN))
    const aC = Array.from({ length: n }, (_, i) => (i < 4 ? 9 + i : NaN))
    const r = calculateADX(aH, aL, aC, 5)
    assertSeries(r.adx, nanArray(n))
    assertSeries(r.plusDI, nanArray(n))
    assertSeries(r.minusDI, nanArray(n))
  })

  it('ADX: a single NaN OHLC row mid-series produces NaN DI at that index', () => {
    const n = 16
    const cc = Array.from({ length: n }, (_, i) => 100 + i)
    cc[8] = NaN
    const hh = cc.map(c => (Number.isNaN(c) ? NaN : c + 1))
    const ll = cc.map(c => (Number.isNaN(c) ? NaN : c - 1))
    const r = calculateADX(hh, ll, cc, 5)
    expect(r.adx).toHaveLength(n)
    expect(Number.isNaN(r.plusDI[8])).toBe(true)
  })
})

// ===================================================================
// Exported constant
// ===================================================================
describe('EPSILON', () => {
  it('is 1e-12', () => {
    expect(EPSILON).toBe(1e-12)
  })
})
