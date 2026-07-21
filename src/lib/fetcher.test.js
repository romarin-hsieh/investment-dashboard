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
import { StateManager } from '@/utils/state-manager'

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

// ===================================================================
// fetchDailySnapshot — cache short-circuit + smart backtracking (R4).
//
// The cache short-circuit compares the snapshot's own Taipei date
// (as_of_date_taipei) against today's Taipei date (audit R4), so the
// UTC-evening / Taipei-next-day window no longer misses a valid same-day
// cache. On a miss it fetches today's daily/{date}.json, backtracking up to
// 2 days on 404. StateManager is mocked so the cache slice is deterministic.
// ===================================================================

/** Today's Taipei date, computed exactly like DataFetcher.getTaipeiDateString(). */
const taipeiToday = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0]

/** Backtrack date math, mirroring the loop's new Date(target).setDate(-i). */
const minusDays = (dateStr, n) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

/** Minimal DailySnapshot that passes the real validateDailySnapshot (Zod). */
function validDailySnapshot (dateStr, generatedAt) {
  return {
    as_of_date_taipei: dateStr,
    generated_at_utc: generatedAt,
    universe: ['AAPL'],
    per_symbol: [{
      symbol: 'AAPL',
      short_brief_zh: '蘋果公司簡報',
      brief_truncated: false,
      brief_source: 'llm',
      news_top10: [],
      news_insufficient: false,
      gaps: []
    }],
    macro: {
      items: [{
        id: 'vix',
        value: 15.2,
        as_of: generatedAt,
        source_name: 'CBOE',
        quality_flag: 'good'
      }]
    }
  }
}

describe('DataFetcher.fetchDailySnapshot — cache short-circuit + backtracking (R4)', () => {
  let fetcher

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetcher = new DataFetcher('')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('cache HIT: cached as_of_date_taipei === today (Taipei) returns source:cache without fetching', async () => {
    const today = taipeiToday()
    const cached = validDailySnapshot(today, '2026-07-21T02:00:00Z')
    vi.spyOn(StateManager, 'loadState').mockReturnValue({ cache: { last_daily_snapshot: cached } })
    const updateSpy = vi.spyOn(StateManager, 'updateCache').mockReturnValue({ success: true })
    global.fetch = vi.fn()

    const res = await fetcher.fetchDailySnapshot()

    expect(res.source).toBe('cache')
    expect(res.data).toBe(cached)
    expect(global.fetch).not.toHaveBeenCalled() // short-circuited before any network
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('cache HIT across the UTC-evening window (the exact R4 case the fix targets)', async () => {
    // Snapshot generated late in the Taipei day → its UTC timestamp is still the
    // PREVIOUS UTC date. The old code split generated_at_utc and missed this
    // valid same-day cache; comparing as_of_date_taipei hits it. This test is the
    // one that distinguishes the fix from the old behaviour.
    const today = taipeiToday()
    const cached = validDailySnapshot(today, minusDays(today, 1) + 'T20:00:00Z')
    expect(cached.generated_at_utc.split('T')[0]).not.toBe(today) // precondition: UTC date differs from Taipei date
    vi.spyOn(StateManager, 'loadState').mockReturnValue({ cache: { last_daily_snapshot: cached } })
    vi.spyOn(StateManager, 'updateCache').mockReturnValue({ success: true })
    global.fetch = vi.fn()

    const res = await fetcher.fetchDailySnapshot()

    expect(res.source).toBe('cache')            // old code → miss → 'network'/'fallback'
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('cache MISS: cached as_of_date_taipei differs from today -> falls through to the network', async () => {
    const stale = validDailySnapshot('2020-01-01', '2020-01-01T02:00:00Z')
    vi.spyOn(StateManager, 'loadState').mockReturnValue({ cache: { last_daily_snapshot: stale } })
    const updateSpy = vi.spyOn(StateManager, 'updateCache').mockReturnValue({ success: true })

    const today = taipeiToday()
    const fresh = validDailySnapshot(today, '2026-07-21T02:00:00Z')
    global.fetch = vi.fn(async (url) => {
      const u = String(url)
      if (u.includes('/data/status.json')) return okStatus()
      if (u.includes(`/data/daily/${today}.json`)) return { ok: true, async json () { return fresh } }
      return { ok: false, status: 404 }
    })

    const res = await fetcher.fetchDailySnapshot()

    expect(res.source).toBe('network')
    expect(res.data).toEqual(fresh)
    expect(res.data.as_of_date_taipei).toBe(today)
    expect(updateSpy).toHaveBeenCalledWith({ last_daily_snapshot: fresh })
  })

  it('backtracks: today 404, yesterday valid -> returns source:network for yesterday', async () => {
    vi.spyOn(StateManager, 'loadState').mockReturnValue({ cache: {} })
    vi.spyOn(StateManager, 'updateCache').mockReturnValue({ success: true })

    const today = taipeiToday()
    const yesterday = minusDays(today, 1)
    const snap = validDailySnapshot(yesterday, '2026-07-20T02:00:00Z')
    global.fetch = vi.fn(async (url) => {
      const u = String(url)
      if (u.includes('/data/status.json')) return okStatus()
      if (u.includes(`/data/daily/${today}.json`)) return { ok: false, status: 404 }
      if (u.includes(`/data/daily/${yesterday}.json`)) return { ok: true, async json () { return snap } }
      return { ok: false, status: 404 }
    })

    const res = await fetcher.fetchDailySnapshot()

    expect(res.source).toBe('network')
    expect(res.data.as_of_date_taipei).toBe(yesterday)
    expect(res.as_of).toBe('2026-07-20T02:00:00Z')
  })

  it('all dates 404 with no usable cache: resolves to source:fallback / very_stale / data null (does not throw)', async () => {
    vi.spyOn(StateManager, 'loadState').mockReturnValue({ cache: {} })
    vi.spyOn(StateManager, 'updateCache').mockReturnValue({ success: true })
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/data/status.json')) return okStatus()
      return { ok: false, status: 404 } // every daily/{date}.json is 404
    })

    const res = await fetcher.fetchDailySnapshot()

    expect(res.source).toBe('fallback')
    expect(res.stale_level).toBe('very_stale')
    expect(res.data).toBeNull()
    expect(typeof res.error).toBe('string')
  })
})

// ===================================================================
// fetchQuotesSnapshot / fetchMetadataSnapshot — network success + cache
// fallback (R4 coverage). Same StateManager-mocked, fetch-dispatched style.
// ===================================================================

/** Minimal QuotesSnapshot that passes the real validateQuotesSnapshot (Zod). */
function validQuotesSnapshot (asOf) {
  return {
    as_of: asOf,
    provider: 'yahoo',
    items: [{
      symbol: 'AAPL',
      price_usd: 190.5,
      price_type: 'latest',
      market_state: 'open',
      is_delayed: false,
      stale_level: 'fresh',
      error: null
    }]
  }
}

/** Minimal MetadataSnapshot that passes the real validateMetadataSnapshot (Zod). */
function validMetadataSnapshot (asOf) {
  return {
    ttl_days: 30,
    as_of: asOf,
    items: [{
      symbol: 'AAPL',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      confidence: 0.9,
      sources: ['yahoo'],
      last_verified_at: asOf
    }]
  }
}

describe('DataFetcher.fetchQuotesSnapshot (R4 coverage)', () => {
  let fetcher

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetcher = new DataFetcher('')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('network success: validates latest.json, updates cache, returns source:network', async () => {
    vi.spyOn(StateManager, 'loadState').mockReturnValue({ cache: {} })
    const updateSpy = vi.spyOn(StateManager, 'updateCache').mockReturnValue({ success: true })
    const quotes = validQuotesSnapshot('2026-07-21T02:00:00Z')
    global.fetch = vi.fn(async (url) => {
      const u = String(url)
      if (u.includes('/data/status.json')) return okStatus()
      if (u.includes('/data/quotes/latest.json')) return { ok: true, async json () { return quotes } }
      return { ok: false, status: 404 }
    })

    const res = await fetcher.fetchQuotesSnapshot()

    expect(res.source).toBe('network')
    expect(res.data).toEqual(quotes)
    expect(updateSpy).toHaveBeenCalledWith({ last_quotes_snapshot: quotes })
  })

  it('network failure with a cached snapshot: returns source:cache from last_quotes_snapshot', async () => {
    const cached = validQuotesSnapshot('2026-07-20T02:00:00Z')
    vi.spyOn(StateManager, 'loadState').mockReturnValue({ cache: { last_quotes_snapshot: cached } })
    vi.spyOn(StateManager, 'updateCache').mockReturnValue({ success: true })
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/data/status.json')) return okStatus()
      return { ok: false, status: 500 } // latest.json fails
    })

    const res = await fetcher.fetchQuotesSnapshot()

    expect(res.source).toBe('cache')
    expect(res.data).toBe(cached)
    expect(typeof res.error).toBe('string')
  })
})

