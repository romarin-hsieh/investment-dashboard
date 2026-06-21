import { describe, it, expect, afterEach } from 'vitest'
import { getTokenRgba } from './designTokens.js'

describe('getTokenRgba', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--t-hex')
    document.documentElement.style.removeProperty('--t-short')
    document.documentElement.style.removeProperty('--t-rgba')
  })

  it('converts a 6-digit hex token to rgba at the given alpha', () => {
    document.documentElement.style.setProperty('--t-hex', '#089981')
    expect(getTokenRgba('--t-hex', 0.3)).toBe('rgba(8, 153, 129, 0.3)')
  })

  it('expands a 3-digit hex token before converting', () => {
    document.documentElement.style.setProperty('--t-short', '#0a0')
    expect(getTokenRgba('--t-short', 1)).toBe('rgba(0, 170, 0, 1)')
  })

  it('passes a non-hex value (already rgb/rgba) through untouched', () => {
    document.documentElement.style.setProperty('--t-rgba', 'rgba(1, 2, 3, 0.5)')
    expect(getTokenRgba('--t-rgba', 0.3)).toBe('rgba(1, 2, 3, 0.5)')
  })

  it('returns an empty string for an undefined token', () => {
    expect(getTokenRgba('--does-not-exist', 0.3)).toBe('')
  })
})
