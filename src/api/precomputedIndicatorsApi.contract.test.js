/**
 * Cross-repo data-contract test for precomputedIndicatorsAPI (WS-I PR2 / audit R2).
 *
 * The app reads a SEPARATE data repository (ADR-0008) — the one input it does
 * not control. `precomputedIndicatorsApi` maps that repo's nested indicator JSON
 * to the flat shape the UI consumes, with hand-written key paths
 * (`raw.psar.sar`, `raw.obv.value`, `raw.cci.cci20`, …). A field rename upstream
 * silently blanks an indicator with no error and no failing test — and the audit
 * already found a DIVERGENT sibling parser in yahooFinanceApi reading
 * `psar.psar`/`obv.obv`/`cci.cci` (wrong), proving this class ships unnoticed.
 *
 * This test runs the REAL parser against a REAL (trimmed) committed sample and
 * asserts every mapping resolves to the sample's actual last value. If the
 * repo's schema drifts — or a refactor points a mapping at the wrong nested key
 * (the psar.psar bug) — the resolved value goes null and the matching assertion
 * fails. The fixture is a size-trimmed copy of
 * public/data/technical-indicators/2026-06-18_AMD.json (which is git-ignored),
 * so this runs in CI without seeded data.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { precomputedIndicatorsAPI } from './precomputedIndicatorsApi'
import technicalIndicatorsCache from '@/utils/technicalIndicatorsCache'

const SAMPLE = JSON.parse(
  readFileSync(path.resolve(__dirname, '__fixtures__/precomputed-AMD-2026-06-18.json'), 'utf8')
)

/** Mirrors precomputedIndicatorsApi's getLast: last non-null value of a series. */
function lastNonNull (arr) {
  if (!Array.isArray(arr)) return null
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null && arr[i] !== undefined) return arr[i]
  }
  return null
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  precomputedIndicatorsAPI.clearCache()
  // The index (date + symbol list) is loaded via the cache service; stub it.
  vi.spyOn(technicalIndicatorsCache, 'getLatestIndex').mockResolvedValue({
    date: '2026-06-18', symbols: ['AMD']
  })
  // Any fetch for the per-symbol file returns the committed sample.
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => SAMPLE })
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('precomputedIndicatorsAPI — data-repo contract (nested → flat mapping)', () => {
  it('maps every indicator key to the sample\'s real last value (catches upstream key drift)', async () => {
    const out = await precomputedIndicatorsAPI.getTechnicalIndicators('AMD')
    const raw = SAMPLE.indicators

    // [ resolved output value, the raw nested series it MUST come from ]
    const contract = [
      ['parabolicSAR', out.parabolicSAR.value, raw.psar.sar],   // the divergence: NOT psar.psar
      ['obv',          out.obv.value,          raw.obv.value],  // NOT obv.obv
      ['cci20',        out.cci20.value,        raw.cci.cci20],  // NOT cci.cci
      ['rsi14',        out.rsi14.value,        raw.rsi.rsi14],
      ['adx14',        out.adx14.value,        raw.adx.adx],
      ['macd',         out.macd.value,         raw.macd.macd],
      ['macd.signal',  out.macd.signal,        raw.macd.signal],
      ['macd.hist',    out.macd.histogram,     raw.macd.histogram],
      ['vwma20',       out.vwma20.value,       raw.vwma.vwma],
      ['superTrend',   out.superTrend.value,   raw.supertrend.supertrend],
      ['atr14',        out.atr14.value,        raw.atr.atr14],
      ['mfi14',        out.mfi14.value,        raw.mfi.mfi14],
      ['cmf20',        out.cmf20.value,        raw.cmf.cmf20],
      ['willr14',      out.willr14.value,      raw.williamsR.r14],
      ['stochK',       out.stochK.value,       raw.stoch.k],
      ['stochD',       out.stochD.value,       raw.stoch.d],
      ['ichimokuConv', out.ichimokuConversionLine.value, raw.ichimoku.conversion],
      ['ichimokuBase', out.ichimokuBaseLine.value,       raw.ichimoku.base],
    ]

    for (const [name, resolved, series] of contract) {
      const expected = lastNonNull(series)
      expect(expected, `fixture is missing a real value for ${name}`).not.toBeNull()
      expect(resolved, `${name} did not map to its nested series' last value`).toBe(expected)
    }
  })

  it('every mapped scalar indicator is finite (no key resolved to null/undefined)', async () => {
    const out = await precomputedIndicatorsAPI.getTechnicalIndicators('AMD')
    const finiteFields = [
      out.parabolicSAR.value, out.obv.value, out.cci20.value, out.rsi14.value,
      out.adx14.value, out.macd.value, out.vwma20.value, out.superTrend.value,
      out.atr14.value, out.mfi14.value, out.cmf20.value, out.willr14.value,
      out.stochK.value, out.stochD.value
    ]
    for (const v of finiteFields) expect(Number.isFinite(v)).toBe(true)
  })

  it('rejects a symbol absent from the index (contract: unknown symbol is an error, not a blank)', async () => {
    await expect(precomputedIndicatorsAPI.getTechnicalIndicators('NOTREAL')).rejects.toThrow()
  })
})
