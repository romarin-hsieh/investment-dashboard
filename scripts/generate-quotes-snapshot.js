#!/usr/bin/env node

/**
 * Quotes Snapshot Generator
 * 生成包含所有 universe 股票的報價快照
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class QuotesSnapshotGenerator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
    this.outputDir = path.join(this.projectRoot, 'public', 'data', 'quotes')

    // 確保輸出目錄存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  // 從統一配置文件讀取股票列表
  async getStocksFromConfig() {
    try {
      // 優先讀取根目錄的 config/stocks.json (做為 Single Source of Truth)
      let configPath = path.join(this.projectRoot, 'config', 'stocks.json')

      // 如果根目錄沒有，嘗試 public/config/stocks.json
      if (!fs.existsSync(configPath)) {
        console.warn('⚠️ Root config/stocks.json not found, trying public/config/stocks.json')
        configPath = path.join(this.projectRoot, 'public', 'config', 'stocks.json')
      }

      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'))

      // 只返回啟用的股票符號
      const enabledSymbols = configData.stocks
        .filter(stock => stock.enabled)
        .map(stock => stock.symbol)

      console.log(`📊 Loaded ${enabledSymbols.length} enabled symbols from stocks.json`)
      return enabledSymbols
    } catch (error) {
      console.error('Failed to read stocks.json:', error)

      // Fallback 到 universe.json
      try {
        console.warn('⚠️ Falling back to universe.json')
        const universePath = path.join(this.projectRoot, 'config', 'universe.json')
        const universeData = JSON.parse(fs.readFileSync(universePath, 'utf8'))
        return universeData.symbols || []
      } catch (fallbackError) {
        console.error('Failed to read universe.json fallback:', fallbackError)
        throw fallbackError
      }
    }
  }

  // 生成(或讀取)股票報價數據
  generateQuote(symbol) {
    // 嘗試從本地 OHLCV 讀取真實數據
    try {
      // 處理符號名稱 (如 FOREXCOM:SPXUSD -> FOREXCOM_SPXUSD)
      const safeSymbol = symbol.replace(/:/g, '_')
      const ohlcvPath = path.join(this.projectRoot, 'public', 'data', 'ohlcv', `${safeSymbol}.json`)

      if (fs.existsSync(ohlcvPath)) {
        const fileContent = fs.readFileSync(ohlcvPath, 'utf8')
        const data = JSON.parse(fileContent)

        if (data.timestamps && data.timestamps.length > 0) {
          const lastIdx = data.timestamps.length - 1
          const prevIdx = Math.max(0, lastIdx - 1)

          const closePrice = data.close[lastIdx]
          const prevClose = data.close[prevIdx]
          const volume = data.volume[lastIdx] || 0

          const changeAmount = closePrice - prevClose
          const changePercent = prevClose !== 0 ? (changeAmount / prevClose) * 100 : 0

          return {
            symbol,
            price_usd: parseFloat(closePrice.toFixed(2)),
            price_type: "close",
            market_state: "closed",
            is_delayed: true,
            stale_level: "fresh",
            error: null,
            change_percent: parseFloat(changePercent.toFixed(2)),
            change_amount: parseFloat(changeAmount.toFixed(2)),
            volume: volume,
            close_price: parseFloat(closePrice.toFixed(2)),
            after_hours_price: null,
            after_hours_change_percent: null,
            after_hours_change_amount: null
          }
        }
      }
    } catch (err) {
      console.warn(`⚠️ Failed to read real data for ${symbol}, falling back to mock:`, err.message)
    }

    // --- Fallback to Mock Data (if file missing) ---
    // 基礎價格範圍 (根據股票類型)
    const priceRanges = {
      // 高價股
      'NVDA': [120, 180],
      'TSLA': [400, 500],
      'GOOG': [170, 200],
      'AMZN': [180, 220],
      'META': [500, 700],
      'NFLX': [700, 900],
      'CRM': [300, 400],
      'AVGO': [200, 280],
      'MDB': [250, 350],
      'ORCL': [150, 200],
      'TSM': [180, 220],

      // 中價股
      'PLTR': [50, 80],
      'RKLB': [60, 90],
      'PL': [140, 180],
      'AVAV': [80, 120],
      'ASTS': [20, 40],
      'RIVN': [10, 20],
      'ONDS': [0.5, 2.0], // Updated to realistic range
      'RDW': [60, 80],
      'LEU': [40, 60],
      'SMR': [20, 30],
      'IONQ': [30, 50],
      'HIMS': [15, 25],

      // 新增股票的價格範圍
      'VST': [40, 60],
      'KTOS': [15, 25],
      'MELI': [1500, 2000],
      'SOFI': [8, 15],
      'EOSE': [5, 15],
      'CEG': [150, 200],
      'TMDX': [25, 40],
      'GRAB': [3, 6],
      'RBLX': [40, 60],
      'IREN': [8, 15],
      'INTR': [20, 35],
      'KSPI': [15, 25],
      'LUNR': [5, 12],
      'HOOD': [20, 35],
      'APP': [60, 90],
      'CHYM': [10, 20],
      'COIN': [200, 300],
      'IBKR': [120, 160],
      'CCJ': [40, 60],
      'MSFT': [400, 450],
      'ADBE': [500, 600],
      'PANW': [300, 400],
      'CRWD': [300, 400],
      'DDOG': [120, 160],
      'DUOL': [250, 350],
      'AXON': [400, 500],
      'ALAB': [15, 25],
      'LRCX': [700, 900],
      'BWXT': [90, 120],
      'RR': [8, 15],
      'RBRK': [25, 40],
      'OKLO': [10, 20],
      'PATH': [15, 25],
      'SE': [80, 120],
      'NU': [10, 15],
      'CRCL': [5, 10],
      'VRT': [400, 500],
      'ETN': [300, 400],
      'FIG': [8, 15],
      'ZETA': [15, 25],
      'MP': [40, 60],
      'UUUU': [5, 10],
      'MU': [80, 130],
      'SNDK': [70, 90],
      'BE': [10, 20],
      'UMAC': [8, 15]
    }

    const [minPrice, maxPrice] = priceRanges[symbol] || [10, 50]
    const basePrice = minPrice + Math.random() * (maxPrice - minPrice)

    // 生成變化百分比 (-5% 到 +5%)
    const changePercent = (Math.random() - 0.5) * 10
    const changeAmount = basePrice * (changePercent / 100)
    const currentPrice = basePrice + changeAmount

    // 生成交易量 (根據股票知名度)
    const volumeMultipliers = {
      'NVDA': 2000000, 'TSLA': 1500000, 'AAPL': 2500000,
      'GOOG': 1000000, 'AMZN': 800000, 'META': 600000,
      'NFLX': 300000, 'CRM': 200000, 'PLTR': 400000
    }
    const baseVolume = volumeMultipliers[symbol] || 100000
    const volume = Math.floor(baseVolume * (0.5 + Math.random()))

    // 決定是否有盤後交易
    const hasAfterHours = Math.random() > 0.6
    let afterHoursPrice = null
    let afterHoursChangePercent = null
    let afterHoursChangeAmount = null

    if (hasAfterHours) {
      const ahChangePercent = (Math.random() - 0.5) * 2 // -1% 到 +1%
      afterHoursChangeAmount = currentPrice * (ahChangePercent / 100)
      afterHoursPrice = currentPrice + afterHoursChangeAmount
      afterHoursChangePercent = ahChangePercent
    }

    return {
      symbol,
      price_usd: parseFloat(currentPrice.toFixed(2)),
      price_type: "close",
      market_state: "closed",
      is_delayed: Math.random() > 0.3, // 70% 機率是延遲數據
      stale_level: "fresh",
      error: null,
      change_percent: parseFloat(changePercent.toFixed(2)),
      change_amount: parseFloat(changeAmount.toFixed(2)),
      volume: volume,
      close_price: parseFloat(currentPrice.toFixed(2)),
      after_hours_price: afterHoursPrice ? parseFloat(afterHoursPrice.toFixed(2)) : null,
      after_hours_change_percent: afterHoursChangePercent ? parseFloat(afterHoursChangePercent.toFixed(2)) : null,
      after_hours_change_amount: afterHoursChangeAmount ? parseFloat(afterHoursChangeAmount.toFixed(2)) : null
    }
  }

  // 生成完整的報價快照
  async generateQuotesSnapshot() {
    const symbols = await this.getStocksFromConfig()
    const now = new Date()

    console.log(`📊 Generating quotes snapshot for ${symbols.length} symbols...`)

    // 生成所有股票的報價數據
    const items = symbols.map(symbol => this.generateQuote(symbol))

    // 構建完整的快照數據
    const snapshot = {
      as_of: now.toISOString(),
      provider: "mock_generator",
      market_session: "after_hours",
      items: items,
      metadata: {
        total_symbols: symbols.length,
        successful_updates: symbols.length,
        failed_updates: 0,
        average_delay_minutes: 15,
        next_update: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString() // 4小時後
      }
    }

    // 寫入文件
    const filepath = path.join(this.outputDir, 'latest.json')
    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2), 'utf8')

    console.log(`✅ Quotes snapshot generated: ${filepath}`)
    console.log(`📈 Total symbols: ${symbols.length}`)
    console.log(`🎯 Sample symbols: ${symbols.slice(0, 5).join(', ')}...`)

    return {
      filepath,
      symbolCount: symbols.length,
      sampleSymbols: symbols.slice(0, 10)
    }
  }

  // 驗證生成的數據
  async validateSnapshot() {
    const filepath = path.join(this.outputDir, 'latest.json')

    if (!fs.existsSync(filepath)) {
      throw new Error('Quotes snapshot file not found')
    }

    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
    const configSymbols = await this.getStocksFromConfig()

    // 檢查所有配置符號是否都包含在內
    const quoteSymbols = data.items.map(item => item.symbol)
    const missingSymbols = configSymbols.filter(symbol => !quoteSymbols.includes(symbol))
    const extraSymbols = quoteSymbols.filter(symbol => !configSymbols.includes(symbol))

    console.log(`🔍 Validation Results:`)
    console.log(`   Config symbols: ${configSymbols.length}`)
    console.log(`   Quote symbols: ${quoteSymbols.length}`)
    console.log(`   Missing symbols: ${missingSymbols.length}`)
    console.log(`   Extra symbols: ${extraSymbols.length}`)

    if (missingSymbols.length > 0) {
      console.warn(`⚠️  Missing symbols: ${missingSymbols.join(', ')}`)
    }

    if (extraSymbols.length > 0) {
      console.warn(`⚠️  Extra symbols: ${extraSymbols.join(', ')}`)
    }

    return {
      isValid: missingSymbols.length === 0,
      missingSymbols,
      extraSymbols,
      totalSymbols: quoteSymbols.length
    }
  }
}

// 主執行函數
async function main() {
  try {
    console.log('🚀 Starting quotes snapshot generation...')

    const generator = new QuotesSnapshotGenerator()

    // 生成報價快照
    console.log('📊 Generating quotes snapshot...')
    const result = await generator.generateQuotesSnapshot()

    // 驗證生成的數據
    console.log('🔍 Validating generated data...')
    const validation = await generator.validateSnapshot()

    if (validation.isValid) {
      console.log('✅ Quotes snapshot generation completed successfully!')
      console.log(`📊 Total symbols: ${validation.totalSymbols}`)
    } else {
      console.error('❌ Validation failed!')
      if (validation.missingSymbols.length > 0) {
        console.error(`Missing: ${validation.missingSymbols.join(', ')}`)
      }
      if (validation.extraSymbols.length > 0) {
        console.error(`Extra: ${validation.extraSymbols.join(', ')}`)
      }
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Quotes snapshot generation failed:', error)
    console.error('Error details:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// 直接執行主函數
main().catch(console.error)

export { QuotesSnapshotGenerator }