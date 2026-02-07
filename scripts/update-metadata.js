#!/usr/bin/env node

/**
 * 更新元數據腳本
 * 使用 Yahoo Finance API 獲取最新的 sector 和 industry 信息
 * 更新 public/data/symbols_metadata.json 文件
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 模擬 Yahoo Finance API 調用 (在 Node.js 環境中)
class YahooFinanceNodeAPI {
  constructor() {
    this.corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?'
    ]
    this.baseUrl = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary/'
    this.currentProxyIndex = 0
  }

  async getStockInfo(symbol) {
    console.log(`Fetching stock info for ${symbol}...`)

    for (let i = 0; i < this.corsProxies.length; i++) {
      try {
        const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length
        const proxy = this.corsProxies[proxyIndex]

        const targetUrl = `${this.baseUrl}${symbol}?modules=summaryProfile,price,defaultKeyStatistics`
        const url = `${proxy}${encodeURIComponent(targetUrl)}`

        // 使用 fetch (Node.js 18+ 內建)
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (!data.quoteSummary || !data.quoteSummary.result || data.quoteSummary.result.length === 0) {
          throw new Error('No quoteSummary data available')
        }

        const result = data.quoteSummary.result[0]
        const summaryProfile = result.summaryProfile || {}
        const price = result.price || {}

        const stockInfo = {
          symbol: symbol,
          sector: summaryProfile.sector || 'Unknown',
          industry: summaryProfile.industry || 'Unknown Industry',
          exchange: price.exchangeName || price.exchange || this.getDefaultExchange(symbol),
          marketCap: price.marketCap ? price.marketCap.raw : null,
          marketCapFormatted: price.marketCap ? price.marketCap.fmt : 'N/A',
          currency: price.currency || 'USD',
          country: summaryProfile.country || 'Unknown',
          website: summaryProfile.website || null,
          employees: summaryProfile.fullTimeEmployees || null,
          businessSummary: summaryProfile.longBusinessSummary || null,
          marketCapCategory: this.getMarketCapCategory(price.marketCap ? price.marketCap.raw : null),
          confidence: 0.95,
          sources: ['yahoo_finance'],
          lastUpdated: new Date().toISOString()
        }

        console.log(`✓ Successfully fetched ${symbol}: ${stockInfo.sector} - ${stockInfo.industry}`)
        this.currentProxyIndex = proxyIndex
        return stockInfo

      } catch (error) {
        console.warn(`✗ Proxy ${i + 1} failed for ${symbol}: ${error.message}`)

        if (i === this.corsProxies.length - 1) {
          console.error(`✗ All proxies failed for ${symbol}`)
          return this.getDefaultStockInfo(symbol)
        }
      }
    }
  }

  getDefaultStockInfo(symbol) {
    return {
      symbol: symbol,
      sector: 'Unknown',
      industry: 'Unknown Industry',
      exchange: this.getDefaultExchange(symbol),
      marketCap: null,
      marketCapFormatted: 'N/A',
      currency: 'USD',
      country: 'Unknown',
      website: null,
      employees: null,
      businessSummary: null,
      marketCapCategory: 'unknown',
      confidence: 0.0,
      sources: ['default'],
      lastUpdated: new Date().toISOString()
    }
  }

  getDefaultExchange(symbol) {
    const nasdaqSymbols = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'RKLB', 'ASTS', 'RIVN', 'MDB', 'ONDS', 'PL', 'AVAV', 'CRM', 'AVGO', 'LEU', 'SMR', 'CRWV', 'IONQ', 'PLTR', 'HIMS', 'FTNT', 'WDC', 'CSCO']
    const nyseSymbols = ['TSM', 'ORCL', 'RDW', 'GLW']

    if (nasdaqSymbols.includes(symbol)) {
      return 'NASDAQ'
    } else if (nyseSymbols.includes(symbol)) {
      return 'NYSE'
    }

    return 'NASDAQ'
  }

  getMarketCapCategory(marketCap) {
    if (!marketCap || marketCap <= 0) {
      return 'unknown'
    }

    if (marketCap >= 200000000000) {
      return 'mega_cap'
    } else if (marketCap >= 10000000000) {
      return 'large_cap'
    } else if (marketCap >= 2000000000) {
      return 'mid_cap'
    } else if (marketCap >= 300000000) {
      return 'small_cap'
    } else {
      return 'micro_cap'
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

class MetadataUpdater {
  constructor() {
    this.api = new YahooFinanceNodeAPI()
    this.metadataPath = path.join(__dirname, '../public/data/symbols_metadata.json')
    this.requestDelay = 2000 // 2 秒延遲，避免 API 限制
  }

  async loadExistingMetadata() {
    try {
      const data = await fs.readFile(this.metadataPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.warn('No existing metadata file found, creating new one')
      return this.createEmptyMetadata()
    }
  }

  createEmptyMetadata() {
    return {
      ttl_days: 7,
      as_of: new Date().toISOString(),
      next_refresh: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      items: [],
      sector_grouping: {},
      confidence_distribution: {},
      data_sources: {},
      refresh_metadata: {}
    }
  }

  async updateSymbolsMetadata(symbols, forceUpdate = false) {
    console.log(`\n🚀 Starting metadata update for ${symbols.length} symbols...`)
    console.log(`Force update: ${forceUpdate}`)

    const startTime = Date.now()
    const existingMetadata = await this.loadExistingMetadata()

    const updatedItems = []
    const errors = []
    let updated = 0
    let skipped = 0

    // create map of existing items for O(1) lookup
    const existingItemsMap = new Map(existingMetadata.items?.map(item => [item.symbol, item]) || [])

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i]

      try {
        // Check if existing item needs update
        const existingItem = existingItemsMap.get(symbol)

        if (!forceUpdate && existingItem && existingItem.confidence >= 0.9) {
          console.log(`⏭️  Skipping ${symbol} (already high confidence: ${existingItem.confidence})`)
          updatedItems.push(existingItem)
          skipped++
          continue
        }

        console.log(`\n📊 Processing ${symbol} (${i + 1}/${symbols.length})...`)

        // Fetch new data
        let stockInfo = await this.api.getStockInfo(symbol)
        let usedFallback = false

        // Check if fetch failed (returned default Unknown)
        if (stockInfo.sector === 'Unknown') {
          const existingItem = existingItemsMap.get(symbol)

          // 1. Try to keep existing valid data
          if (existingItem && existingItem.sector !== 'Unknown') {
            console.log(`⚠️ Fetch returned Unknown, keeping existing valid metadata for ${symbol} (Sector: ${existingItem.sector})`)
            updatedItems.push(existingItem)
            usedFallback = true
            continue // Skip to next symbol
          }

          // 2. Try Manual Fallback
          const manualFallbacks = {
            'FTNT': { sector: 'Technology', industry: 'Software - Infrastructure', marketCapCategory: 'large_cap' },
            'GLW': { sector: 'Technology', industry: 'Electronic Components', marketCapCategory: 'large_cap' },
            'WDC': { sector: 'Technology', industry: 'Computer Hardware', marketCapCategory: 'mid_cap' },
            'CSCO': { sector: 'Technology', industry: 'Communication Equipment', marketCapCategory: 'mega_cap' }
          }

          if (manualFallbacks[symbol]) {
            console.log(`⚠️ Using manual fallback for ${symbol}`)
            // Construct a valid stockInfo from fallback
            stockInfo = {
              ...this.api.getDefaultStockInfo(symbol),
              sector: manualFallbacks[symbol].sector,
              industry: manualFallbacks[symbol].industry,
              marketCapCategory: manualFallbacks[symbol].marketCapCategory,
              confidence: 1.0,
              sources: ['manual_patch'],
              lastUpdated: new Date().toISOString()
            }
            // Proceed to use this stockInfo
          }
        }

        // Convert to metadata format (using either fetched data or manual fallback)
        const metadataItem = {
          symbol: stockInfo.symbol,
          sector: stockInfo.sector,
          industry: stockInfo.industry,
          confidence: stockInfo.confidence,
          sources: stockInfo.sources,
          last_verified_at: stockInfo.lastUpdated,
          market_cap_category: stockInfo.marketCapCategory,
          exchange: stockInfo.exchange,
          country: stockInfo.country,
          website: stockInfo.website,
          employees: stockInfo.employees,
          market_cap: stockInfo.marketCap,
          market_cap_formatted: stockInfo.marketCapFormatted
        }

        updatedItems.push(metadataItem)
        updated++

        // Add delay
        if (i < symbols.length - 1) {
          console.log(`⏳ Waiting ${this.requestDelay}ms before next request...`)
          await this.api.delay(this.requestDelay)
        }

      } catch (error) {
        console.error(`❌ Failed to update ${symbol}: ${error.message}`)
        errors.push({ symbol, error: error.message })

        // Keep existing data or use default
        if (existingItem) {
          updatedItems.push(existingItem)
        } else {
          // Manual Fallback for Known Symbols
          const manualFallbacks = {
            'FTNT': { sector: 'Technology', industry: 'Software - Infrastructure', marketCapCategory: 'large_cap' },
            'GLW': { sector: 'Technology', industry: 'Electronic Components', marketCapCategory: 'large_cap' },
            'WDC': { sector: 'Technology', industry: 'Computer Hardware', marketCapCategory: 'mid_cap' },
            'CSCO': { sector: 'Technology', industry: 'Communication Equipment', marketCapCategory: 'mega_cap' }
          }

          if (manualFallbacks[symbol]) {
            console.log(`⚠️ Using manual fallback for ${symbol}`)
            const fallback = this.api.getDefaultStockInfo(symbol)
            fallback.sector = manualFallbacks[symbol].sector
            fallback.industry = manualFallbacks[symbol].industry
            fallback.marketCapCategory = manualFallbacks[symbol].marketCapCategory
            fallback.confidence = 1.0
            fallback.sources = ['manual_patch']
            updatedItems.push(fallback)
          } else {
            console.warn(`⚠️ No existing data for ${symbol}, using default (Unknown)`)
            updatedItems.push(this.api.getDefaultStockInfo(symbol))
          }
        }
      }
    }

    // Generate stats
    const sectorGrouping = this.generateSectorGrouping(updatedItems)
    const confidenceDistribution = this.generateConfidenceDistribution(updatedItems)
    const dataSources = this.generateDataSources(updatedItems)

    const newMetadata = {
      ttl_days: 7,
      as_of: new Date().toISOString(),
      next_refresh: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      items: updatedItems,
      sector_grouping: sectorGrouping,
      confidence_distribution: confidenceDistribution,
      data_sources: dataSources,
      refresh_metadata: {
        last_refresh_duration_ms: Date.now() - startTime,
        symbols_updated: updated,
        symbols_skipped: skipped,
        symbols_failed: errors.length,
        confidence_improvements: this.countConfidenceImprovements(existingMetadata.items || [], updatedItems),
        errors: errors.length > 0 ? errors : undefined
      }
    }

    await this.saveMetadata(newMetadata)
    this.printSummary(newMetadata, errors)

    return newMetadata
  }

  generateSectorGrouping(items) {
    const grouping = {}

    for (const item of items) {
      const sector = item.sector || 'Unknown'
      if (!grouping[sector]) {
        grouping[sector] = []
      }
      grouping[sector].push(item.symbol)
    }

    return grouping
  }

  generateConfidenceDistribution(items) {
    const distribution = {
      high_confidence_0_90: 0,
      medium_confidence_0_75: 0,
      low_confidence_0_50: 0
    }

    for (const item of items) {
      const confidence = item.confidence || 0
      if (confidence >= 0.90) {
        distribution.high_confidence_0_90++
      } else if (confidence >= 0.75) {
        distribution.medium_confidence_0_75++
      } else if (confidence >= 0.50) {
        distribution.low_confidence_0_50++
      }
    }

    return distribution
  }

  generateDataSources(items) {
    const sources = {}

    for (const item of items) {
      if (item.sources) {
        for (const source of item.sources) {
          sources[source] = (sources[source] || 0) + 1
        }
      }
    }

    return sources
  }

  countConfidenceImprovements(oldItems, newItems) {
    let improvements = 0

    for (const newItem of newItems) {
      const oldItem = oldItems.find(item => item.symbol === newItem.symbol)
      if (oldItem && newItem.confidence > oldItem.confidence) {
        improvements++
      }
    }

    return improvements
  }

  async saveMetadata(metadata) {
    const jsonString = JSON.stringify(metadata, null, 2)
    await fs.writeFile(this.metadataPath, jsonString, 'utf8')
    console.log(`\n💾 Metadata saved to ${this.metadataPath}`)
  }

  printSummary(metadata, errors) {
    const duration = metadata.refresh_metadata.last_refresh_duration_ms
    const updated = metadata.refresh_metadata.symbols_updated
    const skipped = metadata.refresh_metadata.symbols_skipped
    const failed = metadata.refresh_metadata.symbols_failed
    const total = metadata.items.length

    console.log('\n' + '='.repeat(60))
    console.log('📈 METADATA UPDATE SUMMARY')
    console.log('='.repeat(60))
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`)
    console.log(`📊 Total symbols: ${total}`)
    console.log(`✅ Updated: ${updated}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`\n📋 Confidence Distribution:`)
    console.log(`   High (≥90%): ${metadata.confidence_distribution.high_confidence_0_90}`)
    console.log(`   Medium (≥75%): ${metadata.confidence_distribution.medium_confidence_0_75}`)
    console.log(`   Low (≥50%): ${metadata.confidence_distribution.low_confidence_0_50}`)

    if (errors.length > 0) {
      console.log(`\n❌ Errors:`)
      errors.forEach(error => {
        console.log(`   ${error.symbol}: ${error.error}`)
      })
    }

    console.log('\n🎉 Update completed!')
  }
}

// 主函數
async function main() {
  const args = process.argv.slice(2)
  const forceUpdate = args.includes('--force') || args.includes('-f')
  const symbolsArg = args.find(arg => arg.startsWith('--symbols='))

  // Load symbols from stocks.json
  const stocksConfigPath = path.join(__dirname, '../public/config/stocks.json')
  let defaultSymbols = []
  try {
    const stocksData = JSON.parse(await fs.readFile(stocksConfigPath, 'utf8'))
    defaultSymbols = stocksData.stocks.map(s => s.symbol)
    console.log(`✅ Loaded ${defaultSymbols.length} symbols from stocks.json`)
  } catch (error) {
    console.error('❌ Failed to load stocks.json:', error.message)
    // Fallback if file load fails
    defaultSymbols = [
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
      'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
      'CRM', 'AVGO', 'LEU', 'SMR', 'CRWV', 'IONQ', 'PLTR', 'HIMS',
      'FTNT', 'GLW', 'WDC', 'CSCO'
    ]
  }

  let symbols = defaultSymbols

  if (symbolsArg) {
    symbols = symbolsArg.split('=')[1].split(',').map(s => s.trim().toUpperCase())
  }

  console.log('🔄 Yahoo Finance Metadata Updater')
  console.log(`📋 Symbols to process: ${symbols.join(', ')}`)

  const updater = new MetadataUpdater()

  try {
    await updater.updateSymbolsMetadata(symbols, forceUpdate)
  } catch (error) {
    console.error('❌ Update failed:', error)
    process.exit(1)
  }
}

// 執行腳本
import { pathToFileURL } from 'url'
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
}

export { MetadataUpdater, YahooFinanceNodeAPI }