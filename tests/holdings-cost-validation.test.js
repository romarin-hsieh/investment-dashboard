/**
 * Property-Based Test: Holdings cost validation
 * 
 * Property 4: Holdings cost validation
 * For any average cost input, the system should accept only values greater than zero 
 * and reject zero, negative, or null values with appropriate validation messages
 * 
 * Validates: Requirements 3.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { StateManager } from '@/utils/state-manager'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('Property 4: Holdings Cost Validation', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should accept only positive average costs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Z0-9.-]+$/.test(s.toUpperCase())), // Valid symbol format
        fc.float({ min: Math.fround(0.01), max: Math.fround(10000) }), // Positive costs
        (symbol, avgCost) => {
          const result = StateManager.updateHolding(symbol.toUpperCase(), avgCost)
          
          // Should succeed for positive costs
          expect(result.success).toBe(true)
          expect(result.data?.holdings[symbol.toUpperCase()]).toEqual({
            avg_cost_usd: avgCost
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject zero and negative average costs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Z0-9.-]+$/.test(s.toUpperCase())), // Valid symbol format
        fc.oneof(
          fc.constant(0), // Zero
          fc.float({ min: Math.fround(-10000), max: Math.fround(-0.01) }) // Negative values
        ),
        (symbol, avgCost) => {
          const result = StateManager.updateHolding(symbol.toUpperCase(), avgCost)
          
          // Should fail for zero or negative costs
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
          expect(result.error?.message).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject null and undefined average costs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Z0-9.-]+$/.test(s.toUpperCase())), // Valid symbol format
        (symbol) => {
          // Test null
          const nullResult = StateManager.updateHolding(symbol.toUpperCase(), null)
          expect(nullResult.success).toBe(false)
          expect(nullResult.error).toBeDefined()

          // Test undefined
          const undefinedResult = StateManager.updateHolding(symbol.toUpperCase(), undefined)
          expect(undefinedResult.success).toBe(false)
          expect(undefinedResult.error).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject non-numeric average costs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Z0-9.-]+$/.test(s.toUpperCase())), // Valid symbol format
        fc.oneof(
          fc.string(),
          fc.boolean(),
          fc.object(),
          fc.array(fc.anything())
        ),
        (symbol, invalidCost) => {
          const result = StateManager.updateHolding(symbol.toUpperCase(), invalidCost)
          
          // Should fail for non-numeric costs
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle edge cases for positive costs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Z0-9.-]+$/.test(s.toUpperCase())), // Valid symbol format
        fc.oneof(
          fc.constant(0.01), // Minimum positive
          fc.constant(1000000), // Large but finite number
          fc.constant(1e-10), // Very small positive
          fc.float({ min: Math.fround(0.01), max: Math.fround(1) }) // Small positive range
        ),
        (symbol, avgCost) => {
          const result = StateManager.updateHolding(symbol.toUpperCase(), avgCost)
          
          // Should succeed for all positive edge cases
          expect(result.success).toBe(true)
          expect(result.data?.holdings[symbol.toUpperCase()].avg_cost_usd).toBe(avgCost)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle special numeric values correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Z0-9.-]+$/.test(s.toUpperCase())), // Valid symbol format
        fc.oneof(
          fc.constant(NaN),
          fc.constant(Infinity),
          fc.constant(-Infinity)
        ),
        (symbol, specialValue) => {
          const result = StateManager.updateHolding(symbol.toUpperCase(), specialValue)
          
          // Should fail for special numeric values
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve existing holdings when validation fails', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Z0-9.-]+$/.test(s.toUpperCase())), // Valid symbol format
        fc.float({ min: Math.fround(0.01), max: Math.fround(1000) }), // Valid initial cost
        fc.oneof(
          fc.constant(0),
          fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01) }),
          fc.constant(null),
          fc.constant(undefined)
        ), // Invalid update cost
        (symbol, validCost, invalidCost) => {
          // First, set a valid holding
          const initialResult = StateManager.updateHolding(symbol.toUpperCase(), validCost)
          expect(initialResult.success).toBe(true)
          
          // Then try to update with invalid cost
          const updateResult = StateManager.updateHolding(symbol.toUpperCase(), invalidCost)
          expect(updateResult.success).toBe(false)
          
          // Original holding should be preserved
          const currentState = StateManager.loadState()
          expect(currentState.holdings[symbol.toUpperCase()]).toEqual({
            avg_cost_usd: validCost
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should provide meaningful error messages for invalid costs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Z0-9.-]+$/.test(s.toUpperCase())), // Valid symbol format
        fc.oneof(
          fc.constant(0),
          fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01) })
        ),
        (symbol, invalidCost) => {
          const result = StateManager.updateHolding(symbol.toUpperCase(), invalidCost)
          
          expect(result.success).toBe(false)
          expect(result.error?.message).toBeDefined()
          expect(typeof result.error?.message).toBe('string')
          expect(result.error?.message.length).toBeGreaterThan(0)
          
          // Error message should be descriptive
          const message = result.error?.message.toLowerCase()
          expect(
            message.includes('cost') || 
            message.includes('positive') || 
            message.includes('greater') ||
            message.includes('zero')
          ).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})