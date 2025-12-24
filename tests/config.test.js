import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Configuration Files', () => {
  const configPath = resolve(process.cwd(), 'public/config')

  describe('universe.json', () => {
    it('should contain exactly 10 symbols', () => {
      const universeConfig = JSON.parse(
        readFileSync(resolve(configPath, 'universe.json'), 'utf8')
      )
      
      expect(universeConfig.symbols).toHaveLength(10)
      expect(universeConfig.symbols).toEqual([
        'ONDS', 'PL', 'RKLB', 'ASTS', 'RIVN', 
        'MDB', 'ORCL', 'TSM', 'AVAV', 'RDW'
      ])
    })

    it('should have valid validation rules', () => {
      const universeConfig = JSON.parse(
        readFileSync(resolve(configPath, 'universe.json'), 'utf8')
      )
      
      expect(universeConfig.validation.max_length).toBe(10)
      expect(universeConfig.validation.allowed_chars).toBe('[A-Z0-9.-]')
      expect(universeConfig.validation.case_sensitive).toBe(false)
    })
  })

  describe('markets_indicators.json', () => {
    it('should contain exactly 10 markets indicators', () => {
      const macroConfig = JSON.parse(
        readFileSync(resolve(configPath, 'markets_indicators.json'), 'utf8')
      )
      
      expect(macroConfig.indicators).toHaveLength(10)
    })

    it('should have indicators with scrape_only flags', () => {
      const macroConfig = JSON.parse(
        readFileSync(resolve(configPath, 'markets_indicators.json'), 'utf8')
      )
      
      const scrapeOnlyCount = macroConfig.indicators.filter(
        indicator => indicator.scrape_only === true
      ).length
      
      const apiOnlyCount = macroConfig.indicators.filter(
        indicator => indicator.scrape_only === false
      ).length
      
      expect(scrapeOnlyCount).toBeGreaterThan(0)
      expect(apiOnlyCount).toBeGreaterThan(0)
      expect(scrapeOnlyCount + apiOnlyCount).toBe(10)
    })

    it('should have required fields for each indicator', () => {
      const macroConfig = JSON.parse(
        readFileSync(resolve(configPath, 'markets_indicators.json'), 'utf8')
      )
      
      macroConfig.indicators.forEach(indicator => {
        expect(indicator).toHaveProperty('id')
        expect(indicator).toHaveProperty('name')
        expect(indicator).toHaveProperty('description')
        expect(indicator).toHaveProperty('scrape_only')
        expect(indicator).toHaveProperty('data_source')
        expect(indicator).toHaveProperty('update_frequency')
        expect(indicator).toHaveProperty('unit')
      })
    })
  })

  describe('news_sources.json', () => {
    it('should have valid RSS feed configurations', () => {
      const newsConfig = JSON.parse(
        readFileSync(resolve(configPath, 'news_sources.json'), 'utf8')
      )
      
      expect(newsConfig.sources).toBeInstanceOf(Array)
      expect(newsConfig.sources.length).toBeGreaterThan(0)
      
      newsConfig.sources.forEach(source => {
        expect(source).toHaveProperty('id')
        expect(source).toHaveProperty('name')
        expect(source).toHaveProperty('rss_url')
        expect(source).toHaveProperty('enabled')
        expect(source).toHaveProperty('priority')
        expect(source.rss_url).toMatch(/^https?:\/\//)
      })
    })

    it('should have deduplication settings', () => {
      const newsConfig = JSON.parse(
        readFileSync(resolve(configPath, 'news_sources.json'), 'utf8')
      )
      
      expect(newsConfig.collection_settings.deduplication.enabled).toBe(true)
      expect(newsConfig.collection_settings.deduplication.fields).toContain('title')
    })
  })

  describe('wish.json', () => {
    it('should have GitHub issue template URL', () => {
      const wishConfig = JSON.parse(
        readFileSync(resolve(configPath, 'wish.json'), 'utf8')
      )
      
      expect(wishConfig.wish_channel.type).toBe('github_issue')
      expect(wishConfig.wish_channel.url_template).toContain('github.com')
      expect(wishConfig.wish_channel.url_template).toContain('{symbol}')
    })

    it('should have proper validation settings', () => {
      const wishConfig = JSON.parse(
        readFileSync(resolve(configPath, 'wish.json'), 'utf8')
      )
      
      expect(wishConfig.validation.max_symbol_length).toBe(10)
      expect(wishConfig.validation.allowed_chars).toBe('[A-Z0-9.-]')
      expect(wishConfig.validation.url_encoding).toBe(true)
    })
  })
})