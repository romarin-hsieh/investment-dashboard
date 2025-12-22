import { describe, it, expect } from 'vitest'

describe('Project Setup', () => {
  it('should have basic test framework working', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have fast-check available for property testing', async () => {
    const fc = await import('fast-check')
    expect(fc).toBeDefined()
    expect(typeof fc.integer).toBe('function')
  })
})
