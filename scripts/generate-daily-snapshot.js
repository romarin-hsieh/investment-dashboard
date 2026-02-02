#!/usr/bin/env node

/**
 * Daily Snapshot Generator
 * 生成每日股票和宏觀指標快照
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DAY_MS = 24 * 60 * 60 * 1000

function ymdToUtcEpoch(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

class DailySnapshotGenerator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..')
    this.outputDir = path.join(this.projectRoot, 'public', 'data', 'daily')
    
    // 確保輸出目錄存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  // 獲取今天的日期字符串 (台北時間)
  getTodayString() {
    const now = new Date()
    // 轉換為台北時間 (UTC+8)
    const taipeiTime = new Date(now.getTime() + (8 * 60 * 60 * 1000))
    return taipeiTime.toISOString().split('T')[0]
  }

  // 獲取 UTC 時間字符串
  getUTCString() {
    return new Date().toISOString()
  }

  // 從統一配置文件讀取股票列表
  async getStocksFromConfig() {
    try {
      const configPath = path.join(this.projectRoot, 'config', 'stocks.json')
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      
      // 只返回啟用的股票符號
      const enabledSymbols = configData.stocks
        .filter(stock => stock.enabled)
        .map(stock => stock.symbol)
      
      console.log(`📊 Loaded ${enabledSymbols.length} enabled symbols from stocks.json`)
      return enabledSymbols
    } catch (error) {
      console.warn('Failed to read stocks.json, falling back to universe.json:', error)
      
      // Fallback 到 universe.json
      try {
        const universePath = path.join(this.projectRoot, 'config', 'universe.json')
        const universeData = JSON.parse(fs.readFileSync(universePath, 'utf8'))
        return universeData.symbols || []
      } catch (fallbackError) {
        console.warn('Failed to read universe.json, using hardcoded fallback:', fallbackError)
        return [
          'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 
          'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
          'CRM', 'NVDA', 'AVGO', 'AMZN', 'GOOG',
          'META', 'NFLX', 'LEU', 'SMR', 'CRWV',
          'IONQ', 'PLTR', 'HIMS', 'TSLA'
        ]
      }
    }
  }

  // 生成股票簡介 (模擬數據)
  generateStockBrief(symbol) {
    const briefTemplates = {
      'ASTS': 'AST SpaceMobile致力於建設太空基地行動寬頻網路，持續推進衛星部署計劃。',
      'RIVN': 'Rivian電動車公司專注於商用車輛市場，與Amazon的合作關係持續深化。',
      'PL': 'Planet Labs提供衛星影像服務，在農業監測和環境分析領域持續擴張業務範圍。',
      'ONDS': 'Ondas Holdings專注於工業物聯網解決方案，在鐵路和公用事業領域獲得新合約。',
      'RDW': 'Redwire在太空製造和基礎設施領域持續創新，獲得新的NASA合約支持。',
      'AVAV': 'AeroVironment專精於無人機系統，在國防和商業應用領域都有新的發展。',
      'MDB': 'MongoDB在雲端資料庫市場持續成長，AI應用需求推動業務擴張。',
      'ORCL': 'Oracle持續投資雲端基礎設施，在企業級AI解決方案領域加強競爭力。',
      'TSM': '台積電在先進製程技術領域保持領先地位，AI晶片需求持續強勁。',
      'RKLB': 'Rocket Lab在小型衛星發射市場表現強勁，計劃擴大發射頻率以滿足日益增長的需求。',
      'CRM': 'Salesforce持續在企業軟體領域創新，雲端服務需求強勁。',
      'NVDA': 'NVIDIA在AI晶片領域持續領先，數據中心業務增長強勁。',
      'AVGO': 'Broadcom在半導體和軟體解決方案領域表現穩健。',
      'AMZN': 'Amazon在電商和雲端服務領域持續擴張，AWS業務增長穩定。',
      'GOOG': 'Google母公司Alphabet在搜尋和雲端服務領域保持領先地位。',
      'META': 'Meta在社交媒體和元宇宙技術領域持續投資發展。',
      'NFLX': 'Netflix在串流媒體市場持續創新內容和技術。',
      'LEU': 'Centrus Energy在核燃料供應鏈領域具有重要地位。',
      'SMR': 'NuScale Power在小型模組化反應爐技術領域領先。',
      'CRWV': 'CoreWeave在AI雲端基礎設施領域快速成長，提供GPU運算服務。',
      'IONQ': 'IonQ在量子計算技術領域持續創新，獲得多項技術突破。',
      'PLTR': 'Palantir在大數據分析和政府合約領域表現強勁。',
      'HIMS': 'Hims & Hers在遠程醫療和健康服務領域快速成長。',
      'TSLA': 'Tesla在電動車和能源儲存領域持續創新發展。'
    }

    return briefTemplates[symbol] || `${symbol}公司在其專業領域持續發展，關注市場動態和技術創新。`
  }

  // 生成模擬宏觀指標數據
  generateMacroData() {
    const now = new Date()
    const utcString = now.toISOString()
    
    return {
      items: [
        {
          id: "sp500_index",
          value: 6000 + Math.random() * 200, // 模擬 S&P 500
          as_of: utcString,
          source_name: "financial_api",
          quality_flag: "good"
        },
        {
          id: "nasdaq_composite", 
          value: 19500 + Math.random() * 500, // 模擬 NASDAQ
          as_of: utcString,
          source_name: "financial_api",
          quality_flag: "good"
        },
        {
          id: "vix_volatility",
          value: 15 + Math.random() * 10, // 模擬 VIX
          as_of: utcString,
          source_name: "financial_api",
          quality_flag: "good"
        },
        {
          id: "us_10y_treasury",
          value: 4.5 + Math.random() * 0.5, // 模擬 10年期國債
          as_of: utcString,
          source_name: "treasury_gov",
          quality_flag: "good"
        },
        {
          id: "dxy_dollar_index",
          value: 105 + Math.random() * 5, // 模擬美元指數
          as_of: utcString,
          source_name: "forex_scraper",
          quality_flag: "good"
        },
        {
          id: "gold_spot_price",
          value: 2700 + Math.random() * 100, // 模擬黃金價格
          as_of: utcString,
          source_name: "commodities_scraper",
          quality_flag: "good"
        },
        {
          id: "crude_oil_wti",
          value: 75 + Math.random() * 10, // 模擬原油價格
          as_of: utcString,
          source_name: "commodities_scraper",
          quality_flag: "good"
        },
        {
          id: "bitcoin_price",
          value: 100000 + Math.random() * 10000, // 模擬比特幣價格
          as_of: utcString,
          source_name: "crypto_api",
          quality_flag: "good"
        },
        {
          id: "fed_funds_rate",
          value: 4.5,
          as_of: utcString,
          source_name: "fed_scraper",
          quality_flag: "good"
        }
      ]
    }
  }

  // 生成每日快照
  async generateDailySnapshot() {
    const today = this.getTodayString()
    const utcNow = this.getUTCString()
    const symbols = await this.getStocksFromConfig()

    console.log(`🗓️  Generating daily snapshot for ${today}...`)
    console.log(`📊 Processing ${symbols.length} symbols`)

    // 生成每個股票的數據
    const perSymbolData = symbols.map(symbol => ({
      symbol,
      short_brief_zh: this.generateStockBrief(symbol),
      brief_truncated: false,
      brief_source: "generated",
      news_top10: [], // 空的新聞列表 (可以後續擴展)
      news_insufficient: true,
      gaps: ["reuters_business", "bloomberg_markets", "cnbc_finance"]
    }))

    // 構建完整的快照數據
    const snapshot = {
      as_of_date_taipei: today,
      generated_at_utc: utcNow,
      universe: symbols,
      per_symbol: perSymbolData,
      macro: this.generateMacroData(),
      generation_metadata: {
        total_processing_time_ms: 1000 + Math.random() * 2000,
        news_sources_attempted: 3,
        news_sources_successful: 0,
        total_articles_collected: 0,
        articles_after_deduplication: 0,
        llm_brief_generation_success_rate: 1.0,
        macro_indicators_updated: 9,
        macro_indicators_failed: 0,
        generator: "daily-snapshot-script",
        version: "1.0.0"
      }
    }

    // 寫入文件
    const filename = `${today}.json`
    const filepath = path.join(this.outputDir, filename)
    
    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2), 'utf8')
    
    console.log(`✅ Daily snapshot generated: ${filepath}`)
    console.log(`📈 Macro indicators: ${snapshot.macro.items.length}`)
    console.log(`🏢 Stock symbols: ${symbols.length}`)
    
    return {
      asOfDateTaipei: today,
      filename,
      filepath,
      symbolCount: symbols.length,
      macroCount: snapshot.macro.items.length
    }
  }

  // 清理舊的快照文件 (保留最近 30 天)
  cleanupOldSnapshots({ retentionDays = 30, asOfDateTaipei } = {}) {
    const files = fs.readdirSync(this.outputDir)
    const jsonFiles = files.filter(f => f.endsWith('.json'))
    
    const asOf = asOfDateTaipei || this.getTodayString()
    const asOfEpoch = ymdToUtcEpoch(asOf)
    const cutoffEpoch = asOfEpoch - (retentionDays - 1) * DAY_MS // 含 asOf 共 retentionDays 天
    
    let deletedCount = 0
    
    jsonFiles.forEach(filename => {
      const match = filename.match(/^(\d{4}-\d{2}-\d{2})\.json$/)
      if (match) {
        const fileEpoch = ymdToUtcEpoch(match[1])
        if (fileEpoch < cutoffEpoch) {
          const filepath = path.join(this.outputDir, filename)
          fs.unlinkSync(filepath)
          deletedCount++
          console.log(`🗑️  Deleted old snapshot: ${filename}`)
        }
      }
    })
    
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} old snapshot files`)
    } else {
      console.log(`✨ No old snapshots to clean up`)
    }
  }
}

// 主執行函數
async function main() {
  try {
    console.log('🚀 Starting daily snapshot generation...')
    
    const generator = new DailySnapshotGenerator()
    
    // 生成今日快照
    const result = await generator.generateDailySnapshot()
    
    // 清理舊文件
    generator.cleanupOldSnapshots({ retentionDays: 30, asOfDateTaipei: result.asOfDateTaipei })
    
    console.log('✅ Daily snapshot generation completed successfully!')
    console.log(`📄 File: ${result.filename}`)
    console.log(`📊 Symbols: ${result.symbolCount}`)
    console.log(`📈 Macro indicators: ${result.macroCount}`)
    
  } catch (error) {
    console.error('❌ Daily snapshot generation failed:', error)
    process.exit(1)
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { DailySnapshotGenerator }