// 直接載入 metadata 的簡化服務
// 繞過複雜的 dataFetcher 和 metadataService

import { paths } from './baseUrl';

/** symbols_metadata.json 內單一股票的紀錄。欄位寬鬆，僅固定常用鍵。 */
export interface SymbolMetadataItem {
  symbol: string
  sector?: string
  industry?: string
  exchange?: string
  confidence?: number
  [key: string]: unknown
}

/** symbols_metadata.json 的最小契約。 */
export interface MetadataFile {
  items?: SymbolMetadataItem[]
  [key: string]: unknown
}

class DirectMetadataLoader {
  cache: MetadataFile | null
  loading: boolean
  _fetchPromise?: Promise<MetadataFile | null> | null

  constructor() {
    this.cache = null
    this.loading = false
  }

  async loadMetadata(): Promise<MetadataFile | null> {
    if (this.cache) {
      return this.cache
    }

    if (this.loading && this._fetchPromise) {
      console.log('🔄 Reusing existing metadata fetch request');
      return this._fetchPromise;
    }

    this.loading = true

    try {
      const fetchPromise = (async () => {
        const url = paths.symbolsMetadata({ v: Date.now() })
        console.log('🔍 DirectMetadataLoader fetching from:', url)

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data: MetadataFile = await response.json()
        this.cache = data
        return data
      })();
      this._fetchPromise = fetchPromise;

      const data = await fetchPromise;
      console.log('✅ DirectMetadataLoader loaded successfully:', data.items?.length, 'items')
      return data

    } catch (error) {
      console.error('❌ DirectMetadataLoader failed:', error)
      return null
    } finally {
      this.loading = false
      this._fetchPromise = null
    }
  }

  async getSymbolMetadata(symbol: string) {
    const data = await this.loadMetadata()
    if (!data || !data.items) {
      return {
        symbol,
        sector: 'Unknown',
        industry: 'Unknown Industry',
        exchange: 'NASDAQ',
        confidence: 0.0,
        source: 'DirectLoader (Failed)'
      }
    }

    const symbolData = data.items.find(item => item.symbol === symbol)
    if (symbolData) {
      return {
        ...symbolData,
        source: 'DirectLoader (Success)'
      }
    }

    return {
      symbol,
      sector: 'Unknown',
      industry: 'Unknown Industry',
      exchange: 'NASDAQ',
      confidence: 0.0,
      source: 'DirectLoader (Not Found)'
    }
  }

  async getBatchMetadata(symbols: string[]) {
    const results = new Map<string, unknown>()

    for (const symbol of symbols) {
      const metadata = await this.getSymbolMetadata(symbol)
      results.set(symbol, metadata)
    }

    return results
  }
}

export const directMetadataLoader = new DirectMetadataLoader()
