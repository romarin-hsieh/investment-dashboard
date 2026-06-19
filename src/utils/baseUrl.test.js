/**
 * Tests for the data-base indirection added for the data-repo split (Stream ③-1).
 *
 * `withDataBase` / `getDataBaseUrl` let `public/data` move to a separate host via the
 * VITE_DATA_BASE_URL build env, while DEFAULTING to the app BASE_URL when unset (so this
 * change is a no-op until the data repo exists). Config paths stay on the app base.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { withBase, withDataBase, getDataBaseUrl, paths } from './baseUrl.js'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getDataBaseUrl / withDataBase', () => {
  it('falls back to the app BASE_URL when VITE_DATA_BASE_URL is unset (no-op default)', () => {
    // In the test env BASE_URL is '/', so the data base equals the app base.
    expect(getDataBaseUrl()).toBe('/')
    expect(withDataBase('data/ohlcv/AAPL.json')).toBe('/data/ohlcv/AAPL.json')
    expect(withDataBase('data/ohlcv/AAPL.json')).toBe(withBase('data/ohlcv/AAPL.json'))
  })

  it('uses VITE_DATA_BASE_URL when set, normalizing a missing trailing slash', () => {
    vi.stubEnv('VITE_DATA_BASE_URL', 'https://example.github.io/dash-data')
    expect(getDataBaseUrl()).toBe('https://example.github.io/dash-data/')
    expect(withDataBase('data/ohlcv/AAPL.json'))
      .toBe('https://example.github.io/dash-data/data/ohlcv/AAPL.json')
  })

  it('preserves an already-trailing-slash data base', () => {
    vi.stubEnv('VITE_DATA_BASE_URL', 'https://example.github.io/dash-data/')
    expect(getDataBaseUrl()).toBe('https://example.github.io/dash-data/')
  })

  it('strips leading slashes from the path', () => {
    vi.stubEnv('VITE_DATA_BASE_URL', 'https://cdn.example.com/')
    expect(withDataBase('/data/status.json')).toBe('https://cdn.example.com/data/status.json')
  })

  it('routes data paths through the data base but keeps config + package.json on the app base', () => {
    vi.stubEnv('VITE_DATA_BASE_URL', 'https://data.example.com/')
    expect(paths.ohlcv('aapl')).toBe('https://data.example.com/data/ohlcv/AAPL.json')
    expect(paths.status()).toBe('https://data.example.com/data/status.json')
    expect(paths.daily('2026-06-18')).toBe('https://data.example.com/data/daily/2026-06-18.json')
    // Config + package.json live in the app repo, so they stay on the app BASE_URL ('/').
    expect(paths.stocks()).toBe('/config/stocks.json')
    expect(paths.packageJson()).toBe('/package.json')
  })
})
