/**
 * Symbols Configuration Manager
 * 混合式架構：環境變數 + 靜態 fallback + 可選的動態更新
 */

export class SymbolsConfigManager {
  constructor() {
    this.cache = new Map()
    this.lastUpdate = null
    // 從環境變數讀取快取時間，預設 60 分鐘 (1 小時)
    const cacheMinutes = import.meta.env.VITE_CACHE_SYMBOLS_MINUTES || 60
    this.updateInterval = cacheMinutes * 60 * 1000 // 轉換為毫秒
    
    console.log(`Symbols cache interval set to ${cacheMinutes} minutes (1 hour default)`)
  }

  /**
   * 獲取 symbols 列表 - 多層 fallback 策略
   */
  async getSymbolsList() {
    try {
      // 1. 優先使用環境變數 (最高優先級)
      const envSymbols = this.getEnvironmentSymbols()
      if (envSymbols.length > 0) {
        console.log('Using symbols from environment variables')
        return envSymbols
      }

      // 2. 嘗試從快取獲取 (如果在更新間隔內)
      if (this.isCacheValid()) {
        console.log('Using cached symbols list')
        return this.cache.get('symbols') || []
      }

      // 3. 嘗試從 universe.json 獲取 (新增)
      const universeSymbols = await this.fetchFromUniverse()
      if (universeSymbols.length > 0) {
        this.updateCache('symbols', universeSymbols)
        console.log('Using symbols from universe.json')
        return universeSymbols
      }

      // 4. 嘗試從 Google Sheets 獲取 (可選，非阻塞)
      const sheetsSymbols = await this.fetchFromGoogleSheets()
      if (sheetsSymbols.length > 0) {
        this.updateCache('symbols', sheetsSymbols)
        console.log('Using symbols from Google Sheets')
        return sheetsSymbols
      }

      // 5. 最終 fallback 到靜態配置
      const staticSymbols = this.getStaticSymbols()
      console.log('Using static fallback symbols')
      return staticSymbols

    } catch (error) {
      console.warn('Error fetching symbols config:', error)
      return this.getStaticSymbols()
    }
  }

