/**
 * Baseline tests for NavigationService — happy + failure case per public method.
 *
 * Scope per WS-E PR-E3 audit-finding #2: services without .test.js sibling
 * get a regression net. Coverage targets the public surface used by
 * StockOverview.vue (scrollToSymbol, sanitizeSymbol, isSymbolValid,
 * getHeaderOffset). Implementation details (waitForScrollComplete polling)
 * are NOT tested directly — they're integration-shaped and would couple
 * tests to internals that are likely to be refactored.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NavigationService, navigationService } from './NavigationService.js'

beforeEach(() => {
  // Silence production console noise — NavigationService logs verbose
  // diagnostics for every scroll attempt.
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('sanitizeSymbol', () => {
  const svc = new NavigationService()

  it('preserves alphanumeric symbols unchanged', () => {
    expect(svc.sanitizeSymbol('AAPL')).toBe('AAPL')
    expect(svc.sanitizeSymbol('NVDA20')).toBe('NVDA20')
  })

  it('replaces dots and other special characters with underscores', () => {
    expect(svc.sanitizeSymbol('BRK.B')).toBe('BRK_B')
    expect(svc.sanitizeSymbol('BF.A')).toBe('BF_A')
    expect(svc.sanitizeSymbol('A-B C')).toBe('A_B_C')
  })

  it('preserves the empty string', () => {
    expect(svc.sanitizeSymbol('')).toBe('')
  })
})

describe('isSymbolValid', () => {
  const svc = new NavigationService()

  it('returns true when an element with id `sym-<sanitized>` exists', () => {
    const el = document.createElement('div')
    el.id = 'sym-AAPL'
    document.body.appendChild(el)

    expect(svc.isSymbolValid('AAPL')).toBe(true)
  })

  it('returns false when no matching element exists (failure path)', () => {
    expect(svc.isSymbolValid('NONEXISTENT')).toBe(false)
  })

  it('uses the sanitized id when looking up — `BRK.B` → `sym-BRK_B`', () => {
    const el = document.createElement('div')
    el.id = 'sym-BRK_B'
    document.body.appendChild(el)

    expect(svc.isSymbolValid('BRK.B')).toBe(true)
    // The un-sanitized id (`sym-BRK.B`) must NOT match.
    expect(document.getElementById('sym-BRK.B')).toBeNull()
  })
})

describe('getHeaderOffset', () => {
  const svc = new NavigationService()

  it('falls back to the default 80 when no header element is in the DOM', () => {
    expect(svc.getHeaderOffset()).toBe(80)
  })

  it('reads from a found header element + adds the 20 px gutter', () => {
    const header = document.createElement('header')
    header.style.height = '60px'
    document.body.appendChild(header)
    // jsdom doesn't compute layout, so spy on getBoundingClientRect.
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({
      height: 60, top: 0, bottom: 60, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON () {}
    })

    expect(svc.getHeaderOffset()).toBe(80) // 60 + 20
  })
})

describe('scrollToSymbol', () => {
  const svc = new NavigationService()

  it('returns silently when target element is missing (failure path — logs warn, no throw)', async () => {
    const scrollSpy = vi.fn()
    window.scrollTo = scrollSpy
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })

    await expect(svc.scrollToSymbol('NONEXISTENT', false)).resolves.toBeUndefined()
    expect(scrollSpy).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Element with ID "sym-NONEXISTENT" not found')
    )
  })

  it('calls window.scrollTo with computed top + sets focus on found element (happy path)', async () => {
    const target = document.createElement('div')
    target.id = 'sym-AAPL'
    target.tabIndex = 0
    Object.defineProperty(target, 'offsetTop', { value: 500 })
    document.body.appendChild(target)

    const scrollSpy = vi.fn()
    const focusSpy = vi.spyOn(target, 'focus')
    window.scrollTo = scrollSpy
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })

    await svc.scrollToSymbol('AAPL', false) // smooth=false → no waitForScrollComplete

    expect(scrollSpy).toHaveBeenCalledTimes(1)
    expect(scrollSpy.mock.calls[0][0]).toMatchObject({ behavior: 'instant' })
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
  })
})

describe('exports a singleton instance', () => {
  it('navigationService is a singleton instance of NavigationService', () => {
    expect(navigationService).toBeInstanceOf(NavigationService)
  })
})