describe('DataFetcher.fetchMetadataSnapshot (R4 coverage)', () => {
  let fetcher

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetcher = new DataFetcher('')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('network success: parses + validates symbols_metadata.json (via text()), updates cache, source:network', async () => {
    vi.spyOn(StateManager, 'loadState').mockReturnValue({ cache: {} })
    const updateSpy = vi.spyOn(StateManager, 'updateCache').mockReturnValue({ success: true })
    const meta = validMetadataSnapshot('2026-07-21T02:00:00Z')
    global.fetch = vi.fn(async (url) => {
      const u = String(url)
      if (u.includes('/data/status.json')) return okStatus()
      if (u.includes('/data/symbols_metadata.json')) return { ok: true, async text () { return JSON.stringify(meta) } }
      return { ok: false, status: 404 }
    })

    const res = await fetcher.fetchMetadataSnapshot()

    expect(res.source).toBe('network')
    expect(res.data).toEqual(meta)
    expect(updateSpy).toHaveBeenCalledWith({ last_metadata: meta })
  })

  it('network failure with a cached snapshot: returns source:cache from last_metadata', async () => {
    const cached = validMetadataSnapshot('2026-07-20T02:00:00Z')
    vi.spyOn(StateManager, 'loadState').mockReturnValue({ cache: { last_metadata: cached } })
    vi.spyOn(StateManager, 'updateCache').mockReturnValue({ success: true })
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/data/status.json')) return okStatus()
      return { ok: false, status: 500, statusText: 'err' }
    })

    const res = await fetcher.fetchMetadataSnapshot()

    expect(res.source).toBe('cache')
    expect(res.data).toBe(cached)
  })
})