  /**
   * 從 universe.json 獲取 symbols
   */
  async fetchFromUniverse() {
    try {
      console.log('Fetching symbols from universe.json...')
      
      // 獲取正確的路徑 (支援 GitHub Pages)
      const universeUrl = this.getUniverseJsonUrl()
      console.log('Universe.json URL:', universeUrl)
      
      const response = await fetch(universeUrl)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.symbols && Array.isArray(data.symbols)) {
        const symbols = data.symbols
          .filter(symbol => symbol && typeof symbol === 'string')
          .map(symbol => symbol.trim().toUpperCase())
        
        console.log(`✅ Loaded ${symbols.length} symbols from universe.json:`, symbols)
        return symbols
      }
      
      throw new Error('Invalid universe.json format')
      
    } catch (error) {
      console.warn('Failed to fetch from universe.json:', error)
      return []
    }
  }

  /**
   * 獲取正確的 universe.json URL (支援 GitHub Pages)
   */
  getUniverseJsonUrl() {
    // 使用統一的 baseUrl helper
    const base = import.meta.env.BASE_URL || '/';
    return `${base}config/universe.json`;
  }

  /**
   * 從環境變數獲取 symbols
   */
  getEnvironmentSymbols() {
    const envSymbols = import.meta.env.VITE_STOCK_SYMBOLS
    if (!envSymbols) return []

    try {
      // 支援多種格式：
      // VITE_STOCK_SYMBOLS="AAPL,MSFT,GOOGL"
      // VITE_STOCK_SYMBOLS='["AAPL","MSFT","GOOGL"]'
      if (envSymbols.startsWith('[')) {
        return JSON.parse(envSymbols)
      } else {
        return envSymbols.split(',').map(s => s.trim()).filter(Boolean)
      }
    } catch (error) {
      console.warn('Invalid VITE_STOCK_SYMBOLS format:', error)
      return []
    }
  }

  /**
   * 從 Google Sheets 獲取 (非阻塞，有超時)
   */
  async fetchFromGoogleSheets() {
    const sheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL
    if (!sheetsUrl) return []

    try {
      // 從環境變數讀取超時時間，預設 3 秒
      const timeoutMs = import.meta.env.VITE_SHEETS_TIMEOUT_MS || 3000
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(sheetsUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return this.parseGoogleSheetsData(data)

    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Google Sheets request timed out')
      } else {
        console.warn('Failed to fetch from Google Sheets:', error)
      }
      return []
    }
  }

  /**
   * 解析 Google Sheets 數據
   */
  parseGoogleSheetsData(data) {
    try {
      // 支援多種 Google Sheets 返回格式：
      // 格式1: { values: [["Symbol"], ["ASTS"], ["RIVN"], ...] }
      // 格式2: { values: [["ASTS"], ["RIVN"], ["PL"], ...] } (無標題行)
      // 格式3: [{"Symbol": "ASTS"}, {"Symbol": "RIVN"}, ...] (JSON 格式)
      // 格式4: ["ASTS", "RIVN", "PL", ...] (簡單陣列)
      
      // 格式4: 簡單陣列
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
        return data
          .filter(symbol => symbol && typeof symbol === 'string')
          .map(symbol => symbol.trim().toUpperCase())
      }
      
      // 格式3: JSON 物件陣列
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        return data
          .map(item => item.Symbol || item.symbol || item.SYMBOL)
          .filter(symbol => symbol && typeof symbol === 'string')
          .map(symbol => symbol.trim().toUpperCase())
      }
      
      // 格式1 & 格式2: Google Sheets API 標準格式
      if (data.values && Array.isArray(data.values)) {
        const values = data.values
        
        // 檢查第一行是否為標題行
        const firstRow = values[0]
        const isHeaderRow = firstRow && firstRow[0] && 
          (firstRow[0].toLowerCase().includes('symbol') || 
           firstRow[0].toLowerCase().includes('stock') ||
           firstRow[0].toLowerCase().includes('ticker'))
        
        // 決定從哪一行開始處理
        const startIndex = isHeaderRow ? 1 : 0
        
        return values
          .slice(startIndex) // 跳過標題行（如果有的話）
          .map(row => row[0]) // 取第一列
          .filter(symbol => symbol && typeof symbol === 'string')
          .map(symbol => symbol.trim().toUpperCase())
      }
      
      console.warn('Unrecognized Google Sheets data format:', data)
      return []
    } catch (error) {
      console.warn('Failed to parse Google Sheets data:', error)
      return []
    }
  }

  /**
   * 靜態 fallback symbols - 68 stocks from updated list
   */
  getStaticSymbols() {
    return [
      'ASTS', 'RIVN', 'PL', 'ONDS', 'RDW', 
      'AVAV', 'MDB', 'ORCL', 'TSM', 'RKLB',
      'CRM', 'NVDA', 'AVGO', 'AMZN', 'GOOG',
      'META', 'NFLX', 'LEU', 'SMR', 'CRWV',
      'IONQ', 'PLTR', 'HIMS', 'TSLA',
      'VST', 'KTOS', 'MELI', 'SOFI', 'RBRK',
      'EOSE', 'CEG', 'TMDX', 'GRAB', 'RBLX',
      'IREN', 'OKLO', 'PATH', 'INTR', 'SE',
      'KSPI', 'LUNR', 'HOOD', 'APP', 'CHYM',
      'NU', 'COIN', 'CRCL', 'IBKR', 'CCJ',
      'UUUU', 'VRT', 'ETN', 'MSFT', 'ADBE',
      'FIG', 'PANW', 'CRWD', 'DDOG', 'DUOL',
      'ZETA', 'AXON', 'ALAB', 'LRCX', 'BWXT',
      'UMAC', 'MP', 'RR'
    ]
  }

  /**
   * 快取管理
   */
  updateCache(key, value) {
    this.cache.set(key, value)
    this.lastUpdate = Date.now()
  }

  isCacheValid() {
    if (!this.lastUpdate) return false
    return (Date.now() - this.lastUpdate) < this.updateInterval
  }

  /**
   * 手動刷新配置
   */
  async refresh() {
    this.cache.clear()
    this.lastUpdate = null
    return await this.getSymbolsList()
  }

  /**
   * 獲取配置來源信息
   */
  getConfigSource() {
    const envSymbols = this.getEnvironmentSymbols()
    if (envSymbols.length > 0) return 'environment'
    
    if (this.isCacheValid()) return 'cache'
    
    const sheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL
    if (sheetsUrl) return 'google_sheets'
    
    return 'static'
  }

  /**
   * 獲取快取配置信息
   */
  getCacheInfo() {
    const cacheMinutes = import.meta.env.VITE_CACHE_SYMBOLS_MINUTES || 10
    const timeoutMs = import.meta.env.VITE_SHEETS_TIMEOUT_MS || 3000
    
    return {
      cacheIntervalMinutes: cacheMinutes,
      sheetsTimeoutMs: timeoutMs,
      lastUpdate: this.lastUpdate,
      cacheValid: this.isCacheValid(),
      nextUpdateIn: this.lastUpdate ? 
        Math.max(0, this.updateInterval - (Date.now() - this.lastUpdate)) : 0
    }
  }
}

// 導出單例
export const symbolsConfig = new SymbolsConfigManager()