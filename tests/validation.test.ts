import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
  validateUserState,
  validateQuotesSnapshot,
  validateDailySnapshot,
  validateMetadataSnapshot,
  validateSystemStatus,
  validateUniverseConfig,
  validateMarketsIndicatorConfig,
  validateSymbolFormat,
  validateSymbolInUniverse,
  validateNoDuplicateSymbol,
  validateHoldingsCost,
  validateImportFileSize,
  validateImportData
} from '@/utils/validation'
import type { UserState } from '@/types'

describe('Data Model Validation', () => {
  const dataPath = resolve(process.cwd(), 'public/data')
  const configPath = resolve(process.cwd(), 'public/config')

  describe('Configuration Validation', () => {
    it('should validate universe.json structure', () => {
      const universeData = JSON.parse(
        readFileSync(resolve(configPath, 'universe.json'), 'utf8')
      )
      
      const result = validateUniverseConfig(universeData)
      expect(result.success).toBe(true)
      expect(result.data?.symbols).toHaveLength(10)
    })

    it('should validate markets_indicators.json structure', () => {
      const macroData = JSON.parse(
        readFileSync(resolve(configPath, 'markets_indicators.json'), 'utf8')
      )
      
      const result = validateMarketsIndicatorConfig(macroData)
      expect(result.success).toBe(true)
      expect(result.data?.indicators).toHaveLength(10)
    })
  })

  describe('Data File Validation', () => {
    it('should validate status.json structure', () => {
      const statusData = JSON.parse(
        readFileSync(resolve(dataPath, 'status.json'), 'utf8')
      )
      
      const result = validateSystemStatus(statusData)
      expect(result.success).toBe(true)
      expect(result.data?.system_status).toBeDefined()
    })

    it('should validate quotes/latest.json structure', () => {
      const quotesData = JSON.parse(
        readFileSync(resolve(dataPath, 'quotes/latest.json'), 'utf8')
      )
      
      const result = validateQuotesSnapshot(quotesData)
      expect(result.success).toBe(true)
      expect(result.data?.items).toHaveLength(10)
    })

    it('should validate daily snapshot structure', () => {
      const dailyData = JSON.parse(
        readFileSync(resolve(dataPath, 'daily/2025-01-22.json'), 'utf8')
      )
      
      const result = validateDailySnapshot(dailyData)
      expect(result.success).toBe(true)
      expect(result.data?.universe).toHaveLength(10)
      expect(result.data?.per_symbol).toHaveLength(10)
      expect(result.data?.macro.items).toHaveLength(10)
    })

    it('should validate metadata structure', () => {
      const metadataData = JSON.parse(
        readFileSync(resolve(dataPath, 'symbols_metadata.json'), 'utf8')
      )
      
      const result = validateMetadataSnapshot(metadataData)
      expect(result.success).toBe(true)
      expect(result.data?.items).toHaveLength(10)
    })
  })

  describe('Symbol Validation Functions', () => {
    it('should validate symbol format correctly', () => {
      expect(validateSymbolFormat('ONDS')).toBe(true)
      expect(validateSymbolFormat('TEST.A')).toBe(true)
      expect(validateSymbolFormat('TEST-B')).toBe(true)
      
      expect(validateSymbolFormat('toolong')).toBe(false)
      expect(validateSymbolFormat('TOOLONGSYMBOL')).toBe(false)
      expect(validateSymbolFormat('test')).toBe(false) // lowercase
      expect(validateSymbolFormat('SYM BOL')).toBe(false) // space
      expect(validateSymbolFormat(' ONDS')).toBe(false) // leading space
      expect(validateSymbolFormat('ONDS ')).toBe(false) // trailing space
    })

    it('should validate symbol in universe correctly', () => {
      const universe = ['ONDS', 'PL', 'RKLB', 'ASTS', 'RIVN', 'MDB', 'ORCL', 'TSM', 'AVAV', 'RDW']
      
      expect(validateSymbolInUniverse('ONDS', universe)).toBe(true)
      expect(validateSymbolInUniverse('onds', universe)).toBe(true) // case insensitive
      expect(validateSymbolInUniverse('AAPL', universe)).toBe(false)
    })

    it('should validate no duplicate symbols correctly', () => {
      const existing = ['ONDS', 'PL', 'RKLB']
      
      expect(validateNoDuplicateSymbol('ASTS', existing)).toBe(true)
      expect(validateNoDuplicateSymbol('ONDS', existing)).toBe(false)
      expect(validateNoDuplicateSymbol('onds', existing)).toBe(false) // case insensitive
    })

    it('should validate holdings cost correctly', () => {
      const validResult = validateHoldingsCost(100.50)
      expect(validResult.success).toBe(true)
      expect(validResult.data).toBe(100.50)

      const invalidResult = validateHoldingsCost(-10)
      expect(invalidResult.success).toBe(false)
      expect(invalidResult.error?.message).toContain('positive')

      const zeroResult = validateHoldingsCost(0)
      expect(zeroResult.success).toBe(false)
    })
  })

  describe('User State Validation', () => {
    it('should validate complete user state', () => {
      const validUserState: UserState = {
        schema_version: '1.0.0',
        watchlist: ['ONDS', 'PL', 'RKLB'],
        holdings: {
          'ONDS': { avg_cost_usd: 42.85 },
          'PL': { avg_cost_usd: 156.72, shares: 100 }
        },
        settings: {
          scraping_enabled: false,
          degradation_enabled: true,
          ga_enabled: false,
          clarity_enabled: false
        },
        cache: {},
        diagnostics: {}
      }

      const result = validateUserState(validUserState)
      expect(result.success).toBe(true)
      expect(result.data?.watchlist).toHaveLength(3)
    })

    it('should reject invalid user state', () => {
      const invalidUserState = {
        schema_version: '1.0.0',
        watchlist: ['invalid symbol with spaces'],
        holdings: {
          'ONDS': { avg_cost_usd: -10 } // negative cost
        },
        settings: {
          scraping_enabled: 'not a boolean' // wrong type
        }
      }

      const result = validateUserState(invalidUserState)
      expect(result.success).toBe(false)
      expect(result.error?.details).toBeDefined()
    })
  })

  describe('Import/Export Validation', () => {
    it('should validate import file size', () => {
      // Mock File object for testing
      const smallFile = {
        size: 1024, // 1KB
        name: 'test.json'
      } as File

      const largeFile = {
        size: 300 * 1024, // 300KB
        name: 'large.json'
      } as File

      expect(validateImportFileSize(smallFile).success).toBe(true)
      expect(validateImportFileSize(largeFile).success).toBe(false)
    })

    it('should validate import data with unknown keys', () => {
      const dataWithUnknownKeys = {
        schema_version: '1.0.0',
        watchlist: ['ONDS'],
        holdings: {},
        settings: {
          scraping_enabled: true,
          degradation_enabled: true,
          ga_enabled: false,
          clarity_enabled: false
        },
        cache: {},
        diagnostics: {},
        unknown_field: 'should be rejected'
      }

      const result = validateImportData(dataWithUnknownKeys)
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('UNKNOWN_KEYS')
      expect(result.error?.details?.unknownKeys).toContain('unknown_field')
    })

    it('should validate valid import data', () => {
      const validImportData = {
        schema_version: '1.0.0',
        watchlist: ['ONDS', 'PL'],
        holdings: {
          'ONDS': { avg_cost_usd: 42.85 }
        },
        settings: {
          scraping_enabled: false,
          degradation_enabled: true,
          ga_enabled: false,
          clarity_enabled: false
        },
        cache: {},
        diagnostics: {}
      }

      const result = validateImportData(validImportData)
      expect(result.success).toBe(true)
      expect(result.data?.watchlist).toHaveLength(2)
    })
  })

  describe('Error Handling', () => {
    it('should provide detailed error information', () => {
      const invalidData = {
        schema_version: 123, // should be string
        watchlist: 'not an array',
        holdings: 'not an object'
      }

      const result = validateUserState(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Validation failed')
      expect(result.error?.details).toBeDefined()
      expect(Array.isArray(result.error?.details)).toBe(true)
    })

    it('should handle null and undefined data', () => {
      expect(validateUserState(null).success).toBe(false)
      expect(validateUserState(undefined).success).toBe(false)
      expect(validateQuotesSnapshot({}).success).toBe(false)
    })
  })
})