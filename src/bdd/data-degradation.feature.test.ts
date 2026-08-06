/**
 * Binding for features/data-degradation.feature (PRD F6 — stale beats broken).
 *
 * Binds the indicator strategy ladder (precomputed → daily cache → realtime → error
 * response) in hybridTechnicalIndicatorsApi, mirroring the spy pattern of its
 * characterization tests (hybridTechnicalIndicatorsApi.test.js) so the two suites stay
 * consistent about how the ladder is stubbed.
 */
import { expect, vi, beforeEach, afterEach } from 'vitest'
import { feature, scenario, manualScenario } from './gwt'
import { hybridTechnicalIndicatorsAPI } from '@/api/hybridTechnicalIndicatorsApi'
import precomputedIndicatorsAPI from '@/api/precomputedIndicatorsApi'
import yahooFinanceAPI from '@/api/yahooFinanceApi'
import technicalIndicatorsCache from '@/utils/technicalIndicatorsCache'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  hybridTechnicalIndicatorsAPI.preferPrecomputed = true
  hybridTechnicalIndicatorsAPI.fallbackToRealtime = true
  hybridTechnicalIndicatorsAPI.maxPrecomputedAge = 24 * 60 * 60 * 1000
})
afterEach(() => {
  vi.restoreAllMocks()
})

feature('Stale-but-not-broken data degradation', () => {
  scenario('Fresh pre-computed data short-circuits the ladder', (s) => {
    let cacheSpy: ReturnType<typeof vi.spyOn>
    let result: Awaited<ReturnType<typeof hybridTechnicalIndicatorsAPI.getTechnicalIndicators>>

    s.given('the static lake serves fresh pre-computed indicators', () => {
      vi.spyOn(precomputedIndicatorsAPI, 'getTechnicalIndicators').mockResolvedValue({
        adx14: { value: 25 },
        lastUpdated: new Date().toISOString(),
        dataAge: '1h',
        yf: { beta_10d: 1.1 },
      })
      cacheSpy = vi.spyOn(technicalIndicatorsCache, 'getTechnicalIndicators')
    })
    s.when('a widget requests indicators for a symbol', async () => {
      result = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators('NVDA')
    })
    s.then('the pre-computed data is returned', () => {
      expect(String(result.source)).toMatch(/^Precomputed/)
      expect(result.adx14?.value).toBe(25)
    })
    s.and('no cache or live fallback is attempted', () => {
      expect(cacheSpy).not.toHaveBeenCalled()
    })
  })

  scenario('Invalid pre-computed data falls back to the daily cache', (s) => {
    let yahooSpy: ReturnType<typeof vi.spyOn>
    let result: Awaited<ReturnType<typeof hybridTechnicalIndicatorsAPI.getTechnicalIndicators>>

    s.given('the pre-computed indicators fail their validity gate', () => {
      vi.spyOn(precomputedIndicatorsAPI, 'getTechnicalIndicators').mockResolvedValue({
        adx14: { value: null },
        lastUpdated: new Date().toISOString(),
        dataAge: '1h',
      })
    })
    s.and('the daily cache holds valid indicators', () => {
      vi.spyOn(technicalIndicatorsCache, 'getTechnicalIndicators').mockResolvedValue({
        adx14: { value: 30 },
        source: 'daily-cache',
      })
      yahooSpy = vi.spyOn(yahooFinanceAPI, 'fetchTechnicalIndicatorsFromAPI')
    })
    s.when('a widget requests indicators for a symbol', async () => {
      result = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators('NVDA')
    })
    s.then('the daily-cache data is returned', () => {
      expect(result.source).toBe('daily-cache')
      expect(result.adx14?.value).toBe(30)
    })
    s.and('the live API is not called', () => {
      expect(yahooSpy).not.toHaveBeenCalled()
    })
  })

  scenario('Every tier fails so the widget receives a renderable error payload', (s) => {
    let result: Awaited<ReturnType<typeof hybridTechnicalIndicatorsAPI.getTechnicalIndicators>>

    s.given('the static lake is unreachable', () => {
      vi.spyOn(precomputedIndicatorsAPI, 'getTechnicalIndicators').mockRejectedValue(
        new Error('no precomputed')
      )
    })
    s.and('the daily cache is empty', () => {
      vi.spyOn(technicalIndicatorsCache, 'getTechnicalIndicators').mockResolvedValue(null)
    })
    s.and('the live API fails', () => {
      vi.spyOn(yahooFinanceAPI, 'fetchTechnicalIndicatorsFromAPI').mockRejectedValue(
        new Error('proxies exhausted')
      )
    })
    s.when('a widget requests indicators for a symbol', async () => {
      result = await hybridTechnicalIndicatorsAPI.getTechnicalIndicators('NVDA')
    })
    s.then('an error-tagged all-N/A payload is returned for that widget alone', () => {
      expect(result.source).toBe('Error')
      expect(result.adx14).toMatchObject({ value: null, signal: 'N/A' })
    })
    s.and('the payload names the symbol and the failure', () => {
      expect(result.symbol).toBe('NVDA')
      expect(result.error).toBeTruthy()
    })
  })

  manualScenario(
    'Stale data renders with a staleness banner',
    'needs a browser-level stale-lake fixture; tracked for the e2e layer'
  )
})
