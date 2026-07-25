/**
 * Characterization tests for dynamicMetadataService — written BEFORE the
 * JS→TS migration to lock current behaviour (ADR-0014). They pin the branching
 * that a strict-typing pass could subtly disturb: the fetch → static-fallback
 * ladder, the confidence-bucket thresholds, the <0.7 industry-display cutoff,
 * the industry→CSS-class map, and the exchange defaults.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { dynamicMetadataService } from './dynamicMetadataService'
import { yahooFinanceAPI } from '@/api/yahooFinanceApi'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  dynamicMetadataService.clearCache()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('dynamicMetadataService.getDefaultExchange', () => {
  it('maps NASDAQ names, NYSE names (TSM/ORCL/RDW), and defaults unknowns to NASDAQ', () => {
    expect(dynamicMetadataService.getDefaultExchange('NVDA')).toBe('NASDAQ')
    expect(dynamicMetadataService.getDefaultExchange('TSM')).toBe('NYSE')
    expect(dynamicMetadataService.getDefaultExchange('ORCL')).toBe('NYSE')
    expect(dynamicMetadataService.getDefaultExchange('RDW')).toBe('NYSE')
    expect(dynamicMetadataService.getDefaultExchange('ZZZZ')).toBe('NASDAQ')
  })
})

describe('dynamicMetadataService.getIndustryDisplay', () => {
  it('returns "Unknown Industry" for null/undefined metadata', () => {
    expect(dynamicMetadataService.getIndustryDisplay(null)).toBe('Unknown Industry')
    expect(dynamicMetadataService.getIndustryDisplay(undefined)).toBe('Unknown Industry')
  })

  it('returns "Unknown Industry" when confidence < 0.7 (the cutoff)', () => {
    expect(dynamicMetadataService.getIndustryDisplay({ industry: 'Semiconductors', confidence: 0.69 }))
      .toBe('Unknown Industry')
    // 0.7 is inclusive (not < 0.7) → real industry shown
    expect(dynamicMetadataService.getIndustryDisplay({ industry: 'Semiconductors', confidence: 0.7 }))
      .toBe('Semiconductors')
  })

  it('falls back industry → sector → "Unknown Industry" when confidence is high enough', () => {
    expect(dynamicMetadataService.getIndustryDisplay({ industry: 'Database Software', confidence: 0.9 }))
      .toBe('Database Software')
    expect(dynamicMetadataService.getIndustryDisplay({ sector: 'Technology', confidence: 0.9 }))
      .toBe('Technology')
    expect(dynamicMetadataService.getIndustryDisplay({ confidence: 0.9 }))
      .toBe('Unknown Industry')
  })
})

describe('dynamicMetadataService.getIndustryCategory', () => {
  it('maps known industries to CSS classes and unknowns to "other"', () => {
    expect(dynamicMetadataService.getIndustryCategory({ industry: 'Semiconductors', confidence: 0.9 }))
      .toBe('tech-hardware')
    expect(dynamicMetadataService.getIndustryCategory({ industry: 'Aerospace & Defense', confidence: 0.9 }))
      .toBe('industrial-aerospace')
    expect(dynamicMetadataService.getIndustryCategory({ industry: 'Quantum Computing', confidence: 0.9 }))
      .toBe('tech-quantum')
    expect(dynamicMetadataService.getIndustryCategory({ industry: 'Made Up Industry', confidence: 0.9 }))
      .toBe('other')
  })

  it('low-confidence metadata resolves to "unknown" (via getIndustryDisplay)', () => {
    expect(dynamicMetadataService.getIndustryCategory({ industry: 'Semiconductors', confidence: 0.5 }))
      .toBe('unknown')
  })
})

describe('dynamicMetadataService.generateConfidenceDistribution', () => {
  it('buckets confidences at the >=0.90 / >=0.75 / >=0.50 thresholds', () => {
    const map = new Map([
      ['A', { confidence: 0.95 }],  // high
      ['B', { confidence: 0.90 }],  // high (inclusive)
      ['C', { confidence: 0.89 }],  // medium
      ['D', { confidence: 0.75 }],  // medium (inclusive)
      ['E', { confidence: 0.50 }],  // low (inclusive)
      ['F', { confidence: 0.10 }],  // unknown
      ['G', {}]                     // unknown (confidence || 0)
    ])
    expect(dynamicMetadataService.generateConfidenceDistribution(map)).toEqual({
      high_confidence_0_90: 2,
      medium_confidence_0_75: 2,
      low_confidence_0_50: 1,
      unknown_confidence: 2
    })
  })
})

describe('dynamicMetadataService.generateSectorGrouping', () => {
  it('groups symbols by sector, defaulting a missing sector to "Unknown"', () => {
    const map = new Map([
      ['NVDA', { sector: 'Technology' }],
      ['AVGO', { sector: 'Technology' }],
      ['TSLA', { sector: 'Consumer Cyclical' }],
      ['???', {}]
    ])
    expect(dynamicMetadataService.generateSectorGrouping(map)).toEqual({
      Technology: ['NVDA', 'AVGO'],
      'Consumer Cyclical': ['TSLA'],
      Unknown: ['???']
    })
  })
})

describe('dynamicMetadataService.createBatches', () => {
  it('splits an array into fixed-size chunks (last chunk may be short)', () => {
    expect(dynamicMetadataService.createBatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(dynamicMetadataService.createBatches([], 3)).toEqual([])
  })
})

describe('dynamicMetadataService.getStaticFallbackMetadata', () => {
  it('uses the static table for a known symbol and caches the result', () => {
    const md = dynamicMetadataService.getStaticFallbackMetadata('NVDA')
    expect(md).toMatchObject({
      symbol: 'NVDA',
      sector: 'Technology',
      industry: 'Semiconductors',
      confidence: 0.9,
      source: 'Static Fallback Data',
      isLive: false
    })
    expect(dynamicMetadataService.getCacheStats().totalCached).toBe(1)
  })

  it('returns an Unknown/0.0 shape for an unlisted symbol', () => {
    const md = dynamicMetadataService.getStaticFallbackMetadata('ZZZZ')
    expect(md).toMatchObject({
      symbol: 'ZZZZ',
      sector: 'Unknown',
      industry: 'Unknown Industry',
      confidence: 0.0,
      isLive: false
    })
  })
})

describe('dynamicMetadataService.getSymbolMetadata', () => {
  it('returns live metadata when the API succeeds with a real sector', async () => {
    vi.spyOn(yahooFinanceAPI, 'getStockInfo').mockResolvedValue({
      sector: 'Technology', industry: 'Semiconductors', marketCap: 3e12, confidence: 0.98
    })
    const md = await dynamicMetadataService.getSymbolMetadata('NVDA')
    expect(md).toMatchObject({
      symbol: 'NVDA',
      sector: 'Technology',
      industry: 'Semiconductors',
      confidence: 0.98,
      source: 'Yahoo Finance API (Live)',
      isLive: true
    })
  })

  it('falls back to static data when the API returns sector "Unknown"', async () => {
    vi.spyOn(yahooFinanceAPI, 'getStockInfo').mockResolvedValue({ sector: 'Unknown' })
    const md = await dynamicMetadataService.getSymbolMetadata('NVDA')
    expect(md).toMatchObject({ source: 'Static Fallback Data', sector: 'Technology', isLive: false })
  })

  it('falls back to static data when the API throws', async () => {
    vi.spyOn(yahooFinanceAPI, 'getStockInfo').mockRejectedValue(new Error('network down'))
    const md = await dynamicMetadataService.getSymbolMetadata('TSLA')
    expect(md).toMatchObject({
      source: 'Static Fallback Data',
      sector: 'Consumer Cyclical',
      industry: 'Auto Manufacturers',
      isLive: false
    })
  })

  it('serves the cache on the second call without re-fetching', async () => {
    const spy = vi.spyOn(yahooFinanceAPI, 'getStockInfo').mockResolvedValue({
      sector: 'Technology', industry: 'Semiconductors', confidence: 0.98
    })
    await dynamicMetadataService.getSymbolMetadata('NVDA')
    await dynamicMetadataService.getSymbolMetadata('NVDA')
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
