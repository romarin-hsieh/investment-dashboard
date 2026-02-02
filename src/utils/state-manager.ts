/**
 * StateManager for localStorage-based user state management
 * Handles schema versioning, migration, and validation
 */

import type { UserState, ValidationResult } from '@/types'
import { validateUserState, validateImportData } from './validation'

export class StateManager {
  private static readonly STORAGE_KEY = 'investment-dashboard-state'
  private static readonly CURRENT_SCHEMA_VERSION = '1.0.0'
  
  private static readonly DEFAULT_STATE: UserState = {
    schema_version: StateManager.CURRENT_SCHEMA_VERSION,
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

  /**
   * Load user state from localStorage with validation and migration
   */
  static loadState(): UserState {
    try {
      const stored = localStorage.getItem(StateManager.STORAGE_KEY)
      if (!stored) {
        return { ...StateManager.DEFAULT_STATE }
      }

      const parsed = JSON.parse(stored)
      const migrated = StateManager.migrateState(parsed)
      const validation = validateUserState(migrated)
      
      if (validation.success && validation.data) {
        return validation.data
      } else {
        console.warn('Invalid state in localStorage, using defaults:', validation.error)
        return { ...StateManager.DEFAULT_STATE }
      }
    } catch (error) {
      console.error('Failed to load state from localStorage:', error)
      return { ...StateManager.DEFAULT_STATE }
    }
  }

  /**
   * Save user state to localStorage with validation
   */
  static saveState(state: UserState): ValidationResult<UserState> {
    const validation = validateUserState(state)
    if (!validation.success) {
      return validation
    }

    try {
      localStorage.setItem(StateManager.STORAGE_KEY, JSON.stringify(state))
      return { success: true, data: state }
    } catch (error) {
      return {
        success: false,
        error: {
          message: 'Failed to save state to localStorage',
          details: { error: String(error) }
        }
      }
    }
  }

  /**
   * Clear all user state from localStorage
   */
  static clearState(): void {
    localStorage.removeItem(StateManager.STORAGE_KEY)
  }

  /**
   * Export user state as JSON string
   */
  static exportState(): string {
    const state = StateManager.loadState()
    return JSON.stringify(state, null, 2)
  }

  /**
   * Import user state from JSON string with validation
   */
  static importState(jsonData: string, dryRun: boolean = false): ValidationResult<UserState> {
    try {
      const parsed = JSON.parse(jsonData)
      const validation = validateImportData(parsed)
      
      if (!validation.success) {
        return validation
      }

      const migrated = StateManager.migrateState(validation.data!)
      const finalValidation = validateUserState(migrated)
      
      if (!finalValidation.success) {
        return finalValidation
      }

      if (!dryRun) {
        const saveResult = StateManager.saveState(finalValidation.data!)
        if (!saveResult.success) {
          return saveResult
        }
      }

      return { success: true, data: finalValidation.data }
    } catch (error) {
      return {
        success: false,
        error: {
          message: 'Invalid JSON format',
          details: { error: String(error) }
        }
      }
    }
  }

  /**
   * Update watchlist with validation
   */
  static updateWatchlist(symbols: string[]): ValidationResult<UserState> {
    const currentState = StateManager.loadState()
    const newState: UserState = {
      ...currentState,
      watchlist: symbols
    }
    return StateManager.saveState(newState)
  }

  /**
   * Add symbol to watchlist
   */
  static addToWatchlist(symbol: string): ValidationResult<UserState> {
    const currentState = StateManager.loadState()
    if (currentState.watchlist.includes(symbol.toUpperCase())) {
      return {
        success: false,
        error: {
          message: 'Symbol already in watchlist',
          code: 'DUPLICATE_SYMBOL'
        }
      }
    }

    const newWatchlist = [...currentState.watchlist, symbol.toUpperCase()]
    return StateManager.updateWatchlist(newWatchlist)
  }

  /**
   * Remove symbol from watchlist
   */
  static removeFromWatchlist(symbol: string): ValidationResult<UserState> {
    const currentState = StateManager.loadState()
    const newWatchlist = currentState.watchlist.filter(s => s !== symbol.toUpperCase())
    return StateManager.updateWatchlist(newWatchlist)
  }

  /**
   * Update holdings for a symbol
   */
  static updateHolding(symbol: string, avgCost: number, shares?: number): ValidationResult<UserState> {
    const currentState = StateManager.loadState()
    const newState: UserState = {
      ...currentState,
      holdings: {
        ...currentState.holdings,
        [symbol.toUpperCase()]: {
          avg_cost_usd: avgCost,
          ...(shares !== undefined && { shares })
        }
      }
    }
    return StateManager.saveState(newState)
  }

  /**
   * Remove holding for a symbol
   */
  static removeHolding(symbol: string): ValidationResult<UserState> {
    const currentState = StateManager.loadState()
    const newHoldings = { ...currentState.holdings }
    delete newHoldings[symbol.toUpperCase()]
    
    const newState: UserState = {
      ...currentState,
      holdings: newHoldings
    }
    return StateManager.saveState(newState)
  }

  /**
   * Update user settings
   */
  static updateSettings(settings: Partial<UserState['settings']>): ValidationResult<UserState> {
    const currentState = StateManager.loadState()
    const newState: UserState = {
      ...currentState,
      settings: {
        ...currentState.settings,
        ...settings
      }
    }
    return StateManager.saveState(newState)
  }

  /**
   * Update cache data
   */
  static updateCache(cache: Partial<UserState['cache']>): ValidationResult<UserState> {
    const currentState = StateManager.loadState()
    const newState: UserState = {
      ...currentState,
      cache: {
        ...currentState.cache,
        ...cache
      }
    }
    return StateManager.saveState(newState)
  }

  /**
   * Record import result in diagnostics
   */
  static recordImportResult(result: UserState['diagnostics']['last_import_result']): ValidationResult<UserState> {
    const currentState = StateManager.loadState()
    const newState: UserState = {
      ...currentState,
      diagnostics: {
        ...currentState.diagnostics,
        last_import_result: result
      }
    }
    return StateManager.saveState(newState)
  }

  /**
   * Migrate state from older schema versions
   */
  private static migrateState(state: any): UserState {
    // Handle missing schema_version (assume v1.0.0)
    if (!state.schema_version) {
      state.schema_version = '1.0.0'
    }

    // Future migrations would go here
    // Example:
    // if (state.schema_version === '1.0.0') {
    //   // Migrate to 1.1.0
    //   state = migrateFrom1_0_0To1_1_0(state)
    // }

    // Ensure all required fields exist with defaults
    const migrated: UserState = {
      schema_version: StateManager.CURRENT_SCHEMA_VERSION,
      watchlist: state.watchlist || [],
      holdings: state.holdings || {},
      settings: {
        scraping_enabled: state.settings?.scraping_enabled ?? false,
        degradation_enabled: state.settings?.degradation_enabled ?? true,
        ga_enabled: state.settings?.ga_enabled ?? false,
        clarity_enabled: state.settings?.clarity_enabled ?? false
      },
      cache: state.cache || {},
      diagnostics: state.diagnostics || {}
    }

    return migrated
  }

  /**
   * Get current schema version
   */
  static getCurrentSchemaVersion(): string {
    return StateManager.CURRENT_SCHEMA_VERSION
  }

  /**
   * Check if localStorage is available
   */
  static isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }
}