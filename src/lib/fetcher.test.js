/**
 * Tests for DataFetcher.fetchSystemStatus — the Tier-1 in-memory memo (ADR-0003).
 *
 * fetchSystemStatus is the prerequisite first step of every quotes/daily/metadata
 * read and re-runs on every page remount. The memo reuses a recent successful status
 * within a short TTL and dedupes concurrent callers, so navigation / repeat data
 * loads stop re-fetching the (uncacheable) status.json. These tests assert the memo
 * hit, in-flight dedup, TTL expiry, clearStatusCache(), and that failures aren't cached.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DataFetcher } from './fetcher'

// Minimal valid SystemStatus per SystemStatusSchema (src/utils/validation.ts).
const validStatus = {
  generated: '2026-06-18T02:00:00Z',
  date: '2026-06-18',
  status: 'ok',
  data_sources: {
    ohlcv: { exists: true, size: 1234, modified: '2026-06-18T02:00:00Z' }
  },
  update_info: {
    source: 'github-actions',
    workflow: 'daily-data-update',
    next_update: '2026-06-19T02:00:00Z',
    update_frequency: 'daily'
  },
  health_check: {
    all_systems: 'operational',
    last_check: '2026-06-18T02:00:00Z',
    issues: []
  },
  last_updated: '2026-06-18T02:00:00Z'
}

const okStatus = () => ({ ok: true, async json () { return validStatus } })

describe('DataFetcher.fetchSystemStatus — Tier-1 in-memory memo', () => {
  let fetcher

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetcher = new DataFetcher('')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches status.json on the first call (happy path)', async () => {
    global.fetch = vi.fn(async () => okStatus())

    const res = await fetcher.fetchSystemStatus()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(res.source).toBe('network')
    expect(res.data?.last_updated).toBe(validStatus.last_updated)
  })

  it('serves repeat calls within the TTL from memo without re-fetching', async () => {
    global.fetch = vi.fn(async () => okStatus())

    await fetcher.fetchSystemStatus()
    await fetcher.fetchSystemStatus()
    await fetcher.fetchSystemStatus()

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent callers into a single fetch', async () => {
    let calls = 0
    global.fetch = vi.fn(async () => {
      calls++
      await new Promise(r => setTimeout(r, 20))
      return okStatus()
    })

    const [a, b] = await Promise.all([
      fetcher.fetchSystemStatus(),
      fetcher.fetchSystemStatus()
    ])

    expect(calls).toBe(1)
    expect(a).toBe(b)
  })

  it('re-fetches once the memo TTL expires', async () => {
    global.fetch = vi.fn(async () => okStatus())
    const shortTtl = new DataFetcher('', true, 20) // 20 ms TTL

    await shortTtl.fetchSystemStatus()
    await new Promise(r => setTimeout(r, 40))
    await shortTtl.fetchSystemStatus()

    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('clearStatusCache() forces the next call to re-fetch', async () => {
    global.fetch = vi.fn(async () => okStatus())

    await fetcher.fetchSystemStatus()
    fetcher.clearStatusCache()
    await fetcher.fetchSystemStatus()

    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('does not memo a failed fetch, so a transient error does not stick', async () => {
    global.fetch = vi.fn(async () => { throw new Error('network down') })
    const failed = await fetcher.fetchSystemStatus()
    expect(failed.source).toBe('fallback')

    // Recovery: the next call must hit the network again (failure was not cached).
    global.fetch = vi.fn(async () => okStatus())
    const recovered = await fetcher.fetchSystemStatus()

    expect(recovered.source).toBe('network')
    expect(recovered.data?.last_updated).toBe(validStatus.last_updated)
    expect(global.fetch).toHaveBeenCalledTimes(1) // the fresh mock; failure used a separate mock
  })
})
