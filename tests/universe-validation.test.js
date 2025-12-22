import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * **Feature: investment-dashboard, Property 3: Universe symbol validation**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 * 
 * For any symbol input, the system should accept only symbols that exist in the Universe allowlist,
 * are properly formatted (trimmed, ≤10 chars, [A-Z0-9.-]), and are not duplicates (case-insensitive)
 */

// Load Universe configuration
const universeConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/config/universe.json'), 'utf8')
)
const UNIVERSE_SYMBOLS = universeConfig.symbols

// Symbol validation functions (these would be implemented in the actual application)
function isValidSymbolFormat(symbol) {
  if (typeof symbol !== 'string') return false
  if (symbol !== symbol.trim()) return false // Must be trimmed (Requirement 2.3)
  if (symbol.length === 0 || symbol.length > 10) return false // Length constraint (Requirement 2.3)
  return /^[A-Z0-9.-]+$/.test(symbol) // Character constraint (Requirement 2.3)
}

function isInUniverse(symbol) {
  return UNIVERSE_SYMBOLS.includes(symbol.toUpperCase()) // Requirement 2.1
}

function isDuplicate(symbol, existingSymbols) {
  const normalizedSymbol = symbol.toUpperCase()
  const normalizedExisting = existingSymbols.map(s => s.toUpperCase())
  return normalizedExisting.includes(normalizedSymbol) // Case-insensitive (Requirement 2.4)
}

function validateSymbolInput(symbol, existingWatchlist = []) {
  // Requirements 2.3: Format validation
  if (!isValidSymbolFormat(symbol)) {
    return {
      valid: false,
      error: 'Invalid symbol format: must be trimmed, ≤10 chars, [A-Z0-9.-]'
    }
  }

  // Requirements 2.1: Universe allowlist validation
  if (!isInUniverse(symbol)) {
    return {
      valid: false,
      error: 'Not supported in POC Universe' // Requirement 2.2
    }
  }

  // Requirements 2.4: Duplicate validation (case-insensitive)
  if (isDuplicate(symbol, existingWatchlist)) {
    return {
      valid: false,
      error: 'Symbol already exists in watchlist'
    }
  }

  return { valid: true, error: null }
}

describe('Universe Symbol Validation Properties', () => {
  describe('Property 3: Universe symbol validation', () => {
    it('should accept all valid Universe symbols when properly formatted', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...UNIVERSE_SYMBOLS),
          (symbol) => {
            const result = validateSymbolInput(symbol)
            expect(result.valid).toBe(true)
            expect(result.error).toBe(null)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject symbols not in Universe allowlist', () => {
      // Test with common stock symbols that are not in our Universe
      const nonUniverseSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...nonUniverseSymbols),
          (symbol) => {
            const result = validateSymbolInput(symbol)
            expect(result.valid).toBe(false)
            expect(result.error).toBe('Not supported in POC Universe')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject symbols with invalid format - length and trimming', () => {
      const invalidSymbols = [
        '', // Empty
        'TOOLONGSYMBOL', // Too long (>10 chars)
        ' ONDS', // Leading space
        'ONDS ', // Trailing space
        ' ONDS ', // Both spaces
      ]
      
      invalidSymbols.forEach(symbol => {
        const result = validateSymbolInput(symbol)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid symbol format')
      })
    })

    it('should reject symbols with invalid characters', () => {
      const invalidCharSymbols = [
        'abc', // Lowercase
        'SYM BOL', // Space
        'SYM@BOL', // Special char
        'SYM_BOL', // Underscore
        'SYM+BOL', // Plus
      ]
      
      invalidCharSymbols.forEach(symbol => {
        const result = validateSymbolInput(symbol)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid symbol format')
      })
    })

    it('should reject duplicate symbols case-insensitively', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...UNIVERSE_SYMBOLS),
          (symbol) => {
            // Test exact duplicate
            const result = validateSymbolInput(symbol, [symbol])
            expect(result.valid).toBe(false)
            expect(result.error).toBe('Symbol already exists in watchlist')
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should validate complete watchlist scenarios', () => {
      fc.assert(
        fc.property(
          fc.subarray(UNIVERSE_SYMBOLS, { minLength: 1, maxLength: 5 }),
          fc.constantFrom(...UNIVERSE_SYMBOLS),
          (existingWatchlist, newSymbol) => {
            const result = validateSymbolInput(newSymbol, existingWatchlist)
            
            if (existingWatchlist.map(s => s.toUpperCase()).includes(newSymbol.toUpperCase())) {
              // Should be rejected as duplicate
              expect(result.valid).toBe(false)
              expect(result.error).toBe('Symbol already exists in watchlist')
            } else {
              // Should be accepted (valid Universe symbol, not duplicate)
              expect(result.valid).toBe(true)
              expect(result.error).toBe(null)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge cases with special characters in Universe', () => {
      // Test symbols that contain dots or hyphens (if any exist in Universe)
      const specialCharSymbols = UNIVERSE_SYMBOLS.filter(s => /[.-]/.test(s))
      
      if (specialCharSymbols.length > 0) {
        specialCharSymbols.forEach(symbol => {
          const result = validateSymbolInput(symbol)
          expect(result.valid).toBe(true)
          expect(result.error).toBe(null)
        })
      } else {
        // If no special chars in current Universe, test that they would be accepted if they were
        const testSymbol = 'TEST.A' // Hypothetical symbol with dot
        if (isValidSymbolFormat(testSymbol)) {
          // Format is valid, but not in Universe
          const result = validateSymbolInput(testSymbol)
          expect(result.valid).toBe(false)
          expect(result.error).toBe('Not supported in POC Universe')
        }
      }
    })
  })

  describe('Universe Configuration Validation', () => {
    it('should have exactly 10 symbols in Universe', () => {
      expect(UNIVERSE_SYMBOLS).toHaveLength(10)
    })

    it('should have all Universe symbols properly formatted', () => {
      UNIVERSE_SYMBOLS.forEach(symbol => {
        expect(isValidSymbolFormat(symbol)).toBe(true)
      })
    })

    it('should have no duplicate symbols in Universe (case-insensitive)', () => {
      const upperCaseSymbols = UNIVERSE_SYMBOLS.map(s => s.toUpperCase())
      const uniqueSymbols = [...new Set(upperCaseSymbols)]
      expect(uniqueSymbols).toHaveLength(UNIVERSE_SYMBOLS.length)
    })

    it('should contain the expected symbols', () => {
      const expectedSymbols = ['ONDS', 'PL', 'RKLB', 'ASTS', 'RIVN', 'MDB', 'ORCL', 'TSM', 'AVAV', 'RDW']
      expect(UNIVERSE_SYMBOLS.sort()).toEqual(expectedSymbols.sort())
    })
  })
})