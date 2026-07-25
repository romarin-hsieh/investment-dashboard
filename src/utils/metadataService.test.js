/**
 * metadataService tests. Two layers:
 *  1. refreshMetadata — the dataFetcher → directMetadataLoader fallback
 *     (regression: directMetadataLoader was CALLED but never IMPORTED, so the
 *     fallback always threw ReferenceError and never actually loaded anything).
 *  2. Static-mode characterization (added for the JS→TS migration) — the symbol
 *     lookup ladder, batch lookup (exact + case-insensitive + default), the
 *     confidence-gated industry helpers, exchange defaults, and setBulkMetadata.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { metadataService } from './metadataService'
import { dataFetcher } from '@/lib/fetcher'
import { directMetadataLoader } from './directMetadataLoader'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // The singleton carries state across calls — reset the bits the methods read.
  metadataService._loadingPromise = null
  metadataService.lastAttempt = 0
  metadataService.metadata = null
  metadataService.useDynamicAPI = false
  metadataService.cache.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('metadataService.refreshMetadata — direct-loader fallback', () => {
  it('uses directMetadataLoader when dataFetcher fails (regression: it was never imported)', async () => {
    const directData = { items: [{ symbol: 'AAPL', sector: 'Technology' }] }
    vi.spyOn(dataFetcher, 'fetchMetadataSnapshot').mockRejectedValue(new Error('network down'))
    vi.spyOn(directMetadataLoader, 'loadMetadata').mockResolvedValue(directData)

    await metadataService.refreshMetadata()

    // Before the fix this path threw ReferenceError (directMetadataLoader undefined)
    // and metadata stayed null.
    expect(directMetadataLoader.loadMetadata).toHaveBeenCalledTimes(1)
    expect(metadataService.metadata).toEqual(directData)
  })

  it('uses the dataFetcher result on the happy path (no fallback)', async () => {
    const fetched = { data: { items: [{ symbol: 'NVDA', sector: 'Technology' }] } }
    vi.spyOn(dataFetcher, 'fetchMetadataSnapshot').mockResolvedValue(fetched)
    const loaderSpy = vi.spyOn(directMetadataLoader, 'loadMetadata')

    await metadataService.refreshMetadata()

    expect(metadataService.metadata).toEqual(fetched.data)
    expect(loaderSpy).not.toHaveBeenCalled()
  })
})

// Feed the static loader a known snapshot so the lookup paths are deterministic.
function mockSnapshot(items) {
  vi.spyOn(dataFetcher, 'fetchMetadataSnapshot').mockResolvedValue({ data: { items } })
}

describe('metadataService — static-mode getStaticSymbolMetadata', () => {
  it('returns the matching item and caches it', async () => {
    mockSnapshot([{ symbol: 'NVDA', sector: 'Technology', industry: 'Semiconductors', confidence: 0.9 }])
    const md = await metadataService.getStaticSymbolMetadata('NVDA')
    expect(md).toMatchObject({ symbol: 'NVDA', sector: 'Technology', industry: 'Semiconductors' })
    // second call is served from cache (no throw, same object shape)
    expect(await metadataService.getStaticSymbolMetadata('NVDA')).toMatchObject({ symbol: 'NVDA' })
  })

  it('returns a Static-File default for an unlisted symbol', async () => {
    mockSnapshot([{ symbol: 'NVDA', sector: 'Technology' }])
    const md = await metadataService.getStaticSymbolMetadata('ZZZZ')
    expect(md).toMatchObject({
      symbol: 'ZZZZ',
      sector: 'Unknown',
      industry: 'Unknown Industry',
      exchange: 'NASDAQ',
      confidence: 0.0,
      source: 'Static File (Default)',
      isLive: false
    })
  })
})

describe('metadataService — static-mode getBatchMetadata', () => {
  it('resolves exact + case-insensitive hits and defaults the misses', async () => {
    mockSnapshot([{ symbol: 'NVDA', sector: 'Technology', confidence: 0.9 }])
    const results = await metadataService.getBatchMetadata(['NVDA', 'nvda', 'ZZZZ'])
    expect(results.size).toBe(3)
    expect(results.get('NVDA')).toMatchObject({ sector: 'Technology' })
    expect(results.get('nvda')).toMatchObject({ sector: 'Technology' }) // case-insensitive fallback
    expect(results.get('ZZZZ')).toMatchObject({ sector: 'Unknown', source: 'Static File (Default)' })
  })
})

describe('metadataService — static-mode industry helpers', () => {
  it('getIndustryDisplay gates on the 0.7 confidence cutoff', () => {
    expect(metadataService.getIndustryDisplay({ industry: 'Semiconductors', confidence: 0.6 }))
      .toBe('Unknown Industry')
    expect(metadataService.getIndustryDisplay({ industry: 'Semiconductors', confidence: 0.9 }))
      .toBe('Semiconductors')
    expect(metadataService.getIndustryDisplay(null)).toBe('Unknown Industry')
  })

  it('getIndustryCategory maps known industries and defaults unknowns to "other"', () => {
    expect(metadataService.getIndustryCategory({ industry: 'Semiconductors', confidence: 0.9 }))
      .toBe('tech-hardware')
    expect(metadataService.getIndustryCategory({ industry: 'Made Up', confidence: 0.9 }))
      .toBe('other')
  })
})

describe('metadataService — mode + exchange + bulk helpers', () => {
  it('getCurrentMode reflects setUseDynamicAPI', () => {
    expect(metadataService.getCurrentMode()).toBe('static')
    metadataService.setUseDynamicAPI(true)
    expect(metadataService.getCurrentMode()).toBe('dynamic')
  })

  it('getDefaultExchange maps NYSE names and defaults the rest to NASDAQ', () => {
    expect(metadataService.getDefaultExchange('NVDA')).toBe('NASDAQ')
    expect(metadataService.getDefaultExchange('TSM')).toBe('NYSE')
    expect(metadataService.getDefaultExchange('ZZZZ')).toBe('NASDAQ')
  })

  it('setBulkMetadata injects items and warms the cache', () => {
    metadataService.setBulkMetadata([{ symbol: 'FOO', sector: 'X', confidence: 0.9 }])
    expect(metadataService.metadata.items).toHaveLength(1)
    expect(metadataService.getCacheStats()).toMatchObject({ mode: 'static', totalCached: 1 })
  })

  it('setBulkMetadata ignores a non-array argument', () => {
    metadataService.setBulkMetadata(null)
    expect(metadataService.metadata).toBeNull()
  })
})
