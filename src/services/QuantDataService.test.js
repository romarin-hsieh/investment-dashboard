/**
 * Baseline tests for QuantDataService — happy + failure case per public method.
 *
 * Scope per WS-E PR-E3 audit-finding #2. The service is a fetch-cached
 * singleton: getData() fetches `dashboard_status.json` once per
 * CACHE_DURATION (5 min) and dedupes concurrent requests via an in-flight
 * promise. getTickerData() reads from the cache.
 *
 * Tests use vi.resetModules() to force a fresh singleton per case so cache
 * state from one test doesn't leak into the next.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

let module

beforeEach(async () => {
  vi.resetModules()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  module = await import('./QuantDataService.js')
})

afterEach(() => {
  vi.restoreAllMocks()
})

const sampleData = {
  generatedAt: '2026-04-26T00:00:00Z',
  data: [
    { ticker: 'SPY', signal: 'hold', price: 510 },
    { ticker: 'QQQ', signal: 'dip_buy', price: 420 }
  ]
}

describe('QuantDataService.getData', () => {
  it('fetches and returns parsed data on first call (happy path)', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      async json () { return sampleData }
    }))

    const result = await module.quantDataService.getData()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ data: expect.any(Array) })
    expect(result.data).toHaveLength(2)
    expect(result.data[0].ticker).toBe('SPY')
  })

  it('serves the second call from cache without re-fetching', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      async json () { return sampleData }
    }))

    await module.quantDataService.getData()
    await module.quantDataService.getData()

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('throws and clears in-flight promise on network failure (failure path)', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('Network down')
    })

    await expect(module.quantDataService.getData()).rejects.toThrow('Network down')
    // After rejection, fetchPromise should be cleared so a retry can fire
    // a fresh fetch instead of returning the rejected promise forever.
    expect(module.quantDataService.fetchPromise).toBeNull()
  })

  it('throws on non-ok HTTP response and clears in-flight promise', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500 }))

    await expect(module.quantDataService.getData()).rejects.toThrow(/Network response/)
    expect(module.quantDataService.fetchPromise).toBeNull()
  })

  it('deduplicates concurrent calls into a single fetch', async () => {
    let callCount = 0
    global.fetch = vi.fn(async () => {
      callCount++
      // Force overlap by delaying the resolution
      await new Promise(r => setTimeout(r, 20))
      return { ok: true, async json () { return sampleData } }
    })

    const [a, b] = await Promise.all([
      module.quantDataService.getData(),
      module.quantDataService.getData()
    ])

    expect(callCount).toBe(1)
    expect(a).toBe(b) // same frozen object reference
  })
})

describe('QuantDataService.getTickerData', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      async json () { return sampleData }
    }))
  })

  it('finds an exact ticker match (happy path)', async () => {
    const result = await module.quantDataService.getTickerData('SPY')
    expect(result).toMatchObject({ ticker: 'SPY', signal: 'hold' })
  })

  it('matches case-insensitively (lowercase input → uppercase ticker)', async () => {
    const result = await module.quantDataService.getTickerData('qqq')
    expect(result).toMatchObject({ ticker: 'QQQ' })
  })

  it('returns undefined when ticker is not in the dataset (failure path)', async () => {
    const result = await module.quantDataService.getTickerData('NONEXISTENT')
    expect(result).toBeUndefined()
  })
})
