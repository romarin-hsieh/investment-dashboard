/**
 * StateManager — resilience of user state against cache-schema drift
 * (WS-I PR1, the audit's only CRITICAL: silent watchlist/holdings loss).
 *
 * UserStateSchema embeds the full DailySnapshot/Quotes/Metadata schemas inside
 * `cache`. Those tighten over time and the cache holds real fetched snapshots,
 * so an older cached snapshot can stop validating — and whole-object validation
 * then discarded the ENTIRE state, wiping the portfolio on next load. These
 * tests pin the fix: a bad cache slice is dropped; watchlist/holdings survive.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StateManager } from './state-manager'

const KEY = 'investment-dashboard-state'

function validState (overrides = {}) {
  return {
    schema_version: '1.0.0',
    watchlist: ['AMD', 'NVDA'],
    holdings: { AMD: { avg_cost_usd: 100, shares: 10 } },
    settings: { scraping_enabled: false, degradation_enabled: true, ga_enabled: false, clarity_enabled: false },
    cache: {},
    diagnostics: {},
    ...overrides
  }
}

const store = (obj) => localStorage.setItem(KEY, JSON.stringify(obj))

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  localStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('StateManager.loadState — cache-drift resilience (CRITICAL)', () => {
  it('preserves watchlist + holdings when only the cached snapshot is invalid', () => {
    // A stale/tightened daily snapshot that no longer validates (macro.items
    // must be non-empty, and required fields are missing).
    store(validState({ cache: { last_daily_snapshot: { macro: { items: [] } } } }))

    const s = StateManager.loadState()

    expect(s.watchlist).toEqual(['AMD', 'NVDA'])                 // was wiped to [] before the fix
    expect(s.holdings.AMD).toEqual({ avg_cost_usd: 100, shares: 10 })
    expect(s.cache).toEqual({})                                 // only the bad slice dropped
  })

  it('keeps a VALID cache intact', () => {
    // Empty cache is valid; loadState must not touch it.
    store(validState({ cache: {} }))
    expect(StateManager.loadState().cache).toEqual({})
    expect(StateManager.loadState().watchlist).toEqual(['AMD', 'NVDA'])
  })

  it('still falls back to defaults when the USER data itself is invalid', () => {
    // A malformed symbol fails the watchlist regex — that is genuinely-invalid
    // user data, not a cache problem, so defaults are correct here.
    store(validState({ watchlist: ['bad symbol!'] }))
    expect(StateManager.loadState().watchlist).toEqual([])
  })

  it('returns defaults for no stored state and for corrupt JSON', () => {
    expect(StateManager.loadState().watchlist).toEqual([])
    localStorage.setItem(KEY, '{not json')
    expect(StateManager.loadState().watchlist).toEqual([])
  })
})

describe('StateManager.importState', () => {
  it('round-trips through exportState without losing the portfolio', () => {
    store(validState())
    const exported = StateManager.exportState()
    localStorage.clear()

    const result = StateManager.importState(exported)

    expect(result.success).toBe(true)
    expect(result.data.watchlist).toEqual(['AMD', 'NVDA'])
    expect(result.data.holdings.AMD.avg_cost_usd).toBe(100)
  })

  it('rejects unknown top-level keys', () => {
    const result = StateManager.importState(JSON.stringify({ ...validState(), evil: true }))
    expect(result.success).toBe(false)
    expect(result.error.code).toBe('UNKNOWN_KEYS')
  })

  it('imports valid user data even when the cache slice is stale (drops the cache)', () => {
    const result = StateManager.importState(
      JSON.stringify(validState({ cache: { last_daily_snapshot: { macro: { items: [] } } } }))
    )
    expect(result.success).toBe(true)
    expect(result.data.watchlist).toEqual(['AMD', 'NVDA'])
    expect(result.data.cache).toEqual({})
    // and it persisted the cache-dropped state
    expect(StateManager.loadState().watchlist).toEqual(['AMD', 'NVDA'])
  })

  it('rejects invalid JSON', () => {
    expect(StateManager.importState('{nope').success).toBe(false)
  })
})

describe('StateManager — save / mutate / clear', () => {
  it('saveState → loadState round-trips a valid state', () => {
    const res = StateManager.saveState(validState({ watchlist: ['TSLA'] }))
    expect(res.success).toBe(true)
    expect(StateManager.loadState().watchlist).toEqual(['TSLA'])
  })

  it('addToWatchlist / removeFromWatchlist normalize + dedupe', () => {
    StateManager.saveState(validState({ watchlist: [] }))
    expect(StateManager.addToWatchlist('tsla').success).toBe(true)
    expect(StateManager.loadState().watchlist).toEqual(['TSLA'])
    expect(StateManager.addToWatchlist('TSLA').success).toBe(false)   // duplicate
    StateManager.removeFromWatchlist('tsla')
    expect(StateManager.loadState().watchlist).toEqual([])
  })

  it('updateHolding / removeHolding round-trip', () => {
    StateManager.saveState(validState({ holdings: {} }))
    StateManager.updateHolding('nvda', 500, 3)
    expect(StateManager.loadState().holdings.NVDA).toEqual({ avg_cost_usd: 500, shares: 3 })
    StateManager.removeHolding('nvda')
    expect(StateManager.loadState().holdings.NVDA).toBeUndefined()
  })

  it('clearState empties storage', () => {
    StateManager.saveState(validState())
    StateManager.clearState()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(StateManager.loadState().watchlist).toEqual([])
  })

  it('reports storage availability', () => {
    expect(StateManager.isStorageAvailable()).toBe(true)
  })
})
