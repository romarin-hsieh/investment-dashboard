import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Sample Data Files', () => {
  const dataPath = resolve(process.cwd(), 'public/data')

  describe('status.json', () => {
    it('should have valid system status structure', () => {
      const statusData = JSON.parse(
        readFileSync(resolve(dataPath, 'status.json'), 'utf8')
      )
      
      expect(statusData).toHaveProperty('system_status')
      expect(statusData).toHaveProperty('jobs')
      expect(statusData).toHaveProperty('data_freshness')
      expect(statusData).toHaveProperty('system_health')
      
      // Check job structure
      expect(statusData.jobs).toHaveProperty('hourly_quotes')
      expect(statusData.jobs).toHaveProperty('daily_snapshot')
      expect(statusData.jobs).toHaveProperty('metadata_refresh')
      
      // Check each job has required fields
      Object.values(statusData.jobs).forEach(job => {
        expect(job).toHaveProperty('last_run')
        expect(job).toHaveProperty('next_run')
        expect(job).toHaveProperty('status')
        expect(job).toHaveProperty('duration_ms')
      })
    })
  })

  describe('quotes/latest.json', () => {
    it('should contain quotes for all Universe symbols', () => {
      const quotesData = JSON.parse(
        readFileSync(resolve(dataPath, 'quotes/latest.json'), 'utf8')
      )
      
      expect(quotesData).toHaveProperty('as_of')
      expect(quotesData).toHaveProperty('provider')
      expect(quotesData).toHaveProperty('items')
      expect(quotesData.items).toHaveLength(10)
      
      const expectedSymbols = ['ONDS', 'PL', 'RKLB', 'ASTS', 'RIVN', 'MDB', 'ORCL', 'TSM', 'AVAV', 'RDW']
      const actualSymbols = quotesData.items.map(item => item.symbol)
      
      expectedSymbols.forEach(symbol => {
        expect(actualSymbols).toContain(symbol)
      })
    })

    it('should have valid quote item structure', () => {
      const quotesData = JSON.parse(
        readFileSync(resolve(dataPath, 'quotes/latest.json'), 'utf8')
      )
      
      quotesData.items.forEach(item => {
        expect(item).toHaveProperty('symbol')
        expect(item).toHaveProperty('price_usd')
        expect(item).toHaveProperty('price_type')
        expect(item).toHaveProperty('market_state')
        expect(item).toHaveProperty('is_delayed')
        expect(item).toHaveProperty('stale_level')
        expect(item).toHaveProperty('error')
        
        // Validate enum values
        expect(['latest', 'close', 'last_known']).toContain(item.price_type)
        expect(['open', 'closed', 'pre', 'post', null]).toContain(item.market_state)
        expect(['fresh', 'stale', 'very_stale']).toContain(item.stale_level)
      })
    })
  })

  describe('daily/2025-01-22.json', () => {
    it('should have valid daily snapshot structure', () => {
      const dailyData = JSON.parse(
        readFileSync(resolve(dataPath, 'daily/2025-01-22.json'), 'utf8')
      )
      
      expect(dailyData).toHaveProperty('as_of_date_taipei')
      expect(dailyData).toHaveProperty('generated_at_utc')
      expect(dailyData).toHaveProperty('universe')
      expect(dailyData).toHaveProperty('per_symbol')
      expect(dailyData).toHaveProperty('macro')
      
      expect(dailyData.universe).toHaveLength(10)
      expect(dailyData.per_symbol).toHaveLength(10)
      expect(dailyData.macro.items).toHaveLength(10)
    })

    it('should have valid symbol data structure', () => {
      const dailyData = JSON.parse(
        readFileSync(resolve(dataPath, 'daily/2025-01-22.json'), 'utf8')
      )
      
      dailyData.per_symbol.forEach(symbolData => {
        expect(symbolData).toHaveProperty('symbol')
        expect(symbolData).toHaveProperty('short_brief_zh')
        expect(symbolData).toHaveProperty('brief_truncated')
        expect(symbolData).toHaveProperty('brief_source')
        expect(symbolData).toHaveProperty('news_top10')
        expect(symbolData).toHaveProperty('news_insufficient')
        expect(symbolData).toHaveProperty('gaps')
        
        expect(['llm', 'fallback']).toContain(symbolData.brief_source)
        expect(Array.isArray(symbolData.news_top10)).toBe(true)
        expect(Array.isArray(symbolData.gaps)).toBe(true)
      })
    })

    it('should have valid macro data structure', () => {
      const dailyData = JSON.parse(
        readFileSync(resolve(dataPath, 'daily/2025-01-22.json'), 'utf8')
      )
      
      dailyData.macro.items.forEach(indicator => {
        expect(indicator).toHaveProperty('id')
        expect(indicator).toHaveProperty('value')
        expect(indicator).toHaveProperty('as_of')
        expect(indicator).toHaveProperty('source_name')
        expect(indicator).toHaveProperty('quality_flag')
        
        expect(['good', 'stale', 'degraded', 'disabled_scrape']).toContain(indicator.quality_flag)
      })
    })
  })

  describe('symbols_metadata.json', () => {
    it('should contain metadata for all Universe symbols', () => {
      const metadataData = JSON.parse(
        readFileSync(resolve(dataPath, 'symbols_metadata.json'), 'utf8')
      )
      
      expect(metadataData).toHaveProperty('ttl_days')
      expect(metadataData).toHaveProperty('as_of')
      expect(metadataData).toHaveProperty('items')
      expect(metadataData.items).toHaveLength(10)
      
      const expectedSymbols = ['ONDS', 'PL', 'RKLB', 'ASTS', 'RIVN', 'MDB', 'ORCL', 'TSM', 'AVAV', 'RDW']
      const actualSymbols = metadataData.items.map(item => item.symbol)
      
      expectedSymbols.forEach(symbol => {
        expect(actualSymbols).toContain(symbol)
      })
    })

    it('should have valid confidence levels', () => {
      const metadataData = JSON.parse(
        readFileSync(resolve(dataPath, 'symbols_metadata.json'), 'utf8')
      )
      
      metadataData.items.forEach(item => {
        expect(item).toHaveProperty('symbol')
        expect(item).toHaveProperty('sector')
        expect(item).toHaveProperty('industry')
        expect(item).toHaveProperty('confidence')
        expect(item).toHaveProperty('sources')
        expect(item).toHaveProperty('last_verified_at')
        
        // Validate confidence levels
        expect([0.50, 0.75, 0.90]).toContain(item.confidence)
        expect(Array.isArray(item.sources)).toBe(true)
        expect(item.sources.length).toBeGreaterThan(0)
      })
    })

    it('should have proper industry grouping', () => {
      const metadataData = JSON.parse(
        readFileSync(resolve(dataPath, 'symbols_metadata.json'), 'utf8')
      )
      
      expect(metadataData).toHaveProperty('industry_grouping')
      
      // Check that all symbols are accounted for in grouping
      const allGroupedSymbols = Object.values(metadataData.industry_grouping).flat()
      expect(allGroupedSymbols).toHaveLength(10)
      
      // Check confidence distribution
      expect(metadataData).toHaveProperty('confidence_distribution')
      const totalConfidenceCount = Object.values(metadataData.confidence_distribution).reduce((a, b) => a + b, 0)
      expect(totalConfidenceCount).toBe(10)
    })
  })
})