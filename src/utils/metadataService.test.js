/**
 * metadataService.refreshMetadata — the dataFetcher → directMetadataLoader
 * fallback (regression: directMetadataLoader was CALLED but never IMPORTED, so
 * the fallback always threw ReferenceError and never actually loaded anything).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { metadataService } from './metadataService'
import { dataFetcher } from '@/lib/fetcher'
import { directMetadataLoader } from './directMetadataLoader'

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // The singleton carries state across calls — reset the bits refreshMetadata reads.
  metadataService._loadingPromise = null
  metadataService.lastAttempt = 0
  metadataService.metadata = null
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
