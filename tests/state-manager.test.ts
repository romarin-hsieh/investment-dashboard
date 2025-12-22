import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StateManager } from '@/utils/state-manager'
import type { UserState } from '@/types'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
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

describe('StateManager', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('Default State Management', () => {
    it('should return default state when localStorage is empty', () => {
      const state = StateManager.loadState()
      
      expect(state.schema_version).toBe('1.0.0')
      expect(state.watchlist).toEqual([])
      expect(state.holdings).toEqual({})
      expect(state.settings.scraping_enabled).toBe(false)
      expect(state.settings.degradation_enabled).toBe(true)
      expect(state.settings.ga_enabled).toBe(false)
      expect(state.settings.clarity_enabled).toBe(false)
      expect(state.cache).toEqual({})
      expect(state.diagnostics).toEqual({})
    })

    it('should save and load state correctly', () => {
      const testState: UserState = {
        schema_version: '1.0.0',
        watchlist: ['ONDS', 'PL'],
        holdings: {
          'ONDS': { avg_cost_usd: 42.85 }
        },
        settings: {
          scraping_enabled: true,
          degradation_enabled: false,
          ga_enabled: true,
          clarity_enabled: false
        },
        cache: {},
        diagnostics: {}
      }

      const saveResult = StateManager.saveState(testState)
      expect(saveResult.success).toBe(true)

      const loadedState = StateManager.loadState()
      expect(loadedState).toEqual(testState)
    })

    it('should clear state correctly', () => {
      const testState: UserState = {
        schema_version: '1.0.0',
        watchlist: ['ONDS'],
        holdings: {},
        settings: {
          scraping_enabled: false,
          degradation_enabled: true,
          ga_enabled: false,
          clarity_enabled: false
        },
        cache: {},
        diagnostics: {}
      }

      StateManager.saveState(testState)
      StateManager.clearState()
      
      const loadedState = StateManager.loadState()
      expect(loadedState.watchlist).toEqual([])
    })
  })

  describe('Watchlist Management', () => {
    it('should add symbol to watchlist', () => {
      const result = StateManager.addToWatchlist('ONDS')
      expect(result.success).toBe(true)
      expect(result.data?.watchlist).toContain('ONDS')
    })

    it('should prevent duplicate symbols in watchlist', () => {
      StateManager.addToWatchlist('ONDS')
      const result = StateManager.addToWatchlist('ONDS')
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('DUPLICATE_SYMBOL')
    })

    it('should handle case-insensitive duplicates', () => {
      StateManager.addToWatchlist('ONDS')
      const result = StateManager.addToWatchlist('onds')
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('DUPLICATE_SYMBOL')
    })

    it('should remove symbol from watchlist', () => {
      StateManager.addToWatchlist('ONDS')
      StateManager.addToWatchlist('PL')
      
      const result = StateManager.removeFromWatchlist('ONDS')
      expect(result.success).toBe(true)
      expect(result.data?.watchlist).not.toContain('ONDS')
      expect(result.data?.watchlist).toContain('PL')
    })

    it('should update entire watchlist', () => {
      const newWatchlist = ['ONDS', 'PL', 'RKLB']
      const result = StateManager.updateWatchlist(newWatchlist)
      
      expect(result.success).toBe(true)
      expect(result.data?.watchlist).toEqual(newWatchlist)
    })
  })

  describe('Holdings Management', () => {
    it('should update holding with cost only', () => {
      const result = StateManager.updateHolding('ONDS', 42.85)
      
      expect(result.success).toBe(true)
      expect(result.data?.holdings['ONDS']).toEqual({
        avg_cost_usd: 42.85
      })
    })

    it('should update holding with cost and shares', () => {
      const result = StateManager.updateHolding('ONDS', 42.85, 100)
      
      expect(result.success).toBe(true)
      expect(result.data?.holdings['ONDS']).toEqual({
        avg_cost_usd: 42.85,
        shares: 100
      })
    })

    it('should normalize symbol case in holdings', () => {
      StateManager.updateHolding('onds', 42.85)
      const state = StateManager.loadState()
      
      expect(state.holdings['ONDS']).toBeDefined()
      expect(state.holdings['onds']).toBeUndefined()
    })

    it('should remove holding', () => {
      StateManager.updateHolding('ONDS', 42.85)
      StateManager.updateHolding('PL', 156.72)
      
      const result = StateManager.removeHolding('ONDS')
      expect(result.success).toBe(true)
      expect(result.data?.holdings['ONDS']).toBeUndefined()
      expect(result.data?.holdings['PL']).toBeDefined()
    })

    it('should reject invalid holding cost', () => {
      const result = StateManager.updateHolding('ONDS', -10)
      expect(result.success).toBe(false)
    })
  })

  describe('Settings Management', () => {
    it('should update individual settings', () => {
      const result = StateManager.updateSettings({
        scraping_enabled: true,
        ga_enabled: true
      })
      
      expect(result.success).toBe(true)
      expect(result.data?.settings.scraping_enabled).toBe(true)
      expect(result.data?.settings.ga_enabled).toBe(true)
      expect(result.data?.settings.degradation_enabled).toBe(true) // unchanged
    })

    it('should preserve other settings when updating', () => {
      StateManager.updateSettings({ scraping_enabled: true })
      const result = StateManager.updateSettings({ ga_enabled: true })
      
      expect(result.success).toBe(true)
      expect(result.data?.settings.scraping_enabled).toBe(true)
      expect(result.data?.settings.ga_enabled).toBe(true)
    })
  })

  describe('Cache Management', () => {
    it('should update cache data', () => {
      const cacheData = {
        last_quotes_snapshot: {
          as_of: '2025-01-22T10:00:00Z',
          provider: 'test',
          items: []
        }
      }
      
      const result = StateManager.updateCache(cacheData)
      expect(result.success).toBe(true)
      expect(result.data?.cache.last_quotes_snapshot).toBeDefined()
    })
  })

  describe('Import/Export', () => {
    it('should export state as JSON', () => {
      const testState: UserState = {
        schema_version: '1.0.0',
        watchlist: ['ONDS'],
        holdings: { 'ONDS': { avg_cost_usd: 42.85 } },
        settings: {
          scraping_enabled: false,
          degradation_enabled: true,
          ga_enabled: false,
          clarity_enabled: false
        },
        cache: {},
        diagnostics: {}
      }
      
      StateManager.saveState(testState)
      const exported = StateManager.exportState()
      const parsed = JSON.parse(exported)
      
      expect(parsed.watchlist).toEqual(['ONDS'])
      expect(parsed.holdings['ONDS'].avg_cost_usd).toBe(42.85)
    })

    it('should import valid state', () => {
      const importData = {
        schema_version: '1.0.0',
        watchlist: ['PL', 'RKLB'],
        holdings: { 'PL': { avg_cost_usd: 156.72 } },
        settings: {
          scraping_enabled: true,
          degradation_enabled: false,
          ga_enabled: true,
          clarity_enabled: false
        },
        cache: {},
        diagnostics: {}
      }
      
      const result = StateManager.importState(JSON.stringify(importData))
      expect(result.success).toBe(true)
      
      const state = StateManager.loadState()
      expect(state.watchlist).toEqual(['PL', 'RKLB'])
      expect(state.settings.scraping_enabled).toBe(true)
    })

    it('should perform dry run import without saving', () => {
      const originalState = StateManager.loadState()
      
      const importData = {
        schema_version: '1.0.0',
        watchlist: ['TEST'],
        holdings: {},
        settings: {
          scraping_enabled: false,
          degradation_enabled: true,
          ga_enabled: false,
          clarity_enabled: false
        },
        cache: {},
        diagnostics: {}
      }
      
      const result = StateManager.importState(JSON.stringify(importData), true)
      expect(result.success).toBe(true)
      
      const currentState = StateManager.loadState()
      expect(currentState).toEqual(originalState) // Should be unchanged
    })

    it('should reject import with unknown keys', () => {
      const invalidData = {
        schema_version: '1.0.0',
        watchlist: [],
        holdings: {},
        settings: {
          scraping_enabled: false,
          degradation_enabled: true,
          ga_enabled: false,
          clarity_enabled: false
        },
        cache: {},
        diagnostics: {},
        unknown_field: 'invalid'
      }
      
      const result = StateManager.importState(JSON.stringify(invalidData))
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('UNKNOWN_KEYS')
    })

    it('should reject invalid JSON', () => {
      const result = StateManager.importState('invalid json')
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Invalid JSON')
    })
  })

  describe('Diagnostics', () => {
    it('should record import result', () => {
      const importResult = {
        timestamp: '2025-01-22T10:00:00Z',
        success: true,
        changes_applied: 5,
        dry_run: false
      }
      
      const result = StateManager.recordImportResult(importResult)
      expect(result.success).toBe(true)
      expect(result.data?.diagnostics.last_import_result).toEqual(importResult)
    })
  })

  describe('Schema Migration', () => {
    it('should handle missing schema version', () => {
      const oldState = {
        watchlist: ['ONDS'],
        holdings: {},
        settings: {
          scraping_enabled: false,
          degradation_enabled: true,
          ga_enabled: false,
          clarity_enabled: false
        }
        // Missing schema_version, cache, diagnostics
      }
      
      localStorageMock.setItem('investment-dashboard-state', JSON.stringify(oldState))
      
      const state = StateManager.loadState()
      expect(state.schema_version).toBe('1.0.0')
      expect(state.cache).toEqual({})
      expect(state.diagnostics).toEqual({})
    })

    it('should handle missing settings fields', () => {
      const partialState = {
        schema_version: '1.0.0',
        watchlist: [],
        holdings: {},
        settings: {
          scraping_enabled: true
          // Missing other settings
        },
        cache: {},
        diagnostics: {}
      }
      
      localStorageMock.setItem('investment-dashboard-state', JSON.stringify(partialState))
      
      const state = StateManager.loadState()
      expect(state.settings.scraping_enabled).toBe(true)
      expect(state.settings.degradation_enabled).toBe(true) // default
      expect(state.settings.ga_enabled).toBe(false) // default
      expect(state.settings.clarity_enabled).toBe(false) // default
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded')
      })
      
      const testState: UserState = {
        schema_version: '1.0.0',
        watchlist: [],
        holdings: {},
        settings: {
          scraping_enabled: false,
          degradation_enabled: true,
          ga_enabled: false,
          clarity_enabled: false
        },
        cache: {},
        diagnostics: {}
      }
      
      const result = StateManager.saveState(testState)
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Failed to save state')
    })

    it('should handle corrupted localStorage data', () => {
      localStorageMock.setItem('investment-dashboard-state', 'corrupted json')
      
      const state = StateManager.loadState()
      expect(state.watchlist).toEqual([]) // Should return default state
    })

    it('should handle invalid state structure', () => {
      const invalidState = {
        schema_version: '1.0.0',
        watchlist: 'not an array',
        holdings: 'not an object'
      }
      
      localStorageMock.setItem('investment-dashboard-state', JSON.stringify(invalidState))
      
      const state = StateManager.loadState()
      expect(state.watchlist).toEqual([]) // Should return default state
    })
  })

  describe('Utility Methods', () => {
    it('should return current schema version', () => {
      expect(StateManager.getCurrentSchemaVersion()).toBe('1.0.0')
    })

    it('should check localStorage availability', () => {
      expect(StateManager.isStorageAvailable()).toBe(true)
    })

    it('should handle localStorage unavailability', () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorageMock.setItem
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage not available')
      })
      
      expect(StateManager.isStorageAvailable()).toBe(false)
      
      // Restore original implementation
      localStorageMock.setItem.mockImplementation(originalSetItem)
    })
  })
})