/**
 * Characterization tests for hybridTechnicalIndicatorsApi — written BEFORE the
 * JS→TS migration to lock current behaviour (ADR-0014). They pin the parts a
 * strict-typing pass could disturb: the three-strategy data ladder
 * (precomputed → daily cache → realtime → error response), the *relaxed*
 * isADXValid gate, the error-response shape, and setPreferences.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { hybridTechnicalIndicatorsAPI } from '@/api/hybridTechnicalIndicatorsApi'
import precomputedIndicatorsAPI from '@/api/precomputedIndicatorsApi'
import yahooFinanceAPI from '@/api/yahooFinanceApi'
import technicalIndicatorsCache from '@/utils/technicalIndicatorsCache'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // Reset the mutable preference flags to their constructor defaults.
  hybridTechnicalIndicatorsAPI.preferPrecomputed = true
  hybridTechnicalIndicatorsAPI.fallbackToRealtime = true
  hybridTechnicalIndicatorsAPI.maxPrecomputedAge = 24 * 60 * 60 * 1000
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('hybridTechnicalIndicatorsAPI.isADXValid — relaxed validation', () => {
  it('rejects null and data with no / invalid adx14', () => {
    expect(hybridTechnicalIndicatorsAPI.isADXValid(null)).toBe(false)
    expect(hybridTechnicalIndicatorsAPI.isADXValid({})).toBe(false)
    expect(hybridTechnicalIndicatorsAPI.isADXValid({ adx14: { value: null } })).toBe(false)
    expect(hybridTechnicalIndicatorsAPI.isADXValid({ adx14: { value: 'N/A' } })).toBe(false)
  })

  it('accepts a valid adx14.value even when OBV/Beta are missing (relaxed)', () => {
    expect(hybridTechnicalIndicatorsAPI.isADXValid({ adx14: { value: 25 } })).toBe(true)
  })

  it('still returns true when the ADX full-series is mostly empty (relaxed, warns only)', () => {
    const data = { adx14: { value: 25 }, fullSeries: { ADX_14: [null, null, 1, 2] } }
    expect(hybridTechnicalIndicatorsAPI.isADXValid(data)).toBe(true)
  })
})

describe('hybridTechnicalIndicatorsAPI.createErrorResponse', () => {
  it('produces an all-N/A payload tagged with the error and symbol', () => {
    const res = hybridTechnicalIndicatorsAPI.createErrorResponse('AAPL', 'boom')
    expect(res).toMatchObject({
      symbol: 'AAPL',
      error: 'boom',
      source: 'Error',
      adx14: { value: null, signal: 'N/A' },
      rsi14: { value: null, signal: 'N/A' },
      macd: { value: null, signal: 'N/A' }
    })
  })
})

describe('hybridTechnicalIndicatorsAPI.getTechnicalIndicators — strategy ladder', () => {
  it('Strategy 1: returns precomputed data when its ADX is valid', async () => {
    vi.spyOn(precomputedIndicatorsAPI, 'getTechnicalIndicators').mockResolvedValue({
      adx14: { value: 25 }, lastUpdated: new Date().toISOString(), dataAge: '1h', yf: { beta_10d: 1.1 }
    })
    const cacheSpy = vi.spyOn(technicalIndicatorsCache, 'getTechnicalIndicators')

    const res = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators('NVDA')

    expect(String(res.source)).toMatch(/^Precomputed/)
    expect(cacheSpy).not.toHaveBeenCalled() // short-circuited at strategy 1
  })

  it('Strategy 2: falls to the daily cache when precomputed ADX is invalid', async () => {
    vi.spyOn(precomputedIndicatorsAPI, 'getTechnicalIndicators').mockResolvedValue({
      adx14: { value: null }, lastUpdated: new Date().toISOString(), dataAge: '1h'
    })
    vi.spyOn(technicalIndicatorsCache, 'getTechnicalIndicators').mockResolvedValue({
      adx14: { value: 30 }, source: 'daily-cache'
    })
    const yahooSpy = vi.spyOn(yahooFinanceAPI, 'fetchTechnicalIndicatorsFromAPI')

    const res = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators('NVDA')

    expect(res.source).toBe('daily-cache')
    expect(yahooSpy).not.toHaveBeenCalled() // short-circuited at strategy 2
  })

  it('Strategy 3: falls to realtime and writes it back to the daily cache', async () => {
    vi.spyOn(precomputedIndicatorsAPI, 'getTechnicalIndicators').mockRejectedValue(new Error('no precomputed'))
    vi.spyOn(technicalIndicatorsCache, 'getTechnicalIndicators').mockResolvedValue(null)
    vi.spyOn(yahooFinanceAPI, 'fetchTechnicalIndicatorsFromAPI').mockResolvedValue({
      adx14: { value: 20 }, rsi14: { value: 55 }
    })
    const setSpy = vi.spyOn(technicalIndicatorsCache, 'setTechnicalIndicators').mockResolvedValue(undefined)

    const res = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators('NVDA')

    expect(res.adx14).toEqual({ value: 20 })
    expect(setSpy).toHaveBeenCalledWith('NVDA', expect.objectContaining({ adx14: { value: 20 } }))
  })

  it('all strategies fail → error response (source "Error")', async () => {
    vi.spyOn(precomputedIndicatorsAPI, 'getTechnicalIndicators').mockRejectedValue(new Error('no precomputed'))
    vi.spyOn(technicalIndicatorsCache, 'getTechnicalIndicators').mockResolvedValue(null)
    vi.spyOn(yahooFinanceAPI, 'fetchTechnicalIndicatorsFromAPI').mockResolvedValue({ error: 'yahoo down' })

    const res = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators('NVDA')

    expect(res.source).toBe('Error')
    expect(res.symbol).toBe('NVDA')
    expect(res.error).toBeTruthy()
  })
})

describe('hybridTechnicalIndicatorsAPI.setPreferences', () => {
  it('updates only the provided preference flags', () => {
    hybridTechnicalIndicatorsAPI.setPreferences({ preferPrecomputed: false, maxPrecomputedAge: 999 })
    expect(hybridTechnicalIndicatorsAPI.preferPrecomputed).toBe(false)
    expect(hybridTechnicalIndicatorsAPI.maxPrecomputedAge).toBe(999)
    expect(hybridTechnicalIndicatorsAPI.fallbackToRealtime).toBe(true) // untouched
  })
})

describe('hybridTechnicalIndicatorsAPI.getBatchTechnicalIndicators', () => {
  it('returns a Map of per-symbol success results', async () => {
    vi.spyOn(hybridTechnicalIndicatorsAPI, 'getTechnicalIndicators')
      .mockResolvedValue({ adx14: { value: 25 }, source: 'test' })

    const results = await hybridTechnicalIndicatorsAPI.getBatchTechnicalIndicators(['NVDA', 'AMD'])

    expect(results.size).toBe(2)
    expect(results.get('NVDA')).toMatchObject({ symbol: 'NVDA', success: true })
    expect(results.get('AMD')).toMatchObject({ symbol: 'AMD', success: true })
  })
})
